import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stopPath = path.join(__dirname, '..', '..', 'src', 'finresp', 'MultiLogic_FinrespCalculator.stop-monitor.js');

test('MultiLogic_FinrespCalculator.stop-monitor.js has valid JavaScript syntax', () => {
  assert.ok(fs.existsSync(stopPath), `stop-monitor script missing: ${stopPath}`);
  execFileSync(process.execPath, ['--check', stopPath], { encoding: 'utf8' });
});
