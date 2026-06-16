import { existsSync } from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const required = [
  'node_modules/rxjs/package.json',
  'node_modules/@angular/common/package.json',
  'node_modules/@angular/core/package.json',
  'node_modules/@angular/cli/bin/ng.js',
];

function depsOk() {
  return required.every((rel) => existsSync(path.join(root, rel)));
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true });
  return result.status === 0;
}

if (depsOk()) {
  process.exit(0);
}

console.log('Dependencies incomplete (rxjs / @angular/* / CLI). Reinstalling from package-lock.json...');

if (existsSync(path.join(root, 'package-lock.json')) && run('npm', ['ci'])) {
  process.exit(depsOk() ? 0 : 1);
}

console.log('npm ci failed — trying npm install...');
if (!run('npm', ['install'])) {
  process.exit(1);
}

if (!depsOk()) {
  console.error('ERROR: dependencies still missing after npm install.');
  console.error('Delete node_modules, then run: npm ci');
  process.exit(1);
}
