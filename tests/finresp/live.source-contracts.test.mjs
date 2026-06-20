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

test('wallet select has only fictitious and live modes', () => {
  const htmlPath = path.join(
    root,
    'src',
    'app',
    'finresp',
    'calculator',
    'components',
    'finresp-title-bar',
    'finresp-title-bar.component.html',
  );
  const html = fs.readFileSync(htmlPath, 'utf8');
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  const walletBlock = html.match(/id="account-mode"[\s\S]*?<\/select>/);
  assert.ok(walletBlock, 'account-mode select');
  assert.match(walletBlock[0], /value="paper"/);
  assert.match(walletBlock[0], /value="live"/);
  assert.doesNotMatch(walletBlock[0], /value="tbank"/);
  assert.match(liveSrc, /normalizeAccountMode/);
});

test('live auto-reverses: checkbox only in panel, lookback/step in extra params', () => {
  const liveHtmlPath = path.join(
    root,
    'src',
    'app',
    'finresp',
    'calculator',
    'components',
    'finresp-live-panel',
    'finresp-live-panel.component.html',
  );
  const extraHtmlPath = path.join(
    root,
    'src',
    'app',
    'finresp',
    'calculator',
    'components',
    'finresp-calc-form',
    'finresp-calc-form.component.html',
  );
  const bootSrc = fs.readFileSync(bootPath, 'utf8');
  const liveHtml = fs.readFileSync(liveHtmlPath, 'utf8');
  const extraHtml = fs.readFileSync(extraHtmlPath, 'utf8');
  assert.match(liveHtml, /id="live-auto-reverses-panel"/);
  assert.match(liveHtml, /Автоподбор четырёх сопряжённых логик/);
  assert.doesNotMatch(liveHtml, /live-auto-reverses-lookback/);
  assert.doesNotMatch(liveHtml, /live-auto-reverses-step/);
  assert.match(extraHtml, /param-auto-reverses-lookback/);
  assert.match(extraHtml, /param-auto-reverses-step/);
  assert.match(extraHtml, /автоподбор четырёх сопряжённых логик/);
  assert.doesNotMatch(bootSrc, /live-auto-reverses-lookback/);
});

test('Angular account mode notifies legacy live boot when DOM already matches', () => {
  const formPath = path.join(root, 'src', 'app', 'finresp', 'finresp-form.service.ts');
  const src = fs.readFileSync(formPath, 'utf8');
  assert.match(src, /domAlreadyMatched/);
  assert.match(src, /notifyLegacyAccountModeChange/);
  assert.match(src, /__mlOnAccountModeUserChange/);
  assert.match(src, /syncLivePanelFromMode/);
});

test('pause on drawdown: equity catalog runs skip recovery stop (не N× applyPauseOnDrawdown)', () => {
  const bootSrc = fs.readFileSync(bootPath, 'utf8');
  assert.match(bootSrc, /finrespRunOptions\(\{ forEquity: true \}\)/);
  const equityAsync = bootSrc.match(/async function calcLogicEquityRunsAsync[\s\S]*?^  \}/m);
  assert.ok(equityAsync, 'calcLogicEquityRunsAsync');
  assert.match(equityAsync[0], /runMultiAsync/);
  assert.match(equityAsync[0], /forEquity: true/);
  assert.doesNotMatch(equityAsync[0], /recoveryStopConfig/);
  const engineSrc = fs.readFileSync(
    path.join(root, 'src', 'finresp', 'MultiLogic_FinrespCalculator.engine.js'),
    'utf8',
  );
  assert.match(engineSrc, /applyPauseOnDrawdownAsync/);
});

