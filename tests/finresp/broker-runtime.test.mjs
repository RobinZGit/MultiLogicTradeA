import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_PROVISIONAL_DEPOSIT,
  activeView,
  brokerCred,
  clearLiveRuntimeBroker,
  createBrokerRuntimeState,
  ensureLiveRuntime,
  mockDepositDom,
  simulateBrokerSwitch,
  syncVolDepositDomFromBroker,
  validateLastResultMeta,
  volConfigDeposit
} from './helpers/broker-runtime.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const livePath = path.join(root, 'src', 'finresp', 'MultiLogic_FinrespCalculator.live.js');
const bootPath = path.join(root, 'src', 'finresp', 'MultiLogic_FinrespCalculator.boot.js');

test('broker switch: депозиты tbank и alor не смешиваются', () => {
  const state = createBrokerRuntimeState();
  const dom = mockDepositDom();

  state.tbank.depositRub = 6_657_000;
  state.tbank.depositLoaded = true;
  state.tbank.depositProvisional = false;
  syncVolDepositDomFromBroker(state, 'tbank', dom);
  assert.equal(dom.value, '6657000');

  dom.value = '6657000';
  simulateBrokerSwitch(state, { from: 'tbank', to: 'alor', dom });

  assert.equal(state.tbank.depositRub, 6_657_000);
  assert.equal(dom.value, String(DEFAULT_PROVISIONAL_DEPOSIT));
  assert.equal(state.alor.depositProvisional, true);

  state.alor.depositRub = 189;
  state.alor.depositLoaded = true;
  state.alor.depositProvisional = false;
  syncVolDepositDomFromBroker(state, 'alor', dom);
  assert.equal(dom.value, '189');

  simulateBrokerSwitch(state, { from: 'alor', to: 'tbank', dom });
  assert.equal(state.alor.depositRub, 189);
  assert.equal(state.tbank.depositRub, 6_657_000);
  assert.equal(dom.value, '6657000');
});

test('broker switch: clearLiveRuntimeBroker сбрасывает orders/positions уходящего брокера', () => {
  const state = createBrokerRuntimeState();
  const dom = mockDepositDom('1000000', true);

  state.live.orders = [{ orderId: 'tb-1' }];
  state.live.openPositions = [{ sec: 'SBER', qty: 10 }];
  state.live.portfolioValue = 500_000;

  simulateBrokerSwitch(state, { from: 'tbank', to: 'alor', dom, sandboxMode: false });

  assert.deepEqual(state.live.runtime.tbank.real.orders, []);
  assert.deepEqual(state.live.runtime.tbank.real.openPositions, []);
  assert.equal(state.live.runtime.tbank.real.portfolioValue, null);
  assert.deepEqual(state.live.orders, []);
  assert.deepEqual(state.live.openPositions, []);
  assert.equal(state.live.portfolioValue, null);
});

test('sandbox runtime: baseline per broker через activeView', () => {
  const state = createBrokerRuntimeState();

  const tSb = ensureLiveRuntime(state, 'tbank').sandbox;
  tSb.startPortfolio = 6_657_000;
  tSb.cash = 6_600_000;
  tSb.commissionTotal = 120;

  const aSb = ensureLiveRuntime(state, 'alor').sandbox;
  aSb.startPortfolio = 189;
  aSb.cash = 150;
  aSb.commissionTotal = 5;

  state.live.sandboxPositionsValue = 57_000;
  state.live.portfolioValue = 6_657_000;

  const tbankView = activeView(state, 'tbank', true);
  assert.equal(tbankView.brokerId, 'tbank');
  assert.equal(tbankView.sandbox, true);
  assert.equal(tbankView.freeCashRub, 6_600_000);
  assert.equal(tbankView.commissionPaid, 120);

  const alorView = activeView(state, 'alor', true);
  assert.equal(alorView.brokerId, 'alor');
  assert.equal(alorView.freeCashRub, 150);
  assert.equal(alorView.commissionPaid, 5);
  assert.notEqual(tbankView.freeCashRub, alorView.freeCashRub);
});

test('режим источника: validateLastResultMeta — брокер, песочница, депозит', () => {
  const meta = { deposit: 189, brokerId: 'alor', sandbox: true };

  assert.deepEqual(
    validateLastResultMeta(meta, { brokerId: 'alor', sandbox: true, deposit: 189 }),
    []
  );
  assert.deepEqual(
    validateLastResultMeta(meta, { brokerId: 'tbank', sandbox: true, deposit: 189 }),
    ['broker']
  );
  assert.deepEqual(
    validateLastResultMeta(meta, { brokerId: 'alor', sandbox: false, deposit: 189 }),
    ['sandbox']
  );
  assert.deepEqual(
    validateLastResultMeta(meta, { brokerId: 'alor', sandbox: true, deposit: 200 }),
    ['deposit']
  );
});

test('volConfigDeposit: загруженный депозит брокера важнее поля DOM', () => {
  const state = createBrokerRuntimeState();
  state.alor.depositRub = 189;
  state.alor.depositLoaded = true;
  state.alor.depositProvisional = false;

  assert.equal(volConfigDeposit(state, 'alor', '1000000'), 189);
  assert.equal(volConfigDeposit(state, 'tbank', '1000000'), 1_000_000);
});

