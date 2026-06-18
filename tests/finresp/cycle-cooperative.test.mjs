import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = fs.readFileSync(
  path.join(root, 'src/finresp/MultiLogic_FinrespCalculator.cycle-cooperative.js'),
  'utf8',
);

const sandbox = {
  window: {},
  performance: { now: () => sandbox.__t },
  setTimeout: (fn) => {
    fn();
    return 0;
  },
  requestAnimationFrame: (fn) => {
    fn();
    return 0;
  },
};
sandbox.__t = 0;
sandbox.window = sandbox;
vm.runInNewContext(src, sandbox);
const CC = sandbox.MultiLogicFinrespCycleCoop;
assert.ok(CC, 'cycle-cooperative exports API');

let refreshCount = 0;
CC.install({
  warnMs: 100,
  hungMs: 500,
  yieldMs: 0,
  techRefreshMs: 10,
  onTechRefresh: () => {
    refreshCount += 1;
  },
});

CC.beginCycle('test-run', { phase: 'load' });
await CC.cycleBeat({ i: 1, total: 3, sec: 'SBER' });
sandbox.__t = 150;
await CC.cycleBeat({ i: 2, total: 3 });
const ended = CC.endCycle({ ok: true });
assert.equal(ended.id, 'test-run');
assert.equal(ended.ok, true);
assert.ok(ended.elapsedMs >= 0);

const lines = CC.buildTechLines();
assert.ok(lines.some((l) => l.startsWith('activeCycle=—')));
assert.ok(lines.some((l) => l.includes('recentCycles:')));
assert.ok(refreshCount > 0, 'tech refresh hook fired');

console.log('cycle-cooperative.test.mjs: ok');