test('pause on drawdown: calc params, live banner, engine and live hooks', () => {
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  const bootSrc = fs.readFileSync(bootPath, 'utf8');
  const engineSrc = fs.readFileSync(
    path.join(root, 'src', 'finresp', 'MultiLogic_FinrespCalculator.engine.js'),
    'utf8',
  );
  const calcHtml = fs.readFileSync(
    path.join(root, 'src', 'app', 'finresp', 'calculator', 'components', 'finresp-calc-form', 'finresp-calc-form.component.html'),
    'utf8',
  );
  const liveHtml = fs.readFileSync(
    path.join(root, 'src', 'app', 'finresp', 'calculator', 'components', 'finresp-live-panel', 'finresp-live-panel.component.html'),
    'utf8',
  );
  const css = fs.readFileSync(
    path.join(root, 'src', 'app', 'finresp', 'calculator', 'finresp-calculator.component.css'),
    'utf8',
  );
  assert.match(calcHtml, /id="param-pause-on-drawdown"/);
  assert.match(calcHtml, /id="param-pause-on-drawdown-per-logic"/);
  assert.match(calcHtml, /id="param-drawdown-pct"/);
  assert.match(liveHtml, /id="live-recovery-stop-banner"/);
  assert.match(liveHtml, /id="live-recovery-stop-title"/);
  assert.match(liveHtml, /id="live-pause-on-drawdown-panel"/);
  assert.match(liveHtml, /id="live-pause-on-drawdown-per-logic-panel"/);
  assert.match(css, /\.live-recovery-stop-banner/);
  assert.match(bootSrc, /recoveryStopConfig/);
  assert.match(bootSrc, /function resolveCalcLogicSpec/);
  assert.match(bootSrc, /resolveLogicSpecStack\(selectedLogicIds\(\)/);
  assert.match(bootSrc, /resolveEffectiveCalcLogicSpec/);
  assert.match(bootSrc, /effectiveLogicIds\(\)/);
  assert.match(liveSrc, /triggerDrawdownDisableLive/);
  assert.match(liveSrc, /tryDrawdownResumeLive/);
  assert.match(liveSrc, /effectiveLogicIds/);
  assert.match(bootSrc, /snapshotDrawdownRecoveryForPersist/);
  assert.match(bootSrc, /restoreDrawdownRecoveryFromSnapshot/);
  assert.match(bootSrc, /drawdownRecovery/);
  assert.match(bootSrc, /instrumentSelectAll/);
  assert.match(bootSrc, /syncLogicChipDrawdownState/);
  assert.match(css, /calc-logic-chip--drawdown-disabled/);
  assert.match(liveSrc, /payload\.drawdownRecovery/);
  assert.match(liveSrc, /keepDrawdownState/);
  assert.match(liveSrc, /reconcileSandboxAfterDrawdownDisable/);
  assert.match(liveSrc, /triggerRecoveryPauseLive/);
  assert.match(liveSrc, /tryRecoveryResumeLive/);
  assert.match(liveSrc, /syncRecoveryStopBanner/);
});

test('equity charts: только выбранные логики (equitySimLogicKeys + selectedLogicIds)', () => {
  const bootSrc = fs.readFileSync(bootPath, 'utf8');
  assert.match(bootSrc, /function equitySimLogicKeys\(\)/);
  const fn = bootSrc.match(/function equitySimLogicKeys\(\)[\s\S]*?^  \}/m);
  assert.ok(fn, 'equitySimLogicKeys body');
  assert.match(fn[0], /selectedLogicIds\(\)/);
  assert.match(bootSrc, /const catalogKeys = equitySimLogicKeys\(\)/);
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  const drawEq = liveSrc.match(/function drawLiveEquityPlaceholders\(\)[\s\S]*?^  \}/m);
  assert.ok(drawEq);
  assert.doesNotMatch(drawEq[0], /equityCatalogLogicKeys\(\)/);
});

