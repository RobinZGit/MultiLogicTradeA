import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

test('broker connectors registry and alor module', () => {
  const registry = fs.readFileSync(path.join(root, 'src/finresp/connectors/registry.js'), 'utf8');
  const tbank = fs.readFileSync(path.join(root, 'src/finresp/connectors/tbank.js'), 'utf8');
  const alor = fs.readFileSync(path.join(root, 'src/finresp/connectors/alor.js'), 'utf8');
  const scripts = fs.readFileSync(path.join(root, 'src/app/finresp/finresp-engine-scripts.ts'), 'utf8');
  const titleBar = fs.readFileSync(
    path.join(root, 'src/app/finresp/calculator/components/finresp-title-bar/finresp-title-bar.component.html'),
    'utf8'
  );
  const settings = fs.readFileSync(
    path.join(root, 'src/app/finresp/calculator/components/finresp-settings/finresp-settings.component.html'),
    'utf8'
  );
  const live = fs.readFileSync(path.join(root, 'src/finresp/MultiLogic_FinrespCalculator.live.js'), 'utf8');

  assert.match(registry, /register/);
  assert.match(tbank, /register\("tbank"/);
  assert.match(alor, /register\("alor"/);
  assert.match(alor, /oauth\.alor\.ru/);
  assert.match(alor, /api\.alor\.ru/);
  assert.match(scripts, /connectors\/alor\.js/);
  assert.match(titleBar, /id="broker-provider"/);
  assert.match(titleBar, /value="alor"/);
  assert.match(settings, /id="alor-settings"/);
  assert.match(settings, /id="alor-refresh-token"/);
  assert.match(live, /readBrokerIdFromUi/);
  assert.match(live, /create\("alor"/);
});

test('connectors/alor.js syntax', () => {
  const p = path.join(root, 'src/finresp/connectors/alor.js');
  execFileSync(process.execPath, ['--check', p], { encoding: 'utf8' });
});
