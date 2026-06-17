import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const bootPath = path.join(root, 'src', 'finresp', 'MultiLogic_FinrespCalculator.boot.js');
const serverPath = path.join(root, 'scripts', 'finresp-tech-log-server.mjs');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(maxMs = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    try {
      const res = await fetch('http://127.0.0.1:4201/health');
      if (res.ok) return true;
    } catch (_) { /* retry */ }
    await sleep(100);
  }
  return false;
}

test('finresp-tech-log-server.mjs has valid syntax', () => {
  assert.ok(fs.existsSync(serverPath));
  execFileSync(process.execPath, ['--check', serverPath], { encoding: 'utf8' });
});

test('boot.js mirrors tech info to local file sink on localhost', () => {
  const src = fs.readFileSync(bootPath, 'utf8');
  assert.match(src, /TECH_LOG_FILE_HOST/);
  assert.match(src, /scheduleTechInfoFileSink\(\)/);
  assert.match(src, /127\.0\.0\.1:4201\/finresp-tech-log/);
  assert.match(src, /finresp-notify/);
  assert.match(src, /liveNotifySink=/);
  assert.match(src, /brokerEvents:/);
  assert.match(src, /noteBrokerTech/);
  assert.match(src, /brokerLastEvent=/);
  assert.match(src, /finresp-broker-trace/);
  assert.match(src, /brokerTraceSink=/);
});

test('local tech log server accepts POST and writes logs/finresp-tech-log.txt', async () => {
  const logFile = path.join(root, 'logs', 'finresp-tech-log.txt');
  try {
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  } catch (_) { /* ignore */ }

  const child = spawn(process.execPath, [serverPath], {
    stdio: 'ignore',
    windowsHide: true
  });

  const ready = await waitForHealth();
  if (!ready) {
    child.kill();
    assert.fail('tech log server did not start on 127.0.0.1:4201');
  }

  try {
    const payload = {
      at: '2026-06-17T12:00:00.000Z',
      lastEvent: 'test',
      pageVersion: 'test-v',
      url: 'http://127.0.0.1:4200/finresp',
      text: 'pageVersion=test-v\nuiBusy=false'
    };
    const res = await fetch('http://127.0.0.1:4201/finresp-tech-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(res.status, 200);
    assert.ok(fs.existsSync(logFile), 'log file should exist');
    const written = fs.readFileSync(logFile, 'utf8');
    assert.match(written, /uiBusy=false/);
    assert.match(written, /lastEvent=test/);
  } finally {
    child.kill();
    await sleep(150);
    try {
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    } catch (_) { /* ignore */ }
  }
});