test('collapsible calc panels: control params outside main calc, three uniform details', () => {
  const htmlPath = path.join(
    root,
    'src',
    'app',
    'finresp',
    'calculator',
    'components',
    'finresp-calc-form',
    'finresp-calc-form.component.html',
  );
  const html = fs.readFileSync(htmlPath, 'utf8');
  const bootSrc = fs.readFileSync(bootPath, 'utf8');
  const mainPanel = html.match(/id="calc-main-panel"[\s\S]*?<\/div>\s*<div class="calc-panels-row">/);
  assert.ok(mainPanel, 'calc-main-panel closes before calc-panels-row');
  assert.doesNotMatch(mainPanel[0], /calc-at-params/);
  assert.match(html, /id="control-params-panel"/);
  assert.match(html, /id="control-params-toggle"/);
  assert.match(bootSrc, /bindCollapsibleToggle\("control-params-panel", "control-params-toggle"\)/);
  const idxControl = html.indexOf('id="control-params-panel"');
  const idxExtra = html.indexOf('id="extra-params"');
  const idxLogic = html.indexOf('id="logic-catalog-panel"');
  assert.ok(idxControl >= 0 && idxExtra > idxControl && idxLogic > idxExtra, 'panel order');
  assert.match(html, /class="calc-panels-row"[\s\S]*id="control-params-panel"[\s\S]*id="extra-params"[\s\S]*id="logic-catalog-panel"/);
});

test('stop monitor: module + unified live stop poll', () => {
  const stopPath = path.join(root, 'src', 'finresp', 'MultiLogic_FinrespCalculator.stop-monitor.js');
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  const scripts = fs.readFileSync(
    path.join(root, 'src', 'app', 'finresp', 'finresp-engine-scripts.ts'),
    'utf8',
  );
  assert.ok(fs.existsSync(stopPath));
  assert.match(scripts, /MultiLogic_FinrespCalculator\.stop-monitor\.js/);
  assert.match(liveSrc, /function runLiveStopMonitorTick/);
  assert.match(liveSrc, /function startLiveStopPoll/);
  assert.match(liveSrc, /function tickLiveStopPoll/);
  assert.doesNotMatch(
    liveSrc.match(/function renderLivePortfolioStats\(\)[\s\S]*?^  \}/m)?.[0] || '',
    /checkPauseOnDrawdownLive/
  );
});

