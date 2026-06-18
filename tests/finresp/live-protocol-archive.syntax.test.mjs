import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const archivePath = path.join(__dirname, '..', '..', 'src', 'finresp', 'live-protocol-archive.js');

test('live-protocol-archive.js has valid JavaScript syntax', () => {
  assert.ok(fs.existsSync(archivePath), `archive script missing: ${archivePath}`);
  execFileSync(process.execPath, ['--check', archivePath], { encoding: 'utf8' });
});
