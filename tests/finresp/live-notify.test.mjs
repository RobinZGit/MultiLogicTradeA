import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const livePath = path.join(root, 'src', 'finresp', 'MultiLogic_FinrespCalculator.live.js');
const bootPath = path.join(root, 'src', 'finresp', 'MultiLogic_FinrespCalculator.boot.js');
const htmlPath = path.join(root, 'src', 'app', 'finresp', 'calculator', 'components', 'finresp-live-panel', 'finresp-live-panel.component.html');
const NOTIFY_TEST_PORT = 4211;
const serverPath = path.join(root, 'scripts', 'finresp-tech-log-server.mjs');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(port, maxMs = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return true;
    } catch (_) { /* retry */ }
    await sleep(100);
  }
  return false;
}

test('live notify UI and client contracts', () => {
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  const bootSrc = fs.readFileSync(bootPath, 'utf8');
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.match(html, /id="live-notify-panel"/);
  assert.match(html, /id="live-notify-email"/);
  assert.match(html, /id="live-notify-phone"/);
  assert.match(html, /placeholder="\+7 900 123-45-67"/);
  assert.match(html, /id="live-notify-email-enabled"/);
  assert.match(html, /id="live-notify-phone-enabled"/);
  assert.match(liveSrc, /sendLiveNotify/);
  assert.match(liveSrc, /notifyLiveGoalAchieved/);
  assert.match(liveSrc, /checkLiveGoalExpiredNotify/);
  assert.match(liveSrc, /notifyLiveSandboxModeSwitch/);
  assert.match(liveSrc, /normalizeRuPhoneForSms/);
  assert.match(bootSrc, /live\.notify/);
  assert.match(bootSrc, /finresp-notify/);
});

test('local notify server accepts POST and writes logs/finresp-notify.log', async () => {
  const logFile = path.join(root, 'logs', 'finresp-notify.log');
  try {
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  } catch (_) { /* ignore */ }

  const child = spawn(process.execPath, [serverPath], {
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, FINRESP_LOCAL_PORT: String(NOTIFY_TEST_PORT) }
  });

  const ready = await waitForHealth(NOTIFY_TEST_PORT);
  if (!ready) {
    child.kill();
    assert.fail(`local server did not start on 127.0.0.1:${NOTIFY_TEST_PORT}`);
  }

  try {
    const payload = {
      at: '2026-06-17T12:00:00.000Z',
      event: 'goal_achieved',
      subject: 'MultiLogic: цель достигнута',
      message: 'test message',
      email: 'user@example.com',
      phone: '79001234567',
      emailEnabled: true,
      phoneEnabled: false
    };
    const res = await fetch(`http://127.0.0.1:${NOTIFY_TEST_PORT}/finresp-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.ok(fs.existsSync(logFile), 'notify log file should exist');
    const written = fs.readFileSync(logFile, 'utf8');
    assert.match(written, /goal_achieved/);
    assert.match(written, /test message/);
  } finally {
    child.kill();
    await sleep(150);
    try {
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    } catch (_) { /* ignore */ }
  }
});

test('finresp-tech-log-server.mjs notify handler syntax', () => {
  assert.ok(fs.existsSync(serverPath));
  execFileSync(process.execPath, ['--check', serverPath], { encoding: 'utf8' });
});