test('portfolio stopper: sandbox closes positions, real notify only', () => {
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  assert.match(liveSrc, /function triggerPortfolioStopperSandbox/);
  assert.match(liveSrc, /tradeSource: "portfolio-stopper"/);
  assert.match(liveSrc, /if \(isLiveSandbox\(\)\) \{[\s\S]*await triggerPortfolioStopperSandbox/);
  assert.match(liveSrc, /source === "portfolio-stopper"/);
  assert.match(liveSrc, /showSandboxStopperNotification\(hit\)/);
});

test('live commission: reset on session clear, sandbox toggle, always apply from broker ops', () => {
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  assert.match(liveSrc, /function resetLiveRealCommissionSession/);
  assert.match(liveSrc, /function applyLiveBrokerOpsCommission/);
  assert.match(liveSrc, /brokerOpsPeriodAnchor/);
  assert.match(liveSrc, /resetLiveRealCommissionSession\(\)/);
  assert.match(liveSrc, /persistLiveUiToRuntime\([\s\S]{0,120}forceReal:\s*true/);
  assert.match(liveSrc, /applyLiveBrokerOpsCommission\(\)/);
  assert.match(liveSrc, /syncSandboxCommissionToUi/);
});

test('conjugate logics: engine export + UI button between help and copy', () => {
  const engineSrc = fs.readFileSync(
    path.join(root, 'src', 'finresp', 'MultiLogic_FinrespCalculator.engine.js'),
    'utf8',
  );
  const bootSrc = fs.readFileSync(bootPath, 'utf8');
  const css = fs.readFileSync(
    path.join(root, 'src', 'app', 'finresp', 'calculator', 'finresp-calculator.component.css'),
    'utf8',
  );
  assert.match(engineSrc, /function bakeConjugateLogicLine/);
  assert.match(engineSrc, /conjugateLogicLineVariants/);
  assert.match(bootSrc, /function generateConjugateLogics/);
  assert.match(bootSrc, /data-conjugate-logic/);
  assert.match(bootSrc, /Сгенерировать сопряжённые логики/);
  assert.match(css, /\.logic-line-conjugate-btn/);
  assert.match(bootSrc, /logic-line-help-btn[\s\S]*logic-line-conjugate-btn[\s\S]*logic-line-copy-btn/);
});

test('trade protocol export: blob preview, SPA guard, no archive auto-download', () => {
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  const block = liveSrc.match(/async function exportTradeHistoryProtocolFile\(\)[\s\S]*?^  \}/m)?.[0] || '';
  assert.ok(block.length > 40, 'exportTradeHistoryProtocolFile body');
  assert.doesNotMatch(block, /window\.open\(assetUrl\("MultiLogic_TradeHistoryProtocol\.html"\)/);
  assert.match(block, /createObjectURL/);
  assert.match(block, /window\.open\(url/);
  assert.match(liveSrc, /function buildProtocolOpenLots/);
  assert.match(liveSrc, /function isSpaFallbackHtml/);
  assert.match(liveSrc, /PROTOCOL_HTML_SHELL/);
  assert.match(liveSrc, /ensureProtocolExportAssets/);
  const archiveBlock = liveSrc.match(/async function archiveEvictedLiveData\([\s\S]*?^  \}/m)?.[0] || '';
  assert.doesNotMatch(archiveBlock, /a\.download/);
});

test('logic pause equity decor on per-logic charts', () => {
  const bootSrc = fs.readFileSync(bootPath, 'utf8');
  assert.match(bootSrc, /function logicPauseDecorForRows/);
  assert.match(bootSrc, /mode:\s*"logic_pause"/);
  assert.match(bootSrc, /logic-pause-start/);
  assert.match(bootSrc, /redrawEquityChartsFromCache/);
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  assert.match(liveSrc, /mode === "logic_pause"/);
  assert.match(liveSrc, /Логика отключена/);
});

test('trade protocol: sessionEvents journal and HTML section', () => {
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  const renderPath = path.join(root, 'src', 'finresp', 'MultiLogic_TradeHistoryProtocol.render.js');
  const renderSrc = fs.readFileSync(renderPath, 'utf8');
  assert.match(liveSrc, /function recordLogicSessionEvent/);
  assert.match(liveSrc, /sessionEvents/);
  assert.match(liveSrc, /tradeHistoryProtocolSessionEventRow/);
  assert.match(liveSrc, /buildLiveSessionPayload/);
  assert.doesNotMatch(
    liveSrc.match(/async function exportTradeHistoryProtocolFile\(\)[\s\S]*?^  \}/m)?.[0] || '',
    /ensureTbankTokenUnlocked/
  );
  assert.match(renderSrc, /renderSessionEvents/);
  assert.match(renderSrc, /Логики: включения и отключения/);
});

test('sandbox start: async auto-reverses and yield to avoid UI freeze', () => {
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  assert.match(liveSrc, /async function runSandboxAutoReversesCheck/);
  assert.match(liveSrc, /runMultiAsync/);
  assert.match(liveSrc, /rebuildSandboxFromLedgerAsync/);
  assert.match(liveSrc, /yieldToUi/);
});

test('boot defers saveConfig until Angular form restore (не затирает live/бумаги при init)', () => {
  const bootSrc = fs.readFileSync(bootPath, 'utf8');
  assert.match(bootSrc, /deferConfigSave/);
  assert.match(bootSrc, /state\.restoringConfig \|\| state\.deferConfigSave\) return/);
  assert.match(bootSrc, /function applyAngularFormSnapshotFromConfig/);
  assert.doesNotMatch(bootSrc, /\$\("account-mode"\)\.value = "paper"/);
});

test('initAccountMode does not force paper on reload', () => {
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  const block = liveSrc.match(/function initAccountMode\(\)[\s\S]*?^  \}/m)?.[0] || '';
  assert.ok(block, 'initAccountMode');
  assert.match(block, /readAccountModeFromUi/);
  assert.doesNotMatch(block, /value = "paper"/);
});

test('boot flushes config on page hide and periodic save', () => {
  const bootSrc = fs.readFileSync(bootPath, 'utf8');
  assert.match(bootSrc, /function flushConfigSave/);
  assert.match(bootSrc, /flushConfigSave\(\{ force: true, source: "pagehide" \}\)/);
  assert.match(bootSrc, /startPeriodicConfigSave/);
  assert.match(bootSrc, /function resolveAccountModeForConfig/);
});

