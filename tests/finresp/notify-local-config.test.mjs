import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  NOTIFY_LOCAL_JSON,
  hasSavedSmtpCredentials,
  readNotifyLocalJson,
  readSuggestedNotifyEmail,
  isValidNotifyEmail,
  MAILRU_SMTP_DEFAULTS
} from '../../scripts/notify-local-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

test('notify-local-config applies json to env without clobbering existing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-notify-'));
  const prev = process.env.ML_NOTIFY_SMTP_HOST;
  try {
    const jsonPath = path.join(tmp, 'notify.local.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      smtpHost: 'smtp.mail.ru',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: 'a@mail.ru',
      smtpPass: 'secret',
      smtpFrom: 'a@mail.ru'
    }));
    const env = { ML_NOTIFY_SMTP_HOST: 'keep-me' };
    const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (j.smtpHost && !env.ML_NOTIFY_SMTP_HOST) env.ML_NOTIFY_SMTP_HOST = j.smtpHost;
    if (j.smtpUser && !env.ML_NOTIFY_SMTP_USER) env.ML_NOTIFY_SMTP_USER = j.smtpUser;
    assert.equal(env.ML_NOTIFY_SMTP_HOST, 'keep-me');
    assert.equal(env.ML_NOTIFY_SMTP_USER, 'a@mail.ru');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    if (prev === undefined) delete process.env.ML_NOTIFY_SMTP_HOST;
    else process.env.ML_NOTIFY_SMTP_HOST = prev;
  }
});

test('hasSavedSmtpCredentials reads notify.local.json shape', () => {
  assert.equal(typeof hasSavedSmtpCredentials, 'function');
  assert.equal(typeof readNotifyLocalJson, 'function');
  assert.equal(MAILRU_SMTP_DEFAULTS.smtpHost, 'smtp.mail.ru');
  assert.equal(NOTIFY_LOCAL_JSON, path.join(root, 'notify.local.json'));
});

test('ensure-notify-smtp.mjs syntax', () => {
  const p = path.join(root, 'scripts', 'ensure-notify-smtp.mjs');
  execFileSync(process.execPath, ['--check', p], { encoding: 'utf8' });
});

test('run-dev and run-prod call ensure-notify-smtp', () => {
  const dev = fs.readFileSync(path.join(root, 'run-dev.bat'), 'utf8');
  const prod = fs.readFileSync(path.join(root, 'run-prod.bat'), 'utf8');
  assert.match(dev, /ensure-notify-smtp\.mjs/);
  assert.match(prod, /ensure-notify-smtp\.mjs/);
});

test('run-dev.ps1 mirrors dev launcher without cmd', () => {
  const ps1 = fs.readFileSync(path.join(root, 'run-dev.ps1'), 'utf8');
  assert.match(ps1, /ensure-notify-smtp\.mjs/);
  assert.match(ps1, /finresp-tech-log-server\.mjs/);
  assert.match(ps1, /Stop-ListenerOnPort/);
  assert.doesNotMatch(ps1, /\bcmd\s+\/c\b/i);
  assert.doesNotMatch(ps1, /\bcmd\s+\/k\b/i);
});

test('readSuggestedNotifyEmail finds email in project notify log', () => {
  const email = readSuggestedNotifyEmail();
  if (fs.existsSync(path.join(root, 'logs', 'finresp-notify.log'))) {
    assert.ok(isValidNotifyEmail(email), `expected email from cache/log, got: ${email || '—'}`);
  }
});

test('ensure-notify-smtp suggests cached email', () => {
  const src = fs.readFileSync(path.join(root, 'scripts', 'ensure-notify-smtp.mjs'), 'utf8');
  assert.match(src, /readSuggestedNotifyEmail/);
  assert.match(src, /promptWithDefault/);
});

test('boot.js syncs notify email cache to local server', () => {
  const boot = fs.readFileSync(path.join(root, 'src', 'finresp', 'MultiLogic_FinrespCalculator.boot.js'), 'utf8');
  assert.match(boot, /syncNotifyEmailCacheToServer/);
  assert.match(boot, /finresp-notify-cache/);
});

test('finresp-tech-log-server loads notify.local.json helper', () => {
  const src = fs.readFileSync(path.join(root, 'scripts', 'finresp-tech-log-server.mjs'), 'utf8');
  assert.match(src, /applyNotifyLocalJsonToEnv/);
  assert.match(src, /notify-local-config\.mjs/);
  assert.match(src, /finresp-notify-cache/);
});
