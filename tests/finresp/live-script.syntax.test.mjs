import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const livePath = path.join(__dirname, '..', '..', 'src', 'finresp', 'MultiLogic_FinrespCalculator.live.js');

test('MultiLogic_FinrespCalculator.live.js has valid JavaScript syntax', () => {
  assert.ok(fs.existsSync(livePath), `live script missing: ${livePath}`);
  execFileSync(process.execPath, ['--check', livePath], { encoding: 'utf8' });
});