test('logic stack persisted with selectionCleared and drawdown slice', () => {
  const bootSrc = fs.readFileSync(bootPath, 'utf8');
  assert.match(bootSrc, /function resolveLogicIdsForConfig/);
  assert.match(bootSrc, /logicSelectionCleared: logicPick\.cleared/);
  assert.match(bootSrc, /prepareForConfigPersist/);
  assert.match(bootSrc, /function logicIdsForFillPreserve/);
  assert.match(bootSrc, /bridgeReadLogicIdsFromChips/);
  assert.doesNotMatch(
    bootSrc.match(/try \{[\s\S]*?applySavedConfig\(\);[\s\S]*?fillLogicSelect\(\);/m)?.[0] || '',
    /fillLogicSelect\(\);\s*\n\s*updatePositionSlHint/,
  );
  const formSrc = fs.readFileSync(
    path.join(root, 'src', 'app', 'finresp', 'finresp-form.service.ts'),
    'utf8',
  );
  assert.match(formSrc, /prepareForConfigPersist/);
  assert.match(formSrc, /logicSelectionCleared: this\.logicSelectionCleared/);
  assert.doesNotMatch(
    formSrc.match(/onBridgeBootReady\(\)[\s\S]*?^  \}/m)?.[0] || '',
    /syncFromDom/,
  );
});

test('sandbox order price: clamp cross-instrument bleed and no loose packLastClose fallback', () => {
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  assert.match(liveSrc, /function sandboxClampOrderPrice/);
  assert.match(liveSrc, /live-sandbox-price-clamp/);
  assert.doesNotMatch(liveSrc, /if \(!pack\) pack = state\.packs\.find\(\(p\) => String\(p\[0\]\?\.sec/);
  const packBlock = liveSrc.match(/function packLastClose\([\s\S]*?^  \}/m);
  assert.ok(packBlock, 'packLastClose');
  assert.match(packBlock[0], /instrumentKey\(p\[0\]\) === key/);
  const tbankSrc = fs.readFileSync(path.join(root, 'src', 'finresp', 'connectors', 'tbank.js'), 'utf8');
  assert.doesNotMatch(tbankSrc, /if \(!pool\.length\) pool = list/);
});

test('fake vs real: separate API caches, journal filter, persist sandbox before disable', () => {
  const liveSrc = fs.readFileSync(livePath, 'utf8');
  assert.match(liveSrc, /function tradeHistoryForActiveMode/);
  assert.match(liveSrc, /function activateLiveApiCachesForMode/);
  assert.match(liveSrc, /function resetSandboxApiCaches/);
  assert.match(liveSrc, /sb\.instrumentCache/);
  const disableBlock = liveSrc.match(/async function disableLiveSandbox\(\)[\s\S]*?^  \}/m);
  assert.ok(disableBlock, 'disableLiveSandbox');
  assert.match(disableBlock[0], /persistLiveSessionToStorage\(\{ sandbox: true \}\)/);
  const toggleBlock = liveSrc.match(/async function toggleLiveTrading\(\)[\s\S]*?^  \}/m);
  assert.ok(toggleBlock, 'toggleLiveTrading');
  assert.match(toggleBlock[0], /resetSandboxApiCaches/);
  const journalBlock = liveSrc.match(/async function paintTradeHistoryPanelDom\(\)[\s\S]*?^  \}/m);
  assert.ok(journalBlock, 'paintTradeHistoryPanelDom');
  assert.match(journalBlock[0], /tradeHistoryForActiveMode/);
  const protocolBlock = liveSrc.match(/function buildTradeHistoryProtocol\(\)[\s\S]*?^  \}/m);
  assert.ok(protocolBlock, 'buildTradeHistoryProtocol');
  assert.match(protocolBlock[0], /tradeHistoryForActiveMode/);
  assert.match(liveSrc, /liveSessionSlot\(brokerId, sandbox\)/);
});
