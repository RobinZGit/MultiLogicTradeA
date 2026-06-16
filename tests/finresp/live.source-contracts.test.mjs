import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const livePath = path.join(__dirname, '..', '..', 'src', 'finresp', 'MultiLogic_FinrespCalculator.live.js');
const bootPath = path.join(__dirname, '..', '..', 'src', 'finresp', 'MultiLogic_FinrespCalculator.boot.js');

test('live candle refresh uses async chart redraw (не блокирует UI синхронным equity)', () => {
  const src = fs.readFileSync(livePath, 'utf8');
  const block = src.match(/applyResult\(state\.lastResult,\s*\{[\s\S]*?\}\);/);
  assert.ok(block, 'applyResult(state.lastResult, ...) in refreshLiveCandleStreamInner');
  assert.match(block[0], /redrawChartsAsync:\s*true/, 'live poll must pass redrawChartsAsync: true');
});

test('live.js exports sandbox toggle busy guard (один in-flight)', () => {
  const src = fs.readFileSync(livePath, 'utf8');
  assert.match(src, /liveSandboxToggleInFlight/);
  assert.match(src, /sandboxToggleBusy\s*=\s*true/);
  assert.match(src, /sandboxToggleBusy\s*=\s*false/);
});

test('tech info includes live busy flags for диагностики зависаний', () => {
  const src = fs.readFileSync(bootPath, 'utf8');
  for (const key of [
    'liveCandleRefreshBusy',
    'liveSandboxToggleBusy',
    'liveTradingActionBusy',
    'liveLastCandleRefreshMs',
    'liveFinrespBootstrap',
    'liveOrderBookBusy',
    'liveLastOrderBookRefreshMs'
  ]) {
    assert.match(src, new RegExp(key), `buildTechInfoText must include ${key}`);
  }
});

test('order book refresh shows loading and uses non-interactive token unlock', () => {
  const src = fs.readFileSync(livePath, 'utf8');
  assert.match(src, /showLiveOrderBookLoading/);
  assert.match(src, /загрузка стакана/);
  const refreshBlock = src.match(/async function refreshLiveOrderBook\(\)[\s\S]*?^  \}/m);
  assert.ok(refreshBlock, 'refreshLiveOrderBook');
  assert.match(refreshBlock[0], /ensureTbankTokenUnlocked\(\{ interactive: false, openUi: false \}\)/);
  assert.match(refreshBlock[0], /await yieldToUi\(\)/);
  assert.match(refreshBlock[0], /lastOrderBookRefreshMs/);
});

test('order book panel toggle does not double-schedule refresh on open', () => {
  const src = fs.readFileSync(livePath, 'utf8');
  const toggleBlock = src.match(/live-order-book-panel[\s\S]*?stopLiveOrderBookPoll/);
  assert.ok(toggleBlock, 'order book toggle handler');
  assert.doesNotMatch(toggleBlock[0], /scheduleRefreshLiveOrderBook\(true\)[\s\S]*startLiveOrderBookPoll/);
  assert.match(toggleBlock[0], /showLiveOrderBookLoading/);
  assert.match(toggleBlock[0], /startLiveOrderBookPoll/);
});
