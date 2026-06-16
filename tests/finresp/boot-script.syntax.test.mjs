import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bootPath = path.join(__dirname, '..', '..', 'src', 'finresp', 'MultiLogic_FinrespCalculator.boot.js');

test('MultiLogic_FinrespCalculator.boot.js has valid JavaScript syntax', () => {
  assert.ok(fs.existsSync(bootPath), `boot script missing: ${bootPath}`);
  execFileSync(process.execPath, ['--check', bootPath], { encoding: 'utf8' });
});