test('broker switch очищает sandbox ledger уходящего брокера', () => {
  const state = createBrokerRuntimeState();
  const dom = mockDepositDom('189');

  const sb = ensureLiveRuntime(state, 'tbank').sandbox;
  sb.startPortfolio = 189;
  sb.cash = 100;
  sb.orders.push({ orderId: 'sbx-1' });
  sb.ledger.push({ fillId: 1 });

  clearLiveRuntimeBroker(state, 'tbank', 'alor');

  const cleared = state.live.runtime.tbank.sandbox;
  assert.equal(cleared.startPortfolio, null);
  assert.equal(cleared.cash, null);
  assert.deepEqual(cleared.orders, []);
  assert.deepEqual(cleared.ledger, []);
});

test('source contracts: page init bootstrap broker connect + deposit', () => {
  const live = fs.readFileSync(livePath, 'utf8');
  const boot = fs.readFileSync(bootPath, 'utf8');

  assert.match(live, /function bootstrapBrokerOnPageInit\(\)/);
  assert.match(live, /function connectTbankForLiveBackground\(source\)/);
  assert.match(boot, /connectTbankForLiveBackground\("page-init"\)/);
  assert.match(boot, /bootstrapBrokerOnPageInit\(\)/);
  assert.match(boot, /trackBootBackground/);
  assert.match(boot, /setBootStatus/);
  assert.match(boot, /onAngularScriptsReady/);
  assert.match(boot, /bootWatchdogFired/);
  assert.match(boot, /if \(!state\.tbank\.token\) state\.tbank\.depositLoaded = false/);

  const connectBlock = live.match(/function scheduleBrokerConnectIfReady\(source\)[\s\S]*?^  \}/m);
  assert.ok(connectBlock);
  assert.match(connectBlock[0], /isPageInit/);
  assert.match(connectBlock[0], /return scheduleBrokerUnlockPrompt/);
  assert.match(connectBlock[0], /interactive:\s*false/);

  const liveBgBlock = live.match(/function connectTbankForLiveBackground\(source\)[\s\S]*?^  \}/m);
  assert.ok(liveBgBlock);
  assert.match(liveBgBlock[0], /interactive:\s*false/);
  assert.doesNotMatch(liveBgBlock[0], /interactive:\s*true/);

  const unlockBlock = live.match(/function scheduleBrokerUnlockPrompt\(source, opsGen\)[\s\S]*?^  \}/m);
  assert.ok(unlockBlock);
  assert.match(unlockBlock[0], /ensureBrokerDepositLoaded/);
  assert.match(unlockBlock[0], /interactive:\s*true/);
});

test('source contracts: multi-broker runtime wiring в live.js и boot.js', () => {
  const live = fs.readFileSync(livePath, 'utf8');
  const boot = fs.readFileSync(bootPath, 'utf8');

  const changeBlock = live.match(/function onBrokerProviderChange\(\)[\s\S]*?^  \}/m);
  assert.ok(changeBlock, 'onBrokerProviderChange');
  assert.match(changeBlock[0], /scheduleBrokerConnectDebounced/);
  assert.match(changeBlock[0], /clearBrokerSessionTokens/);
  assert.doesNotMatch(changeBlock[0], /lockBrokerSession/);

  assert.match(live, /function activeView\(\)/);
  assert.match(changeBlock[0], /clearLiveRuntimeBroker\(from\)/);
  assert.match(changeBlock[0], /persistBrokerDepositFromDom\(from\)/);
  assert.match(changeBlock[0], /hydrateLiveUiFromRuntime\(to\)/);

  const connectBlock = live.match(/async function connectTbankAndLoadDeposit\(opts\)[\s\S]*?^  \}/m);
  assert.ok(connectBlock, 'connectTbankAndLoadDeposit');
  assert.match(connectBlock[0], /if \(connectBrokerInFlight === task\) connectBrokerInFlight = null/);
  assert.match(live, /state\.live\.runtime/);
  assert.match(live, /brokerSandboxState/);
  assert.match(live, /depositRub/);

  assert.match(boot, /brokers:\s*\{/);
  assert.match(boot, /depositRub/);
  assert.match(boot, /lastResultMeta = \{[\s\S]*brokerId[\s\S]*sandbox/);

  const validateBlock = live.match(/function validateLiveTradingStart\(\)[\s\S]*?^  \}/m);
  assert.ok(validateBlock, 'validateLiveTradingStart');
  assert.match(validateBlock[0], /meta\.brokerId/);
  assert.match(validateBlock[0], /meta\.sandbox/);
});

test('source contracts: renderLivePortfolioStats читает activeView', () => {
  const live = fs.readFileSync(livePath, 'utf8');
  const block = live.match(/function renderLivePortfolioStats\(\)[\s\S]*?^  \}/m);
  assert.ok(block);
  assert.match(block[0], /const view = activeView\(\)/);
  assert.match(block[0], /view\.portfolioValue/);
  assert.match(block[0], /view\.commissionPaid/);
});

test('account mode switch: paper не трогает per-broker depositRub', () => {
  const state = createBrokerRuntimeState();
  state.tbank.depositRub = 500_000;
  state.tbank.depositLoaded = true;
  state.tbank.depositProvisional = false;

  const paperDeposit = 250_000;
  const dom = mockDepositDom(String(paperDeposit));
  brokerCred(state, 'tbank').depositRub = state.tbank.depositRub;

  assert.equal(volConfigDeposit(state, 'tbank', dom.value), 500_000);
  assert.equal(brokerCred(state, 'tbank').depositRub, 500_000);
});
