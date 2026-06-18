import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const livePath = path.join(root, 'src', 'finresp', 'MultiLogic_FinrespCalculator.live.js');
const bootPath = path.join(root, 'src', 'finresp', 'MultiLogic_FinrespCalculator.boot.js');

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
    'liveLastOrderBookRefreshMs',
    'liveJournalPanelBusy',
    'livePositionsPanelBusy',
    'liveGoalPanelBusy',
    'liveNotifyPanelBusy'
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

test('sandbox entry does not block on interactive T-Bank unlock', () => {
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  const connectBlock = liveSrc.match(/async function connectTbankForLive\(\)[\s\S]*?^  \}/m);
  assert.ok(connectBlock, 'connectTbankForLive');
  assert.match(connectBlock[0], /if \(isLiveSandbox\(\)\)/);
  const enableBlock = liveSrc.match(/async function enableLiveSandbox\(\)[\s\S]*?^  \}/m);
  assert.ok(enableBlock, 'enableLiveSandbox');
  assert.doesNotMatch(enableBlock[0], /ensureTbankTokenUnlocked\(\{ interactive: true/);
  assert.doesNotMatch(enableBlock[0], /GetPortfolio/);
  assert.match(liveSrc, /unstickLiveUi/);
  assert.match(liveSrc, /sandbox-toggle-timeout|watchdog-timeout/);
  const bootSrc = fs.readFileSync(bootPath, 'utf8');
  assert.match(bootSrc, /sandboxLive\s*=\s*isLiveMode\(\)\s*&&\s*!!\$\("live-sandbox-mode"\)\?\.checked/);
});

test('live goal panel: enabled header shows target date and percent', () => {
  const htmlPath = path.join(root, 'src', 'app', 'finresp', 'calculator', 'components', 'finresp-live-panel', 'finresp-live-panel.component.html');
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.match(html, /id="live-goal-panel"/);
  assert.match(html, /id="live-goal-summary-title"/);
  assert.match(html, /id="live-goal-enabled"/);
  assert.match(html, /id="live-goal-banner-badge"/);
  assert.match(liveSrc, /liveGoalSummaryTitle/);
  assert.match(liveSrc, /syncLiveGoalBanner/);
  assert.match(liveSrc, /live-goal-banner-badge--active/);
  const cssPath = path.join(root, 'src', 'app', 'finresp', 'calculator', 'finresp-calculator.component.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /live-goal-banner-badge--achieved[\s\S]*live-trading-panel--sandbox/);
  const calcFormHtml = fs.readFileSync(
    path.join(root, 'src', 'app', 'finresp', 'calculator', 'components', 'finresp-calc-form', 'finresp-calc-form.component.html'),
    'utf8'
  );
  assert.match(calcFormHtml, /id="trading-periods-panel"/);
  assert.match(calcFormHtml, /id="trading-periods-toggle"/);
  assert.match(calcFormHtml, /id="trading-periods-master"/);
  assert.match(liveSrc, /liveTradingPeriodsBlocked/);
  assert.match(liveSrc, /LIVE_SESSION_STORE_KEY/);
  assert.match(liveSrc, /persistLiveSessionToStorage/);
  assert.match(liveSrc, /tryRestoreLiveSessionFromStorage/);
  assert.match(liveSrc, /clearLiveSessionCache/);
  assert.match(liveSrc, /liveProtocolSessionMeta/);
  assert.match(liveSrc, /trimSandboxLedgerWithArchive/);
  assert.match(liveSrc, /archiveEvictedLiveData/);
  assert.match(liveSrc, /MultiLogicLiveProtocolArchive/);
  assert.match(html, /id="live-session-clear-cache"/);
  assert.match(liveSrc, /Цель установлена/);
});

test('notify panel lives inside live trading panel under goal', () => {
  const notifyHtml = fs.readFileSync(
    path.join(root, 'src', 'app', 'finresp', 'calculator', 'components', 'finresp-notify-panel', 'finresp-notify-panel.component.html'),
    'utf8'
  );
  const livePanelHtml = fs.readFileSync(
    path.join(root, 'src', 'app', 'finresp', 'calculator', 'components', 'finresp-live-panel', 'finresp-live-panel.component.html'),
    'utf8'
  );
  const calcHtml = fs.readFileSync(
    path.join(root, 'src', 'app', 'finresp', 'calculator', 'finresp-calculator.component.html'),
    'utf8'
  );
  assert.match(notifyHtml, /id="live-notify-panel"/);
  assert.match(livePanelHtml, /app-finresp-notify-panel/);
  assert.match(livePanelHtml, /live-goal-panel[\s\S]*app-finresp-notify-panel/);
  assert.doesNotMatch(calcHtml, /app-finresp-notify-panel/);
});

test('order book panel toggle does not double-schedule refresh on open', () => {
  const src = fs.readFileSync(livePath, 'utf8');
  const toggleBlock = src.match(/live-order-book-panel[\s\S]*?stopLiveOrderBookPoll/);
  assert.ok(toggleBlock, 'order book toggle handler');
  assert.doesNotMatch(toggleBlock[0], /scheduleRefreshLiveOrderBook\(true\)[\s\S]*startLiveOrderBookPoll/);
  assert.match(toggleBlock[0], /showLiveOrderBookLoading/);
  assert.match(toggleBlock[0], /startLiveOrderBookPoll/);
});

test('live panels defer heavy work on expand (goal, notify, journal, positions)', () => {
  const src = fs.readFileSync(livePath, 'utf8');
  assert.match(src, /showLiveTradeHistoryLoading/);
  assert.match(src, /showLivePositionsLoading/);
  assert.match(src, /showLiveGoalPanelLoading/);
  assert.match(src, /showLiveNotifyPanelLoading/);
  assert.match(src, /scheduleSyncLiveNotifyPanel/);
  assert.match(src, /scheduleSyncLiveGoalPanel/);
  assert.match(src, /paintTradeHistoryPanelDom/);
  assert.match(src, /syncTradeHistoryFromSourcesAsync/);
  const notifyToggle = src.match(/live-notify-panel[\s\S]*?scheduleSyncLiveNotifyPanel\(true\)/);
  assert.ok(notifyToggle, 'notify panel expand schedules async sync');
  const goalToggle = src.match(/live-goal-panel[\s\S]*?scheduleSyncLiveGoalPanel\(true\)/);
  assert.ok(goalToggle, 'goal panel expand schedules async sync');
});

test('Angular account mode notifies legacy live boot when DOM already matches', () => {
  const formPath = path.join(root, 'src', 'app', 'finresp', 'finresp-form.service.ts');
  const src = fs.readFileSync(formPath, 'utf8');
  assert.match(src, /domAlreadyMatched/);
  assert.match(src, /notifyLegacyAccountModeChange/);
  assert.match(src, /__mlOnAccountModeUserChange/);
  assert.match(src, /syncLivePanelFromMode/);
});
