/*
 * MultiLogic FINRESP — live trading runtime (real + sandbox).
 * Loaded after engine.js; initialized from HTML via MultiLogicFinrespLive.install(deps).
 */
(function (root) {
  "use strict";

  /** Точка входа live-модуля: замыкание с deps из HTML, возвращает публичный API. */
  function install(d) {

    // --- Зависимости из HTML (state, engine, UI-хелперы) ---
    const state = d.state;
    const E = d.E;
    const $ = d.$;
    const fmt = d.fmt;
    const fmtSignedRub = d.fmtSignedRub;
    const RUB_SIGN = d.RUB_SIGN;
    const IS_FILE_PROTOCOL = d.IS_FILE_PROTOCOL;
    const TBANK_REST_BASES = d.TBANK_REST_BASES;
    const TBANK_TOKEN_STORE_KEY = d.TBANK_TOKEN_STORE_KEY;
    const TBANK_ACCOUNT_STORE_KEY = d.TBANK_ACCOUNT_STORE_KEY;
    const TBANK_HOST_STORE_KEY = d.TBANK_HOST_STORE_KEY;
    const TBANK_CRYPTO_ITERATIONS = d.TBANK_CRYPTO_ITERATIONS;
    const safeStorageGet = d.safeStorageGet;
    const safeStorageSet = d.safeStorageSet;
    const safeStorageRemove = d.safeStorageRemove;
    const moneyValueRub = d.moneyValueRub;
    const moneyValueToNumber = d.moneyValueToNumber;
    const accountLabel = d.accountLabel;
    const rubFreeCashFromTbankPositions = d.rubFreeCashFromTbankPositions;
    const encryptTbankToken = d.encryptTbankToken;
    const decryptTbankToken = d.decryptTbankToken;
    const params = (...a) => d.params(...a);
    const volConfig = (...a) => d.volConfig(...a);
    const stopperConfig = (...a) => d.stopperConfig(...a);
    const commissionPctValue = (...a) => d.commissionPctValue(...a);
    const noteLiveTech = (...a) => d.noteLiveTech(...a);
    const noteTechError = (...a) => d.noteTechError(...a);
    const updateTechInfo = (...a) => d.updateTechInfo(...a);
    const saveConfig = (...a) => d.saveConfig(...a);
    const selectedInstruments = (...a) => d.selectedInstruments(...a);
    const selectedInstrumentCount = (...a) => d.selectedInstrumentCount(...a);
    const instrumentKey = (...a) => d.instrumentKey(...a);
    const packsByInstrumentKey = (...a) => d.packsByInstrumentKey(...a);
    const orderPacksForInstruments = (...a) => d.orderPacksForInstruments(...a);
    const loadMetaKey = (...a) => d.loadMetaKey(...a);
    const selectedLogicIds = (...a) => d.selectedLogicIds(...a);
    const primaryLogicId = (...a) => d.primaryLogicId(...a);
    const logicDisplayName = (...a) => d.logicDisplayName(...a);
    const resolveCalcLogicSpec = (...a) => d.resolveCalcLogicSpec(...a);
    const calcResultAsync = (...a) => d.calcResultAsync(...a);
    const yieldToUi = (...a) => d.yieldToUi(...a);
    const syncChartBox = (...a) => d.syncChartBox(...a);
    const invalidateFinrespResult = (...a) => d.invalidateFinrespResult(...a);
    const syncLeverageDisplay = (...a) => d.syncLeverageDisplay(...a);
    const INDICATOR_OPTIONS = d.INDICATOR_OPTIONS;
    const MIN_WARMUP_BARS = d.MIN_WARMUP_BARS;
    const MOEX_MINUTES_PER_SESSION = d.MOEX_MINUTES_PER_SESSION;
    const applyEditorParams = (...a) => d.applyEditorParams(...a);
    const indicatorSelection = (...a) => d.indicatorSelection(...a);
    const normalizeSliders = (...a) => d.normalizeSliders(...a);
    const finrespRunOptions = (...a) => d.finrespRunOptions(...a);
    const bindCollapsibleToggle = (...a) => d.bindCollapsibleToggle(...a);
    const syncCollapsibleToggleLabel = (...a) => d.syncCollapsibleToggleLabel(...a);
    const bindLivePanelCollapsibleToggles = (...a) => d.bindLivePanelCollapsibleToggles(...a);
    const syncPageVersionBadge = (...a) => d.syncPageVersionBadge(...a);
    const liveMoexBarTimes = (...a) => d.liveMoexBarTimes(...a);
    const noteLiveReconcileToTech = (...a) => d.noteLiveReconcileToTech(...a);
    const liveIssueLine = (...a) => d.liveIssueLine(...a);
    const mergeLiveForbiddenIssues = (...a) => d.mergeLiveForbiddenIssues(...a);
    const liveForbiddenLabel = (...a) => d.liveForbiddenLabel(...a);
    const formatLiveForbiddenTechLine = (...a) => d.formatLiveForbiddenTechLine(...a);
    const liveIssueIsApiForbidden = (...a) => d.liveIssueIsApiForbidden(...a);
    const techLog = d.techLog;
    const refPack = (...a) => d.refPack(...a);
    const drawCharts = (...a) => d.drawCharts(...a);
    const drawEquityCharts = (...a) => d.drawEquityCharts(...a);
    const applyResult = (...a) => d.applyResult(...a);
    const setCommissionMetric = (...a) => d.setCommissionMetric(...a);
    const formatMoexBarTime = (...a) => d.formatMoexBarTime(...a);
    const parseMoexTime = (...a) => d.parseMoexTime(...a);
    const parseDay = (...a) => d.parseDay(...a);
    const formatDay = (...a) => d.formatDay(...a);
    const todayDate = (...a) => d.todayDate(...a);
    const addDays = (...a) => d.addDays(...a);
    const maxCalcDays = (...a) => d.maxCalcDays(...a);
    const formatLiveRefreshClock = (...a) => d.formatLiveRefreshClock(...a);
    const logicEquityLabel = (...a) => d.logicEquityLabel(...a);
    const equityCatalogLogicKeys = (...a) => d.equityCatalogLogicKeys(...a);
    const selectedEquityLogicKeys = (...a) => d.selectedEquityLogicKeys(...a);
    const totalEquityTitle = (...a) => d.totalEquityTitle(...a);
    const finrespEquityTitle = (...a) => d.finrespEquityTitle(...a);
    const referenceEquityTitle = (...a) => d.referenceEquityTitle(...a);
    const currentLimit = (...a) => d.currentLimit(...a);
    const commonTimeRange = (...a) => d.commonTimeRange(...a);
    const findFirstIndexAtOrAfter = (...a) => d.findFirstIndexAtOrAfter(...a);
    const findLastIndexAtOrBefore = (...a) => d.findLastIndexAtOrBefore(...a);
    const rowIndexByTime = (...a) => d.rowIndexByTime(...a);

  /** Ленивый экземпляр T-Bank коннектора (connectors/tbank.js). */
  let brokerInst = null;

  function hasConnectors() {
    const REG = root.MultiLogicFinrespConnectors;
    return !!(REG && typeof REG.create === "function" && typeof REG.get === "function" && REG.get("tbank"));
  }

  function fillTbankAccountsFromStorage() {
    if (!state.tbank.accounts.length) {
      state.tbank.selectedAccountId = "";
      return;
    }
    const saved = state.tbank.selectedAccountId || safeStorageGet(TBANK_ACCOUNT_STORE_KEY);
    if (saved && state.tbank.accounts.some((a) => a.id === saved)) {
      state.tbank.selectedAccountId = saved;
    } else {
      state.tbank.selectedAccountId = state.tbank.accounts[0]?.id || "";
    }
    if (state.tbank.selectedAccountId) safeStorageSet(TBANK_ACCOUNT_STORE_KEY, state.tbank.selectedAccountId);
  }

  function getBroker() {
    if (!brokerInst) {
      if (!hasConnectors()) {
        throw new Error("Коннектор T-Bank не загружен (connectors/registry.js и connectors/tbank.js). Обновите страницу Ctrl+F5.");
      }
      brokerInst = root.MultiLogicFinrespConnectors.create("tbank", {
        state,
        liveState: state.live,
        TBANK_REST_BASES,
        TBANK_ACCOUNT_STORE_KEY,
        TBANK_HOST_STORE_KEY,
        safeStorageGet,
        safeStorageSet,
        moneyValueRub,
        accountLabel,
        noteLiveTech,
        fmt,
        E,
        liveOrderTypeUi,
        resolveOrderPrice,
        orderBookDepth: 10,
        onHostFallback: (hostId) => setTbankStatus(`Подключение выполнено через резервный API хост: ${hostId}.`)
      });
    }
    return brokerInst;
  }

  // === HTML ↔ live: функции ниже экспортируются из install() для вызова из HTML ===
  function liveFreeCashRub() {
    if (isLiveSandbox()) {
      const sb = ensureSandboxState();
      ensureSandboxCash(sb);
      if (Number.isFinite(sb.cash)) return sb.cash;
      if (Number.isFinite(sb.startPortfolio)) return sb.startPortfolio;
      const dep = +($("vol-deposit")?.value || 0);
      return dep > 0 ? dep : NaN;
    }
    return state.live.freeCashRub;
  }

  /** Live-торговля: `livePositionsMtmRub`. */
  function livePositionsMtmRub() {
    if (isLiveSandbox()) return state.live.sandboxPositionsValue;
    if (Number.isFinite(state.live.positionsMtmRub)) return state.live.positionsMtmRub;
    const pv = state.live.portfolioValue;
    const cash = state.live.freeCashRub;
    if (Number.isFinite(pv) && Number.isFinite(cash)) return pv - cash;
    return NaN;
  }

  /** Синхронизация UI/state: `syncLiveStatsHint`. */
  function syncLiveStatsHint() {
    const el = $("live-trading-stats-hint");
    if (!el || !isLiveMode()) return;
    const cash = liveFreeCashRub();
    const mtm = livePositionsMtmRub();
    const pv = state.live.portfolioValue;
    const comm = state.live.commissionPaid;
    const fin = liveFinResultRub();
    const modelFin = state.live.modelFinresp;
    if (Number.isFinite(cash) && Number.isFinite(mtm) && Number.isFinite(pv)) {
      const commTxt = Number.isFinite(comm) && comm > 0 ? ` · комиссии: −${fmt(comm, 2)} ₽` : "";
      const modelTxt = Number.isFinite(modelFin)
        ? ` · FINRESP Σ (модель): ${fmtSignedRub(modelFin, 2)} ₽ = блок расчёта`
        : "";
      const portTxt = Number.isFinite(fin)
        ? ` · портфель Δ: ${fmtSignedRub(fin, 2)} ₽`
        : "";
      const histFin = (() => {
        try {
          const done = (state.live.tradeHistory || []).filter((h) => !h.active);
          return computeTradeHistoryCloseTotals(done).sumFin;
        } catch (_) { return NaN; }
      })();
      const histTxt = Number.isFinite(histFin)
        ? ` · Σ закрытий (FIFO): ${fmtSignedRub(histFin, 2)} ₽`
        : "";
      el.textContent =
        `Портфель = деньги + позиции: ${fmt(cash, 2)} + ${fmt(mtm, 2)} = ${fmt(pv, 2)} ₽`
        + ` · «Деньги, свободно» — не в бумагах (старт − комиссии ± сделки)${commTxt}${modelTxt}${portTxt}${histTxt}`;
      return;
    }
    if (isLiveSandbox()) {
      el.textContent = "Включите «Песочница (фейк)» или сделайте сделку — появятся «Деньги, свободно» и портфель.";
      return;
    }
    if (!state.tbank.token) {
      el.textContent = "«Деньги, свободно» подтягиваются из T-Bank после подключения токена и счёта.";
      return;
    }
    el.textContent = "Портфель = деньги (свободные RUB) + стоимость открытых позиций по текущим ценам.";
  }

  /** Отрисовка элемента live-панели: `renderLiveFreeCashStat`. */
  function renderLiveFreeCashStat() {
    const stat = $("live-free-cash-stat");
    const el = $("live-free-cash-value");
    if (!el) return;
    if (stat) stat.hidden = !isLiveMode();
    const v = liveFreeCashRub();
    const dec = 2;
    el.textContent = fmtSignedRub(v, dec);
    const neg = Number.isFinite(v) && v < 0;
    el.classList.toggle("live-cash-negative", neg);
    el.style.color = neg ? "#b91c1c" : "";
  }

  /** Live-торговля: `liveSessionPortfolioBaseline`. */
  function liveSessionPortfolioBaseline() {
    const cs = state.live.chartSession;
    if (cs?.portfolioBaseline != null && Number.isFinite(cs.portfolioBaseline)) return cs.portfolioBaseline;
    if (isLiveSandbox()) {
      const sb = ensureSandboxState();
      if (Number.isFinite(sb.startPortfolio)) return sb.startPortfolio;
    }
    return NaN;
  }

  /** Live-торговля: `liveFinResultRub`. */
  function liveFinResultRub() {
    const base = liveSessionPortfolioBaseline();
    const cur = state.live.portfolioValue;
    if (!Number.isFinite(base) || !Number.isFinite(cur)) return NaN;
    return cur - base;
  }

  /** Подпрограмма `snapshotLiveSessionPortfolioBaseline`. */
  function snapshotLiveSessionPortfolioBaseline() {
    const cs = state.live.chartSession;
    if (!cs || (cs.portfolioBaseline != null && Number.isFinite(cs.portfolioBaseline))) return;
    if (isLiveSandbox()) {
      const sb = ensureSandboxState();
      if (Number.isFinite(sb.startPortfolio)) {
        cs.portfolioBaseline = sb.startPortfolio;
        return;
      }
    }
    const pv = state.live.realPortfolioValue ?? state.live.portfolioValue;
    if (Number.isFinite(pv)) cs.portfolioBaseline = pv;
    else {
      const dep = +($("vol-deposit")?.value || 0);
      if (Number.isFinite(dep) && dep > 0) cs.portfolioBaseline = dep;
    }
  }

  /** Отрисовка элемента live-панели: `renderLiveFinResultStat`. */
  function renderLiveFinResultStat() {
    const stat = $("live-finresult-stat");
    const el = $("live-finresult-value");
    if (!el) return;
    if (stat) stat.hidden = !isLiveMode();
    const v = isLiveTradingSession() && Number.isFinite(state.live.modelFinresp)
      ? state.live.modelFinresp
      : NaN;
    el.textContent = Number.isFinite(v) ? `${fmtSignedRub(v, 2)} ₽` : "—";
    const neg = Number.isFinite(v) && v < 0;
    const pos = Number.isFinite(v) && v > 0;
    el.classList.toggle("live-fin-negative", neg);
    el.classList.toggle("live-fin-positive", pos);
    el.style.color = neg ? "#b91c1c" : (pos ? "#047857" : "");
  }

  /** Сброс baseline FINRESP при старте торговли (отсчёт с «Начать торговлю»). */
  function resetLiveFinrespBaselinesForTrading() {
    const cs = state.live.chartSession;
    if (!cs) return;
    cs.finrespBaseline = null;
    cs.commissionBaseline = null;
  }

  /** Уведомления отключены (UI колокольчиков удалён). */
  function liveSandboxNotifyActive() {
    return false;
  }

  /** Показ UI/уведомления: `showLiveInPageToast`. */
  function showLiveInPageToast(_title, _body, _ms) { /* noop */ }

  /** Подпрограмма `sendSandboxTestNotification`. */
  function sendSandboxTestNotification() { /* noop */ }

  /** Показ UI/уведомления: `showSandboxWebNotification`. */
  function showSandboxWebNotification(_title, _body, _tag, _opts) {
    return false;
  }

  /** Песочница (фейк-брокер): `sandboxPositionLotsLabel`. */
  function sandboxPositionLotsLabel(pos, pieces) {
    const p = Math.abs(+pieces || +pos.pieces || 0);
    if (!p) return "0";
    const lots = pos.isFuture ? p : piecesToLots(p, pos.lot);
    return String(lots);
  }

  /** Подпрограмма `notifySandboxPositionOpen`. */
  function notifySandboxPositionOpen(pos, price, pieces) {
    if (!pos) return;
    const sideLabel = pos.side === "short" ? "шорт" : "лонг";
    const lots = sandboxPositionLotsLabel(pos, pieces);
    const ticker = pos.ticker || pos.sec || "?";
    showSandboxWebNotification(
      `MultiLogic — открыта позиция · ${ticker}`,
      `${ticker} · ${sideLabel} · ${lots} лот · ${fmt(price, 2)} ₽`,
      `multilogic-sandbox-open-${ticker}-${Date.now()}`,
      { requireInteraction: false }
    );
    noteLiveTech("sandbox-pos-open", ticker, `${sideLabel} ${lots} lot @ ${fmt(price, 2)}`);
  }

  /** Подпрограмма `notifySandboxPositionClose`. */
  function notifySandboxPositionClose(pos, closePieces, closePrice, pnl) {
    if (!pos) return;
    const sideLabel = pos.side === "short" ? "шорт" : "лонг";
    const lots = sandboxPositionLotsLabel(pos, closePieces);
    const ticker = pos.ticker || pos.sec || "?";
    const pnlText = Number.isFinite(pnl)
      ? ` · P/L ${pnl >= 0 ? "+" : ""}${fmt(pnl, 0)} ₽`
      : "";
    showSandboxWebNotification(
      `MultiLogic — закрыта позиция · ${ticker}`,
      `${ticker} · ${sideLabel} · ${lots} лот · ${fmt(closePrice, 2)} ₽${pnlText}`,
      `multilogic-sandbox-close-${ticker}-${Date.now()}`,
      { requireInteraction: false }
    );
    noteLiveTech("sandbox-pos-close", ticker, `${sideLabel} ${lots} lot @ ${fmt(closePrice, 2)}${pnlText}`);
  }

  /** Синхронизация UI/state: `syncLiveNotifyStopperUi`. */
  function syncLiveNotifyStopperUi() { /* UI удалён */ }

  /** Ленивая инициализация/проверка: `ensureLiveNotifyPermission`. */
  async function ensureLiveNotifyPermission() {
    return false;
  }

  /** Обработчик события UI: `onLiveNotifyPermissionClick`. */
  async function onLiveNotifyPermissionClick() { /* noop */ }

  /** Сброс состояния: `resetSandboxStopperWatch`. */
  function resetSandboxStopperWatch() {
    const cs = state.live.chartSession;
    if (!cs) return;
    cs.sandboxStopperWatch = {
      referenceEquity: null,
      equityHistory: [],
      lastBarTime: null,
      lastNotifyKey: null
    };
  }

  /** Ленивая инициализация/проверка: `ensureSandboxStopperWatch`. */
  function ensureSandboxStopperWatch() {
    if (!state.live.chartSession) return null;
    if (!state.live.chartSession.sandboxStopperWatch) resetSandboxStopperWatch();
    return state.live.chartSession.sandboxStopperWatch;
  }

  /** Подпрограмма `portfolioStopperReferenceForWatch`. */
  function portfolioStopperReferenceForWatch(cfg, watch) {
    if (cfg.refEquity > 0) return cfg.refEquity;
    if (watch.referenceEquity != null && Number.isFinite(watch.referenceEquity)) return watch.referenceEquity;
    return null;
  }

  /** Показ UI/уведомления: `showSandboxStopperNotification`. */
  function showSandboxStopperNotification(hit) {
    if (!hit) return;
    const isSl = hit.kind === "sl";
    const title = isSl
      ? "MultiLogic — портфельный stop-loss (песочница)"
      : "MultiLogic — портфельный take-profit (песочница)";
    const body =
      `${isSl ? "Stop-loss" : "Take-profit"} · портфель ${fmt(hit.equity, 0)} ₽`
      + ` · база ${fmt(hit.referenceEquity, 0)} ₽`
      + ` · порог ${fmt(hit.triggerLevel, 0)} ₽`
      + ` · ATR ${fmt(hit.atr, 0)} ₽`;
    showSandboxWebNotification(title, body, `multilogic-sandbox-portfolio-${hit.kind}`, {
      requireInteraction: isSl
    });
    noteLiveTech(
      "sandbox-stopper-notify",
      `${hit.kind} @ ${hit.time || "—"}`,
      `eq=${fmt(hit.equity, 0)} ref=${fmt(hit.referenceEquity, 0)}`
    );
  }

  /** Проверка портфельного stopper в песочнице (уведомления отключены). */
  function checkSandboxPortfolioStopperNotify() {
    if (!liveSandboxNotifyActive()) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const cfg = stopperConfig();
    if (!cfg.useSl && !cfg.useTp) return;
    const pv = state.live.portfolioValue;
    if (!Number.isFinite(pv)) return;
    const watch = ensureSandboxStopperWatch();
    if (!watch) return;

    const time = state.live.lastCandleBarTime || new Date().toISOString();
    if (watch.lastBarTime === time && watch.equityHistory.length) {
      watch.equityHistory[watch.equityHistory.length - 1].equity = pv;
    } else {
      watch.equityHistory.push({ equity: pv, time });
      watch.lastBarTime = time;
      if (watch.equityHistory.length > 400) watch.equityHistory.shift();
    }

    let ref = portfolioStopperReferenceForWatch(cfg, watch);
    if (ref == null && watch.equityHistory.length >= 1) {
      ref = watch.equityHistory[0].equity;
      watch.referenceEquity = ref;
    }

    const hit = E.checkPortfolioStopperTrigger(watch.equityHistory, cfg, ref);
    if (!hit) return;

    const notifyKey = `${hit.kind}:${hit.time}:${Math.round(hit.equity)}`;
    if (watch.lastNotifyKey === notifyKey) return;
    watch.lastNotifyKey = notifyKey;

    showSandboxStopperNotification(hit);
    watch.referenceEquity = hit.equity;
  }

  // === T-Bank: токен, счета, статус подключения ===

  /** Подпрограмма `setTbankStatus`. */
  function setTbankStatus(message, isError = false) {
    const el = $("tbank-status");
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? "#b91c1c" : "var(--muted)";
  }

  /** Синхронизация UI/state: `syncTbankSettingsState`. */
  function syncTbankSettingsState() {
    const el = $("tbank-settings-state");
    if (!el) return;
    const stored = !!safeStorageGet(TBANK_TOKEN_STORE_KEY);
    const unlocked = !!state.tbank.token;
    const account = state.tbank.selectedAccountId ? "счёт найден" : "счёт не загружен";
    const deposit = state.tbank.depositLoaded ? "депозит загружен" : "депозит не загружен";
    el.textContent = unlocked
      ? `токен расшифрован · ${account} · ${deposit}`
      : stored ? "токен сохранён локально, нужен пароль" : "не подключено";
  }

  /** Проверка булева условия: `isLiveMode`. */
  function isLiveMode() {
    const v = $("account-mode")?.value;
    if (v === "live" || v === "tbank" || v === "paper") return v === "live";
    return state.accountMode === "live";
  }
  /** Проверка булева условия: `isTbankBackedMode`. */
  function isTbankBackedMode() {
    const v = $("account-mode")?.value;
    if (v === "live" || v === "tbank") return true;
    if (v === "paper") return false;
    return state.accountMode === "tbank" || state.accountMode === "live";
  }

  /** Чтение из формы/state: `readAccountModeFromUi`. */
  function readAccountModeFromUi() {
    const v = $("account-mode")?.value || "paper";
    if (v === "tbank") return "tbank";
    if (v === "live") return "live";
    return "paper";
  }

  /** Live-торговля: `liveOrderDirectionLabel`. */
  function liveOrderDirectionLabel(direction) {
    if (direction === "ORDER_DIRECTION_BUY" || direction === 1) return "Покупка";
    if (direction === "ORDER_DIRECTION_SELL" || direction === 2) return "Продажа";
    return direction || "—";
  }

  /** Live-торговля: `liveOrderStatusLabel`. */
  function liveOrderStatusLabel(status) {
    const map = {
      EXECUTION_REPORT_STATUS_UNSPECIFIED: "неизвестно",
      EXECUTION_REPORT_STATUS_FILL: "исполнена",
      EXECUTION_REPORT_STATUS_REJECTED: "отклонена",
      EXECUTION_REPORT_STATUS_CANCELLED: "отменена",
      EXECUTION_REPORT_STATUS_NEW: "новая",
      EXECUTION_REPORT_STATUS_PARTIALLYFILL: "частично",
      EXECUTION_REPORT_STATUS_PENDING: "ожидает"
    };
    return map[status] || String(status || "—").replace(/^EXECUTION_REPORT_STATUS_/, "").toLowerCase();
  }

  /** Проверка булева условия: `isOrderBuy`. */
  function isOrderBuy(o) {
    return o.direction === "ORDER_DIRECTION_BUY" || o.direction === 1;
  }

  /** Закрытие позиции/заявки: `closeAtMarketLabelForOrder`. */
  function closeAtMarketLabelForOrder(o) {
    if (!isLiveSandbox() && liveOrderCancellable(o, false)) return "Снять";
    return isOrderBuy(o) ? "Продать по рынку" : "Купить по рынку";
  }

  /** Закрытие позиции/заявки: `closeAtMarketLabelForPosition`. */
  function closeAtMarketLabelForPosition(row) {
    return row?.side === "short" ? "Купить по рынку" : "Продать по рынку";
  }

  /** Live-торговля: `liveOrderCloseable`. */
  function liveOrderCloseable(o) {
    if (isLiveSandbox()) return true;
    const st = String(o.executionReportStatus || o.orderState || "").toUpperCase();
    if (!st) return true;
    if (st.includes("CANCEL") || st.includes("REJECT")) return false;
    if (liveOrderCancellable(o, false)) return true;
    return st.includes("FILL");
  }

  /** Live-торговля: `liveOrderRowId`. */
  function liveOrderRowId(o) {
    return String(o.orderId || o.order_id || o.id || "").trim();
  }

  /** Ленивая инициализация/проверка: `ensureLiveTradeHistory`. */
  function ensureLiveTradeHistory() {
    if (!Array.isArray(state.live.tradeHistory)) state.live.tradeHistory = [];
    return state.live.tradeHistory;
  }

  /** Проверка булева условия: `isLiveOrderActive`. */
  function isLiveOrderActive(o) {
    if (o.fake || isLiveSandbox()) return false;
    const st = String(o.executionReportStatus || o.orderState || "").toUpperCase();
    if (!st) return true;
    if (st.includes("FILL") && !st.includes("PARTIALLY")) return false;
    if (st.includes("CANCEL") || st.includes("REJECT")) return false;
    return st.includes("NEW") || st.includes("PARTIALLY") || st.includes("PENDING") || st.includes("SUBMIT");
  }

  /** Live-торговля: `liveTradeSourceRobotLabel`. */
  function liveTradeSourceRobotLabel() {
    const ids = selectedLogicIds();
    if (!ids.length) return "Робот";
    if (ids.length === 1) return logicDisplayName(ids[0]);
    return `Робот: ${ids.map(logicDisplayName).join(" → ")}`;
  }

  /** Разрешение id/метаданных: `resolveTradeSourceLabel`. */
  function resolveTradeSourceLabel(source, customLabel) {
    if (customLabel) return customLabel;
    if (source === "robot") return liveTradeSourceRobotLabel();
    if (source === "manual") return "Ручная заявка";
    if (source === "close-position") return "Закрытие позиции";
    if (source === "sell-all") return "Закрыть все";
    if (source === "broker") return "Брокер";
    if (source) return String(source);
    return "—";
  }

  /** Подпрограмма `attachTradeSourceFields`. */
  function attachTradeSourceFields(obj, source, sourceLabel) {
    if (source) obj.tradeSource = source;
    const label = resolveTradeSourceLabel(source, sourceLabel);
    if (label && label !== "—") obj.tradeSourceLabel = label;
    return obj;
  }

  /** Подпрограмма `pickTradeSourceFromOptimisticRealEntry`. */
  function pickTradeSourceFromOptimisticRealEntry(entry) {
    const hist = ensureLiveTradeHistory();
    const t = Date.parse(entry.orderDate || 0) || 0;
    const entryBuy = isOrderBuy(entry);
    for (const h of hist) {
      if (h.fake || String(h.id || "").startsWith("real-op-")) continue;
      if (h.ticker !== entry.ticker || !!h.isBuy !== entryBuy) continue;
      if (!h.tradeSourceLabel) continue;
      const ht = Date.parse(h.when || 0) || 0;
      if (Math.abs(ht - t) < 180000) {
        entry.tradeSource = h.tradeSource;
        entry.tradeSourceLabel = h.tradeSourceLabel;
        return;
      }
    }
    attachTradeSourceFields(entry, entry.tradeSource || "broker");
  }

  /** Сделка/комиссия: `tradeHistoryFinrespForOrder`. */
  function tradeHistoryFinrespForOrder(o) {
    const explicit = tradeHistoryCloseFinrespExplicit(o);
    if (Number.isFinite(explicit)) return explicit;
    if (o.fake) {
      const role = o.tradeRole;
      if (role === "close_long" || role === "close_short" || role === "flip") {
        return sandboxCloseFinrespNet(o);
      }
      return null;
    }
    if (!isOrderBuy(o)) {
      if (Number.isFinite(o.finresp)) return o.finresp;
      if (Number.isFinite(o.brokerYield)) return o.brokerYield;
      if (Number.isFinite(o.tradePnl)) return o.tradePnl;
    } else {
      const role = o.tradeRole;
      if (role === "close_short" || role === "flip") {
        return sandboxCloseFinrespNet(o);
      }
    }
    return null;
  }

  /** T-Bank REST API: `tbankOpTradeSide`. */
  function tbankOpTradeSide(op) {
    const raw = op?.operationType ?? op?.operation_type ?? op?.type;
    const n = typeof raw === "number" ? raw : Number.parseInt(String(raw || "").replace(/\D/g, ""), 10);
    if (n === 22 || n === 29 || n === 18) return "sell";
    if (n === 15 || n === 16 || n === 20 || n === 28) return "buy";
    const ot = String(raw || "").toUpperCase();
    if (!ot) return null;
    if (ot.includes("SELL") || ot.includes("ПРОДА")) return "sell";
    if (ot.includes("BUY") || ot.includes("ПОКУП")) return "buy";
    return null;
  }

  /** Доходность сделки (yield) в ₽ из операции брокера. */
  function tbankOpYieldRub(op) {
    if (!op) return NaN;
    let y = moneyValueRub(op.yield);
    if (Number.isFinite(y)) return y;
    y = moneyValueRub(op.paymentYield);
    if (Number.isFinite(y)) return y;
    return NaN;
  }

  /** Отдельная fee-операция T-Bank (не buy/sell). */
  function tbankOpIsFeeOp(op) {
    if (!op) return false;
    const raw = op.operationType ?? op.operation_type ?? op.type;
    const n = typeof raw === "number" ? raw : Number.parseInt(String(raw || "").replace(/\D/g, ""), 10);
    if (n === 19) return true; // OPERATION_TYPE_BROKER_FEE
    const ot = String(raw || "").toUpperCase();
    return ot.includes("BROKER_FEE") || ot.includes("SERVICE_FEE") || ot.includes("CASH_FEE")
      || ot.includes("MARGIN_FEE") || ot.includes("SUCCESS_FEE") || ot.includes("ADVICE_FEE")
      || ot.includes("OTHER_FEE") || ot.includes("OVER_COM");
  }

  /** Комиссия по одной операции T-Bank (поле commission или отдельная OPERATION_TYPE_*_FEE). */
  function tbankOpCommissionRub(op) {
    if (!op) return 0;
    if (tbankOpIsFeeOp(op)) {
      const pay = moneyValueRub(op.payment);
      return Number.isFinite(pay) ? Math.abs(pay) : 0;
    }
    const fee = moneyValueRub(op.commission);
    return Number.isFinite(fee) && fee !== 0 ? Math.abs(fee) : 0;
  }

  /**
   * Сумма дочерних BROKER_FEE по parentOperationId (T-Bank часто не кладёт commission в сделку).
   * @param {object[]} operations
   * @returns {Map<string, number>}
   */
  function buildBrokerCommissionByParentOpId(operations) {
    const map = new Map();
    for (const op of operations || []) {
      if (tbankOpTradeSide(op)) continue;
      const parentRaw = op.parentOperationId ?? op.parent_operation_id;
      if (parentRaw == null || parentRaw === "" || String(parentRaw) === "-1") continue;
      const fee = tbankOpCommissionRub(op);
      if (!(fee > 0)) continue;
      const key = String(parentRaw);
      map.set(key, (map.get(key) || 0) + fee);
    }
    return map;
  }

  /** Комиссия сделки: commission на строке + дочерние fee-операции с parentOperationId. */
  function tbankOpTradeTotalCommissionRub(op, feeByParent) {
    let total = tbankOpCommissionRub(op);
    const opId = op?.id != null && String(op.id) !== "" && String(op.id) !== "-1"
      ? String(op.id) : "";
    if (opId && feeByParent instanceof Map) {
      total += feeByParent.get(opId) || 0;
    }
    return total;
  }

  /** Сохранить сырой ответ GetOperations и карту комиссий по parent id. */
  function storeBrokerOperationsRaw(raw) {
    state.live.brokerOperationsRaw = raw || [];
    state.live.brokerOpCommissionByParentId = buildBrokerCommissionByParentOpId(state.live.brokerOperationsRaw);
  }

  function brokerOpCommissionByParentMap() {
    if (state.live.brokerOpCommissionByParentId instanceof Map) {
      return state.live.brokerOpCommissionByParentId;
    }
    if (Array.isArray(state.live.brokerOperationsRaw) && state.live.brokerOperationsRaw.length) {
      storeBrokerOperationsRaw(state.live.brokerOperationsRaw);
      return state.live.brokerOpCommissionByParentId;
    }
    return new Map();
  }

  /** Сумма комиссий по списку операций (сделки + отдельные fee-операции). */
  function sumTbankOperationsCommission(operations) {
    let comm = 0;
    for (const op of operations || []) comm += tbankOpCommissionRub(op);
    return comm;
  }

  /** Снимок открытых позиций на старт торговли — для seed legs в боевом режиме. */
  function captureRealLegSeedFromPortfolioRows(rows) {
    if (isLiveSandbox()) return;
    const seed = (rows || [])
      .filter((r) => isLiveOpenPositionBalance(r.pieces, r.lot))
      .map((r) => ({
        key: sandboxPosKey(r.market || (r.isFuture ? "futures" : "shares"), r.ticker),
        ticker: r.ticker,
        sec: r.sec || r.ticker,
        market: r.market || (r.isFuture ? "futures" : "shares"),
        instrumentId: r.instrumentId,
        lot: r.lot,
        isFuture: !!r.isFuture,
        side: r.side || "long",
        pieces: Math.abs(+r.pieces || 0),
        avgPrice: Number.isFinite(r.avgPrice) ? r.avgPrice : null
      }));
    state.live.realLegSeed = seed;
  }

  /** Seed FIFO/LIFO legs позициями, открытыми до старта live-сессии. */
  function seedRealBrokerLegCtx(ctx) {
    const seed = state.live.realLegSeed;
    if (!Array.isArray(seed) || !seed.length) return;
    for (const row of seed) {
      if (!row.pieces || !Number.isFinite(row.avgPrice) || row.avgPrice <= 0) continue;
      const posMeta = {
        ticker: row.ticker,
        sec: row.sec,
        market: row.market,
        instrumentId: row.instrumentId,
        lot: row.lot,
        isFuture: row.isFuture
      };
      pushSandboxLeg(ctx, row.key, row.side, row.pieces, row.avgPrice);
      rebuildSandboxOpenFromLegs(ctx, row.key, posMeta);
    }
  }

  /** Начало периода операций брокера для комиссий и журнала. */
  function liveBrokerOpsPeriodFrom() {
    return state.live.tradingStartedAt
      || state.live.sessionStartedAt
      || state.live.chartSession?.startedAt
      || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  }

  /**
   * Пересчёт FINRESPΔ по журналу брокера: yield брокера при закрытии, иначе FIFO/LIFO как в песочнице.
   * @param {object[]} enriched — результат enrichBrokerOperationsForHistory
   */
  function reconcileRealBrokerTradeFinresp(enriched) {
    if (isLiveSandbox() || !Array.isArray(enriched) || !enriched.length) return;
    const sorted = enriched.slice().sort(
      (a, b) => (Date.parse(a._histDate || a.date || 0) || 0) - (Date.parse(b._histDate || b.date || 0) || 0)
    );
    const ctx = createSandboxReplayCtx({ startPortfolio: 0 });
    seedRealBrokerLegCtx(ctx);
    state.live.brokerReplayLegFees = new Map();
    const metaByOpId = new Map();
    const matchMode = sandboxMatchMode();
    const feeByParent = brokerOpCommissionByParentMap();

    for (const op of sorted) {
      const side = op._histSide || tbankOpTradeSide(op);
      if (!side) continue;
      const pieces = Math.abs(Math.trunc(+op.quantity || 0));
      if (!pieces) continue;
      const signedPieces = side === "buy" ? pieces : -pieces;
      const isFuture = String(op.instrumentType || op.instrument_type || "").toLowerCase() === "futures";
      const market = isFuture ? "futures" : "shares";
      const ticker = op._histTicker || String(op.ticker || op.figi || "").toUpperCase();
      const price = Number.isFinite(op._histPrice)
        ? op._histPrice
        : (moneyValueRub(op.price) || moneyValueToNumber(op.price));
      if (!Number.isFinite(price) || price <= 0) continue;
      const fee = tbankOpTradeTotalCommissionRub(op, feeByParent);
      const brokerYield = tbankOpYieldRub(op);
      const posMeta = {
        ticker,
        sec: ticker,
        market,
        instrumentId: op.instrumentUid || op.figi,
        lot: Math.max(1, +op._histLot || 1),
        isFuture
      };
      const meta = applySandboxSignedDelta(ctx, posMeta, signedPieces, price, {
        matchMode,
        skipNotify: true,
        skipClosedJournal: true
      });
      // Привязать комиссию открытия к leg (покупка лонга / продажа шорта — для FIFO при закрытии).
      if (fee > 0 && meta?.legIds?.length) {
        const perLegFee = fee / meta.legIds.length;
        for (const legId of meta.legIds) {
          state.live.brokerReplayLegFees.set(legId, (state.live.brokerReplayLegFees.get(legId) || 0) + perLegFee);
          for (const legs of ctx.openLegs?.values() || []) {
            const leg = legs.find((l) => l.legId === legId);
            if (leg) leg.fee = (leg.fee || 0) + perLegFee;
          }
        }
      }
      let finresp = null;
      const isClose = meta.role === "close_long" || meta.role === "close_short" || meta.role === "flip";
      if (isClose) {
        const closeEntry = {
          tradeRole: meta.role,
          tradeMatches: meta.matches,
          price,
          fee,
          isBuy: side === "buy",
          notional: pieces * price,
          signedPieces: side === "buy" ? pieces : -pieces
        };
        finresp = tradeHistoryCloseFinrespExplicit(closeEntry);
        if (!Number.isFinite(finresp) && Number.isFinite(brokerYield)) finresp = brokerYield;
        else if (!Number.isFinite(finresp)) finresp = sandboxCloseFinrespNet(closeEntry);
      }
      if (op.id != null) {
        metaByOpId.set(String(op.id), {
          role: meta.role,
          matches: meta.matches ? meta.matches.map((m) => ({ ...m })) : [],
          pnlTotal: meta.pnlTotal,
          fee,
          brokerYield: Number.isFinite(brokerYield) ? brokerYield : null,
          finresp: Number.isFinite(finresp) ? finresp : null
        });
      }
    }

    const hist = ensureLiveTradeHistory();
    for (const h of hist) {
      if (h.mode !== "real" || !String(h.id || "").startsWith("real-op-")) continue;
      const opId = String(h.id).slice("real-op-".length);
      const m = metaByOpId.get(opId);
      if (!m) continue;
      h.tradeRole = m.role;
      h.tradeMatches = m.matches;
      h.tradePnl = m.pnlTotal;
      if (Number.isFinite(m.brokerYield)) h.brokerYield = m.brokerYield;
      if (Number.isFinite(m.fee)) h.fee = m.fee;
      h.finresp = m.finresp;
      if (h.sourceOrder) {
        h.sourceOrder.tradeRole = m.role;
        h.sourceOrder.tradeMatches = m.matches;
        h.sourceOrder.tradePnl = m.pnlTotal;
        if (Number.isFinite(m.brokerYield)) h.sourceOrder.brokerYield = m.brokerYield;
        if (Number.isFinite(m.fee)) h.sourceOrder.fee = m.fee;
        if (Number.isFinite(m.finresp)) h.sourceOrder.finresp = m.finresp;
      }
    }
  }

  /** Подпрограмма `dedupeOptimisticRealTradeHistory`. */
  function dedupeOptimisticRealTradeHistory(entry) {
    if (!entry || entry.fake) return;
    const hist = ensureLiveTradeHistory();
    const t = Date.parse(entry.when || 0) || 0;
    for (let i = hist.length - 1; i >= 0; i--) {
      const h = hist[i];
      if (h.fake || String(h.id || "").startsWith("real-op-")) continue;
      if (h.ticker !== entry.ticker || !!h.isBuy !== !!entry.isBuy) continue;
      const ht = Date.parse(h.when || 0) || 0;
      if (Math.abs(ht - t) < 180000) hist.splice(i, 1);
    }
  }

  /** Подпрограмма `upsertTradeHistoryFromTbankOperation`. */
  function upsertTradeHistoryFromTbankOperation(op) {
    const side = op._histSide || tbankOpTradeSide(op);
    if (!side) return;
    const pieces = Math.abs(Math.trunc(+op.quantity || 0));
    if (!pieces) return;
    const price = Number.isFinite(op._histPrice) ? op._histPrice : (moneyValueRub(op.price) || moneyValueToNumber(op.price));
    const payment = moneyValueRub(op.payment);
    const commission = tbankOpTradeTotalCommissionRub(op, brokerOpCommissionByParentMap());
    const brokerYield = tbankOpYieldRub(op);
    const ticker = op._histTicker || String(op.ticker || op.figi || "—").toUpperCase();
    const lot = Math.max(1, +op._histLot || 1);
    const lots = op._histLots ?? Math.max(1, piecesToLots(pieces, lot) || 1);
    const isBuy = side === "buy";
    const when = op.date || op._histDate || new Date().toISOString();
    const entryOrder = attachTradeSourceFields({
      orderId: `real-op-${op.id}`,
      ticker,
      sec: ticker,
      direction: isBuy ? "ORDER_DIRECTION_BUY" : "ORDER_DIRECTION_SELL",
      lotsRequested: lots,
      lotsExecuted: lots,
      orderType: "ORDER_TYPE_MARKET",
      executionReportStatus: "EXECUTION_REPORT_STATUS_FILL",
      orderDate: when,
      fake: false,
      brokerOp: true,
      price: Number.isFinite(price) ? price : null,
      notional: Number.isFinite(payment) ? Math.abs(payment) : (Number.isFinite(price) ? pieces * price : null),
      fee: commission,
      brokerYield: Number.isFinite(brokerYield) ? brokerYield : null,
      tradePnl: Number.isFinite(brokerYield) ? brokerYield : null,
      instrumentId: op.instrumentUid || op.figi
    }, "broker");
    pickTradeSourceFromOptimisticRealEntry(entryOrder);
    upsertTradeHistoryFromOrder(entryOrder, "real");
    dedupeOptimisticRealTradeHistory(tradeHistoryEntryFromOrder(entryOrder, "real"));
  }

  /** Подпрограмма `enrichBrokerOperationsForHistory`. */
  async function enrichBrokerOperationsForHistory(operations) {
    const out = [];
    const instCache = new Map();
    for (const op of operations || []) {
      const side = tbankOpTradeSide(op);
      if (!side) continue;
      const pieces = Math.abs(Math.trunc(+op.quantity || 0));
      if (!pieces) continue;
      const uid = op.instrumentUid || op.figi;
      let meta = uid ? instCache.get(uid) : null;
      if (uid && !meta) {
        try {
          meta = await tbankGetInstrumentById(uid);
          if (meta) instCache.set(uid, meta);
        } catch (_) { /* optional */ }
      }
      const lot = Math.max(1, +meta?.lot || 1);
      const ticker = String(meta?.ticker || op.ticker || uid || "—").toUpperCase();
      const isFuture = String(op.instrumentType || op.instrument_type || meta?.instrumentType || "").toLowerCase() === "futures";
      op._histSide = side;
      op._histTicker = ticker;
      op._histLot = lot;
      op._histLots = isFuture ? pieces : Math.max(1, piecesToLots(pieces, lot) || 1);
      op._histPrice = moneyValueRub(op.price) || moneyValueToNumber(op.price);
      op._histDate = op.date;
      out.push(op);
    }
    return out;
  }

  /** Синхронизация UI/state: `syncRealTradeHistoryFromBroker`. */
  async function syncRealTradeHistoryFromBroker() {
    if (isLiveSandbox() || !state.tbank.token || !state.tbank.selectedAccountId) return;
    const from = liveBrokerOpsPeriodFrom();
    try {
      const data = await tbankRequest("OperationsService/GetOperations", {
        accountId: state.tbank.selectedAccountId,
        from,
        to: new Date().toISOString(),
        state: "OPERATION_STATE_EXECUTED"
      });
      storeBrokerOperationsRaw(data.operations || []);
      const enriched = await enrichBrokerOperationsForHistory(state.live.brokerOperationsRaw);
      state.live.brokerOperations = enriched;
      for (const op of enriched) upsertTradeHistoryFromTbankOperation(op);
      reconcileRealBrokerTradeFinresp(enriched);
    } catch (err) {
      noteLiveTech("live-broker-ops", err.message, `account=${state.tbank.selectedAccountId || "—"}`);
    }
  }

  /** Сделка/комиссия: `tradeHistoryEntryFromOrder`. */
  function tradeHistoryEntryFromOrder(o, mode) {
    const fake = mode === "sandbox" || !!o.fake;
    const isBuy = isOrderBuy(o);
    const status = fake
      ? sandboxOrderStatusLabel(o)
      : (o.brokerOp ? "исполнена (брокер)" : liveOrderStatusLabel(o.executionReportStatus || o.orderState));
    const active = !fake && isLiveOrderActive(o);
    const finresp = tradeHistoryFinrespForOrder(o);
    const histId = liveOrderRowId(o)
      || (o.fillId != null ? `fill-${o.fillId}` : "")
      || `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      id: histId,
      orderId: liveOrderRowId(o),
      ticker: o.ticker || o.sec || "—",
      direction: o.direction,
      isBuy,
      lotsRequested: o.lotsRequested ?? o.lots_requested,
      lotsExecuted: o.lotsExecuted ?? o.lots_executed ?? o.lots,
      orderType: o.orderType,
      price: o.price,
      notional: o.notional,
      fee: o.fee,
      status,
      active,
      fake,
      mode: fake ? "sandbox" : "real",
      tradeRole: o.tradeRole || null,
      tradeMatches: Array.isArray(o.tradeMatches) ? o.tradeMatches.map((m) => ({ ...m })) : null,
      tradePnl: o.tradePnl,
      signedPieces: o.signedPieces,
      brokerYield: o.brokerYield,
      brokerOp: !!o.brokerOp,
      tradeSource: o.tradeSource || null,
      tradeSourceLabel: o.tradeSourceLabel || resolveTradeSourceLabel(o.tradeSource),
      finresp,
      when: o.orderDate || o.createdAt || new Date().toISOString(),
      instrumentId: o.instrumentId,
      market: o.market,
      sec: o.sec,
      revertSnap: o.revertSnap,
      sourceOrder: o
    };
  }

  /** FINRESP после merge: песочница — engine; реал — явная FIFO-формула при наличии матчей. */
  function applyTradeHistoryFinrespOnMerge(entry) {
    if (!entry) return;
    if (entry.fake || entry.mode === "sandbox") {
      const fin = tradeHistoryFinrespForOrder(entry);
      if (Number.isFinite(fin)) entry.finresp = fin;
      return;
    }
    const explicit = tradeHistoryCloseFinrespExplicit(entry);
    if (Number.isFinite(explicit)) entry.finresp = explicit;
  }

  /** Подпрограмма `upsertTradeHistoryFromOrder`. */
  function upsertTradeHistoryFromOrder(o, mode) {
    if (!o) return;
    const hist = ensureLiveTradeHistory();
    const entry = tradeHistoryEntryFromOrder(o, mode);
    if (!entry.id) return;
    const idx = hist.findIndex((h) => h.id === entry.id);
    if (idx >= 0) {
      const prev = hist[idx];
      const merged = { ...prev, ...entry };
      if (!Number.isFinite(entry.finresp)) {
        if (Number.isFinite(prev.finresp)) merged.finresp = prev.finresp;
        else if (Number.isFinite(o.finresp)) merged.finresp = o.finresp;
        else if (!entry.isBuy && Number.isFinite(entry.brokerYield)) merged.finresp = entry.brokerYield;
        else if (!entry.isBuy && Number.isFinite(prev.brokerYield)) merged.finresp = prev.brokerYield;
      }
      if (!entry.tradeRole && prev.tradeRole) merged.tradeRole = prev.tradeRole;
      if (Array.isArray(entry.tradeMatches) && entry.tradeMatches.length) {
        merged.tradeMatches = entry.tradeMatches.map((m) => ({ ...m }));
      } else if ((!merged.tradeMatches || !merged.tradeMatches.length) && prev.tradeMatches?.length) {
        merged.tradeMatches = prev.tradeMatches;
      }
      if (!Number.isFinite(entry.tradePnl) && Number.isFinite(prev.tradePnl)) merged.tradePnl = prev.tradePnl;
      applyTradeHistoryFinrespOnMerge(merged);
      hist[idx] = merged;
    } else {
      applyTradeHistoryFinrespOnMerge(entry);
      hist.unshift(entry);
    }
    if (hist.length > 500) hist.length = 500;
  }

  /** Одна строка журнала на каждое исполнение в песочнице (ledger append-only, без схлопывания). */
  function upsertTradeHistoryFromSandboxFill(fill) {
    if (!fill) return;
    const signedPieces = Math.trunc(+fill.signedPieces || 0);
    if (!signedPieces) return;
    const lot = Math.max(1, +fill.lot || 1);
    const lots = fill.lots ?? (fill.isFuture
      ? Math.abs(signedPieces)
      : Math.max(1, Math.round(Math.abs(signedPieces) / lot)));
    const price = +fill.price;
    const notional = Math.abs(signedPieces) * price;
    const direction = fill.direction
      || (signedPieces > 0 ? "ORDER_DIRECTION_BUY" : "ORDER_DIRECTION_SELL");
    upsertTradeHistoryFromOrder({
      fillId: fill.fillId,
      orderId: fill.orderId || (fill.fillId != null ? `fill-${fill.fillId}` : undefined),
      ticker: fill.ticker,
      sec: fill.sec,
      direction,
      lotsRequested: lots,
      lotsExecuted: lots,
      orderType: "ORDER_TYPE_MARKET",
      executionReportStatus: "EXECUTION_REPORT_STATUS_FILL",
      orderDate: fill.ts,
      fake: true,
      price,
      notional,
      fee: fill.fee,
      instrumentId: fill.instrumentId,
      market: fill.market,
      tradeRole: fill.tradeRole,
      tradeMatches: fill.tradeMatches,
      tradePnl: fill.tradePnl,
      matchMode: fill.matchMode,
      signedPieces: fill.signedPieces,
      tradeSource: fill.tradeSource,
      tradeSourceLabel: fill.tradeSourceLabel || resolveTradeSourceLabel(fill.tradeSource)
    }, "sandbox");
  }

  /** Подпрограмма `recordRealOrderToTradeHistory`. */
  function recordRealOrderToTradeHistory(apiResult, meta) {
    if (!apiResult || !meta) return;
    const lotsReq = Math.max(0, Math.floor(+(meta.lots || 0)));
    const lotsExec = Math.max(0, Math.floor(+(apiResult.lotsExecuted ?? apiResult.lotsRequested ?? lotsReq)));
    const lot = Math.max(1, +meta.lot || 1);
    const price = Number.isFinite(meta.price) ? meta.price : null;
    const notional = Number.isFinite(price) ? lotsExec * lot * price : null;
    upsertTradeHistoryFromOrder(attachTradeSourceFields({
      orderId: apiResult.orderId || meta.orderId,
      ticker: meta.ticker || meta.secForPrice,
      sec: meta.secForPrice,
      direction: meta.direction,
      lotsRequested: lotsReq,
      lotsExecuted: lotsExec,
      orderType: meta.orderType === "limit" ? "ORDER_TYPE_LIMIT" : "ORDER_TYPE_MARKET",
      executionReportStatus: apiResult.executionReportStatus || apiResult.orderState || "EXECUTION_REPORT_STATUS_FILL",
      orderDate: apiResult.orderDate || apiResult.createdAt || new Date().toISOString(),
      fake: false,
      price,
      notional,
      instrumentId: meta.instrumentId,
      market: meta.market
    }, meta.tradeSource, meta.tradeSourceLabel), "real");
  }

  /** Подпрограмма `markTradeHistoryCancelled`. */
  function markTradeHistoryCancelled(orderId) {
    if (!orderId) return;
    const hist = ensureLiveTradeHistory();
    const row = hist.find((h) => h.id === orderId);
    if (row) {
      row.active = false;
      row.status = "снята";
    }
  }

  /** Удалить фейковые записи из журнала сделок (при выходе из песочницы). */
  function purgeSandboxTradeHistory() {
    const hist = ensureLiveTradeHistory();
    state.live.tradeHistory = hist.filter((h) => !h.fake && h.mode !== "sandbox");
  }

  /** Синхронизация UI/state: `syncTradeHistoryFromSources`. */
  function syncTradeHistoryFromSources() {
    if (isLiveSandbox()) {
      const sb = ensureSandboxState();
      rebuildSandboxFromLedger(sb);
      for (const fill of sb.ledger || []) upsertTradeHistoryFromSandboxFill(fill);
      return;
    }
    const brokerOps = state.live.brokerOperations || [];
    for (const op of brokerOps) upsertTradeHistoryFromTbankOperation(op);
    reconcileRealBrokerTradeFinresp(brokerOps);
    for (const o of state.live.orders || []) {
      if (isLiveOrderActive(o)) upsertTradeHistoryFromOrder(o, "real");
    }
  }

  /** Отрисовка элемента live-панели: `renderTradeHistoryRow`. */
  function renderTradeHistoryRow(entry) {
    const star = entry.isBuy
      ? '<span class="trade-star trade-star-buy" title="Покупка">★</span>'
      : '<span class="trade-star trade-star-sell" title="Продажа">☆</span>';
    const dirCls = entry.isBuy ? "dir-buy" : "dir-sell";
    const otype = String(entry.orderType || "").includes("LIMIT") ? "лимит" : "рынок";
    const priceHint = Number.isFinite(entry.price) ? ` @ ${fmt(entry.price, 2)}` : "";
    const sumHint = Number.isFinite(entry.notional) ? ` · ${fmt(entry.notional, 0)} ₽` : "";
    const lotsReq = entry.lotsRequested ?? "—";
    const lotsExec = entry.lotsExecuted ?? "—";
    const when = entry.when ? new Date(entry.when).toLocaleString("ru-RU") : "—";
    const modeLabel = entry.fake
      ? '<span class="trade-mode-fake">фейк</span>'
      : '<span class="trade-mode-real">реал</span>';
    const { buyFee: buyFeeRub, sellFee: sellFeeRub } = tradeHistoryRowFeeColumns(entry);
    const finrespVal = tradeHistoryCloseFinrespExplicit(entry) ?? tradeHistoryFinrespForOrder(entry);
    let finrespCell = "—";
    if (Number.isFinite(finrespVal)) {
      const cls = finrespVal >= 0 ? "trade-finresp-pos" : "trade-finresp-neg";
      finrespCell = `<span class="${cls}">${finrespVal >= 0 ? "+" : ""}${fmt(finrespVal, 2)} ₽</span>`;
    }
    const feeBuyCell = Number.isFinite(buyFeeRub)
      ? `<span style="color:#b45309;font-weight:700">−${fmt(buyFeeRub, 2)} ₽</span>`
      : "—";
    const feeSellCell = Number.isFinite(sellFeeRub)
      ? `<span style="color:#b91c1c;font-weight:700">−${fmt(sellFeeRub, 2)} ₽</span>`
      : "—";
    const rowCls = entry.fake ? "trade-row-fake" : "trade-row-real";
    const activeCls = entry.active ? " trade-row-active" : "";
    const sourceLabel = entry.tradeSourceLabel || "—";
    const sourceTitle = sourceLabel.replace(/"/g, "&quot;");
    const sourceCell = `<td class="trade-source-cell" title="${sourceTitle}">${sourceLabel}</td>`;
    return `<tr class="${rowCls}${activeCls}"><td>${star}</td><td>${entry.ticker}</td><td class="${dirCls}">${entry.isBuy ? "покупка" : "продажа"}</td><td>${otype}${priceHint}${sumHint}</td><td>${lotsReq}/${lotsExec}</td><td>${entry.status}${entry.active ? " · активна" : ""}</td><td>${finrespCell}</td><td>${feeBuyCell}</td><td>${feeSellCell}</td><td>${sourceCell}</td><td>${modeLabel}</td><td>${when}</td></tr>`;
  }

  /** Суммы по закрытиям для строки итогов истории (явная формула FIFO). */
  function computeTradeHistoryCloseTotals(done) {
    let sumFin = 0;
    let sumBuyFee = 0;
    let sumSellFee = 0;
    let sumSale = 0;
    let sumPurchase = 0;
    for (const e of done) {
      const closeKind = tradeHistoryCloseKind(e);
      if (closeKind !== "close_long" && closeKind !== "close_short" && closeKind !== "flip") continue;
      const finresp = tradeHistoryCloseFinrespExplicit(e);
      if (Number.isFinite(finresp)) sumFin += finresp;
      const fees = tradeHistoryRowFeeColumns(e);
      if (Number.isFinite(fees.buyFee)) sumBuyFee += fees.buyFee;
      if (Number.isFinite(fees.sellFee)) sumSellFee += fees.sellFee;
      const amounts = tradeHistoryCloseFifoAmounts(e);
      if (amounts) {
        sumSale += amounts.saleSum;
        sumPurchase += amounts.purchaseSum;
      }
    }
    return {
      sumFin,
      sumBuyFee,
      sumSellFee,
      sumSale,
      sumPurchase,
      portfolioDelta: liveFinResultRub()
    };
  }

  /** Закреплённый футер итогов — вне прокрутки таблицы. */
  function renderTradeHistoryTotalsFooter(totals) {
    const sumFin = totals?.sumFin ?? 0;
    const sumBuyFee = totals?.sumBuyFee ?? 0;
    const sumSellFee = totals?.sumSellFee ?? 0;
    const sumSale = totals?.sumSale ?? 0;
    const sumPurchase = totals?.sumPurchase ?? 0;
    const portDelta = totals?.portfolioDelta;
    const finCls = sumFin > 0 ? "trade-finresp-pos" : sumFin < 0 ? "trade-finresp-neg" : "";
    const finStr = `${sumFin >= 0 ? "+" : ""}${fmt(sumFin, 2)} ₽`;
    const formula = `прод ${fmt(sumSale, 2)} − покуп ${fmt(sumPurchase, 2)} − buy ${fmt(sumBuyFee, 2)} − sell ${fmt(sumSellFee, 2)}`;
    const portStr = Number.isFinite(portDelta)
      ? ` · портфель Δ ${portDelta >= 0 ? "+" : ""}${fmt(portDelta, 2)} ₽`
      : "";
    return `<div class="live-trade-history-totals" role="status" aria-label="Итоги закрытий FIFO" title="FINRESPΔ = Σ продажи − Σ покупки (FIFO) − комиссии buy − sell. Портфель Δ = текущий портфель − старт сессии (включает нереализованное по открытым позициям). FINRESP Σ (модель) вверху — по сигналам расчёта, не по журналу сделок."><span class="live-trade-history-totals-label">Итоги (закрытия FIFO):</span> <span class="live-trade-history-totals-fin ${finCls}">FINRESPΔ ${finStr}</span> <span class="live-trade-history-totals-sep">=</span> <span class="live-trade-history-totals-formula">${formula}</span>${portStr}</div>`;
  }

  /** Отрисовка элемента live-панели: `renderLiveOrdersPanel`. */
  function renderLiveOrdersPanel() {
    const el = $("live-trading-orders");
    const metaEl = $("live-trade-history-meta");
    if (!el) return;
    syncTradeHistoryFromSources();
    const hist = ensureLiveTradeHistory().slice().sort((a, b) => {
      if (!!a.active !== !!b.active) return a.active ? -1 : 1;
      const ta = Date.parse(a.when || 0) || 0;
      const tb = Date.parse(b.when || 0) || 0;
      return tb - ta;
    });
    if (metaEl && isLiveMode()) {
      const nAct = hist.filter((h) => h.active).length;
      const nFake = hist.filter((h) => h.fake).length;
      const nReal = hist.filter((h) => !h.fake).length;
      metaEl.textContent = isLiveSandbox()
        ? `Сделок в журнале: ${hist.length} (фейк ${nFake}, реал ${nReal}${nAct ? `, активных заявок ${nAct}` : ""}). ★ покупка · ☆ продажа · FINRESPΔ = продажи − покупки (FIFO) − комиссии · Источник — робот / ручная / закрытие.`
        : `Сделок в журнале: ${hist.length} (фейк ${nFake}, реал ${nReal}${nAct ? `, активных заявок ${nAct}` : ""}). ★/☆ · FINRESPΔ = продажи − покупки (FIFO) − комиссии (брокер) · позиции до старта сессии — без комиссии покупки в журнале.`;
    }
    const active = hist.filter((h) => h.active);
    const done = hist.filter((h) => !h.active);
    const totalsFooter = renderTradeHistoryTotalsFooter(computeTradeHistoryCloseTotals(done));
    if (!hist.length) {
      const emptyMsg = isLiveSandbox()
        ? "Сделок пока нет. Робот и ручные заявки попадут сюда после исполнения."
        : "Сделок пока нет. После «Начать торговлю» здесь — заявки и исполнения.";
      el.innerHTML = `<div class="live-trading-orders-scroll"><p class="live-trading-orders-empty">${emptyMsg}</p></div>${totalsFooter}`;
      return;
    }
    const activeBlock = active.length
      ? `<tr class="live-trade-history-subhead"><td colspan="12">Текущие заявки (не исполнены полностью)</td></tr>${active.map(renderTradeHistoryRow).join("")}`
      : "";
    const doneBlock = done.length
      ? `${active.length ? '<tr class="live-trade-history-subhead"><td colspan="12">Исполненные и завершённые</td></tr>' : ""}${done.map(renderTradeHistoryRow).join("")}`
      : "";
    const tableHtml = `<table><thead><tr><th></th><th>Тикер</th><th>Сторона</th><th>Тип / сумма</th><th>Лоты</th><th>Статус</th><th>FINRESPΔ</th><th>Комиссия buy</th><th>Комиссия sell</th><th>Источник</th><th>Режим</th><th>Время</th></tr></thead><tbody>${activeBlock}${doneBlock}</tbody></table>`;
    el.innerHTML = `<div class="live-trading-orders-scroll">${tableHtml}</div>${totalsFooter}`;
  }

  /** Карта legId → tradeId открывающей сделки + остатки открытых legs после replay. */
  function buildReplayLegTradeMap() {
    const legToTradeId = new Map();
    const remainingLegs = [];
    if (isLiveSandbox()) {
      const sb = ensureSandboxState();
      rebuildSandboxFromLedger(sb);
      for (const fill of sb.ledger || []) {
        const tradeId = fill.fillId != null ? `fill-${fill.fillId}` : (fill.orderId || null);
        if (!tradeId) continue;
        for (const legId of fill.openLegIds || []) legToTradeId.set(legId, tradeId);
      }
      for (const [key, legs] of (sb.openLegs || new Map()).entries()) {
        for (const leg of legs || []) {
          remainingLegs.push({
            key,
            legId: leg.legId,
            side: leg.side,
            pieces: leg.pieces,
            price: leg.price,
            fee: leg.fee,
            openedAt: leg.openedAt,
            openTradeId: legToTradeId.get(leg.legId) || null
          });
        }
      }
      return { legToTradeId, remainingLegs };
    }
    const enriched = state.live.brokerOperations || [];
    const ctx = createSandboxReplayCtx({ startPortfolio: 0 });
    seedRealBrokerLegCtx(ctx);
    const sorted = enriched.slice().sort(
      (a, b) => (Date.parse(a._histDate || a.date || 0) || 0) - (Date.parse(b._histDate || b.date || 0) || 0)
    );
    const matchMode = sandboxMatchMode();
    for (const op of sorted) {
      const side = op._histSide || tbankOpTradeSide(op);
      if (!side) continue;
      const pieces = Math.abs(Math.trunc(+op.quantity || 0));
      if (!pieces) continue;
      const signedPieces = side === "buy" ? pieces : -pieces;
      const isFuture = String(op.instrumentType || op.instrument_type || "").toLowerCase() === "futures";
      const market = isFuture ? "futures" : "shares";
      const ticker = op._histTicker || String(op.ticker || op.figi || "").toUpperCase();
      const price = Number.isFinite(op._histPrice)
        ? op._histPrice
        : (moneyValueRub(op.price) || moneyValueToNumber(op.price));
      if (!Number.isFinite(price) || price <= 0) continue;
      const posMeta = {
        ticker,
        sec: ticker,
        market,
        instrumentId: op.instrumentUid || op.figi,
        lot: Math.max(1, +op._histLot || 1),
        isFuture
      };
      const meta = applySandboxSignedDelta(ctx, posMeta, signedPieces, price, {
        matchMode,
        skipNotify: true,
        skipClosedJournal: true
      });
      const tradeId = op.id != null ? `real-op-${op.id}` : null;
      if (tradeId && meta?.legIds?.length) {
        for (const legId of meta.legIds) legToTradeId.set(legId, tradeId);
      }
    }
    for (const [key, legs] of (ctx.openLegs || new Map()).entries()) {
      for (const leg of legs || []) {
        remainingLegs.push({
          key,
          legId: leg.legId,
          side: leg.side,
          pieces: leg.pieces,
          price: leg.price,
          fee: leg.fee,
          openedAt: leg.openedAt,
          openTradeId: legToTradeId.get(leg.legId) || null
        });
      }
    }
    return { legToTradeId, remainingLegs };
  }

  /** Одна сделка для JSON-протокола. */
  function tradeHistoryProtocolTradeRow(entry) {
    const fees = tradeHistoryRowFeeColumns(entry);
    const finresp = tradeHistoryCloseFinrespExplicit(entry) ?? tradeHistoryFinrespForOrder(entry);
    return {
      tradeId: entry.id,
      orderId: entry.orderId || null,
      when: entry.when || null,
      ticker: entry.ticker,
      isBuy: !!entry.isBuy,
      side: entry.isBuy ? "buy" : "sell",
      tradeRole: entry.tradeRole || null,
      lotsRequested: entry.lotsRequested ?? null,
      lotsExecuted: entry.lotsExecuted ?? null,
      price: Number.isFinite(entry.price) ? +entry.price : null,
      notional: Number.isFinite(entry.notional) ? +entry.notional : null,
      fee: Number.isFinite(entry.fee) ? +entry.fee : null,
      feeBuyRub: Number.isFinite(fees.buyFee) ? fees.buyFee : null,
      feeSellRub: Number.isFinite(fees.sellFee) ? fees.sellFee : null,
      finrespDelta: Number.isFinite(finresp) ? finresp : null,
      status: entry.status || null,
      active: !!entry.active,
      fake: !!entry.fake,
      mode: entry.mode || (entry.fake ? "sandbox" : "real"),
      tradeSourceLabel: entry.tradeSourceLabel || null,
      brokerYield: Number.isFinite(entry.brokerYield) ? entry.brokerYield : null
    };
  }

  /** FIFO-пакеты закрытия со ссылками на открывающие сделки. */
  function tradeHistoryProtocolClosePacket(entry, legToTradeId) {
    const closeKind = tradeHistoryCloseKind(entry);
    if (closeKind !== "close_long" && closeKind !== "close_short" && closeKind !== "flip") return null;
    const matches = Array.isArray(entry.tradeMatches) ? entry.tradeMatches : [];
    const closePrice = +entry.price || 0;
    const fees = tradeHistoryRowFeeColumns(entry);
    const fifoPackets = matches.map((m) => {
      const qty = Math.max(0, Math.trunc(+m.pieces || 0));
      const openPx = +m.openPrice || 0;
      const closePx = +m.closePrice || closePrice;
      const buyFee = sandboxWeightedOpenLegFeeForMatch(m);
      const isShort = m.side === "short";
      const saleSum = isShort ? openPx * qty : closePx * qty;
      const purchaseSum = isShort ? closePx * qty : openPx * qty;
      return {
        openTradeId: m.legId != null ? (legToTradeId.get(m.legId) || null) : null,
        legId: m.legId ?? null,
        openSide: m.side || null,
        pieces: qty,
        openPrice: openPx,
        closePrice: closePx,
        purchaseSum,
        saleSum,
        buyFeeAllocatedRub: buyFee,
        openedAt: m.openedAt || null
      };
    });
    const amounts = tradeHistoryCloseFifoAmounts(entry);
    const finresp = tradeHistoryCloseFinrespExplicit(entry);
    return {
      closeTradeId: entry.id,
      when: entry.when || null,
      ticker: entry.ticker,
      closeKind,
      closeSide: entry.isBuy ? "buy" : "sell",
      closePrice: Number.isFinite(entry.price) ? +entry.price : null,
      closeNotional: Number.isFinite(entry.notional) ? +entry.notional : null,
      saleSumRub: amounts?.saleSum ?? null,
      purchaseSumRub: amounts?.purchaseSum ?? null,
      feeBuyRub: Number.isFinite(fees.buyFee) ? fees.buyFee : null,
      feeSellRub: Number.isFinite(fees.sellFee) ? fees.sellFee : null,
      finrespDelta: Number.isFinite(finresp) ? finresp : null,
      fifoPackets
    };
  }

  /** Сводка верхнего блока live + формулы расчёта. */
  function tradeHistoryProtocolPortfolioSummary(done) {
    const cash = liveFreeCashRub();
    const mtm = livePositionsMtmRub();
    const portfolio = state.live.portfolioValue;
    const commission = state.live.commissionPaid;
    const modelFin = state.live.modelFinresp;
    const portDelta = liveFinResultRub();
    const closeTotals = computeTradeHistoryCloseTotals(done);
    const base = liveSessionPortfolioBaseline();
    return {
      portfolioValueRub: Number.isFinite(portfolio) ? portfolio : null,
      freeCashRub: Number.isFinite(cash) ? cash : null,
      positionsMtmRub: Number.isFinite(mtm) ? mtm : null,
      commissionPaidRub: Number.isFinite(commission) ? commission : null,
      modelFinrespRub: Number.isFinite(modelFin) ? modelFin : null,
      portfolioDeltaRub: Number.isFinite(portDelta) ? portDelta : null,
      sessionPortfolioBaselineRub: Number.isFinite(base) ? base : null,
      closeTotalsFifo: closeTotals,
      howCalculated: {
        portfolio: "Портфель всего = деньги свободно + стоимость открытых позиций по текущим ценам (cash + MTM).",
        freeCash: isLiveSandbox()
          ? "Деньги свободно (фейк) = старт песочницы − комиссии − покупки + выручка продаж."
          : "Деньги свободно = RUB на счёте T-Bank, не в бумагах.",
        portfolioDelta: "Портфель Δ = текущий портфель − baseline на старт live-сессии.",
        modelFinresp: "FINRESP Σ (модель) = результат расчёта по сигналам логики (блок «Рассчитать»), не журнал сделок.",
        closeFinresp: "FINRESPΔ закрытия = Σ продажи − Σ покупки (FIFO-пакеты) − комиссия buy − комиссия sell.",
        fifoPackets: "Каждое закрытие ссылается на openTradeId покупок/продаж открытия через fifoPackets."
      }
    };
  }

  /** Собрать полный JSON-протокол истории сделок. */
  function buildTradeHistoryProtocol() {
    syncTradeHistoryFromSources();
    const hist = ensureLiveTradeHistory().slice().sort(
      (a, b) => (Date.parse(a.when || 0) || 0) - (Date.parse(b.when || 0) || 0)
    );
    const done = hist.filter((h) => !h.active);
    const { legToTradeId, remainingLegs } = buildReplayLegTradeMap();
    const trades = hist.map(tradeHistoryProtocolTradeRow);
    const closeEvents = done
      .map((e) => tradeHistoryProtocolClosePacket(e, legToTradeId))
      .filter(Boolean);
    const openLotsByKey = new Map();
    for (const leg of remainingLegs) {
      if (!leg.pieces) continue;
      const row = openLotsByKey.get(leg.key) || {
        positionKey: leg.key,
        ticker: leg.key.split(":").pop() || leg.key,
        side: leg.side,
        remainingPieces: 0,
        openTrades: []
      };
      row.remainingPieces += leg.pieces;
      row.openTrades.push({
        openTradeId: leg.openTradeId,
        legId: leg.legId,
        piecesRemaining: leg.pieces,
        openPrice: leg.price,
        openFeeRub: Number.isFinite(leg.fee) ? leg.fee : null,
        openedAt: leg.openedAt || null
      });
      openLotsByKey.set(leg.key, row);
    }
    const legToOpenTradeId = {};
    for (const [legId, tradeId] of legToTradeId.entries()) legToOpenTradeId[String(legId)] = tradeId;
    return {
      format: "multilogic-trade-history-protocol-v1",
      exportedAt: new Date().toISOString(),
      pageVersion: (typeof root.__mlFinrespVersion === "string" ? root.__mlFinrespVersion : null),
      mode: isLiveSandbox() ? "sandbox" : "real",
      session: {
        liveActive: !!state.live.active,
        sandbox: isLiveSandbox(),
        sessionStartedAt: state.live.sessionStartedAt || state.live.chartSession?.startedAt || null,
        tradingStartedAt: state.live.tradingStartedAt || null
      },
      portfolioSummary: tradeHistoryProtocolPortfolioSummary(done),
      legToOpenTradeId,
      trades,
      closeEvents,
      openLots: [...openLotsByKey.values()]
    };
  }

  const PROTOCOL_STORAGE_KEY = "multilogic.trade-protocol.v1";

  /** Собрать автономный HTML-файл протокола (данные встроены, render.js инлайн). */
  async function buildStandaloneProtocolHtml(payload) {
    const dataJson = JSON.stringify(payload).replace(/</g, "\\u003c");
    let renderJs = "";
    try {
      const res = await fetch("MultiLogic_TradeHistoryProtocol.render.js", { cache: "no-store" });
      if (res.ok) renderJs = await res.text();
    } catch (_) { /* file:// или офлайн */ }
    let htmlTpl = "";
    try {
      const res = await fetch("MultiLogic_TradeHistoryProtocol.html", { cache: "no-store" });
      if (res.ok) htmlTpl = await res.text();
    } catch (_) { /* ignore */ }
    if (htmlTpl && renderJs) {
      const dataScript = `<script type="application/json" id="ml-protocol-data">${dataJson}</script>`;
      return htmlTpl.replace(
        '<script src="MultiLogic_TradeHistoryProtocol.render.js"></script>\n<script>MLTradeProtocol.boot();</script>',
        `<script>${renderJs}</script>\n${dataScript}\n<script>MLTradeProtocol.boot();</script>`
      );
    }
    return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>MultiLogic — протокол</title></head><body>
<script type="application/json" id="ml-protocol-data">${dataJson}</script>
<script>${renderJs || "document.body.textContent='render.js unavailable';"}</script>
<script>MLTradeProtocol.boot();</script></body></html>`;
  }

  /** Открыть HTML-протокол и скачать автономный .html-файл. */
  async function exportTradeHistoryProtocolFile() {
    if (!isLiveMode()) return;
    try {
      const payload = buildTradeHistoryProtocol();
      try { sessionStorage.setItem(PROTOCOL_STORAGE_KEY, JSON.stringify(payload)); } catch (_) { /* quota */ }
      window.open("MultiLogic_TradeHistoryProtocol.html", "_blank");
      const day = new Date().toISOString().slice(0, 10);
      const mode = payload.mode || "live";
      const filename = `multilogic_trade_protocol_${mode}_${day}.html`;
      const html = await buildStandaloneProtocolHtml(payload);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      noteLiveTech(
        "live-trade-protocol",
        `saved ${filename}`,
        `trades=${payload.trades?.length ?? 0} closes=${payload.closeEvents?.length ?? 0}`
      );
    } catch (err) {
      noteLiveTech("live-trade-protocol", err.message || String(err));
    }
  }

  /** Кнопка «Сохранить протокол» в шапке истории сделок. */
  function bindTradeHistoryProtocolExport() {
    const btn = $("live-trade-history-save-protocol");
    if (!btn || bindTradeHistoryProtocolExport._bound) return;
    bindTradeHistoryProtocolExport._bound = true;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exportTradeHistoryProtocolFile();
    });
  }

  /** Live-торговля: `liveOrderCancellable`. */
  function liveOrderCancellable(o, sandboxNewest) {
    if (isLiveSandbox()) return !!sandboxNewest && !!o.revertSnap;
    const st = String(o.executionReportStatus || o.orderState || "").toUpperCase();
    if (!st) return true;
    if (st.includes("FILL") && !st.includes("PARTIALLY")) return false;
    if (st.includes("CANCEL") || st.includes("REJECT") || st.includes("REJECTED")) return false;
    return st.includes("NEW") || st.includes("PARTIALLY") || st.includes("PENDING") || st.includes("SUBMIT");
  }
  /** Синхронизация всей live-панели: статус, кнопки, опросы, стакан. */
  function syncLiveTradingUi() {
    const panel = $("live-trading-panel");
    const select = $("account-mode");
    const label = document.querySelector("label.account-mode");
    const isLive = isLiveMode();
    const sandbox = isLiveSandbox();
    if (panel) {
      panel.hidden = !isLive;
      panel.classList.toggle("live-trading-panel--active", isLive && !!state.live.active);
      panel.classList.toggle("live-trading-panel--sandbox", sandbox);
    }
    const warn = panel?.querySelector(".live-trading-warn");
    if (warn) {
      warn.textContent = sandbox
        ? "Песочница (фейк): заявки на биржу не отправляются. Продажа без лонга открывает шорт (маржа). Портфель симулируется от суммы на момент включения; комиссия — по полю Commission %."
        : "Реальные заявки на бирже. Тот же счёт T-Bank и токен с правом торговли (не только чтение). Пароль запрашивается при подключении. При активной торговле свечи обновляются по выбранному источнику (T-Bank — актуальнее MOEX ISS); индикаторы и заявки пересчитываются на каждом цикле.";
    }
    const portfolioLabel = $("live-portfolio-label");
    if (portfolioLabel) {
      portfolioLabel.textContent = `Портфель всего (деньги + поз.), ${RUB_SIGN}`;
    }
    const freeCashLabel = $("live-free-cash-label");
    if (freeCashLabel) {
      freeCashLabel.textContent = sandbox
        ? `Деньги, свободно (фейк), ${RUB_SIGN}`
        : `Деньги, свободно, ${RUB_SIGN}`;
    }
    const commissionLabel = $("live-commission-label");
    if (commissionLabel) {
      commissionLabel.textContent = sandbox
        ? `Комиссии (фейк, модель %), ${RUB_SIGN}`
        : `Комиссии уплачено (реально), ${RUB_SIGN}`;
    }
    if (select) select.classList.toggle("account-mode-select--live", isLive);
    if (label) label.classList.toggle("account-mode--live", isLive);
    const toggle = $("live-trading-toggle");
    if (toggle) {
      toggle.textContent = state.live.active ? "Остановить торговлю" : "Начать торговлю";
      toggle.classList.toggle("live-trading-toggle--active", state.live.active);
      toggle.disabled = !isLive || state.uiBusy;
    }
    const sellAll = $("live-trading-sell-all");
    if (sellAll) sellAll.disabled = !isLive || state.uiBusy || state.live.tradingActionBusy;
    syncPageVersionBadge();
    const status = $("live-trading-status");
    if (status) {
      if (state.live.lastError && isLive) {
        const warnOnly = (state.live.lastError.startsWith("пропущено")
          || state.live.lastError.startsWith("FINRESP пустой")
          || state.live.lastError.startsWith("Нет сигнала")
          || state.live.lastError.startsWith("Сигнал по"))
          && !state.live.lastError.includes("ошибки заявок");
        status.textContent = `${warnOnly ? "внимание" : "ошибка"}: ${state.live.lastError}`;
      }
      else if (state.live.active) {
        const boot = state.live.candleRefreshBusy
          || state.live.finrespBootstrapProgress
          || (isLiveFinrespBootstrapPending() && !liveHasAnyCandles());
        if (boot) {
          const src = liveCandleSourceEffectiveLabel();
          const prog = state.live.finrespBootstrapProgress;
          const progHint = prog ? ` ${prog.done}/${prog.total}` : "";
          status.textContent = `подготовка: свечи ${src} и FINRESP${progHint}…`;
        } else {
          const { calcEnd, freshest } = liveMoexBarTimes(state.packs);
          const bar = formatMoexBarTime(calcEnd || state.live.lastCandleBarTime);
          const freshHint = freshest && calcEnd && freshest > calcEnd
            ? ` (самый свежий тикер ${formatMoexBarTime(freshest)})`
            : "";
          const polled = formatLiveRefreshClock(state.live.lastCandleRefreshAt);
          const src = liveCandleSourceEffectiveLabel();
          const busy = state.live.candleRefreshBusy ? " · обновление свечей…" : "";
          const sandboxHint = sandbox ? " · песочница (фейк)" : "";
          status.textContent =
            `торговля активна${sandboxHint} · источник ${src} · бары до ${bar}${freshHint} · опрос ${polled}${busy}`;
        }
      } else {
        const src = liveCandleSourceEffectiveLabel();
        status.textContent = sandbox
          ? `остановлена · песочница (фейк) · источник ${src}`
          : `остановлена · источник ${src}`;
      }
    }
    syncLiveCandleSourceUi(isLive);
    syncLiveCandleDelayUi(isLive);
    renderLivePortfolioStats();
    syncLeverageDisplay();
    renderLiveOrdersPanel();
    renderLivePositionsPanel();
    syncLiveManualOrderUi();
    if (isLive) {
      bindLivePanelCollapsibleToggles();
      bindTradeHistoryProtocolExport();
    }
  }

  /** Остановка периодического опроса: `stopLiveTradingPoll`. */
  function stopLiveTradingPoll() {
    stopLiveModePoll();
  }

  /** Остановка периодического опроса: `stopLiveStatsPoll`. */
  function stopLiveStatsPoll() {
    if (state.live.statsTimer) clearInterval(state.live.statsTimer);
    state.live.statsTimer = null;
  }

  /** Запуск периодического опроса: `startLiveStatsPoll`. */
  function startLiveStatsPoll() {
    stopLiveStatsPoll();
    state.live.statsTimer = setInterval(() => {
      if (!isLiveMode()) {
        stopLiveStatsPoll();
        return;
      }
      refreshLivePortfolioStats();
    }, 8000);
  }

  /** Остановка периодического опроса: `stopLiveTradingOnModeChange`. */
  function stopLiveTradingOnModeChange() {
    state.live.active = false;
    endLiveChartSession();
    stopLiveStatsPoll();
    stopLiveOrderBookPoll();
    stopLivePositionsPoll();
    syncLiveTradingUi();
  }

  const LIVE_ORDER_BOOK_DEPTH = 10;
  const LIVE_ORDER_BOOK_POLL_MS = 4000;

  /** Заявка/ордер: `orderBookPrice`. */
  function orderBookPrice(q) {
    if (!q) return NaN;
    return (+q.units || 0) + (+q.nano || 0) / 1e9;
  }

  /** Форматирование для отображения: `formatOrderBookTime`. */
  function formatOrderBookTime(ts) {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch (_) {
      return "—";
    }
  }

  /** Установка значения: `setLiveOrderBookStats`. */
  function setLiveOrderBookStats(text) {
    const statsEl = $("live-order-book-stats");
    if (statsEl) statsEl.textContent = text || "—";
  }

  /** Отрисовка элемента live-панели: `renderLiveOrderBookView`. */
  function renderLiveOrderBookView(ob) {
    const tableEl = $("live-order-book-table");
    if (!tableEl) return;
    if (!ob) {
      tableEl.innerHTML = '<p class="live-order-book-empty">—</p>';
      return;
    }
    const bids = (ob.bids || []).slice().sort((a, b) => orderBookPrice(b.price) - orderBookPrice(a.price));
    const asks = (ob.asks || []).slice().sort((a, b) => orderBookPrice(a.price) - orderBookPrice(b.price));
    const depth = ob.depth || bids.length || asks.length || LIVE_ORDER_BOOK_DEPTH;
    const ts = formatOrderBookTime(ob.orderbookTs || ob.time);
    const spread = bids.length && asks.length
      ? orderBookPrice(asks[0].price) - orderBookPrice(bids[0].price)
      : NaN;
    const spreadTxt = Number.isFinite(spread) ? ` · спред ${fmt(spread, 2)}` : "";
    setLiveOrderBookStats(`глубина ${depth} · ${ts}${spreadTxt}`);
    const rows = Math.max(bids.length, asks.length, 1);
    let html = '<table class="live-ob-grid"><thead><tr><th colspan="2">Покупка (bid)</th><th colspan="2">Продажа (ask)</th></tr>'
      + '<tr><th>лоты</th><th>цена</th><th>цена</th><th>лоты</th></tr></thead><tbody>';
    const pickCell = (side, price, lots, cls, text) => {
      if (!Number.isFinite(price) || price <= 0) return `<td class="${cls}"></td>`;
      const isPrice = cls === "ob-bid-p" || cls === "ob-ask-p";
      const title = side === "sell"
        ? "Двойной клик — лимитная заявка на продажу"
        : "Двойной клик — лимитная заявка на покупку";
      const pickCls = isPrice ? " live-ob-pick live-ob-price-pick" : "";
      return `<td class="${cls}${pickCls}" data-side="${side}" data-price="${price}" data-lots="${lots ?? ""}" title="${isPrice ? title : ""}">${text}</td>`;
    };
    for (let i = 0; i < rows; i++) {
      const bid = bids[i];
      const ask = asks[i];
      const bidPrice = bid ? orderBookPrice(bid.price) : NaN;
      const askPrice = ask ? orderBookPrice(ask.price) : NaN;
      html += `<tr>
        ${pickCell("buy", bidPrice, bid?.quantity, "ob-bid-q", bid?.quantity ?? "")}
        ${pickCell("buy", bidPrice, bid?.quantity, "ob-bid-p", bid ? fmt(bidPrice, 2) : "")}
        ${pickCell("sell", askPrice, ask?.quantity, "ob-ask-p", ask ? fmt(askPrice, 2) : "")}
        ${pickCell("sell", askPrice, ask?.quantity, "ob-ask-q", ask?.quantity ?? "")}
      </tr>`;
    }
    html += "</tbody></table>";
    tableEl.innerHTML = html;
  }

  /** Остановка периодического опроса: `stopLiveOrderBookPoll`. */
  function stopLiveOrderBookPoll() {
    if (state.live.orderBookTimer) clearInterval(state.live.orderBookTimer);
    state.live.orderBookTimer = null;
  }

  /** Обновление данных с источника: `refreshLiveOrderBook`. */
  async function refreshLiveOrderBook() {
    const panel = $("live-order-book-panel");
    if (!panel?.open || !isLiveMode()) return;
    if (state.live.orderBookBusy) return;
    const picked = parseLiveManualInstrumentKey($("live-order-book-sec")?.value);
    if (!picked?.sec) {
      renderLiveOrderBookView(null);
      setLiveOrderBookStats("выберите инструмент в списке слева");
      return;
    }
    state.live.orderBookBusy = true;
    try {
      if (!(await ensureTbankTokenUnlocked())) {
        setLiveOrderBookStats("расшифруйте токен T-Bank");
        return;
      }
      const ti = await tbankFindInstrument(picked.sec, picked.market);
      if (!ti) throw new Error(`${picked.sec}: не найден в T-Bank`);
      const instrumentId = ti.uid || ti.figi;
      const ob = await getBroker().getOrderBook(instrumentId, LIVE_ORDER_BOOK_DEPTH);
      renderLiveOrderBookView(ob);
    } catch (err) {
      renderLiveOrderBookView(null);
      const msg = err?.message || String(err);
      setLiveOrderBookStats(`ошибка: ${msg}`);
      noteLiveTech("live-orderbook", msg, `sec=${picked.sec}`);
    } finally {
      state.live.orderBookBusy = false;
    }
  }

  /** Запуск периодического опроса: `startLiveOrderBookPoll`. */
  function startLiveOrderBookPoll() {
    stopLiveOrderBookPoll();
    const panel = $("live-order-book-panel");
    if (!panel?.open || !isLiveMode()) return;
    refreshLiveOrderBook();
    state.live.orderBookTimer = setInterval(() => {
      if (!isLiveMode() || !$("live-order-book-panel")?.open) {
        stopLiveOrderBookPoll();
        return;
      }
      refreshLiveOrderBook();
    }, LIVE_ORDER_BOOK_POLL_MS);
  }

  const LIVE_POSITIONS_POLL_MS = 6000;

  /** Подпрограмма `quotationToNumber`. */
  function quotationToNumber(q) {
    if (q == null) return NaN;
    if (typeof q === "number") return q;
    return (+q.units || 0) + (+q.nano || 0) / 1e9;
  }

  function tbankOrderPriceType(meta, marketHint) {
    return getBroker().orderPriceType(meta, marketHint);
  }

  function tbankPostOrderTypeEnum(orderType, market) {
    return getBroker().postOrderTypeEnum(orderType, market);
  }

  function isTbankPostOrderRetryAsLimitError(err) {
    return getBroker().isPostOrderRetryAsLimitError(err);
  }

  function tbankRoundPriceToIncrement(price, meta) {
    return getBroker().roundPriceToIncrement(price, meta);
  }

  /** Проверка булева условия: `isLiveSessionOpenPosition`. */
  function isLiveSessionOpenPosition(ticker, pieces, lot) {
    if (!pieces) return false;
    const baseline = state.live.sessionPositionBaseline;
    if (!baseline) return true;
    const basePieces = baseline.get(ticker)?.pieces ?? 0;
    const lotSize = Math.max(1, +lot || 1);
    return Math.abs(pieces - basePieces) >= lotSize * 0.45;
  }

  /** Подпрограмма `portByIdFromPortfolio`. */
  function portByIdFromPortfolio(portData) {
    const portById = new Map();
    for (const p of portData?.positions || []) {
      const id = p.instrumentUid || p.figi;
      if (id) portById.set(id, p);
    }
    return portById;
  }

  /** Вклад позиции в портфель, ₽: лонг +, шорт − (не вся стоимость портфеля). */
  function positionExposureRub(pos) {
    if (!pos) return NaN;
    const px = pos.curPrice ?? pos.avgPrice;
    if (!Number.isFinite(px)) return NaN;
    const pieces = Math.abs(+pos.pieces || 0);
    if (!pieces) return 0;
    const sign = pos.side === "short" ? -1 : 1;
    return sign * pieces * px;
  }

  /** Ненулевой остаток на счёте (T-Bank balance или фейk pieces). */
  function isLiveOpenPositionBalance(pieces, lotSize) {
    const p = Math.abs(+pieces || 0);
    if (p <= 0) return false;
    const lot = Math.max(1, +lotSize || 1);
    return p >= lot * 0.45;
  }

  /** Подпрограмма `filterLiveOpenPositionRows`. */
  function filterLiveOpenPositionRows(rows) {
    return (rows || []).filter((r) => isLiveOpenPositionBalance(r.pieces, r.lot));
  }

  /** Строки открытых поз T-Bank; sessionOnly — только изменения с начала live-сессии (для таблицы). */
  async function buildTbankPositionRows(portData, posData, options) {
    const opts = options || {};
    const sessionOnly = !!opts.sessionOnly;
    const portById = portByIdFromPortfolio(portData);
    const rows = [];
    const ingest = async (items, isFuture) => {
      for (const p of items || []) {
        const pieces = +p.balance || 0;
        let lot = Math.max(1, +p.lot || 1);
        if (!isLiveOpenPositionBalance(pieces, lot)) continue;
        const instrumentId = p.instrumentUid || p.figi;
        let meta = null;
        try {
          meta = await tbankGetInstrumentById(instrumentId);
        } catch (_) { /* keep partial row */ }
        if (meta?.lot) lot = Math.max(1, +meta.lot);
        if (!isLiveOpenPositionBalance(pieces, lot)) continue;
        const ticker = String(meta?.ticker || p.ticker || instrumentId).toUpperCase();
        if (sessionOnly && !isLiveSessionOpenPosition(ticker, pieces, lot)) continue;
        const port = portById.get(instrumentId);
        const avgPrice = moneyValueToNumber(port?.averagePositionPrice || port?.averagePositionPriceFifo);
        const curPrice = moneyValueToNumber(port?.currentPrice);
        const pnl = quotationToNumber(port?.expectedYield);
        const lots = isFuture ? Math.abs(Math.round(pieces)) : piecesToLots(pieces, lot);
        const side = pieces > 0 ? "long" : "short";
        const absPieces = Math.abs(pieces);
        const sum = positionExposureRub({ side, pieces: absPieces, curPrice, avgPrice: curPrice });
        const market = isFuture ? "futures" : "shares";
        rows.push({
          ticker,
          side,
          lots,
          pieces: absPieces,
          lot,
          avgPrice,
          curPrice,
          sum,
          pnl,
          isFuture,
          instrumentId,
          market,
          sec: ticker
        });
      }
    };
    await ingest(posData?.securities, false);
    await ingest(posData?.futures, true);
    rows.sort((a, b) => a.ticker.localeCompare(b.ticker, "ru"));
    return rows;
  }

  /** Подпрограмма `candlePriceForPosition`. */
  function candlePriceForPosition(pos) {
    const fromPack = packLastClose(pos.sec, pos.market);
    if (Number.isFinite(fromPack) && fromPack > 0) return fromPack;
    const cur = pos.curPrice;
    return Number.isFinite(cur) && cur > 0 ? cur : null;
  }

  /** Применение настроек/результата: `applyMarketPriceToPosition`. */
  function applyMarketPriceToPosition(pos, cur) {
    if (!Number.isFinite(cur) || cur <= 0) return;
    pos.curPrice = cur;
    pos.sum = Math.abs(pos.pieces || 0) * cur;
  }

  /** Синхронизация UI/state: `syncSessionPositionPricesFromPortfolio`. */
  function syncSessionPositionPricesFromPortfolio() {
    const byTicker = new Map((state.live.portfolioPositions || []).map((p) => [p.ticker, p]));
    for (const row of state.live.openPositions || []) {
      const ref = byTicker.get(row.ticker);
      if (ref && Number.isFinite(ref.curPrice)) {
        row.curPrice = ref.curPrice;
        row.sum = ref.sum;
      } else {
        applyMarketPriceToPosition(row, candlePriceForPosition(row));
      }
    }
  }

  /** Портфель = свободный cash (RUB) + рыночная стоимость всех открытых поз (цена — последняя свеча). */
  async function recalcLivePortfolioMtmFromCandles() {
    if (!isLiveMode()) return;
    if (isLiveSandbox()) {
      await updateSandboxPortfolioDisplay();
      return;
    }
    const cash = state.live.freeCashRub;
    const positions = state.live.portfolioPositions || [];
    if (!Number.isFinite(cash)) {
      if (Number.isFinite(state.live.realPortfolioValue)) {
        state.live.portfolioValue = state.live.realPortfolioValue;
        renderLivePortfolioStats();
      }
      return;
    }
    let mtm = 0;
    for (const pos of positions) {
      let cur = candlePriceForPosition(pos);
      if (!Number.isFinite(cur)) {
        try {
          cur = await resolveOrderPrice(pos.instrumentId, pos.sec, pos.market);
        } catch (_) { /* optional */ }
      }
      if (!Number.isFinite(cur) || cur <= 0) continue;
      const sign = pos.side === "short" ? -1 : 1;
      mtm += sign * Math.abs(pos.pieces || 0) * cur;
      applyMarketPriceToPosition(pos, cur);
    }
    state.live.positionsMtmRub = mtm;
    state.live.portfolioValue = cash + mtm;
    syncSessionPositionPricesFromPortfolio();
    renderLivePortfolioStats();
    if ($("live-positions-panel")?.open) renderLivePositionsPanel();
    queueLiveChartsRefresh();
  }

  /** Отрисовка элемента live-панели: `renderLivePositionsPanel`. */
  function renderLivePositionsPanel() {
    hideLivePositionsMenu();
    const tableEl = $("live-positions-table");
    const metaEl = $("live-positions-meta");
    if (!tableEl) return;
    if (!isLiveMode()) {
      tableEl.innerHTML = '<p class="live-order-book-empty">Доступно в режиме live.</p>';
      if (metaEl) metaEl.textContent = "Нереализованные позиции счёта. Закрытые (реализованные) не показываются.";
      return;
    }
    if (isLiveSandbox()) {
      const sb = ensureSandboxState();
      if (metaEl) {
        metaEl.textContent = "Нереализованные фейк-позиции. Закрытые из списка убираются. «Сумма, ₽» — вклад в портфель, не «Портфель всего».";
      }
      const openRows = filterLiveOpenPositionRows([...sb.open.values()]);
      if (!openRows.length) {
        state.live.openPositions = [];
        tableEl.textContent = "";
        tableEl.innerHTML = '<p class="live-order-book-empty">Нереализованных фейк-позиций нет.</p>';
        return;
      }
      let totalExp = 0;
      let openIdx = 0;
      const openBody = openRows.map((r) => {
        const idx = openIdx++;
        const sideCls = r.side === "short" ? "pos-short" : "pos-long";
        const sideLabel = r.side === "short" ? "шорт" : "лонг";
        const pnl = r.side === "short"
          ? (r.avgPrice - (r.curPrice ?? r.avgPrice)) * r.pieces
          : ((r.curPrice ?? r.avgPrice) - r.avgPrice) * r.pieces;
        const pnlCls = pnl > 0 ? "pos-pnl-pos" : (pnl < 0 ? "pos-pnl-neg" : "");
        const sum = positionExposureRub(r);
        if (Number.isFinite(sum)) totalExp += sum;
        const signedLots = signedSandboxLots(r);
        const closeLbl = closeAtMarketLabelForPosition(r);
        const closeBtn = `<button type="button" class="live-order-cancel-btn" data-pos-close="${idx}" title="Закрыть фейк-позицию по рынку">${closeLbl}</button>`;
        return `<tr class="live-pos-row" data-pos-idx="${idx}" title="ПКМ — закрыть фейк-позицию">
          <td>${r.ticker}<span class="pos-fake-tag">(фейк)</span></td>
          <td class="${sideCls}">${sideLabel}</td>
          <td>${signedLots}</td>
          <td>${Number.isFinite(r.avgPrice) ? fmt(r.avgPrice, 2) : "—"}</td>
          <td>${Number.isFinite(r.curPrice) ? fmt(r.curPrice, 2) : "—"}</td>
          <td>${Number.isFinite(sum) ? fmt(sum, 0) : "—"}</td>
          <td class="${pnlCls}">${Number.isFinite(pnl) ? `${pnl >= 0 ? "+" : ""}${fmt(pnl, 0)}` : "—"}</td>
          <td class="live-order-col-cancel">${closeBtn}</td>
        </tr>`;
      }).join("");
      const foot = Number.isFinite(totalExp)
        ? `<tfoot><tr><th colspan="5">Итого нереализованные</th><th>${fmt(totalExp, 0)}</th><th colspan="2"></th></tr></tfoot>`
        : "";
      state.live.openPositions = openRows;
      tableEl.textContent = "";
      tableEl.innerHTML = `<table class="live-ob-grid"><thead><tr>
        <th>Тикер</th><th>Сторона</th><th>Лоты</th><th>Ср. цена</th><th>Тек. цена</th><th title="Вклад в портфель, ₽">Сумма, ₽</th><th>P/L, ₽</th><th class="live-order-col-cancel">Действие</th>
      </tr></thead><tbody>${openBody}</tbody>${foot}</table>`;
      return;
    }
    if (state.live.positionsError) {
      if (metaEl) metaEl.textContent = `Ошибка: ${state.live.positionsError}`;
    } else if (metaEl) {
      if (state.live.positionsUpdatedAt) {
        const ts = new Date(state.live.positionsUpdatedAt).toLocaleTimeString("ru-RU", {
          hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
        metaEl.textContent = `Обновлено ${ts} · нереализованные остатки на счёте T-Bank`;
      } else {
        metaEl.textContent = "Нереализованные остатки на счёте T-Bank. Реализованные (закрытые) не показываются.";
      }
    }
    const rows = filterLiveOpenPositionRows(state.live.openPositions || []);
    if (!rows.length) {
      tableEl.innerHTML = '<p class="live-order-book-empty">Нереализованных позиций нет.</p>';
      return;
    }
    let totalSum = 0;
    let totalPnl = 0;
    const body = rows.map((r, idx) => {
      const sideCls = r.side === "short" ? "pos-short" : "pos-long";
      const sideLabel = r.side === "short" ? "шорт" : (r.side === "long" ? "лонг" : "лонг");
      const pnlCls = r.pnl > 0 ? "pos-pnl-pos" : (r.pnl < 0 ? "pos-pnl-neg" : "");
      if (Number.isFinite(r.sum)) totalSum += r.sum;
      if (Number.isFinite(r.pnl)) totalPnl += r.pnl;
      const closeLbl = closeAtMarketLabelForPosition(r);
      const closeBtn = `<button type="button" class="live-order-cancel-btn" data-pos-close="${idx}" title="Закрыть позицию по рынку">${closeLbl}</button>`;
      return `<tr class="live-pos-row" data-pos-idx="${idx}" title="ПКМ — закрыть позицию">
        <td>${r.ticker}</td>
        <td class="${sideCls}">${sideLabel}</td>
        <td>${r.lots}</td>
        <td>${Number.isFinite(r.avgPrice) ? fmt(r.avgPrice, 2) : "—"}</td>
        <td>${Number.isFinite(r.curPrice) ? fmt(r.curPrice, 2) : "—"}</td>
        <td>${Number.isFinite(r.sum) ? fmt(r.sum, 0) : "—"}</td>
        <td class="${pnlCls}">${Number.isFinite(r.pnl) ? `${r.pnl >= 0 ? "+" : ""}${fmt(r.pnl, 0)}` : "—"}</td>
        <td class="live-order-col-cancel">${closeBtn}</td>
      </tr>`;
    }).join("");
    const foot = (Number.isFinite(totalSum) || Number.isFinite(totalPnl))
      ? `<tfoot><tr><th colspan="5">Итого нереализованные</th><th>${Number.isFinite(totalSum) ? fmt(totalSum, 0) : "—"}</th>`
        + `<th class="${totalPnl >= 0 ? "pos-pnl-pos" : "pos-pnl-neg"}">${Number.isFinite(totalPnl) ? `${totalPnl >= 0 ? "+" : ""}${fmt(totalPnl, 0)}` : "—"}</th><th></th></tr></tfoot>`
      : "";
    tableEl.textContent = "";
    tableEl.innerHTML = `<table class="live-ob-grid"><thead><tr>
      <th>Тикер</th><th>Сторона</th><th>Лоты</th><th>Ср. цена</th><th>Тек. цена</th><th>Сумма, ₽</th><th>P/L, ₽</th><th class="live-order-col-cancel">Действие</th>
    </tr></thead><tbody>${body}</tbody>${foot}</table>`;
  }

  /** Закрытие позиции/заявки: `closeDirectionForPosition`. */
  function closeDirectionForPosition(row) {
    if (!row) return null;
    return row.side === "short" ? "ORDER_DIRECTION_BUY" : "ORDER_DIRECTION_SELL";
  }

  /** Разрешение id/метаданных: `resolveLivePositionInstrumentKey`. */
  function resolveLivePositionInstrumentKey(row) {
    if (!row) return "";
    const market = row.market || (row.isFuture ? "futures" : "shares");
    const sec = row.sec || row.ticker;
    return `${market}:${sec}`;
  }

  /** Скрытие UI: `hideLivePositionsMenu`. */
  function hideLivePositionsMenu() {
    const menu = $("live-positions-menu");
    if (!menu) return;
    menu.classList.remove("open");
    menu.hidden = true;
    state.live.positionsMenuIdx = null;
  }

  /** Показ UI/уведомления: `showLivePositionsMenu`. */
  function showLivePositionsMenu(clientX, clientY, idx) {
    const menu = $("live-positions-menu");
    const row = state.live.openPositions?.[idx];
    if (!menu || !row) return;
    state.live.positionsMenuIdx = idx;
    menu.hidden = false;
    menu.classList.add("open");
    const pad = 6;
    menu.style.left = `${clientX}px`;
    menu.style.top = `${clientY}px`;
    const rect = menu.getBoundingClientRect();
    let x = clientX;
    let y = clientY;
    if (rect.right > window.innerWidth) x = Math.max(pad, window.innerWidth - rect.width - pad);
    if (rect.bottom > window.innerHeight) y = Math.max(pad, window.innerHeight - rect.height - pad);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }

  /** Получение значения: `getLivePositionMenuRow`. */
  function getLivePositionMenuRow() {
    const idx = state.live.positionsMenuIdx;
    if (idx == null) return null;
    return state.live.openPositions?.[idx] || null;
  }

  /** Закрыть позицию по рынку (sandbox или T-Bank). */
  async function closeLivePositionAtMarket(row) {
    if (!row || !isLiveMode()) return;
    const metaEl = $("live-positions-meta");
    const sandbox = isLiveSandbox();
    try {
      if (!sandbox && !(await ensureTbankTokenUnlocked())) throw new Error("Расшифруйте токен T-Bank.");
      if (!sandbox) {
        if (!state.tbank.selectedAccountId) await loadTbankAccounts();
        if (!state.tbank.selectedAccountId) throw new Error("Счёт T-Bank не выбран.");
      }
      const direction = closeDirectionForPosition(row);
      const lots = positionClosingLots(row);
      if (lots <= 0) throw new Error("Нет лотов для закрытия.");
      const instrumentId = row.instrumentId;
      if (!instrumentId) throw new Error("Нет идентификатора инструмента.");
      const sec = row.sec || row.ticker;
      if (!sandbox) {
        let meta = null;
        try { meta = await tbankGetInstrumentById(instrumentId); } catch (_) { /* optional */ }
        const tradable = await tbankValidateTradable(instrumentId, meta, "market");
        if (!tradable.ok) throw new Error(`${row.ticker}: ${tradable.reason}`);
      }
      const sideLabel = direction === "ORDER_DIRECTION_BUY" ? "покупка" : "продажа";
      if (metaEl) metaEl.textContent = `Закрытие ${row.ticker}: ${sideLabel}, ${lots} лот по рынку…`;
      if (sandbox) {
        await closeSandboxPositionAtMarket(row);
        await updateSandboxPortfolioDisplay({ skipCharts: true, fetchPrices: false });
        syncSandboxPositionsTable();
        renderLiveOrdersPanel();
      } else {
        await postLiveOrder(instrumentId, direction, lots, sec, { orderType: "market", market: row.market, tradeSource: "close-position" });
        await refreshLiveOpenPositions({ force: true });
        await new Promise((r) => setTimeout(r, 900));
        await refreshLiveOpenPositions({ force: true });
        await refreshLiveOrders();
        await refreshLivePortfolioStats();
      }
      const okText = sandbox
        ? `Фейк-позиция закрыта по рынку: ${row.ticker}, ${sideLabel}, ${lots} лот.`
        : `Закрыто по рынку: ${row.ticker}, ${sideLabel}, ${lots} лот.`;
      noteLiveTech("live-pos-close", okText, `uid=${instrumentId}`);
      state.live.lastError = "";
      syncLiveTradingUi();
    } catch (err) {
      const msg = err?.message || String(err);
      state.live.lastError = msg;
      noteLiveTech("live-pos-close", msg);
      if (metaEl) metaEl.textContent = `Ошибка закрытия: ${msg}`;
      syncLiveTradingUi();
    }
  }

  /** Заполнение select/списка: `fillManualOrderFromPosition`. */
  function fillManualOrderFromPosition(row) {
    if (!row) return;
    const key = resolveLivePositionInstrumentKey(row);
    const closeSide = row.side === "short" ? "buy" : "sell";
    const price = row.curPrice;
    const panel = $("live-manual-order-panel");
    if (panel) panel.open = true;
    syncCollapsibleToggleLabel("live-manual-order-panel", "live-manual-order-toggle");
    syncLiveManualOrderUi();
    const manualSel = $("live-manual-sec");
    fillLiveTradingInstrumentSelects();
    if (manualSel) {
      if ([...manualSel.options].some((o) => o.value === key)) {
        manualSel.value = key;
      } else {
        const o = document.createElement("option");
        o.value = key;
        o.textContent = row.isFuture ? `${row.ticker} (фьюч)` : row.ticker;
        manualSel.appendChild(o);
        manualSel.value = key;
      }
    }
    $("live-manual-direction").value = closeSide;
    $("live-manual-order-type").value = "limit";
    const priceWrap = $("live-manual-price-wrap");
    if (priceWrap) priceWrap.hidden = false;
    if (Number.isFinite(price) && price > 0) $("live-manual-price").value = String(price);
    state.live.manualPriceSec = key;
    $("live-manual-qty").value = String(Math.max(1, Math.floor(+row.lots || 1)));
    saveConfig();
    const statusEl = $("live-manual-order-status");
    const sideLabel = closeSide === "sell" ? "продажа" : "покупка";
    if (statusEl) {
      statusEl.textContent = `Закрытие позиции: ${row.ticker}, ${sideLabel}, лимит ${Number.isFinite(price) ? fmt(price, 2) : "—"} ₽, ${row.lots} лот. Нажмите «Выставить заявку».`;
    }
    panel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  let livePosLongPressTimer = null;

  /** Обработчик события UI: `onLivePositionsTableContextMenu`. */
  function onLivePositionsTableContextMenu(ev) {
    const tr = ev.target?.closest?.(".live-pos-row");
    if (!tr || !isLiveMode()) return;
    ev.preventDefault();
    const idx = +tr.dataset.posIdx;
    if (!Number.isFinite(idx)) return;
    showLivePositionsMenu(ev.clientX, ev.clientY, idx);
  }

  /** Обработчик события UI: `onLivePositionsPointerDown`. */
  function onLivePositionsPointerDown(ev) {
    const tr = ev.target?.closest?.(".live-pos-row");
    if (!tr || !isLiveMode() || ev.button !== 0) return;
    clearTimeout(livePosLongPressTimer);
    livePosLongPressTimer = setTimeout(() => {
      const idx = +tr.dataset.posIdx;
      if (!Number.isFinite(idx)) return;
      const rect = tr.getBoundingClientRect();
      showLivePositionsMenu(rect.left + rect.width / 2, rect.top + rect.height / 2, idx);
    }, 550);
  }

  /** Обработчик события UI: `onLivePositionsPointerEnd`. */
  function onLivePositionsPointerEnd() {
    clearTimeout(livePosLongPressTimer);
    livePosLongPressTimer = null;
  }

  /** Обработчик события UI: `onLivePositionsMenuAction`. */
  function onLivePositionsMenuAction(action) {
    const row = getLivePositionMenuRow();
    hideLivePositionsMenu();
    if (!row) return;
    if (action === "market") closeLivePositionAtMarket(row);
    else if (action === "limit") fillManualOrderFromPosition(row);
  }

  /** Остановка периодического опроса: `stopLivePositionsPoll`. */
  function stopLivePositionsPoll() {
    if (state.live.positionsTimer) clearInterval(state.live.positionsTimer);
    state.live.positionsTimer = null;
  }

  /** Обновление данных с источника: `refreshLiveOpenPositions`. */
  async function refreshLiveOpenPositions(opts) {
    const options = opts || {};
    if (state.live.tradingActionBusy && !options.force) return;
    if (!isLiveMode()) {
      state.live.openPositions = [];
      state.live.positionsError = "";
      renderLivePositionsPanel();
      return;
    }
    if (isLiveSandbox()) {
      state.live.positionsError = "";
      await updateSandboxPortfolioDisplay();
      renderLivePositionsPanel();
      return;
    }
    if (!state.tbank.token || !state.tbank.selectedAccountId) {
      renderLivePositionsPanel();
      return;
    }
    if (state.live.positionsBusy) return;
    state.live.positionsBusy = true;
    state.live.positionsError = "";
    try {
      if (!(await ensureTbankTokenUnlocked())) {
        state.live.positionsError = "Расшифруйте токен T-Bank.";
        return;
      }
      const accountId = state.tbank.selectedAccountId;
      const [portData, posData] = await Promise.all([
        tbankRequest("OperationsService/GetPortfolio", { accountId, currency: "RUB" }),
        tbankRequest("OperationsService/GetPositions", { accountId })
      ]);
      const rows = await buildTbankPositionRows(portData, posData, { sessionOnly: false });
      state.live.openPositions = filterLiveOpenPositionRows(rows);
      state.live.positionsUpdatedAt = Date.now();
    } catch (err) {
      state.live.openPositions = [];
      state.live.positionsError = err?.message || String(err);
      noteLiveTech("live-positions", state.live.positionsError, `account=${state.tbank.selectedAccountId || "—"}`);
    } finally {
      state.live.positionsBusy = false;
      renderLivePositionsPanel();
    }
  }

  /** Запуск периодического опроса: `startLivePositionsPoll`. */
  function startLivePositionsPoll() {
    stopLivePositionsPoll();
    const panel = $("live-positions-panel");
    if (!panel?.open || !isLiveMode()) return;
    refreshLiveOpenPositions();
    state.live.positionsTimer = setInterval(() => {
      if (!isLiveMode() || !$("live-positions-panel")?.open) {
        stopLivePositionsPoll();
        return;
      }
      refreshLiveOpenPositions();
    }, LIVE_POSITIONS_POLL_MS);
  }

  function tbankInstField(inst, ...keys) {
    return getBroker().instField(inst, ...keys);
  }

  function tbankInstApiTradable(inst) {
    return getBroker().instApiTradable(inst);
  }

  async function tbankFindInstrument(sec, market) {
    return getBroker().findInstrument(sec, market);
  }

  /** Мета инструмента для песочницы без T-Bank (лот=1, цены из свечей/MOEX). */
  function sandboxInstrumentMeta(sec, market) {
    const ticker = String(sec || "").trim().toUpperCase();
    const m = market === "futures" ? "futures" : "shares";
    const instrumentId = `sandbox:${m}:${ticker}`;
    const ti = { ticker, lot: 1, uid: instrumentId, figi: instrumentId, name: ticker };
    return {
      ti,
      instrumentId,
      lot: 1,
      ticker,
      market: m,
      classCode: "",
      instrumentName: ticker
    };
  }

  /** T-Bank FindInstrument или локальная заглушка в песочнице (без T-Bank / при ошибке API). */
  async function resolveLiveInstrumentMeta(sec, market) {
    if (isLiveSandbox()) {
      if (!state.tbank.token) return sandboxInstrumentMeta(sec, market);
      try {
        const ti = await tbankFindInstrument(sec, market);
        if (!ti) return sandboxInstrumentMeta(sec, market);
        const instrumentId = ti.uid || ti.figi;
        return {
          ti,
          instrumentId,
          lot: Math.max(1, +ti.lot || 1),
          ticker: String(ti.ticker || sec).toUpperCase(),
          market: market === "futures" ? "futures" : "shares",
          classCode: tbankInstField(ti, "classCode", "class_code") || "",
          instrumentName: tbankInstField(ti, "name") || ""
        };
      } catch (err) {
        noteLiveTech("live-sandbox-meta", err.message, `${market}:${sec}`);
        return sandboxInstrumentMeta(sec, market);
      }
    }
    const ti = await tbankFindInstrument(sec, market);
    if (!ti) return null;
    const instrumentId = ti.uid || ti.figi;
    return {
      ti,
      instrumentId,
      lot: Math.max(1, +ti.lot || 1),
      ticker: String(ti.ticker || sec).toUpperCase(),
      market: market === "futures" ? "futures" : "shares",
      classCode: tbankInstField(ti, "classCode", "class_code") || "",
      instrumentName: tbankInstField(ti, "name") || ""
    };
  }

  async function tbankGetTradingStatus(instrumentId) {
    return getBroker().getTradingStatus(instrumentId);
  }

  async function tbankValidateTradable(instrumentId, instMeta, orderTypeOverride) {
    return getBroker().validateTradable(instrumentId, instMeta, orderTypeOverride);
  }

  /** Подпрограмма `summarizeLiveReconcileIssues`. */
  function summarizeLiveReconcileIssues(skipped, failed, maxItems) {
    const n = Math.max(1, +maxItems || 4);
    const parts = [];
    if (skipped.length) {
      const head = skipped.slice(0, n).map(liveIssueLine).join("; ");
      parts.push(`пропущено без API (${skipped.length}): ${head}${skipped.length > n ? "…" : ""}`);
    }
    if (failed.length) {
      const head = failed.slice(0, n).map(liveIssueLine).join("; ");
      parts.push(`ошибки заявок (${failed.length}): ${head}${failed.length > n ? "…" : ""}`);
    }
    return parts.join(" · ");
  }

  /** Live-торговля: `liveIssueEntry`. */
  function liveIssueEntry(ticker, sec, fields) {
    return { ticker, sec: sec || ticker, ...fields };
  }

  async function tbankGetInstrumentById(instrumentId) {
    return getBroker().getInstrumentById(instrumentId);
  }

  /** Подпрограмма `piecesToLots`. */
  function piecesToLots(pieces, lotSize) {
    const lot = Math.max(1, +lotSize || 1);
    const p = Math.abs(+pieces || 0);
    if (p <= 0) return 0;
    return Math.max(1, Math.round(p / lot));
  }

  /** Лоты для закрытия позиции на брокере (без округления вверх). */
  function positionClosingLots(row, piecesOverride) {
    if (!row) return 0;
    const isFuture = row.isFuture || row.market === "futures";
    const pieces = Math.abs(+piecesOverride ?? row.pieces ?? 0);
    if (pieces <= 0) return 0;
    if (isFuture) return Math.abs(Math.round(pieces));
    const lot = Math.max(1, +row.lot || 1);
    const lots = Math.floor(pieces / lot);
    return lots > 0 ? lots : 1;
  }

  /** Live-торговля: `liveOrderTypeUi`. */
  function liveOrderTypeUi() {
    return $("live-order-type")?.value === "limit" ? "limit" : "market";
  }

  /** Подпрограмма `quotationFromNumber`. */
  function quotationFromNumber(price) {
    const p = Math.max(0, +price || 0);
    const units = Math.floor(p);
    const nano = Math.round((p - units) * 1e9);
    return { units: String(units), nano };
  }

  async function tbankGetLastPrice(instrumentId) {
    return getBroker().getLastPrice(instrumentId);
  }

  /** Live-торговля: `liveCandleSourceUi`. */
  function liveCandleSourceUi() {
    return $("live-candle-source")?.value || "auto";
  }

  /** Разрешение id/метаданных: `resolveLiveCandleSource`. */
  function resolveLiveCandleSource() {
    const ui = liveCandleSourceUi();
    if (ui === "moex") return "moex";
    if (ui === "tbank") return state.tbank.token ? "tbank" : "moex";
    return state.tbank.token ? "tbank" : "moex";
  }

  /** Подпись фактического источника свечей (может отличаться от выбора в select). */
  function liveCandleSourceEffectiveLabel() {
    const ui = liveCandleSourceUi();
    const labels = { tbank: "T-Bank", moex: "MOEX", cache: "кэш" };
    const actualKey = state.live.candleSource || resolveLiveCandleSource();
    const actual = labels[actualKey] || actualKey;
    if (ui === "tbank" && !state.tbank.token) return `${actual} (нет токена T-Bank)`;
    if (ui === "auto" && !state.tbank.token) return `${actual} (авто → MOEX)`;
    if (state.live.candleRefreshBusy) return `загрузка ${actual}…`;
    return actual;
  }

  /** Подсказка у select «Свечи live»: фактический источник и fallback. */
  function syncLiveCandleSourceUi(isLive) {
    const hint = $("live-candle-source-hint");
    const select = $("live-candle-source");
    if (!hint || !select) return;
    if (!isLive) {
      hint.hidden = true;
      hint.textContent = "";
      return;
    }
    const ui = liveCandleSourceUi();
    const label = liveCandleSourceEffectiveLabel();
    const showHint = state.live.candleRefreshBusy
      || ui === "auto"
      || (ui === "tbank" && !state.tbank.token);
    hint.hidden = !showHint;
    hint.textContent = showHint ? `→ ${label}` : "";
  }

  /** Live-торговля: `liveTbankTailFromDate`. */
  function liveTbankTailFromDate(fromStr, tillStr, interval) {
    const tillD = parseDay(tillStr);
    tillD.setHours(23, 59, 59, 999);
    const now = new Date();
    const end = tillD > now ? now : tillD;
    const hours = E.liveTbankTailHours(interval);
    const tailStart = new Date(end.getTime() - hours * 3600 * 1000);
    const fromD = parseDay(fromStr);
    return fromD > tailStart ? fromD : tailStart;
  }

  async function tbankFetchCandlesRange(instrumentId, fromDate, toDate, interval) {
    return getBroker().fetchCandlesRange(instrumentId, fromDate, toDate, interval);
  }

  /** Обновление данных с источника: `refreshLiveTbankTail`. */
  async function refreshLiveTbankTail(instruments, from, till, interval, existingByKey) {
    if (!(await ensureTbankTokenUnlocked())) {
      throw new Error("Токен T-Bank не расшифрован — свечи T-Bank недоступны.");
    }
    const byKey = new Map(existingByKey || []);
    const failures = [];
    const list = instruments || [];
    const tailFrom = liveTbankTailFromDate(from, till, interval);
    const tillEnd = parseDay(till);
    tillEnd.setHours(23, 59, 59, 999);
    const queue = [...list];
    const workers = Array.from(
      { length: Math.max(1, Math.min(3, list.length > 6 ? 3 : 2)) },
      async () => {
        while (queue.length) {
          const inst = queue.shift();
          if (!inst) continue;
          const sec = inst.sec;
          const market = inst.market || "shares";
          const key = `${market}:${String(sec || "").trim().toUpperCase()}`;
          try {
            const ti = await tbankFindInstrument(sec, market);
            if (!ti) {
              failures.push({ sec, market, error: "не найден в T-Bank" });
              continue;
            }
            const instrumentId = ti.uid || ti.figi;
            const raw = await tbankFetchCandlesRange(instrumentId, tailFrom, tillEnd, interval);
            const pack = E.parseTbankHistoricCandles(raw, sec, market);
            if (!pack.length) {
              failures.push({ sec, market, error: "T-Bank не вернул свечи за хвост периода" });
              continue;
            }
            const prev = byKey.get(key) || [];
            byKey.set(key, E.mergeCandleSeries(prev, pack));
          } catch (err) {
            failures.push({ sec, market, error: err?.message || String(err) });
          }
        }
      }
    );
    await Promise.all(workers);
    return { byKey, failures };
  }

  /** Подпрограмма `packLastClose`. */
  function packLastClose(sec, market) {
    const secU = String(sec || "").trim().toUpperCase();
    const mkt = market === "futures" ? "futures" : "shares";
    const key = `${mkt}:${secU}`;
    let pack = state.packs.find((p) => instrumentKey(p[0]) === key);
    if (!pack) pack = state.packs.find((p) => String(p[0]?.sec || "").toUpperCase() === secU);
    const close = pack?.at(-1)?.close;
    return Number.isFinite(close) && close > 0 ? close : null;
  }

  /** Песочница (фейк-брокер): `sandboxLocalPrice`. */
  function sandboxLocalPrice(pos) {
    if (!pos) return NaN;
    const fromPack = packLastClose(pos.sec, pos.market);
    if (Number.isFinite(fromPack) && fromPack > 0) return fromPack;
    const cur = pos.curPrice ?? pos.avgPrice;
    return Number.isFinite(cur) && cur > 0 ? cur : NaN;
  }

  /** Быстрый пересчёт портфеля песочницы без запросов цен (после закрытия позиции). */
  function renderSandboxPortfolioQuick() {
    if (!isLiveSandbox()) return;
    const sb = ensureSandboxState();
    let mtm = 0;
    for (const pos of sb.open.values()) {
      const cur = sandboxLocalPrice(pos);
      const px = Number.isFinite(cur) ? cur : (pos.avgPrice ?? 0);
      if (!Number.isFinite(px)) continue;
      const sign = pos.side === "short" ? -1 : 1;
      mtm += sign * pos.pieces * px;
    }
    state.live.portfolioValue = (sb.cash || 0) + mtm;
    state.live.sandboxPositionsValue = mtm;
    state.live.freeCashRub = sb.cash;
    state.live.commissionPaid = sb.commissionTotal || 0;
    renderLivePortfolioStats();
  }

  /** Синхронизация UI/state: `syncSandboxPositionsTable`. */
  function syncSandboxPositionsTable() {
    state.live.openPositions = filterLiveOpenPositionRows([...ensureSandboxState().open.values()]);
    renderLivePositionsPanel();
  }

  /** Подпрограмма `clearLiveManualFlatten`. */
  function clearLiveManualFlatten() {
    state.live.manualFlatten = false;
  }

  /** Принудительно показать пустой список позиций (без ожидания опроса брокера). */
  function forceClearLivePositionsPanel() {
    state.live.openPositions = [];
    const tableEl = $("live-positions-table");
    const metaEl = $("live-positions-meta");
    if (!tableEl || !isLiveMode()) return;
    tableEl.textContent = "";
    const emptyMsg = isLiveSandbox()
      ? "Нереализованных фейк-позиций нет."
      : "Нереализованных позиций нет.";
    tableEl.innerHTML = `<p class="live-order-book-empty">${emptyMsg}</p>`;
    if (metaEl && isLiveSandbox()) {
      metaEl.textContent = "Нереализованные фейк-позиции. «Сумма, ₽» — вклад в портфель (лонг +, шорт −), не «Портфель всего».";
    }
  }

  let liveChartsRefreshTimer = null;
  let liveChartsBootstrapPromise = null;

  /** Первичная отрисовка графиков после старта live-сессии (инструменты + equity). */
  async function bootstrapLiveChartsSession(opts) {
    if (!isLiveTradingSession()) return false;
    if (liveChartsBootstrapPromise) return liveChartsBootstrapPromise;
    liveChartsBootstrapPromise = bootstrapLiveChartsSessionInner(opts).finally(() => {
      liveChartsBootstrapPromise = null;
    });
    return liveChartsBootstrapPromise;
  }

  async function bootstrapLiveChartsSessionInner(opts) {
    const ro = opts || {};
    if (!isLiveTradingSession() || state.live.chartsBootstrapBusy) return false;
    state.live.chartsBootstrapBusy = true;
    try {
      pinLiveSessionEquityWindow();
      if (!selectedInstruments().length) {
        refreshLiveChartsUi();
        return false;
      }
      if (state.packs.length && !state.lastResult?.perSec?.length) {
        const quick = await tryLiveFinrespCalc({ silent: true, chartMode: true, ...ro });
        if (quick?.perSec?.length) {
          const { perSec, stopper } = quick;
          drawCharts(perSec, stopper, { liveSession: true });
          refreshLiveEquityChartsUi();
          return true;
        }
      }
      const ok = await refreshLiveCandleStream({ silent: true, redrawCharts: true, ...ro });
      if (state.lastResult?.perSec?.length) {
        if (!ok) refreshLiveChartsUi();
        return true;
      }
      refreshLiveChartsUi();
      return false;
    } finally {
      state.live.chartsBootstrapBusy = false;
    }
  }

  /** Подпрограмма `queueLiveChartsRefresh`. */
  function queueLiveChartsRefresh() {
    if (!isLiveTradingSession()) return;
    clearTimeout(liveChartsRefreshTimer);
    liveChartsRefreshTimer = setTimeout(() => {
      liveChartsRefreshTimer = null;
      if (state.live.tradingActionBusy) return;
      refreshLiveChartsUi();
    }, 2500);
  }

  /** Подпрограмма `cancelQueuedLiveChartsRefresh`. */
  function cancelQueuedLiveChartsRefresh() {
    clearTimeout(liveChartsRefreshTimer);
    liveChartsRefreshTimer = null;
  }

  /** Разрешение id/метаданных: `resolveOrderPrice`. */
  async function resolveOrderPrice(instrumentId, sec, market) {
    const fromPack = packLastClose(sec, market);
    if (Number.isFinite(fromPack) && fromPack > 0) return fromPack;
    if (instrumentId && String(instrumentId).startsWith("sandbox:")) return null;
    return await tbankGetLastPrice(instrumentId);
  }

  /** Обновление данных с источника: `refreshLiveManualLimitPrice`. */
  async function refreshLiveManualLimitPrice(opts) {
    const options = opts || {};
    if (!isLiveMode()) return;
    if ($("live-manual-order-type")?.value !== "limit") return;
    const picked = parseLiveManualInstrumentKey($("live-manual-sec")?.value);
    const priceEl = $("live-manual-price");
    if (!priceEl) return;
    if (!picked?.sec) {
      if (options.force) {
        priceEl.value = "";
        state.live.manualPriceSec = "";
      }
      return;
    }
    const secKey = `${picked.market}:${picked.sec}`;
    if (!options.force && state.live.manualPriceSec === secKey && priceEl.value) return;
    let price = packLastClose(picked.sec, picked.market);
    let source = price ? "свечи" : "";
    if (!price && state.tbank.token) {
      try {
        if (await ensureTbankTokenUnlocked()) {
          const ti = await tbankFindInstrument(picked.sec, picked.market);
          if (ti) {
            const instrumentId = ti.uid || ti.figi;
            price = await tbankGetLastPrice(instrumentId);
            if (price) source = "T-Bank";
          }
        }
      } catch (_) { /* optional */ }
    }
    if (Number.isFinite(price) && price > 0) {
      priceEl.value = String(price);
      state.live.manualPriceSec = secKey;
      if (options.showStatus) {
        const statusEl = $("live-manual-order-status");
        if (statusEl) statusEl.textContent = `Цена ${picked.sec} из ${source}: ${fmt(price, 2)} ₽`;
      }
      if (!state.restoringConfig) saveConfig();
    } else if (options.force) {
      priceEl.value = "";
      state.live.manualPriceSec = secKey;
      if (!state.restoringConfig) saveConfig();
    }
  }

  // === Live: песочница (фейк) — симуляция заявок без T-Bank PostOrder ===

  /** Функция: включена ли галочка «Песочница (фейк)» в режиме live. */
  function isLiveSandbox() {
    return isLiveMode() && !!$("live-sandbox-mode")?.checked;
  }

  /** Функция: объект state.live.sandbox (Map открытых, массивы closed/orders, ledger). */
  function ensureSandboxState() {
    if (!state.live.sandbox) {
      state.live.sandbox = {
        startPortfolio: null,
        cash: null,
        cashDelta: 0,
        commissionTotal: 0,
        open: new Map(),
        openLegs: new Map(),
        nextLegId: 0,
        ledger: [],
        nextFillId: 0,
        closed: [],
        orders: []
      };
    }
    if (!(state.live.sandbox.open instanceof Map)) state.live.sandbox.open = new Map();
    if (!(state.live.sandbox.openLegs instanceof Map)) state.live.sandbox.openLegs = new Map();
    if (!Number.isFinite(state.live.sandbox.nextLegId)) state.live.sandbox.nextLegId = 0;
    if (!Array.isArray(state.live.sandbox.ledger)) state.live.sandbox.ledger = [];
    if (!Number.isFinite(state.live.sandbox.nextFillId)) state.live.sandbox.nextFillId = 0;
    if (!Array.isArray(state.live.sandbox.closed)) state.live.sandbox.closed = [];
    if (!Array.isArray(state.live.sandbox.orders)) state.live.sandbox.orders = [];
    return state.live.sandbox;
  }

  /** Ленивая инициализация/проверка: `ensureSandboxLedger`. */
  function ensureSandboxLedger(sb) {
    if (!Array.isArray(sb.ledger)) sb.ledger = [];
    if (!Number.isFinite(sb.nextFillId)) sb.nextFillId = 0;
  }

  /** FIFO или LIFO при списании закрытия на ранее открытые лоты (по умолчанию FIFO). */
  function sandboxMatchMode() {
    return $("live-sandbox-match-mode")?.value === "lifo" ? "lifo" : "fifo";
  }

  /** Подпрограмма `createSandboxReplayCtx`. */
  function createSandboxReplayCtx(sb) {
    return {
      startPortfolio: sb.startPortfolio,
      cash: sb.startPortfolio,
      cashDelta: 0,
      commissionTotal: 0,
      open: new Map(),
      openLegs: new Map(),
      nextLegId: 0,
      closed: []
    };
  }

  /** Копирование: `copySandboxReplayToState`. */
  function copySandboxReplayToState(sb, ctx) {
    sb.cash = ctx.cash;
    sb.cashDelta = ctx.cash - sb.startPortfolio;
    sb.commissionTotal = ctx.commissionTotal;
    sb.open = ctx.open;
    sb.openLegs = ctx.openLegs;
    sb.nextLegId = ctx.nextLegId;
    sb.closed.length = 0;
    sb.closed.push(...ctx.closed);
  }

  /** Синхронизация UI/state: `syncSandboxOrdersTradeMetaFromLedger`. */
  function syncSandboxOrdersTradeMetaFromLedger(sb) {
    const byOrder = new Map();
    for (const fill of sb.ledger || []) {
      if (fill.orderId) byOrder.set(fill.orderId, fill);
    }
    for (const o of sb.orders || []) {
      const fill = byOrder.get(o.orderId);
      if (!fill) continue;
      o.tradeRole = fill.tradeRole || o.tradeRole;
      o.tradeMatches = fill.tradeMatches ? fill.tradeMatches.map((m) => ({ ...m })) : o.tradeMatches;
      o.tradePnl = fill.tradePnl ?? o.tradePnl;
      o.matchMode = fill.matchMode || o.matchMode;
      o.openLegIds = fill.openLegIds ? fill.openLegIds.slice() : o.openLegIds;
    }
  }

  /**
   * Убрать из журнала фейк-заявок пары открытие↔закрытие, если лоты полностью списаны (FIFO/LIFO).
   * Ledger остаётся append-only для пересчёта cash; чистится только sb.orders (UI).
   */
  function compactSandboxOrderJournal(sb) {
    if (!Array.isArray(sb.orders) || !sb.orders.length) return;
    if (!Array.isArray(sb.ledger) || !sb.ledger.length) return;

    const openLegIds = new Set();
    for (const legs of sb.openLegs?.values() || []) {
      for (const leg of legs) openLegIds.add(leg.legId);
    }

    const legToOpenOrder = new Map();
    for (const fill of sb.ledger) {
      if (!fill.orderId) continue;
      for (const legId of fill.openLegIds || []) {
        if (legId != null) legToOpenOrder.set(legId, fill.orderId);
      }
    }

    const ordersToRemove = new Set();

    for (const [legId, orderId] of legToOpenOrder) {
      if (!openLegIds.has(legId)) ordersToRemove.add(orderId);
    }

    for (const fill of sb.ledger) {
      if (!fill.orderId) continue;
      const role = fill.tradeRole;
      if (role !== "close_long" && role !== "close_short" && role !== "flip") continue;
      const matches = fill.tradeMatches || [];
      if (!matches.length) continue;
      const matchedClosed = matches.every((m) => m.legId != null && !openLegIds.has(m.legId));
      const openedStillLive = (fill.openLegIds || []).some((id) => openLegIds.has(id));
      if (matchedClosed && !openedStillLive) ordersToRemove.add(fill.orderId);
    }

    if (!ordersToRemove.size) return;
    sb.orders = sb.orders.filter((o) => !ordersToRemove.has(o.orderId));
  }

  /** Восстановить ledger из старых заявок (миграция сессий без ledger). */
  function migrateSandboxLedgerFromLegacy(sb) {
    ensureSandboxLedger(sb);
    if (sb.ledger.length || !(sb.orders || []).length) return;
    const sorted = sb.orders.slice().sort(
      (a, b) => (Date.parse(a.orderDate || 0) || 0) - (Date.parse(b.orderDate || 0) || 0)
    );
    for (const o of sorted) {
      if (!o.fake) continue;
      const market = o.market === "futures" ? "futures" : "shares";
      const ticker = String(o.ticker || o.sec || "").toUpperCase();
      const lots = Math.max(1, Math.floor(+(o.lotsExecuted ?? o.lotsRequested ?? 1)));
      const lot = Math.max(1, +o.lot || (market === "futures" ? 1 : 10));
      const isFuture = market === "futures";
      const isBuy = isOrderBuy(o);
      const signedPieces = Number.isFinite(o.signedPieces)
        ? Math.trunc(o.signedPieces)
        : (isFuture ? (isBuy ? lots : -lots) : (isBuy ? lots * lot : -(lots * lot)));
      sb.nextFillId = (sb.nextFillId || 0) + 1;
      sb.ledger.push({
        fillId: sb.nextFillId,
        orderId: o.orderId,
        ts: o.orderDate || new Date().toISOString(),
        key: sandboxPosKey(market, ticker),
        ticker,
        sec: o.sec || ticker,
        market,
        instrumentId: o.instrumentId,
        lot,
        isFuture,
        signedPieces,
        price: +o.price,
        fee: +o.fee || 0,
        matchMode: o.matchMode || sandboxMatchMode(),
        direction: o.direction,
        lots,
        tradeRole: o.tradeRole,
        tradeMatches: o.tradeMatches,
        tradePnl: o.tradePnl
      });
    }
  }

  /** Полный пересчёт cash / openLegs / closed из append-only журнала исполнений. */
  function rebuildSandboxFromLedger(sb) {
    ensureSandboxLedger(sb);
    if (!Number.isFinite(sb.startPortfolio)) return;
    if (!sb.ledger.length) {
      migrateSandboxLedgerFromLegacy(sb);
      if (!sb.ledger.length) return;
    }
    const ctx = createSandboxReplayCtx(sb);
    for (const fill of sb.ledger) {
      const meta = applySandboxLedgerFill(ctx, fill);
      fill.tradeRole = meta.role;
      fill.tradeMatches = meta.matches ? meta.matches.map((m) => ({ ...m })) : [];
      fill.tradePnl = meta.pnlTotal;
      if (meta.legIds?.length) fill.openLegIds = meta.legIds.slice();
    }
    copySandboxReplayToState(sb, ctx);
    syncSandboxOrdersTradeMetaFromLedger(sb);
    compactSandboxOrderJournal(sb);
  }

  /** Применение настроек/результата: `applySandboxLedgerFill`. */
  function applySandboxLedgerFill(ctx, fill) {
    const signedPieces = Math.trunc(+fill.signedPieces || 0);
    const price = +fill.price;
    const fee = +fill.fee || 0;
    if (!signedPieces || !Number.isFinite(price)) {
      return { role: null, matches: [], pnlTotal: 0, legIds: [] };
    }
    const notional = Math.abs(signedPieces) * price;
    if (signedPieces > 0) {
      ctx.cash -= notional + fee;
    } else {
      ctx.cash += notional - fee;
    }
    ctx.commissionTotal += fee;
    const posMeta = {
      ticker: fill.ticker,
      sec: fill.sec,
      market: fill.market,
      instrumentId: fill.instrumentId,
      lot: fill.lot,
      isFuture: fill.isFuture
    };
    const meta = applySandboxSignedDelta(ctx, posMeta, signedPieces, price, {
      matchMode: fill.matchMode || sandboxMatchMode(),
      skipNotify: true
    });
    // Привязать комиссию открытия к leg (покупка лонга / продажа шорта).
    if (fee > 0 && meta?.legIds?.length) {
      const perLegFee = fee / meta.legIds.length;
      for (const legId of meta.legIds) {
        for (const legs of ctx.openLegs?.values() || []) {
          const leg = legs.find((l) => l.legId === legId);
          if (leg) leg.fee = (leg.fee || 0) + perLegFee;
        }
      }
    }
    return meta;
  }

  /** Подпрограмма `appendSandboxFill`. */
  function appendSandboxFill(sb, fillData) {
    ensureSandboxLedger(sb);
    sb.nextFillId = (sb.nextFillId || 0) + 1;
    const fill = {
      fillId: sb.nextFillId,
      ts: fillData.ts || new Date().toISOString(),
      matchMode: fillData.matchMode || sandboxMatchMode(),
      ...fillData
    };
    sb.ledger.push(fill);
    if (sb.ledger.length > 500) sb.ledger.splice(0, sb.ledger.length - 500);
    return fill;
  }

  /** Песочница (фейк-брокер): `sandboxNotifyForFillTrade`. */
  function sandboxNotifyForFillTrade(fill, posMeta) {
    if (!fill?.tradeRole) return;
    const role = fill.tradeRole;
    const price = +fill.price;
    if (role === "open_long" || role === "open_short") {
      const pieces = Math.abs(Math.trunc(+fill.signedPieces || 0));
      notifySandboxPositionOpen(
        { ...posMeta, side: role === "open_short" ? "short" : "long" },
        price,
        pieces
      );
      return;
    }
    if (role === "close_long" || role === "close_short" || role === "flip") {
      const closedPieces = Array.isArray(fill.tradeMatches) && fill.tradeMatches.length
        ? fill.tradeMatches.reduce((s, m) => s + (+m.pieces || 0), 0)
        : Math.abs(Math.trunc(+fill.signedPieces || 0));
      notifySandboxPositionClose(
        { ...posMeta, side: role === "close_short" ? "short" : "long" },
        closedPieces,
        price,
        fill.tradePnl
      );
    }
  }

  /** Ленивая инициализация/проверка: `ensureSandboxOpenLegs`. */
  function ensureSandboxOpenLegs(sb) {
    if (!(sb.openLegs instanceof Map)) sb.openLegs = new Map();
    if (!Number.isFinite(sb.nextLegId)) sb.nextLegId = 0;
  }

  /** Подпрограмма `allocSandboxLegId`. */
  function allocSandboxLegId(sb) {
    ensureSandboxOpenLegs(sb);
    sb.nextLegId = (sb.nextLegId || 0) + 1;
    return sb.nextLegId;
  }

  /** Подпрограмма `snapshotSandboxOpenLegs`. */
  function snapshotSandboxOpenLegs(openLegsMap) {
    const out = {};
    for (const [k, legs] of (openLegsMap || new Map()).entries()) {
      out[k] = (legs || []).map((leg) => ({ ...leg }));
    }
    return out;
  }

  /** Миграция: одна агрегированная позиция → один leg (старые сессии без openLegs). */
  function migrateSandboxOpenToLegs(sb, key) {
    ensureSandboxOpenLegs(sb);
    const pool = sb.openLegs.get(key);
    if (pool && pool.length) return;
    const cur = sb.open.get(key);
    if (!cur || cur.pieces <= 0) return;
    sb.openLegs.set(key, [{
      legId: allocSandboxLegId(sb),
      side: cur.side,
      pieces: cur.pieces,
      price: cur.avgPrice,
      openedAt: cur.openedAt || new Date().toISOString()
    }]);
  }

  /** Подпрограмма `rebuildSandboxOpenFromLegs`. */
  function rebuildSandboxOpenFromLegs(sb, key, posMeta) {
    ensureSandboxOpenLegs(sb);
    const pool = sb.openLegs.get(key) || [];
    if (!pool.length) {
      sb.open.delete(key);
      sb.openLegs.delete(key);
      return null;
    }
    const side = pool[0].side;
    let pieces = 0;
    let costSum = 0;
    let oldestOpen = pool[0].openedAt;
    for (const leg of pool) {
      pieces += leg.pieces;
      costSum += leg.pieces * leg.price;
      if (leg.openedAt && (!oldestOpen || leg.openedAt < oldestOpen)) oldestOpen = leg.openedAt;
    }
    if (pieces <= 0) {
      sb.open.delete(key);
      sb.openLegs.delete(key);
      return null;
    }
    const prev = sb.open.get(key);
    const row = {
      ticker: posMeta.ticker,
      sec: posMeta.sec,
      market: posMeta.market,
      instrumentId: posMeta.instrumentId,
      lot: posMeta.lot,
      isFuture: posMeta.isFuture,
      side,
      pieces,
      lots: posMeta.isFuture ? pieces : piecesToLots(pieces, posMeta.lot),
      avgPrice: costSum / pieces,
      curPrice: prev?.curPrice ?? costSum / pieces,
      openedAt: oldestOpen || new Date().toISOString(),
      fake: true
    };
    sb.open.set(key, row);
    return row;
  }

  /** Подпрограмма `pushSandboxLeg`. */
  function pushSandboxLeg(sb, key, side, pieces, price) {
    ensureSandboxOpenLegs(sb);
    if (!sb.openLegs.has(key)) sb.openLegs.set(key, []);
    const legId = allocSandboxLegId(sb);
    sb.openLegs.get(key).push({
      legId,
      side,
      pieces,
      price,
      openedAt: new Date().toISOString()
    });
    return legId;
  }

  /**
   * Списать piecesToClose штук с открытых legs (FIFO/LIFO).
   * @returns {{ matches, pnlTotal, remaining }}
   */
  function consumeSandboxLegs(sb, key, closeSide, piecesToClose, closePrice, posMeta, opts) {
    const options = opts || {};
    ensureSandboxOpenLegs(sb);
    migrateSandboxOpenToLegs(sb, key);
    const pool = sb.openLegs.get(key) || [];
    const matchMode = options.matchMode || sandboxMatchMode();
    let remaining = Math.trunc(+piecesToClose || 0);
    const matches = [];
    let pnlTotal = 0;

    while (remaining > 0 && pool.length) {
      const idx = matchMode === "lifo" ? pool.length - 1 : 0;
      const leg = pool[idx];
      if (leg.side !== closeSide) break;
      const take = Math.min(remaining, leg.pieces);
      const openPieces = leg.pieces;
      const legPnl = closeSide === "short"
        ? (leg.price - closePrice) * take
        : (closePrice - leg.price) * take;
      matches.push({
        legId: leg.legId,
        side: leg.side,
        pieces: take,
        openPrice: leg.price,
        openPieces,
        openFee: Number.isFinite(leg.fee) ? leg.fee : null,
        closePrice,
        pnl: legPnl,
        openedAt: leg.openedAt,
        matchMode
      });
      pnlTotal += legPnl;
      remaining -= take;
      if (take >= leg.pieces) {
        pool.splice(idx, 1);
      } else {
        const legPiecesBefore = leg.pieces;
        leg.pieces -= take;
        if (Number.isFinite(leg.fee) && leg.fee > 0 && legPiecesBefore > 0) {
          leg.fee *= leg.pieces / legPiecesBefore;
        }
      }
    }

    if (!pool.length) sb.openLegs.delete(key);

    const closedPieces = Math.trunc(+piecesToClose || 0) - remaining;
    if (closedPieces > 0 && !options.skipClosedJournal) {
      const journalPos = sb.open.get(key) || {
        ticker: posMeta.ticker,
        sec: posMeta.sec,
        market: posMeta.market,
        side: closeSide,
        lot: posMeta.lot,
        isFuture: posMeta.isFuture,
        instrumentId: posMeta.instrumentId,
        avgPrice: matches[0]?.openPrice ?? closePrice
      };
      pushSandboxClosed(sb, journalPos, closedPieces, closePrice, {
        matches,
        pnlTotal,
        matchMode,
        skipNotify: options.skipNotify
      });
    } else if (closedPieces > 0 && !options.skipNotify) {
      const notifyPos = sb.open.get(key) || {
        ticker: posMeta.ticker,
        sec: posMeta.sec,
        market: posMeta.market,
        side: closeSide,
        lot: posMeta.lot,
        isFuture: posMeta.isFuture,
        instrumentId: posMeta.instrumentId,
        avgPrice: matches[0]?.openPrice ?? closePrice
      };
      notifySandboxPositionClose(notifyPos, closedPieces, closePrice, pnlTotal);
    }

    rebuildSandboxOpenFromLegs(sb, key, posMeta);
    return { matches, pnlTotal, remaining };
  }

  /** Функция: ключ позиции в Map песочницы (market:ticker). */
  function sandboxPosKey(market, ticker) {
    return `${market === "futures" ? "futures" : "shares"}:${String(ticker || "").toUpperCase()}`;
  }

  /** Функция: лоты со знаком (шорт — отрицательное количество). */
  function signedSandboxLots(pos) {
    const lots = pos.isFuture
      ? Math.abs(+pos.pieces || 0)
      : Math.abs(+pos.lots || piecesToLots(pos.pieces, pos.lot) || 0);
    return pos.side === "short" ? -lots : lots;
  }

  /** Функция: комиссия фейк-сделки по полю Commission % калькулятора. */
  function sandboxCommissionFee(notional) {
    return Math.abs(+notional || 0) * (commissionPctValue() / 100);
  }

  /** Исполнение, открывшее leg (покупка лонга или продажа шорта). */
  function sandboxOpenFillForLeg(legId) {
    if (legId == null) return null;
    for (const fill of ensureSandboxState().ledger || []) {
      if ((fill.openLegIds || []).includes(legId)) return fill;
    }
    return null;
  }

  /**
   * Доля комиссии открытия leg на закрытые штуки (FIFO/LIFO):
   * fee_открытия × (закрыто_из_лота / открыто_в_лоте); при полном закрытии лота — вся комиссия.
   * Лонг: комиссия покупки; шорт: комиссия продажи при открытии.
   */
  function sandboxWeightedOpenLegFeeForMatch(match) {
    const closed = Math.max(0, Math.trunc(+match.pieces || 0));
    if (!closed) return 0;
    const openPrice = +match.openPrice || 0;
    const openFee = +match.openFee;
    const openPieces = Math.max(0, Math.trunc(+match.openPieces || 0));
    if (Number.isFinite(openFee) && openFee > 0 && openPieces > 0) {
      return openFee * (closed / openPieces);
    }
    const openFill = !isLiveSandbox() ? null : (match.legId != null ? sandboxOpenFillForLeg(match.legId) : null);
    if (openFill) {
      const opened = Math.abs(Math.trunc(+openFill.signedPieces || 0));
      if (opened > 0) {
        const px = +openFill.price || openPrice;
        const fillFee = Number.isFinite(openFill.fee) ? +openFill.fee : sandboxCommissionFee(opened * px);
        return fillFee * (closed / opened);
      }
    }
    if (!isLiveSandbox() && match.legId != null) {
      const replayFee = state.live.brokerReplayLegFees?.get(match.legId);
      const pieces = Math.max(0, Math.trunc(+match.openPieces || 0));
      if (Number.isFinite(replayFee) && replayFee > 0 && pieces > 0) {
        return replayFee * (closed / pieces);
      }
      return 0;
    }
    return sandboxCommissionFee(openPrice * closed);
  }

  /** @deprecated alias */
  function sandboxWeightedBuyFeeForMatch(match) {
    return sandboxWeightedOpenLegFeeForMatch(match);
  }

  /** Роль закрытия по FIFO-матчам (лонг/шорт/flip). */
  function tradeHistoryCloseKind(entry) {
    const role = entry.tradeRole;
    if (role === "close_long" || role === "close_short" || role === "flip") return role;
    const matches = Array.isArray(entry.tradeMatches) ? entry.tradeMatches : [];
    if (!matches.length) return null;
    const isBuy = entry.isBuy != null ? !!entry.isBuy : isOrderBuy(entry);
    const openSide = matches[0]?.side;
    if (openSide === "long" && !isBuy) return "close_long";
    if (openSide === "short" && isBuy) return "close_short";
    return null;
  }

  /** Суммы продажи и покупки по FIFO-матчам закрытия (₽, без комиссий). */
  function tradeHistoryCloseFifoAmounts(entry) {
    const matches = Array.isArray(entry.tradeMatches) ? entry.tradeMatches : [];
    if (!matches.length) return null;
    const closePrice = +entry.price || 0;
    let saleSum = 0;
    let purchaseSum = 0;
    for (const m of matches) {
      const qty = Math.max(0, Math.trunc(+m.pieces || 0));
      if (!qty) continue;
      const openPx = +m.openPrice || 0;
      const closePx = +m.closePrice || closePrice;
      if (m.side === "short") {
        saleSum += openPx * qty;
        purchaseSum += closePx * qty;
      } else {
        purchaseSum += openPx * qty;
        saleSum += closePx * qty;
      }
    }
    return { saleSum, purchaseSum };
  }

  /**
   * FINRESPΔ закрытия: Σ продажи − Σ покупки (FIFO-пакеты) − комиссия buy − комиссия sell.
   * Лонг: продажа закрытия − покупки списанных лотов; шорт: продажи открытия − покупка закрытия.
   */
  function tradeHistoryCloseFinrespExplicit(entry) {
    const closeKind = tradeHistoryCloseKind(entry);
    if (closeKind !== "close_long" && closeKind !== "close_short" && closeKind !== "flip") return null;
    const amounts = tradeHistoryCloseFifoAmounts(entry);
    if (!amounts) return null;
    const fees = tradeHistoryRowFeeColumns(entry);
    const buyFee = Number.isFinite(fees.buyFee) ? fees.buyFee : 0;
    const sellFee = Number.isFinite(fees.sellFee) ? fees.sellFee : 0;
    return amounts.saleSum - amounts.purchaseSum - buyFee - sellFee;
  }

  /** Колонки комиссий строки журнала: buy / sell с учётом FIFO открытий при закрытии. */
  function tradeHistoryRowFeeColumns(entry) {
    const closeKind = tradeHistoryCloseKind(entry);
    const matches = Array.isArray(entry.tradeMatches) ? entry.tradeMatches : [];
    const closeFee = Number.isFinite(entry.fee) ? Math.max(0, +entry.fee) : 0;
    const openLegFeeSum = matches.length
      ? matches.reduce((s, m) => s + sandboxWeightedOpenLegFeeForMatch(m), 0)
      : 0;
    const isClose = closeKind === "close_long" || closeKind === "close_short" || closeKind === "flip";

    if (entry.isBuy) {
      if (isClose && (closeKind === "close_short" || closeKind === "flip")) {
        return {
          buyFee: closeFee,
          sellFee: openLegFeeSum
        };
      }
      return { buyFee: closeFee > 0 ? closeFee : NaN, sellFee: NaN };
    }
    if (isClose && (closeKind === "close_long" || closeKind === "flip")) {
      return {
        buyFee: openLegFeeSum,
        sellFee: closeFee
      };
    }
    return { buyFee: NaN, sellFee: closeFee > 0 ? closeFee : NaN };
  }

  /**
   * FINRESPΔ закрытия без FIFO-матчей (запасной путь).
   */
  function sandboxCloseFinrespNet(o) {
    if (!o) return null;
    const explicit = tradeHistoryCloseFinrespExplicit(o);
    if (Number.isFinite(explicit)) return explicit;
    const role = o.tradeRole;
    if (role !== "close_long" && role !== "close_short" && role !== "flip") return null;
    if (!Number.isFinite(o.tradePnl)) return null;
    const closePrice = +o.price || 0;
    const closedPieces = Math.abs(Math.trunc(+o.signedPieces || 0));
    const closeNotional = Number.isFinite(o.notional)
      ? Math.abs(+o.notional)
      : closedPieces * closePrice;
    const closeFee = Number.isFinite(o.fee) ? +o.fee : sandboxCommissionFee(closeNotional);
    return o.tradePnl - closeFee;
  }

  /** Функция: фейк-позиции в формате tbankPositionsByTicker для reconcile робота. */
  function sandboxPositionsByTicker() {
    const map = new Map();
    for (const pos of ensureSandboxState().open.values()) {
      const pieces = pos.side === "short" ? -Math.abs(+pos.pieces || 0) : Math.abs(+pos.pieces || 0);
      map.set(pos.ticker, {
        ticker: pos.ticker,
        instrumentId: pos.instrumentId,
        lot: pos.lot,
        pieces
      });
    }
    return map;
  }

  /** Процедура: снимок фейк-состояния для отмены последней заявки. */
  function snapshotSandboxOpen(openMap) {
    const out = {};
    for (const [k, v] of openMap.entries()) out[k] = { ...v };
    return out;
  }

  /** Синхронизировать sb.cash со старой моделью cashDelta (миграция сессий). */
  function ensureSandboxCash(sb) {
    if (Number.isFinite(sb.cash)) return sb.cash;
    if (!Number.isFinite(sb.startPortfolio)) return NaN;
    sb.cash = sb.startPortfolio + (+sb.cashDelta || 0);
    return sb.cash;
  }

  /** Подпрограмма `snapshotSandboxState`. */
  function snapshotSandboxState(sb) {
    return {
      cash: sb.cash,
      cashDelta: sb.cashDelta,
      commissionTotal: sb.commissionTotal,
      open: snapshotSandboxOpen(sb.open),
      openLegs: snapshotSandboxOpenLegs(sb.openLegs),
      nextLegId: sb.nextLegId || 0,
      ledger: (sb.ledger || []).map((f) => ({
        ...f,
        tradeMatches: f.tradeMatches ? f.tradeMatches.map((m) => ({ ...m })) : null
      })),
      nextFillId: sb.nextFillId || 0,
      closed: (sb.closed || []).map((c) => ({ ...c }))
    };
  }

  /** Подпрограмма `restoreSandboxSnapshot`. */
  function restoreSandboxSnapshot(sb, snap) {
    if (!snap) return;
    sb.cash = snap.cash;
    sb.cashDelta = snap.cashDelta;
    sb.commissionTotal = snap.commissionTotal;
    sb.open.clear();
    for (const [k, v] of Object.entries(snap.open || {})) sb.open.set(k, { ...v });
    ensureSandboxOpenLegs(sb);
    sb.openLegs.clear();
    for (const [k, legs] of Object.entries(snap.openLegs || {})) {
      sb.openLegs.set(k, (legs || []).map((leg) => ({ ...leg })));
    }
    sb.nextLegId = snap.nextLegId || 0;
    ensureSandboxLedger(sb);
    sb.ledger.length = 0;
    sb.ledger.push(...(snap.ledger || []).map((f) => ({
      ...f,
      tradeMatches: f.tradeMatches ? f.tradeMatches.map((m) => ({ ...m })) : null
    })));
    sb.nextFillId = snap.nextFillId || 0;
    sb.closed.length = 0;
    sb.closed.push(...(snap.closed || []));
    if (sb.ledger.length) rebuildSandboxFromLedger(sb);
  }

  /** Процедура (async): закрыть фейк-позицию целиком по точному числу штук (без переворота в шорт). */
  async function closeSandboxPositionAtMarket(pos, opts) {
    const options = opts || {};
    if (!pos) return false;
    const sb = ensureSandboxState();
    ensureSandboxCash(sb);
    const ticker = String(pos.ticker || pos.sec || "").toUpperCase();
    const market = pos.market || (pos.isFuture ? "futures" : "shares");
    const key = sandboxPosKey(market, ticker);
    const openPos = sb.open.get(key);
    if (!openPos || openPos.pieces <= 0) return false;

    let price = sandboxLocalPrice(openPos);
    if (!Number.isFinite(price) || price <= 0) {
      price = await resolveOrderPrice(openPos.instrumentId, openPos.sec || ticker, market);
    }
    if (!Number.isFinite(price) || price <= 0) price = openPos.curPrice ?? openPos.avgPrice;
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Нет цены для закрытия ${ticker}.`);
    }

    const tradeSource = options.tradeSource || "close-position";
    const tradeSourceLabel = options.tradeSourceLabel || resolveTradeSourceLabel(tradeSource);
    const revertSnap = snapshotSandboxState(sb);
    const pieces = openPos.pieces;
    const isShort = openPos.side === "short";
    const direction = isShort ? "ORDER_DIRECTION_BUY" : "ORDER_DIRECTION_SELL";
    const notional = pieces * price;
    const fee = sandboxCommissionFee(notional);
    const lots = openPos.isFuture ? pieces : positionClosingLots(openPos, pieces);
    const orderId = options.skipRecord
      ? null
      : (`fake-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    let fill = null;

    try {
      const pieceDelta = isShort ? pieces : -pieces;
      fill = appendSandboxFill(sb, {
        orderId,
        key,
        ticker,
        sec: openPos.sec || ticker,
        market,
        instrumentId: openPos.instrumentId,
        lot: openPos.lot,
        isFuture: openPos.isFuture,
        signedPieces: pieceDelta,
        price,
        fee,
        direction,
        lots,
        tradeSource,
        tradeSourceLabel
      });
      rebuildSandboxFromLedger(sb);
      if (!options.skipNotify) {
        sandboxNotifyForFillTrade(fill, {
          ticker,
          sec: openPos.sec || ticker,
          market,
          instrumentId: openPos.instrumentId,
          lot: openPos.lot,
          isFuture: openPos.isFuture
        });
      }
    } catch (err) {
      restoreSandboxSnapshot(sb, revertSnap);
      throw err;
    }

    if (!options.skipRecord) {
      recordSandboxOrder({
        orderId,
        ticker,
        direction,
        lots,
        orderType: "market",
        price,
        notional,
        fee,
        instrumentId: openPos.instrumentId,
        market,
        sec: openPos.sec || ticker,
        revertSnap,
        tradeRole: fill?.tradeRole,
        tradeMatches: fill?.tradeMatches,
        tradePnl: fill?.tradePnl,
        matchMode: sandboxMatchMode(),
        signedPieces: isShort ? pieces : -pieces,
        lot: openPos.lot,
        openLegIds: fill?.openLegIds,
        tradeSource,
        tradeSourceLabel
      });
      recordLiveOrderMarker(openPos.sec || ticker, direction, "market", { lots, price });
    }
    if (!options.skipUiRefresh) {
      renderSandboxPortfolioQuick();
      syncSandboxPositionsTable();
    }
    return true;
  }

  /** Процедура: добавить запись в журнал фейк-заявок (до 200 шт.). */
  function recordSandboxOrder(trade) {
    const sb = ensureSandboxState();
    const orderId = trade.orderId || `fake-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const order = attachTradeSourceFields({
      orderId,
      ticker: trade.ticker,
      direction: trade.direction,
      lotsRequested: trade.lots,
      lotsExecuted: trade.lots,
      orderType: trade.orderType === "limit" ? "ORDER_TYPE_LIMIT" : "ORDER_TYPE_MARKET",
      executionReportStatus: "EXECUTION_REPORT_STATUS_FILL",
      orderDate: new Date().toISOString(),
      fake: true,
      price: trade.price,
      notional: trade.notional,
      fee: trade.fee,
      instrumentId: trade.instrumentId,
      market: trade.market,
      sec: trade.sec,
      revertSnap: trade.revertSnap,
      tradeRole: trade.tradeRole || null,
      tradeMatches: trade.tradeMatches ? trade.tradeMatches.map((m) => ({ ...m })) : null,
      tradePnl: trade.tradePnl,
      matchMode: trade.matchMode || sandboxMatchMode(),
      signedPieces: trade.signedPieces,
      lot: trade.lot,
      openLegIds: trade.openLegIds ? trade.openLegIds.slice() : null
    }, trade.tradeSource, trade.tradeSourceLabel);
    upsertTradeHistoryFromOrder(order, "sandbox");
    sb.orders.unshift(order);
    if (sb.orders.length > 200) sb.orders.length = 200;
    compactSandboxOrderJournal(sb);
    return orderId;
  }

  /** Песочница (фейк-брокер): `sandboxOrderStatusLabel`. */
  function sandboxOrderStatusLabel(o) {
    const role = o.tradeRole;
    const mode = o.matchMode === "lifo" ? "LIFO" : "FIFO";
    const netPnl = sandboxCloseFinrespNet(o);
    const pnl = Number.isFinite(netPnl)
      ? ` · P/L ${netPnl >= 0 ? "+" : ""}${fmt(netPnl, 2)} ₽`
      : (Number.isFinite(o.tradePnl)
        ? ` · P/L ${o.tradePnl >= 0 ? "+" : ""}${fmt(o.tradePnl, 0)} ₽`
        : "");
    const legCount = Array.isArray(o.tradeMatches) ? o.tradeMatches.length : 0;
    const legsHint = legCount > 1 ? ` · ${legCount} лота` : "";
    if (role === "open_long") return "открытие лонга";
    if (role === "add_long") return "докупка лонга";
    if (role === "close_long") return `закрытие лонга (${mode})${legsHint}${pnl}`;
    if (role === "open_short") return "открытие шорта";
    if (role === "add_short") return "докупка шорта";
    if (role === "close_short") return `закрытие шорта (${mode})${legsHint}${pnl}`;
    if (role === "flip") return `переворот (${mode})${pnl}`;
    return "исполнена (фейк)";
  }

  /** Закрытие позиции/заявки: `closeSandboxOrderAtMarket`. */
  async function closeSandboxOrderAtMarket(order) {
    const sb = ensureSandboxState();
    const orderId = liveOrderRowId(order);
    const idx = sb.orders.findIndex((o) => liveOrderRowId(o) === orderId);
    if (idx < 0) throw new Error("Заявка не найдена.");
    const newest = sb.orders.slice().sort((a, b) => (Date.parse(b.orderDate || 0) || 0) - (Date.parse(a.orderDate || 0) || 0))[0];
    const isNewest = newest && liveOrderRowId(newest) === orderId;
    if (isNewest && order.revertSnap) {
      restoreSandboxSnapshot(sb, order.revertSnap);
      markTradeHistoryCancelled(orderId);
      sb.orders.splice(idx, 1);
    } else {
      const invDir = isOrderBuy(order) ? "ORDER_DIRECTION_SELL" : "ORDER_DIRECTION_BUY";
      const lots = Math.max(1, Math.floor(+(order.lotsExecuted ?? order.lotsRequested ?? 0)));
      await simulateSandboxOrder(order.instrumentId, invDir, lots, order.sec || order.ticker, {
        market: order.market || "shares",
        orderType: "market",
        skipRecord: true
      });
      markTradeHistoryCancelled(orderId);
      sb.orders.splice(idx, 1);
    }
    await updateSandboxPortfolioDisplay({ skipCharts: true, fetchPrices: false });
    renderLiveOrdersPanel();
    syncSandboxPositionsTable();
  }

  /** Закрытие позиции/заявки: `closeRealOrderAtMarket`. */
  async function closeRealOrderAtMarket(order) {
    if (!(await ensureTbankTokenUnlocked())) throw new Error("Расшифруйте токен T-Bank.");
    if (!state.tbank.selectedAccountId) await loadTbankAccounts();
    if (liveOrderCancellable(order, false)) {
      await getBroker().cancelOrder(order.orderId, order.orderRequestId || order.orderId);
      markTradeHistoryCancelled(liveOrderRowId(order));
      return;
    }
    const invDir = isOrderBuy(order) ? "ORDER_DIRECTION_SELL" : "ORDER_DIRECTION_BUY";
    const lots = Math.max(1, Math.floor(+(order.lotsExecuted ?? order.lotsRequested ?? 0)));
    let instrumentId = order.instrumentUid || order.figi || order.instrumentId;
    const ticker = String(order.ticker || order.figi || "").toUpperCase();
    const market = order.market === "futures" ? "futures" : "shares";
    if (!instrumentId && ticker) {
      const ti = await tbankFindInstrument(ticker, market);
      instrumentId = ti?.uid || ti?.figi;
    }
    if (!instrumentId) throw new Error("Нет идентификатора инструмента.");
    const tradable = await tbankValidateTradable(instrumentId, null, "market");
    if (!tradable.ok) throw new Error(`${ticker || instrumentId}: ${tradable.reason}`);
    await postLiveOrder(instrumentId, invDir, lots, ticker, { orderType: "market", market });
  }

  /** Закрытие позиции/заявки: `closeLiveOrderAtMarket`. */
  async function closeLiveOrderAtMarket(orderId) {
    if (!isLiveMode() || !orderId) return;
    const orders = isLiveSandbox()
      ? ensureSandboxState().orders
      : (state.live.orders || []);
    let order = orders.find((o) => liveOrderRowId(o) === String(orderId));
    if (!order) {
      const hist = ensureLiveTradeHistory().find((h) => h.id === String(orderId));
      order = hist?.sourceOrder || hist;
    }
    if (!order) throw new Error("Заявка не найдена.");
    if (!liveOrderCloseable(order)) throw new Error("Заявку нельзя закрыть.");
    if (isLiveSandbox()) {
      await closeSandboxOrderAtMarket(order);
      syncLiveTradingUi();
      noteLiveTech("live-sandbox-close-order", String(orderId));
      return;
    }
    await closeRealOrderAtMarket(order);
    await refreshLiveOrders();
    await refreshLivePortfolioStats();
    await refreshLiveOpenPositions();
    syncLiveTradingUi();
    noteLiveTech("live-close-order", "ok", String(orderId));
  }

  /** Процедура: перенести закрытый объём в sb.closed с расчётом P/L (журнал, не таблица открытых). */
  function pushSandboxClosed(sb, pos, closePieces, closePrice, opts) {
    const options = opts || {};
    const matches = options.matches;
    const pnl = Number.isFinite(options.pnlTotal)
      ? options.pnlTotal
      : (pos.side === "short"
        ? (pos.avgPrice - closePrice) * closePieces
        : (closePrice - pos.avgPrice) * closePieces);
    sb.closed.unshift({
      ticker: pos.ticker,
      sec: pos.sec,
      market: pos.market,
      side: pos.side,
      lots: pos.isFuture ? closePieces : piecesToLots(closePieces, pos.lot),
      pieces: closePieces,
      lot: pos.lot,
      avgPrice: pos.avgPrice,
      closePrice,
      curPrice: closePrice,
      sum: closePieces * closePrice,
      pnl,
      closedAt: new Date().toISOString(),
      isFuture: pos.isFuture,
      instrumentId: pos.instrumentId,
      fake: true,
      matchMode: options.matchMode || sandboxMatchMode(),
      matches: matches ? matches.map((m) => ({ ...m })) : null
    });
    if (sb.closed.length > 200) sb.closed.length = 200;
    if (!options.skipNotify) notifySandboxPositionClose(pos, closePieces, closePrice, pnl);
  }

  /** Подпрограмма `openSandboxPosition`. */
  function openSandboxPosition(sb, pos, side, pieces, price, opts) {
    const options = opts || {};
    const key = sandboxPosKey(pos.market, pos.ticker);
    const hadOpen = sb.open.has(key) && (sb.open.get(key)?.pieces || 0) > 0;
    const legId = pushSandboxLeg(sb, key, side, pieces, price);
    const row = rebuildSandboxOpenFromLegs(sb, key, pos);
    if (!options.skipNotify && !hadOpen && row) notifySandboxPositionOpen(row, price, pieces);
    return legId;
  }

  /**
   * Процедура: изменить открытую фейк-позицию на signedPieceDelta штук (+ лонг / − шорт).
   * Закрытие списывает ранее открытые legs по FIFO или LIFO.
   * @returns {{ role, matches, pnlTotal }}
   */
  function applySandboxSignedDelta(sb, pos, signedPieceDelta, price, opts) {
    const options = opts || {};
    const delta = Math.trunc(+signedPieceDelta || 0);
    if (!delta) return { role: null, matches: [], pnlTotal: 0, legIds: [] };
    const key = sandboxPosKey(pos.market, pos.ticker);
    migrateSandboxOpenToLegs(sb, key);
    const cur = sb.open.get(key);
    const matchMode = options.matchMode || sandboxMatchMode();

    const curSigned = cur ? (cur.side === "short" ? -cur.pieces : cur.pieces) : 0;
    const newSigned = curSigned + delta;
    let role = null;
    let matches = [];
    let pnlTotal = 0;
    let legIds = [];

    if (curSigned === 0) {
      if (delta > 0) {
        legIds = [openSandboxPosition(sb, pos, "long", delta, price, options)];
        role = "open_long";
      } else {
        legIds = [openSandboxPosition(sb, pos, "short", -delta, price, options)];
        role = "open_short";
      }
      return { role, matches, pnlTotal, legIds };
    }

    const curSide = cur.side;

    if (newSigned === 0) {
      const consumed = consumeSandboxLegs(sb, key, curSide, cur.pieces, price, pos, {
        ...options,
        matchMode,
        skipNotify: options.skipNotify
      });
      matches = consumed.matches;
      pnlTotal = consumed.pnlTotal;
      role = curSide === "short" ? "close_short" : "close_long";
      return { role, matches, pnlTotal, legIds };
    }

    if (Math.sign(newSigned) === Math.sign(curSigned)) {
      if (Math.abs(newSigned) > Math.abs(curSigned)) {
        const addPieces = Math.abs(newSigned) - Math.abs(curSigned);
        legIds = [pushSandboxLeg(sb, key, curSide, addPieces, price)];
        rebuildSandboxOpenFromLegs(sb, key, pos);
        role = curSide === "short" ? "add_short" : "add_long";
      } else {
        const closePieces = cur.pieces - Math.abs(newSigned);
        const consumed = consumeSandboxLegs(sb, key, curSide, closePieces, price, pos, {
          ...options,
          matchMode,
          skipNotify: options.skipNotify
        });
        matches = consumed.matches;
        pnlTotal = consumed.pnlTotal;
        role = curSide === "short" ? "close_short" : "close_long";
      }
      return { role, matches, pnlTotal, legIds };
    }

    const consumed = consumeSandboxLegs(sb, key, curSide, cur.pieces, price, pos, {
      ...options,
      matchMode,
      skipNotify: options.skipNotify
    });
    matches = consumed.matches;
    pnlTotal = consumed.pnlTotal;
    const flipPieces = Math.abs(newSigned);
    const flipSide = newSigned > 0 ? "long" : "short";
    legIds = [openSandboxPosition(sb, pos, flipSide, flipPieces, price, { ...options, skipNotify: true })];
    role = "flip";
    return { role, matches, pnlTotal, legIds };
  }

  /**
   * Процедура (async): исполнить заявку в песочнице — цена как у реальной,
   * правка cash/open/closed/commissionTotal, без API брокера.
   */
  async function simulateSandboxOrder(instrumentId, direction, lots, secForPrice, options) {
    const opts = options || {};
    const qty = Math.max(0, Math.floor(+lots || 0));
    if (!instrumentId || qty <= 0) return null;
    const sb = ensureSandboxState();
    if (!Number.isFinite(sb.startPortfolio)) {
      sb.startPortfolio = state.live.realPortfolioValue ?? state.live.portfolioValue ?? (+$("vol-deposit")?.value || 0);
    }
    ensureSandboxCash(sb);
    const revertSnap = snapshotSandboxState(sb);
    const market = opts.market === "futures" ? "futures" : "shares";
    let meta = null;
    if (instrumentId && !String(instrumentId).startsWith("sandbox:")) {
      try { meta = await tbankGetInstrumentById(instrumentId); } catch (_) { /* optional */ }
      if (!meta) {
        try { meta = await tbankFindInstrument(secForPrice, market); } catch (_) { /* optional */ }
      }
    }
    const lot = Math.max(1, +meta?.lot || 1);
    const ticker = String(meta?.ticker || secForPrice || "").toUpperCase();
    const isFuture = market === "futures";
    const orderType = opts.orderType === "limit" || opts.orderType === "market"
      ? opts.orderType
      : liveOrderTypeUi();
    let price = opts.limitPrice != null && opts.limitPrice !== "" ? +opts.limitPrice : NaN;
    if (!Number.isFinite(price) || price <= 0) {
      price = await resolveOrderPrice(instrumentId, secForPrice, market);
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Нет цены для фейк-заявки (${ticker || secForPrice}).`);
    }
    const isBuy = direction === "ORDER_DIRECTION_BUY";
    const pieceDelta = isFuture
      ? (isBuy ? qty : -qty)
      : (isBuy ? qty * lot : -(qty * lot));
    const notional = Math.abs(pieceDelta) * price;
    const fee = sandboxCommissionFee(notional);
    const posMeta = { ticker, sec: secForPrice || ticker, market, instrumentId, lot, isFuture };
    const tradeSource = opts.tradeSource || "robot";
    const tradeSourceLabel = opts.tradeSourceLabel || resolveTradeSourceLabel(tradeSource);
    assertSandboxOrderWithinPortfolioCap(sb, posMeta, pieceDelta, price, volConfig());
    const orderId = opts.skipRecord
      ? null
      : (`fake-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    let fill = null;

    try {
      fill = appendSandboxFill(sb, {
        orderId,
        key: sandboxPosKey(market, ticker),
        ticker,
        sec: secForPrice || ticker,
        market,
        instrumentId,
        lot,
        isFuture,
        signedPieces: pieceDelta,
        price,
        fee,
        direction,
        lots: qty,
        tradeSource,
        tradeSourceLabel
      });
      rebuildSandboxFromLedger(sb);
      if (!opts.skipRecord && !opts.skipNotify) sandboxNotifyForFillTrade(fill, posMeta);
    } catch (err) {
      restoreSandboxSnapshot(sb, revertSnap);
      throw err;
    }

    if (!opts.skipRecord) {
      recordSandboxOrder({
        orderId,
        ticker,
        direction,
        lots: qty,
        orderType,
        price,
        notional,
        fee,
        instrumentId,
        market,
        sec: secForPrice || ticker,
        revertSnap,
        tradeRole: fill?.tradeRole,
        tradeMatches: fill?.tradeMatches,
        tradePnl: fill?.tradePnl,
        matchMode: sandboxMatchMode(),
        signedPieces: pieceDelta,
        lot,
        openLegIds: fill?.openLegIds,
        tradeSource,
        tradeSourceLabel
      });
      renderLiveOrdersPanel();
      syncSandboxPositionsTable();
      noteLiveTech("live-sandbox-order", `${ticker} ${isBuy ? "buy" : "sell"} ${qty} lot @ ${fmt(price, 2)} · ${fmt(notional, 0)} ₽`);
      queueLiveChartsRefresh();
    }
    return { orderId, fake: true };
  }

  /** Функция (async): PostOrder брокера или simulateSandboxOrder, если включена песочница. */
  async function postLiveOrder(instrumentId, direction, lots, secForPrice, options) {
    const opts = options || {};
    let result;
    if (isLiveSandbox()) {
      result = await simulateSandboxOrder(instrumentId, direction, lots, secForPrice, opts);
    } else {
      const qty = Math.max(0, Math.floor(+lots || 0));
      const market = opts.market === "futures" ? "futures" : "shares";
      let lot = 1;
      let meta = null;
      try { meta = await tbankGetInstrumentById(instrumentId); } catch (_) { /* optional */ }
      lot = Math.max(1, +meta?.lot || 1);
      let price = opts.limitPrice != null && opts.limitPrice !== "" ? +opts.limitPrice : NaN;
      if (!Number.isFinite(price) || price <= 0) {
        price = await resolveOrderPrice(instrumentId, secForPrice, market);
      }
      const orderType = opts.orderType === "limit" || opts.orderType === "market"
        ? opts.orderType
        : liveOrderTypeUi();
      result = await tbankPostOrder(instrumentId, direction, lots, secForPrice, opts);
      if (!opts.skipRecord && result) {
        recordRealOrderToTradeHistory(result, {
          orderId: result.orderId,
          instrumentId,
          direction,
          lots: qty,
          secForPrice,
          market,
          orderType,
          price: Number.isFinite(price) ? price : null,
          lot,
          ticker: String(meta?.ticker || secForPrice || "").toUpperCase(),
          tradeSource: opts.tradeSource || "robot",
          tradeSourceLabel: opts.tradeSourceLabel
        });
        try {
          await syncRealTradeHistoryFromBroker();
        } catch (_) { /* broker ops may lag */ }
        renderLiveOrdersPanel();
      }
    }
    if (!opts.skipRecord) {
      if (result || isLiveSandbox()) {
        recordLiveOrderMarker(
          secForPrice,
          direction,
          opts.orderType || liveOrderTypeUi(),
          { lots, price: opts.limitPrice }
        );
        queueLiveChartsRefresh();
      }
    }
    return result;
  }

  /** Процедура (async): пересчитать live-portfolio-value = свободный cash + рыночная стоимость открытых фейк-поз. */
  async function updateSandboxPortfolioDisplay(opts) {
    if (!isLiveSandbox()) return;
    const options = opts || {};
    const sb = ensureSandboxState();
    if (!Number.isFinite(sb.startPortfolio)) {
      sb.startPortfolio = state.live.realPortfolioValue ?? state.live.portfolioValue ?? (+$("vol-deposit")?.value || 0);
    }
    ensureSandboxCash(sb);
    if (sb.ledger?.length) rebuildSandboxFromLedger(sb);
    let mtm = 0;
    for (const pos of sb.open.values()) {
      let cur = sandboxLocalPrice(pos);
      if (!Number.isFinite(cur) && options.fetchPrices !== false) {
        cur = await resolveOrderPrice(pos.instrumentId, pos.sec, pos.market);
      }
      if (!Number.isFinite(cur)) cur = pos.avgPrice;
      pos.curPrice = cur;
      const sign = pos.side === "short" ? -1 : 1;
      mtm += sign * pos.pieces * cur;
    }
    state.live.portfolioValue = (sb.cash || 0) + mtm;
    state.live.sandboxPositionsValue = mtm;
    state.live.freeCashRub = sb.cash;
    state.live.commissionPaid = sb.commissionTotal || 0;
    snapshotLiveSessionPortfolioBaseline();
    renderLivePortfolioStats();
    if (!options.skipCharts) queueLiveChartsRefresh();
  }

  /** Процедура (async): включить песочницу — зафиксировать startPortfolio, очистить фейк-состояние. */
  async function enableLiveSandbox() {
    const hasStored = !!safeStorageGet(TBANK_TOKEN_STORE_KEY);
    if (hasStored && !state.tbank.token) {
      await ensureTbankTokenUnlocked({ interactive: false, openUi: false });
    }
    try {
      const portfolio = state.tbank.selectedAccountId
        ? await tbankRequest("OperationsService/GetPortfolio", {
          accountId: state.tbank.selectedAccountId,
          currency: "RUB"
        })
        : null;
      state.live.realPortfolioValue = portfolio
        ? moneyValueRub(portfolio.totalAmountPortfolio)
        : (+$("vol-deposit")?.value || 0);
    } catch (_) {
      state.live.realPortfolioValue = state.live.portfolioValue ?? (+$("vol-deposit")?.value || 0);
    }
    const sb = ensureSandboxState();
    sb.startPortfolio = state.live.realPortfolioValue ?? 0;
    sb.cash = sb.startPortfolio;
    sb.cashDelta = 0;
    sb.commissionTotal = 0;
    sb.open.clear();
    ensureSandboxOpenLegs(sb);
    sb.openLegs.clear();
    sb.nextLegId = 0;
    ensureSandboxLedger(sb);
    sb.ledger.length = 0;
    sb.nextFillId = 0;
    sb.closed.length = 0;
    sb.orders.length = 0;
    state.live.portfolioValue = sb.startPortfolio;
    state.live.commissionPaid = 0;
    if (state.live.chartSession) {
      state.live.chartSession.portfolioBaseline = sb.startPortfolio;
      resetSandboxStopperWatch();
    }
    await updateSandboxPortfolioDisplay();
    renderLiveOrdersPanel();
    renderLivePositionsPanel();
    noteLiveTech("live-sandbox", "enabled", `start=${sb.startPortfolio}`);
  }

  /** Сброс baseline позиций для фильтра «только сессия» после смены песочница ↔ реал. */
  async function resetLiveSessionPositionBaseline() {
    if (!state.live.active) return;
    try {
      if (isLiveSandbox()) {
        state.live.sessionPositionBaseline = sandboxPositionsByTicker();
      } else if (state.tbank.token && state.tbank.selectedAccountId
        && (await ensureTbankTokenUnlocked({ interactive: false, openUi: false }))) {
        state.live.sessionPositionBaseline = await tbankPositionsByTicker();
      } else {
        state.live.sessionPositionBaseline = null;
      }
    } catch (err) {
      state.live.sessionPositionBaseline = isLiveSandbox() ? sandboxPositionsByTicker() : null;
      noteLiveTech("live-session-baseline", err.message);
    }
  }

  /** Процедура (async): выключить песочницу — очистить фейк, вернуть реальный портфель T-Bank. */
  async function disableLiveSandbox() {
    purgeSandboxTradeHistory();
    const sb = ensureSandboxState();
    sb.startPortfolio = null;
    sb.cash = null;
    sb.cashDelta = 0;
    sb.commissionTotal = 0;
    sb.open.clear();
    ensureSandboxOpenLegs(sb);
    sb.openLegs.clear();
    sb.nextLegId = 0;
    ensureSandboxLedger(sb);
    sb.ledger.length = 0;
    sb.nextFillId = 0;
    sb.closed.length = 0;
    sb.orders.length = 0;
    state.live.sandboxPositionsValue = null;
    state.live.openPositions = [];
    if (state.tbank.token && state.tbank.selectedAccountId) {
      await refreshLivePortfolioStats();
      await refreshLiveOpenPositions();
      await refreshLiveOrders();
    } else {
      state.live.freeCashRub = null;
      state.live.commissionPaid = null;
      if (Number.isFinite(state.live.realPortfolioValue)) {
        state.live.portfolioValue = state.live.realPortfolioValue;
      }
      renderLivePortfolioStats();
      renderLivePositionsPanel();
      renderLiveOrdersPanel();
    }
    noteLiveTech("live-sandbox", "disabled");
  }

  /** Процедура (async): обработчик галочки «Песочница (фейк)». */
  async function onLiveSandboxToggle() {
    const on = !!$("live-sandbox-mode")?.checked;
    if (state.live.active) recordLiveModeRegionSwitch();
    if (on) {
      await enableLiveSandbox();
      resetSandboxStopperWatch();
      state.live.lastError = "";
      if (state.live.active) {
        await resetLiveSessionPositionBaseline();
        await updateSandboxPortfolioDisplay();
        try {
          await liveTradingReconcile();
        } catch (err) {
          state.live.lastError = err.message;
        }
      }
    } else {
      await disableLiveSandbox();
      if (state.live.active) {
        const unlocked = await ensureTbankTokenUnlocked({ interactive: true, openUi: true });
        if (unlocked) {
          if (!state.tbank.selectedAccountId) await loadTbankAccounts();
          await resetLiveSessionPositionBaseline();
          await refreshLivePortfolioStats();
          await refreshLiveOrders();
          startLiveStatsPoll();
          state.live.lastError = "";
          try {
            await liveTradingReconcile();
          } catch (err) {
            state.live.lastError = err.message;
          }
        } else {
          state.live.lastError = "Реальная торговля: расшифруйте токен T-Bank (пароль в настройках счёта).";
        }
      }
    }
    saveConfig();
    syncLiveTradingUi();
    void bootstrapLiveChartsSession({ reason: "sandbox-toggle" });
  }

  /** Запись причины, по которой reconcile не запустился или не отправил заявки. */
  function noteLiveReconcileAbort(reason, detail) {
    state.live.lastReconcileAbort = {
      at: new Date().toISOString(),
      reason: String(reason || "—"),
      detail: detail || ""
    };
    noteLiveTech("live-reconcile-abort", reason, detail);
  }

  function tbankPostOrderRejected(data) {
    return getBroker().postOrderRejected(data);
  }

  async function tbankPostOrder(instrumentId, direction, lots, secForPrice, options) {
    return getBroker().postOrder(instrumentId, direction, lots, secForPrice, options);
  }

  /** Разбор строки/времени/ключа: `parseLiveManualInstrumentKey`. */
  function parseLiveManualInstrumentKey(key) {
    const raw = String(key || "").trim();
    if (!raw) return null;
    const sep = raw.indexOf(":");
    if (sep <= 0) return { market: "shares", sec: raw };
    return { market: raw.slice(0, sep), sec: raw.slice(sep + 1) };
  }

  /** Заполнение select/списка: `fillLiveTradingInstrumentSelect`. */
  function fillLiveTradingInstrumentSelect(sel, restoredKey) {
    if (!sel) return;
    const prev = sel.value || restoredKey || "";
    const items = selectedInstruments();
    sel.innerHTML = "";
    if (!items.length) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "— выберите бумаги в калькуляторе —";
      sel.appendChild(o);
      sel.disabled = true;
      return;
    }
    for (const i of items) {
      const o = document.createElement("option");
      o.value = `${i.market}:${i.sec}`;
      o.textContent = i.market === "futures" ? `${i.sec} (фьюч)` : i.sec;
      sel.appendChild(o);
    }
    sel.disabled = !isLiveMode() || state.uiBusy;
    if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
  }

  /** Заполнение select/списка: `fillLiveTradingInstrumentSelects`. */
  function fillLiveTradingInstrumentSelects() {
    fillLiveTradingInstrumentSelect($("live-manual-sec"), state.restoredManualSec);
    state.restoredManualSec = "";
    fillLiveTradingInstrumentSelect($("live-order-book-sec"), state.restoredOrderBookSec);
    state.restoredOrderBookSec = "";
  }

  /** Заполнение select/списка: `fillManualOrderFromOrderBook`. */
  function fillManualOrderFromOrderBook(side, price) {
    const obKey = $("live-order-book-sec")?.value || "";
    const picked = parseLiveManualInstrumentKey(obKey);
    const statusEl = $("live-manual-order-status");
    if (!picked?.sec) {
      if (statusEl) statusEl.textContent = "Сначала выберите инструмент в «Стакан».";
      return;
    }
    if (!Number.isFinite(price) || price <= 0) return;
    const panel = $("live-manual-order-panel");
    if (panel) panel.open = true;
    syncCollapsibleToggleLabel("live-manual-order-panel", "live-manual-order-toggle");
    syncLiveManualOrderUi();
    const manualSel = $("live-manual-sec");
    if (manualSel && obKey) manualSel.value = obKey;
    $("live-manual-direction").value = side === "sell" ? "sell" : "buy";
    $("live-manual-order-type").value = "limit";
    const priceWrap = $("live-manual-price-wrap");
    if (priceWrap) priceWrap.hidden = false;
    $("live-manual-price").value = String(price);
    state.live.manualPriceSec = obKey;
    $("live-manual-qty").value = "1";
    saveConfig();
    const sideLabel = side === "sell" ? "продажа" : "покупка";
    if (statusEl) {
      statusEl.textContent = `Из стакана: ${picked.sec}, ${sideLabel}, лимит ${fmt(price, 2)} ₽, 1 лот. Нажмите «Выставить заявку».`;
    }
    panel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /** Обработчик события UI: `onLiveOrderBookPriceDblClick`. */
  function onLiveOrderBookPriceDblClick(ev) {
    const cell = ev.target?.closest?.(".live-ob-price-pick");
    if (!cell || !isLiveMode()) return;
    ev.preventDefault();
    const side = cell.dataset.side === "sell" ? "sell" : "buy";
    const price = +cell.dataset.price;
    fillManualOrderFromOrderBook(side, price);
  }

  /** Синхронизация UI/state: `syncLiveManualOrderUi`. */
  function syncLiveManualOrderUi() {
    fillLiveTradingInstrumentSelects();
    const isLive = isLiveMode();
    const lock = state.uiBusy;
    const ids = ["live-manual-sec", "live-order-book-sec", "live-manual-direction", "live-manual-order-type", "live-manual-qty", "live-manual-price", "live-manual-submit"];
    for (const id of ids) {
      const el = $(id);
      if (el) el.disabled = !isLive || lock;
    }
    const isLimit = $("live-manual-order-type")?.value === "limit";
    const priceWrap = $("live-manual-price-wrap");
    if (priceWrap) priceWrap.hidden = !isLimit;
  }

  /** Ручная заявка из панели live (market/limit). */
  async function placeManualLiveOrder() {
    if (!isLiveMode()) return;
    const statusEl = $("live-manual-order-status");
    const btn = $("live-manual-submit");
    if (btn) btn.disabled = true;
    try {
      const sandbox = isLiveSandbox();
      if (sandbox && !Number.isFinite(ensureSandboxState().startPortfolio)) {
        await enableLiveSandbox();
      }
      if (!sandbox && !(await ensureTbankTokenUnlocked())) {
        if (statusEl) statusEl.textContent = "Расшифруйте токен T-Bank.";
        return;
      }
      if (!sandbox) {
        if (!state.tbank.selectedAccountId) await loadTbankAccounts();
        if (!state.tbank.selectedAccountId) throw new Error("Счёт T-Bank не выбран.");
      }
      const picked = parseLiveManualInstrumentKey($("live-manual-sec")?.value);
      if (!picked?.sec) throw new Error("Выберите инструмент из списка калькулятора.");
      const { sec, market } = picked;
      const direction = $("live-manual-direction")?.value === "sell"
        ? "ORDER_DIRECTION_SELL"
        : "ORDER_DIRECTION_BUY";
      const lots = Math.max(0, Math.floor(+($("live-manual-qty")?.value || 0)));
      if (lots <= 0) throw new Error("Укажите количество лотов больше 0.");
      const orderType = $("live-manual-order-type")?.value === "limit" ? "limit" : "market";
      const limitPrice = $("live-manual-price")?.value || "";
      if (orderType === "limit") {
        const px = +String(limitPrice).replace(",", ".");
        if (!Number.isFinite(px) || px <= 0) {
          throw new Error("Укажите цену лимитной заявки (поле «Цена»).");
        }
      }
      let ti = null;
      if (state.tbank.token && (await ensureTbankTokenUnlocked())) {
        ti = await tbankFindInstrument(sec, market);
      }
      let instrumentId;
      if (ti) {
        instrumentId = ti.uid || ti.figi;
      } else if (sandbox) {
        const px = packLastClose(sec, market);
        if (!Number.isFinite(px) || px <= 0) {
          throw new Error(`Нет цены по ${sec} — дождитесь свечей или подключите T-Bank.`);
        }
        instrumentId = `sandbox:${market}:${sec}`;
        ti = { ticker: sec.toUpperCase(), lot: 1, uid: instrumentId };
      } else {
        throw new Error(`${sec}: не найден в T-Bank.`);
      }
      const ticker = String(ti.ticker || sec).toUpperCase();
      if (!sandbox) {
        const tradable = await tbankValidateTradable(instrumentId, ti, orderType);
        if (!tradable.ok) throw new Error(`${ticker}: ${tradable.reason}`);
      }
      if (statusEl) statusEl.textContent = `Отправка ${direction === "ORDER_DIRECTION_BUY" ? "покупки" : "продажи"} ${ticker}, ${lots} лот…`;
      await postLiveOrder(instrumentId, direction, lots, sec, { orderType, limitPrice, market, tradeSource: "manual" });
      const side = direction === "ORDER_DIRECTION_BUY" ? "покупка" : "продажа";
      const otype = orderType === "limit" ? "лимит" : "рынок";
      const okText = sandbox
        ? `Фейк-заявка: ${ticker}, ${side}, ${lots} лот, ${otype}. Портфель пересчитан.`
        : `Заявка отправлена: ${ticker}, ${side}, ${lots} лот, ${otype}.`;
      if (statusEl) statusEl.textContent = okText;
      state.live.lastError = "";
      noteLiveTech("live-manual-order", okText, `sec=${sec} uid=${instrumentId}`);
      saveConfig();
      if (sandbox) await updateSandboxPortfolioDisplay();
      else {
        await refreshLiveOrders();
        await refreshLivePortfolioStats();
      }
      syncLiveTradingUi();
    } catch (err) {
      const msg = err?.message || String(err);
      if (statusEl) statusEl.textContent = `Ошибка: ${msg}`;
      state.live.lastError = msg;
      noteLiveTech("live-manual-order", msg);
      syncLiveTradingUi();
    } finally {
      if (btn) btn.disabled = !isLiveMode() || state.uiBusy;
      syncLiveManualOrderUi();
    }
  }

  /** Отрисовка элемента live-панели: `renderLivePortfolioStats`. */
  function renderLivePortfolioStats() {
    const pv = $("live-portfolio-value");
    const cp = $("live-commission-paid");
    const pvDec = 2;
    if (pv) {
      pv.textContent = Number.isFinite(state.live.portfolioValue)
        ? fmt(state.live.portfolioValue, pvDec)
        : "—";
    }
    renderLiveFreeCashStat();
    renderLiveFinResultStat();
    syncLiveStatsHint();
    if (cp) {
      if (!Number.isFinite(state.live.commissionPaid) || state.live.commissionPaid <= 0) {
        cp.textContent = "0";
      } else {
        cp.textContent = `−${fmt(state.live.commissionPaid, 2)}`;
      }
      cp.style.color = "#b91c1c";
    }
    checkSandboxPortfolioStopperNotify();
  }

  /** Обновление данных с источника: `refreshLivePortfolioStats`. */
  async function refreshLivePortfolioStats() {
    if (!isLiveMode()) return;
    if (isLiveSandbox()) {
      await updateSandboxPortfolioDisplay();
      return;
    }
    if (!state.tbank.token || !state.tbank.selectedAccountId) return;
    try {
      const accountId = state.tbank.selectedAccountId;
      const [portfolio, positions] = await Promise.all([
        tbankRequest("OperationsService/GetPortfolio", { accountId, currency: "RUB" }),
        tbankRequest("OperationsService/GetPositions", { accountId })
      ]);
      state.live.realPortfolioValue = moneyValueRub(portfolio.totalAmountPortfolio);
      state.live.freeCashRub = rubFreeCashFromTbankPositions(positions);
      state.live.portfolioPositions = filterLiveOpenPositionRows(
        await buildTbankPositionRows(portfolio, positions, { sessionOnly: false })
      );
      if (!state.live.realLegSeed?.length) {
        captureRealLegSeedFromPortfolioRows(state.live.portfolioPositions);
      }
      const from = liveBrokerOpsPeriodFrom();
      const ops = await tbankRequest("OperationsService/GetOperations", {
        accountId: state.tbank.selectedAccountId,
        from,
        to: new Date().toISOString(),
        state: "OPERATION_STATE_EXECUTED"
      });
      storeBrokerOperationsRaw(ops.operations || []);
      const enriched = await enrichBrokerOperationsForHistory(state.live.brokerOperationsRaw);
      state.live.brokerOperations = enriched;
      for (const op of enriched) upsertTradeHistoryFromTbankOperation(op);
      reconcileRealBrokerTradeFinresp(enriched);
      state.live.commissionPaid = sumTbankOperationsCommission(state.live.brokerOperationsRaw);
      await recalcLivePortfolioMtmFromCandles();
      snapshotLiveSessionPortfolioBaseline();
      await refreshLiveOpenPositions();
      renderLiveOrdersPanel();
      renderLivePortfolioStats();
    } catch (err) {
      noteLiveTech("live-portfolio", err.message, `account=${state.tbank.selectedAccountId || "—"}`);
    }
  }

  /** Обновление данных с источника: `refreshLiveOrders`. */
  async function refreshLiveOrders() {
    if (!isLiveMode()) return;
    if (isLiveSandbox()) {
      renderLiveOrdersPanel();
      await updateSandboxPortfolioDisplay();
      return;
    }
    if (!state.tbank.token || !state.tbank.selectedAccountId) return;
    try {
      const data = await tbankRequest("OrdersService/GetOrders", {
        accountId: state.tbank.selectedAccountId
      });
      state.live.orders = data.orders || [];
      state.live.lastError = "";
      await refreshLivePortfolioStats();
      renderLiveOrdersPanel();
    } catch (err) {
      state.live.lastError = err.message;
      syncLiveTradingUi();
      noteLiveTech("live-orders", err.message, `account=${state.tbank.selectedAccountId || "—"}`);
    }
  }

  async function tbankPositionsByTicker() {
    return getBroker().positionsByTicker();
  }

  /** Песочница: gross-экспозиция открытых позиций в контексте createPortfolioCap. */
  function sandboxPortfolioCapState(sb, vol) {
    const cap = E.createPortfolioCap(vol);
    for (const pos of sb.open.values()) {
      const px = pos.curPrice || pos.avgPrice || 0;
      const pieces = pos.side === "short" ? -Math.abs(+pos.pieces || 0) : Math.abs(+pos.pieces || 0);
      cap.setPos(pos.sec || pos.ticker, pieces, px);
    }
    return cap;
  }

  /** Проверка: заявка не увеличивает gross выше портфельного лимита. */
  function assertSandboxOrderWithinPortfolioCap(sb, posMeta, pieceDelta, price, vol) {
    const delta = +pieceDelta || 0;
    if (!delta || !Number.isFinite(price) || price <= 0) return;
    const cap = sandboxPortfolioCapState(sb, vol);
    const sec = posMeta.sec || posMeta.ticker;
    cap.setPrice(sec, price);
    const key = sandboxPosKey(posMeta.market, posMeta.ticker);
    const cur = sb.open.get(key);
    const curSigned = cur ? (cur.side === "short" ? -cur.pieces : cur.pieces) : 0;
    const newSigned = curSigned + delta;
    const curExp = Math.abs(curSigned) * price;
    const newExp = Math.abs(newSigned) * price;
    if (newExp <= curExp + 1e-6) return;
    const clipped = cap.clampTargetPos(sec, price, newSigned);
    if (Math.abs(clipped) + 1e-6 < Math.abs(newSigned)) {
      const capRub = E.portfolioGrossCapRub(vol);
      throw new Error(
        `Портфельный лимит: суммарная позиция ≤ ${fmt(capRub, 0)} ₽ (депозит × Max positions × Volume%).`
      );
    }
  }

  /** Нужна ли заявка: не считать «выровнено», если цель — новая позиция с нуля. */
  function reconcileNeedsTrade(targetPieces, currentPieces, delta, lot) {
    if (!Number.isFinite(delta) || Math.abs(delta) < 1e-9) return false;
    const tgt = +targetPieces || 0;
    const cur = +currentPieces || 0;
    const lotSz = Math.max(1, +lot || 1);
    if (Math.abs(tgt) > 1e-9 && Math.abs(cur) < 1e-9) return true;
    return Math.abs(tgt - cur) >= lotSz * 0.45;
  }

  /** Live-торговля: `liveReconcileTargets`. */
  function liveReconcileTargets() {
    const rows = state.lastResult?.perSec || [];
    if (!state.live.manualFlatten) return rows;
    return rows.map((p) => ({ ...p, pos: 0 }));
  }

  /** Проверка булева условия: `isLiveObTrendGateEnabled`. */
  function isLiveObTrendGateEnabled() {
    return isLiveMode() && !!state.live.obTrendConfirm;
  }

  /** Подпрограмма `activeLogicLineRaw`. */
  function activeLogicLineRaw() {
    const key = primaryLogicId();
    return state.customLines?.[key] || E.DEFAULT_LOGIC_LINES?.[key] || "";
  }

  /** Live-торговля: `liveObTrendGateRequired`. */
  function liveObTrendGateRequired() {
    if (!isLiveObTrendGateEnabled()) return false;
    return E.logicUsesObTrend(activeLogicLineRaw());
  }

  async function tbankFetchOrderBookCached(instrumentId) {
    return getBroker().fetchOrderBookCached(instrumentId);
  }

  /** Live-торговля: `liveObTrendAllowsOrder`. */
  async function liveObTrendAllowsOrder(instrumentId, direction) {
    if (!liveObTrendGateRequired()) return { ok: true, skipped: true };
    if (isLiveSandbox() && !state.tbank.token) {
      return { ok: true, skipped: true, reason: "песочница без T-Bank — @OBT пропущен" };
    }
    const line = activeLogicLineRaw();
    const logicKey = primaryLogicId();
    const mode = E.detectObTrendMode(line, logicKey);
    const tradeSide = direction === "ORDER_DIRECTION_SELL" ? "sell" : "buy";
    try {
      const ob = await tbankFetchOrderBookCached(instrumentId);
      const verdict = E.evaluateOrderBookTrend(ob, tradeSide, mode);
      return { ...verdict, mode, tradeSide, logicKey };
    } catch (err) {
      if (isLiveSandbox()) {
        return { ok: true, skipped: true, reason: err?.message || String(err) };
      }
      return { ok: false, reason: err?.message || String(err), mode, tradeSide, logicKey };
    }
  }

  /** Подпрограмма `tfDurationMs`. */
  function tfDurationMs(tf) {
    const map = {
      "1": 60000,
      "5": 300000,
      "10": 600000,
      "15": 900000,
      "60": 3600000,
      "24": 86400000
    };
    return map[String(tf)] || 3600000;
  }

  /** Сколько инструментов имеют хотя бы одну свечу в state.packs. */
  function liveCandlePackCount(packs) {
    let n = 0;
    for (const pack of packs || []) {
      if (pack?.length) n += 1;
    }
    return n;
  }

  /** Live-торговля: `liveHasAnyCandles`. */
  function liveHasAnyCandles() {
    return liveCandlePackCount(state.packs) > 0;
  }

  /** FINRESP ещё не посчитан после старта торговли. */
  function isLiveFinrespBootstrapPending() {
    return !!state.live.active && !(state.lastResult?.perSec?.length);
  }

  /** Первые минуты после старта live-торговли — не считать задержкой опроса/FINRESP. */
  function isLiveBootstrapWindow(nowMs) {
    const t0 = state.live.tradingStartedAt
      || state.live.sessionStartedAt
      || state.live.chartSession?.startedAt;
    if (!t0) return false;
    const tf = $("calc-tf")?.value || "60";
    const bootMs = Math.max(300000, tfDurationMs(tf) * 3);
    const elapsed = (nowMs ?? Date.now()) - new Date(t0).getTime();
    return elapsed >= 0 && elapsed < bootMs;
  }

  /** Не ругаться на «нет свечей» первый TF после старта live-сессии. */
  function liveCandleDelayGraceUntilMs() {
    const cs = state.live.chartSession;
    if (!cs?.startedAt) return 0;
    const tf = $("calc-tf")?.value || "60";
    const t0 = new Date(cs.startedAt).getTime();
    return Number.isFinite(t0) ? t0 + tfDurationMs(tf) : 0;
  }

  /** Подпрограмма `inLiveCandleGracePeriod`. */
  function inLiveCandleGracePeriod(nowMs) {
    const until = liveCandleDelayGraceUntilMs();
    return until > 0 && (nowMs ?? Date.now()) < until;
  }

  /** Задержка live-свечей: >2×TF по времени бара или >2 мин без успешного опроса. */
  function assessLiveCandleDelay() {
    const tf = $("calc-tf")?.value || "60";
    const tfMs = tfDurationMs(tf);
    const maxBarLagMs = 2 * tfMs;
    const maxPollGapMs = 120000;
    const now = Date.now();
    const liveOn = isLiveMode() && (state.live.active || state.live.chartSession);
    if (!liveOn) return { stale: false, message: "" };

    const hasCandles = liveHasAnyCandles();
    const inGrace = inLiveCandleGracePeriod(now);
    const refreshMs = state.live.lastCandleRefreshAt
      ? new Date(state.live.lastCandleRefreshAt).getTime()
      : NaN;
    const pollGapMs = Number.isFinite(refreshMs) ? now - refreshMs : Infinity;
    const { freshest } = liveMoexBarTimes(state.packs);
    const barMs = parseMoexTime(freshest)?.getTime();
    const barLagMs = Number.isFinite(barMs) ? now - barMs : Infinity;
    const src = state.live.candleSource === "tbank" ? "T-Bank" : (state.live.candleSource === "cache" ? "кэш" : "MOEX");

    if (!hasCandles) {
      if (inGrace) return { stale: false, message: "" };
      if (pollGapMs <= maxPollGapMs && state.live.candleRefreshBusy) {
        return { stale: false, message: "" };
      }
      return {
        stale: true,
        message: `Задержка: нет свечей (${src}). Проверьте токен, источник и выбранные тикеры.`
      };
    }

    if (pollGapMs > maxPollGapMs) {
      if (state.live.candleRefreshBusy
        || (isLiveFinrespBootstrapPending() && isLiveBootstrapWindow(now))) {
        return { stale: false, message: "" };
      }
      const min = Math.max(1, Math.round(pollGapMs / 60000));
      return {
        stale: true,
        message: `Задержка: нет ответа ${src} ${min} мин (опрос каждые ~${Math.round(liveCandlePollIntervalMs(tf) / 1000)} с).`
      };
    }

    if (Number.isFinite(barLagMs) && barLagMs > maxBarLagMs) {
      const tfLag = Math.max(1, Math.round((barLagMs / tfMs) * 10) / 10);
      return {
        stale: true,
        message: `Задержка свечей: последний бар ${formatMoexBarTime(freshest)} · отставание ~${tfLag} TF (норма ≤2 TF).`
      };
    }

    return { stale: false, message: "" };
  }

  /** Синхронизация UI/state: `syncLiveCandleDelayUi`. */
  function syncLiveCandleDelayUi(isLive) {
    const panel = $("live-trading-panel");
    const alertEl = $("live-candle-delay-alert");
    const delay = isLive ? assessLiveCandleDelay() : { stale: false, message: "" };
    if (panel) panel.classList.toggle("live-trading-panel--candle-stale", !!delay.stale);
    if (alertEl) {
      alertEl.hidden = !delay.stale;
      alertEl.textContent = delay.stale ? delay.message : "";
    }
  }

  /** Live-торговля: `liveCandlePollIntervalMs`. */
  function liveCandlePollIntervalMs(tf) {
    if (tf === "1") return 30000;
    if (tf === "5") return 45000;
    if (tf === "10" || tf === "15") return 60000;
    if (tf === "60") return 120000;
    return 300000;
  }

  /** Live-торговля: `liveCandleStreamRange`. */
  function liveCandleStreamRange(instruments) {
    const interval = $("calc-tf").value;
    const n = Math.max(1, instruments?.length || 1);
    const till = formatDay(todayDate());
    const maxD = maxCalcDays(interval, n);
    let from = formatDay(addDays(todayDate(), -(maxD - 1)));
    if (!isLiveMode()) {
      $("calc-till").value = till;
      from = $("calc-from").value;
      const minFrom = formatDay(addDays(todayDate(), -(maxD - 1)));
      if (!from || parseDay(from) < parseDay(minFrom)) {
        from = minFrom;
        $("calc-from").value = from;
      }
    }
    return { from, till, interval };
  }

  /** Применение настроек/результата: `applyCalcWindowIndices`. */
  function applyCalcWindowIndices(a, b, pack) {
    const p = pack || refPack();
    const n = p.length;
    if (!n) return;
    let ai = Math.max(0, Math.min(+a || 0, n - 1));
    let bi = Math.max(ai, Math.min(+b || 0, n - 1));
    if (bi - ai < 2) {
      bi = Math.min(n - 1, ai + 2);
      if (bi - ai < 2) ai = Math.max(0, bi - 2);
    }
    $("calc-start").value = ai;
    $("calc-end").value = bi;
    state.anchorStartTime = p[ai]?.time ?? state.anchorStartTime;
    state.anchorEndTime = p[bi]?.time ?? state.anchorEndTime;
    state.hasWindow = true;
    $("calc-start-label").textContent = p[ai]?.time || "—";
    $("calc-end-label").textContent = p[bi]?.time || "—";
  }

  /** Сброс состояния: `resetLiveWindowToCommonOverlap`. */
  function resetLiveWindowToCommonOverlap() {
    const pack = refPack();
    if (!pack.length) return false;
    const maxBars = currentLimit().maxBars;
    const common = commonTimeRange(state.packs);
    let b = pack.length - 1;
    let a;
    if (common && common.start <= common.end) {
      a = findFirstIndexAtOrAfter(pack, common.start);
      b = findLastIndexAtOrBefore(pack, common.end);
      if (a > b) {
        b = pack.length - 1;
        a = Math.max(0, b - MIN_WARMUP_BARS + 1);
      }
    } else {
      a = Math.max(0, b - MIN_WARMUP_BARS + 1);
    }
    if (b - a + 1 > maxBars) a = Math.max(0, b - maxBars + 1);
    applyCalcWindowIndices(a, b, pack);
    return true;
  }

  /** Подпрограмма `timeToMs`. */
  function timeToMs(t) {
    if (!t) return NaN;
    return new Date(String(t).replace(" ", "T")).getTime();
  }

  /** Проверка булева условия: `isLiveTradingSession`. */
  function isLiveTradingSession() {
    return isLiveMode() && !!state.live.chartSession;
  }

  /** Live-торговля: `liveSessionStartTime`. */
  function liveSessionStartTime() {
    const cs = state.live.chartSession;
    return cs?.sessionBarTime || cs?.startedAt || state.live.sessionStartedAt || null;
  }

  /** Подпрограмма `anchorLiveSessionBarIndex`. */
  function anchorLiveSessionBarIndex() {
    const cs = state.live.chartSession;
    if (!cs || cs.sessionBarAnchored) return;
    const pack = refPack();
    if (!pack.length) return;
    const idx = pack.length - 1;
    cs.sessionBarIndex = idx;
    cs.sessionBarTime = pack[idx]?.time || cs.startedAt;
    cs.sessionBarAnchored = true;
  }

  /** Сброс baseline FINRESP/equity live-сессии перед новым расчётом/отрисовкой. */
  function resetLiveSessionChartBaselines() {
    const cs = state.live.chartSession;
    if (!cs) return;
    cs.finrespBaseline = null;
    cs.commissionBaseline = null;
    cs.equityBaselines = {};
    cs.perSecBaselines = {};
  }

  /** Подпрограмма `pinLiveSessionEquityWindow`. */
  function pinLiveSessionEquityWindow() {
    const pack = refPack();
    if (!pack.length) return false;
    anchorLiveSessionBarIndex();
    const cs = state.live.chartSession;
    let a = cs?.sessionBarIndex;
    const b = pack.length - 1;
    if (a == null) {
      a = b;
      if (cs) {
        cs.sessionBarIndex = b;
        cs.sessionBarTime = pack[b]?.time || cs.startedAt;
        cs.sessionBarAnchored = true;
      }
    }
    if (a > b) a = b;
    applyCalcWindowIndices(a, b, pack);
    return true;
  }

  /** Синхронизация UI/state: `syncLivePeriodControls`. */
  function syncLivePeriodControls() {
    const live = isLiveMode();
    $("calc-from")?.closest(".calc-field")?.classList.toggle("live-mode-hidden", live);
    $("calc-till")?.closest(".calc-field")?.classList.toggle("live-mode-hidden", live);
    $("calc-month")?.closest(".calc-field")?.classList.toggle("live-mode-hidden", live);
    $("calc-run")?.classList.toggle("live-mode-hidden", live);
    $("calc-select-positive")?.classList.toggle("live-mode-hidden", live);
    document.querySelector(".range-grid")?.classList.toggle("live-mode-hidden", live);
  }

  /** Live-торговля: `liveChartSessionNote`. */
  function liveChartSessionNote() {
    const t = formatMoexBarTime(liveSessionStartTime()) || "—";
    const modeHint = isLiveSandbox()
      ? "Зелёная область — песочница. Equity — модель FINRESP."
      : "Розовая область — реальная торговля. Графики equity/FINRESP — модель по сигналам; портфель и журнал — только после исполнения заявок T-Bank.";
    return `Live-сессия с ${t}: графики с момента выбора «Реальная торговля». ${modeHint} Синяя линия — покупка, оранжевая — продажа; SL/TP — красная/зелёная.`;
  }

  /** Подпрограмма `recordLiveOrderMarker`. */
  function recordLiveOrderMarker(sec, direction, orderType, extras) {
    const cs = state.live.chartSession;
    if (!cs) return;
    const key = String(sec || "").toUpperCase();
    if (!key) return;
    const pack = state.packs.find((c) => String(c[0]?.sec || "").toUpperCase() === key);
    const barTime = pack?.length ? pack.at(-1)?.time : (refPack().at(-1)?.time || null);
    cs.orderMarkers = cs.orderMarkers || [];
    cs.orderMarkers.push({
      sec: key,
      time: barTime,
      at: new Date().toISOString(),
      direction: direction === "ORDER_DIRECTION_BUY" ? "buy" : "sell",
      orderType: orderType || "market",
      lots: extras?.lots,
      price: extras?.price
    });
    if (cs.orderMarkers.length > 300) cs.orderMarkers.splice(0, cs.orderMarkers.length - 300);
  }

  /** Заявка/ордер: `orderMarkersForChart`. */
  function orderMarkersForChart(sec, rows) {
    if (!rows?.length || !state.live.chartSession?.orderMarkers?.length) return [];
    const key = String(sec || "").toUpperCase();
    const out = [];
    for (const m of state.live.chartSession.orderMarkers) {
      if (m.sec !== key) continue;
      let idx = m.time ? rowIndexByTime(rows, m.time) : -1;
      if (idx < 0) idx = rows.length - 1;
      const kind = m.direction === "buy" ? "order-buy" : "order-sell";
      const side = m.direction === "buy" ? "Покупка" : "Продажа";
      const tip = `${side}${m.lots ? ` ${m.lots} л` : ""}${m.orderType === "limit" ? " лимит" : ""}`;
      out.push({ idx, kind, scope: "order", label: tip });
    }
    return out;
  }

  /** Заглушки графиков до старта торговли или без данных. */
  function drawLiveChartPlaceholders() {
    const instruments = selectedInstruments();
    const chartBox = $("calc-chart");
    if (!instruments.length) {
      syncChartBox(chartBox, "<p class=\"note\">Live: выберите инструменты в списке бумаг.</p>");
      return;
    }
    const note = `<p class="note">${liveChartSessionNote()}</p>`;
    const blocks = instruments.map((inst) => {
      const sec = inst.sec;
      const key = String(sec).toUpperCase();
      const pack = state.packs.find((c) => String(c[0]?.sec || "").toUpperCase() === key);
      const hasOrders = (state.live.chartSession?.orderMarkers || []).some((m) => m.sec === key);
      const msg = pack?.length
        ? "Ожидание свечей live-сессии…"
        : (hasOrders ? "Заявка отмечена — ждём свечи для графика" : "Загрузка свечей…");
      return `<div class="chart-mini"><p class="chart-sec-title">${sec}</p><div class="chart-mini-empty">${msg}</div></div>`;
    });
    syncChartBox(chartBox, `${note}<div class="chart-stack">${blocks.join("")}</div>`);
  }

  /** Отрисовка SVG/графика: `drawLiveEquityPlaceholders`. */
  function drawLiveEquityPlaceholders() {
    const box = $("calc-chart-equity");
    if (!box) return;
    const catalogKeys = equityCatalogLogicKeys();
    const activeKeys = selectedEquityLogicKeys();
    const finrespBlock = `<div class="chart-equity-total chart-equity-total--finresp">
<p class="chart-sec-title chart-sec-title--finresp">${finrespEquityTitle()}</p>
<div class="chart-mini-empty">Equity = FINRESP Σ — ждём свечи…</div>
</div>`;
    const avgPriceBlock = `<div class="chart-equity-avg-price">
<p class="chart-sec-title">Средневзвешенная цена выбранных инструментов (Close)</p>
<div class="chart-mini-empty">Средняя цена close — ждём свечи…</div>
</div>`;
    const referenceBlock = activeKeys.length
      ? `<div class="chart-equity-total chart-equity-total--reference">
<p class="chart-sec-title chart-sec-title--reference">${referenceEquityTitle(activeKeys)}</p>
<div class="chart-mini-empty">Справочная сумма логик — ждём свечи…</div>
</div>`
      : `<p class="note">Справочная сумма логик: выберите хотя бы одну логику в списке «Логика».</p>`;
    const logicBlocks = catalogKeys.map((key) => {
      const selected = activeKeys.includes(key);
      const heading = logicChartHeading(key, selected);
      const absentNote = !selected
        ? `<p class="chart-logic-absent-note">${logicAbsentNote(true)}</p>`
        : "";
      const wrapClass = selected ? "chart-mini" : "chart-mini chart-mini--inactive";
      return `<div class="${wrapClass}"><p class="chart-sec-title">${heading}</p>${absentNote}<div class="chart-mini-empty">Equity с начала live-сессии…</div></div>`;
    }).join("");
    syncChartBox(box, `<div class="chart-equity-section">
${avgPriceBlock}
<p class="chart-equity-section-title">Equity по логикам — live-сессия</p>
<p class="note">${liveChartSessionNote()}</p>
${finrespBlock}
${referenceBlock}
<div class="chart-equity-logic-scroll"><div class="chart-stack">${logicBlocks}</div></div>
</div>`);
  }

  /** Обновление данных с источника: `refreshLiveChartsUi`. */
  function refreshLiveChartsUi() {
    if (!isLiveTradingSession()) return;
    if (state.lastResult?.perSec?.length) {
      const { perSec, stopper } = state.lastResult;
      drawCharts(perSec, stopper, { liveSession: true });
    } else if (state.packs.length) {
      drawLiveChartPlaceholders();
      if (!state.live.chartsBootstrapBusy && !liveChartsBootstrapPromise) {
        void bootstrapLiveChartsSession({ via: "refresh-ui" });
      }
    } else {
      drawLiveChartPlaceholders();
    }
    refreshLiveEquityChartsUi();
  }

  /** Ленивая инициализация/проверка: `ensureLiveChartSession`. */
  function ensureLiveChartSession() {
    if (!isLiveMode()) return false;
    if (state.live.chartSession) return true;
    const startedAt = new Date().toISOString();
    state.live.sessionStartedAt = startedAt;
    const mode = isLiveSandbox() ? "sandbox" : "real";
    const pack = refPack();
    const hasPack = !!pack.length;
    const startIdx = hasPack ? pack.length - 1 : null;
    state.live.chartSession = {
      startedAt,
      finrespBaseline: null,
      commissionBaseline: null,
      equityBaselines: {},
      perSecBaselines: {},
      orderMarkers: [],
      sessionBarIndex: startIdx,
      sessionBarTime: hasPack ? (pack[startIdx]?.time || startedAt) : null,
      sessionBarAnchored: hasPack,
      portfolioBaseline: null,
      modeRegions: [{ startTime: startedAt, endTime: null, mode }]
    };
    snapshotLiveSessionPortfolioBaseline();
    state.live.modelFinresp = 0;
    state.live.modelCommission = 0;
    $("calc-finresp").textContent = `${fmt(0)} ₽`;
    $("calc-finresp").style.color = "#047857";
    setCommissionMetric("calc-commission", 0);
    $("calc-ann-simple").textContent = "—";
    $("calc-ann-compound").textContent = "—";
    $("calc-count").textContent = "0";
    $("calc-pos").textContent = "0";
    $("calc-cash").textContent = `${fmt(0)} ₽`;
    $("calc-bysec").textContent = "—";
    const annHint = $("calc-ann-hint");
    if (annHint) annHint.textContent = "Live-сессия: FINRESP и графики с нуля с момента выбора «Реальная торговля».";
    if (state.lastResult?.perSec?.length) {
      state.live.preCalcSnapshot = { result: state.lastResult };
    }
    state.lastResult = null;
    if (isLiveSandbox()) resetSandboxStopperWatch();
    refreshLiveChartsUi();
    void bootstrapLiveChartsSession({ reason: "session-start" });
    renderLiveFinResultStat();
    startLiveModePoll();
    return true;
  }

  /** Подпрограмма `endLiveChartSession`. */
  function endLiveChartSession() {
    stopLiveModePoll();
    cancelQueuedLiveChartsRefresh();
    const snapshot = state.live.preCalcSnapshot;
    state.live.preCalcSnapshot = null;
    state.live.chartSession = null;
    state.live.sessionStartedAt = null;
    state.live.realLegSeed = null;
    state.live.modelFinresp = null;
    state.live.modelCommission = null;
    syncLivePeriodControls();
    if (snapshot?.result?.perSec?.length) {
      applyResult(snapshot.result, { redrawCharts: true, liveSession: false });
      return;
    }
    if (state.packs.length) {
      void calcResultAsync(null, { silent: true }).then((result) => {
        if (result?.perSec?.length) {
          applyResult(result, { redrawCharts: true, liveSession: false });
          return;
        }
        if (!state.lastResult?.perSec?.length) {
          syncChartBox($("calc-chart"), "");
          syncChartBox($("calc-chart-equity"), "");
        }
      });
      return;
    }
    if (!state.lastResult?.perSec?.length) {
      syncChartBox($("calc-chart"), "");
      syncChartBox($("calc-chart-equity"), "");
    } else {
      const { perSec, stopper, a, b } = state.lastResult;
      drawCharts(perSec, stopper, { liveSession: false });
      drawEquityCharts(a, b, { liveSession: false });
    }
  }

  /** Подпрограмма `beginLiveTradingSession`. */
  function beginLiveTradingSession() {
    ensureLiveChartSession();
  }

  /** Подпрограмма `recordLiveModeRegionSwitch`. */
  function recordLiveModeRegionSwitch() {
    if (!state.live.active || !state.live.chartSession) return;
    const regions = state.live.chartSession.modeRegions;
    const pack = refPack();
    const barTime = pack.length ? pack.at(-1)?.time : null;
    const stamp = barTime || new Date().toISOString();
    if (regions.length) {
      const last = regions.at(-1);
      if (last && !last.endTime) last.endTime = stamp;
    }
    regions.push({
      startTime: stamp,
      endTime: null,
      mode: isLiveSandbox() ? "sandbox" : "real"
    });
    if (regions.length > 30) regions.shift();
  }

  /** Подпрограмма `sliceRowsForLiveSession`. */
  function sliceRowsForLiveSession(rows) {
    if (!isLiveTradingSession() || !rows?.length) return rows || [];
    const barTime = state.live.chartSession?.sessionBarTime;
    if (barTime) {
      const startMs = timeToMs(barTime);
      const idx = rows.findIndex((r) => {
        const ms = timeToMs(r?.time);
        return Number.isFinite(ms) && ms >= startMs;
      });
      if (idx >= 0) return rows.slice(idx);
      return rows.slice(Math.max(0, rows.length - 1));
    }
    const startMs = timeToMs(liveSessionStartTime());
    if (!Number.isFinite(startMs)) return rows;
    const idx = rows.findIndex((r) => Number.isFinite(timeToMs(r?.time)) && timeToMs(r.time) >= startMs);
    if (idx >= 0) return rows.slice(idx);
    return rows.slice(Math.max(0, rows.length - 1));
  }

  /** Live-торговля: `liveEquityWindowIndices`. */
  function liveEquityWindowIndices() {
    const pack = refPack();
    if (!pack.length) return null;
    anchorLiveSessionBarIndex();
    const cs = state.live.chartSession;
    let a = cs?.sessionBarIndex;
    const b = pack.length - 1;
    if (a == null) a = b;
    if (a > b) a = b;
    return [a, b];
  }

  /** Обновление данных с источника: `refreshLiveEquityChartsUi`. */
  function refreshLiveEquityChartsUi() {
    if (!isLiveTradingSession()) return;
    if (!state.packs.length || refPack().length < 1) {
      drawLiveEquityPlaceholders();
      return;
    }
    pinLiveSessionEquityWindow();
    const win = liveEquityWindowIndices();
    if (!win) {
      drawLiveEquityPlaceholders();
      return;
    }
    const cs = state.live.chartSession;
    if (cs) cs.equityBaselines = {};
    drawEquityCharts(win[0], win[1], { liveSession: true });
  }

  /** Подпрограмма `zeroBaseEquityRows`. */
  function zeroBaseEquityRows(rows, baselineKey) {
    if (!rows?.length) return rows;
    const cs = state.live.chartSession;
    if (!cs) return rows;
    if (cs.equityBaselines[baselineKey] == null) cs.equityBaselines[baselineKey] = rows[0]?.eq ?? 0;
    const base = cs.equityBaselines[baselineKey];
    return rows.map((r) => ({ ...r, eq: (r?.eq ?? 0) - base }));
  }

  /** Live-торговля: `liveDisplayFinresp`. */
  function liveDisplayFinresp(sec, finresp) {
    const cs = state.live.chartSession;
    if (!cs) return finresp;
    const key = sec || "__agg";
    if (cs.perSecBaselines[key] == null) cs.perSecBaselines[key] = finresp;
    return finresp - cs.perSecBaselines[key];
  }

  /** Подпрограмма `modeRegionsForChartRows`. */
  function modeRegionsForChartRows(rows) {
    const regions = state.live.chartSession?.modeRegions || [];
    if (!rows?.length || !regions.length) return [];
    const out = [];
    for (const reg of regions) {
      const startMs = timeToMs(reg.startTime);
      let i0 = rows.findIndex((r) => Number.isFinite(timeToMs(r?.time)) && timeToMs(r.time) >= startMs);
      if (i0 < 0) continue;
      let i1 = rows.length - 1;
      if (reg.endTime) {
        const endMs = timeToMs(reg.endTime);
        let ie = -1;
        for (let i = rows.length - 1; i >= 0; i--) {
          const ms = timeToMs(rows[i]?.time);
          if (Number.isFinite(ms) && ms <= endMs) { ie = i; break; }
        }
        if (ie >= i0) i1 = ie;
      }
      out.push({ fromIdx: i0, toIdx: i1, mode: reg.mode });
    }
    return out;
  }

  /** Цветные полосы режимов (live/sandbox/stopped) на графике. */
  function buildModeRegionBands(rows, modeRegions, x, top, bottom) {
    if (!modeRegions?.length) return "";
    return modeRegions.map(({ fromIdx, toIdx, mode }) => {
      const x0 = x(fromIdx);
      const x1 = x(toIdx);
      const fill = mode === "sandbox" ? "#ecfdf5" : "#fef2f2";
      const stroke = mode === "sandbox" ? "#bbf7d0" : "#fecaca";
      const w = Math.max(2, x1 - x0 + (toIdx === rows.length - 1 ? 4 : 0));
      const title = mode === "sandbox" ? "Песочница (фейк)" : "Реальная торговля";
      return `<g opacity="0.88"><rect x="${x0.toFixed(1)}" y="${top}" width="${w.toFixed(1)}" height="${bottom - top}" fill="${fill}" stroke="${stroke}" stroke-width="0.6"/><title>${title}</title></g>`;
    }).join("");
  }

  /** Подпрограмма `chartDecorFromRows`. */
  function chartDecorFromRows(rows, vLines) {
    return {
      vLines: vLines || [],
      modeRegions: isLiveTradingSession() ? modeRegionsForChartRows(rows) : []
    };
  }

  /** Логика FINRESP: `logicAbsentNote`. */
  function logicAbsentNote(liveSession) {
    return liveSession
      ? "В торговле не участвует · equity справочно, от нуля live-сессии"
      : "Не участвует в справочной сумме (FINRESP Σ — стек выбранных логик сверху)";
  }

  /** Логика FINRESP: `logicChartHeading`. */
  function logicChartHeading(key, selected) {
    const badge = selected
      ? '<span class="chart-logic-badge chart-logic-badge--active">выбрана</span>'
      : '<span class="chart-logic-badge">справочно</span>';
    return `${key} · ${logicEquityLabel(key)} ${badge}`;
  }

  /** Подпрограмма `pinLiveWindowToLatestBar`. */
  function pinLiveWindowToLatestBar() {
    const pack = refPack();
    if (!pack.length) return;
    const max = pack.length - 1;
    const maxBars = currentLimit().maxBars;
    let b = max;
    let a = Math.max(0, b - Math.min(maxBars, MIN_WARMUP_BARS) + 1);
    const common = commonTimeRange(state.packs);
    if (common && common.start <= common.end) {
      const ca = findFirstIndexAtOrAfter(pack, common.start);
      const cb = findLastIndexAtOrBefore(pack, common.end);
      if (ca <= cb) {
        a = Math.max(a, ca);
        b = Math.min(b, cb);
      }
    }
    if (b < a) {
      b = max;
      a = Math.max(0, b - MIN_WARMUP_BARS + 1);
    }
    if (b - a + 1 > maxBars) a = Math.max(0, b - maxBars + 1);
    applyCalcWindowIndices(a, b, pack);
  }

  /** Подпрограмма `countPacksInTimeWindow`. */
  function countPacksInTimeWindow(tStart, tEnd, minBars = 3) {
    if (!tStart || !tEnd || tStart > tEnd) return 0;
    let n = 0;
    for (const candles of state.packs) {
      if (!candles?.length) continue;
      let a = -1;
      let b = -1;
      for (let i = 0; i < candles.length; i++) {
        const t = candles[i]?.time;
        if (!t || t < tStart) continue;
        if (t > tEnd) break;
        if (a < 0) a = i;
        b = i;
      }
      if (a >= 0 && b >= a && b - a + 1 >= minBars) n += 1;
    }
    return n;
  }

  /** Live: окно ползунков, где пересекается максимум инструментов (без «Рассчитать»). */
  function pinLiveWindowForAllInstruments() {
    const pack = refPack();
    const total = state.packs?.length || 0;
    if (!pack.length || !total) return false;
    const maxBars = currentLimit().maxBars;
    const minSpan = Math.min(MIN_WARMUP_BARS, maxBars, pack.length);
    let best = null;
    const bEnd = pack.length - 1;
    for (let span = minSpan; span <= Math.min(maxBars, pack.length); span++) {
      for (let b = bEnd; b >= span - 1; b--) {
        const a = b - span + 1;
        const tStart = pack[a]?.time;
        const tEnd = pack[b]?.time;
        if (!tStart || !tEnd) continue;
        const fit = countPacksInTimeWindow(tStart, tEnd);
        if (!fit) continue;
        if (!best || fit > best.fit || (fit === best.fit && b > best.b)) {
          best = { a, b, fit };
        }
        if (fit >= total) {
          applyCalcWindowIndices(a, b, pack);
          return true;
        }
      }
    }
    if (best?.fit) {
      applyCalcWindowIndices(best.a, best.b, pack);
      return true;
    }
    return pinLiveWindowToLatestBar();
  }

  /** Агрегация FINRESP по инструментам для live-отображения. */
  function aggregateFinrespLocal(perSecResults) {
    let finresp = 0;
    let cash = 0;
    let pos = 0;
    let commission = 0;
    let buys = 0;
    let sells = 0;
    const bySec = {};
    for (const r of perSecResults) {
      finresp += r.finresp || 0;
      cash += r.cash || 0;
      pos += r.pos || 0;
      commission += r.commission || 0;
      buys += r.buys || 0;
      sells += r.sells || 0;
      bySec[r.sec] = r.finresp;
    }
    return { finresp, cash, pos, commission, buys, sells, bySec };
  }

  /** Live: сигнал по хвосту каждого инструмента (общий портфельный лимит, без привязки к окну ползунков). */
  async function calcLiveSignalsPerInstrument(runOptions) {
    const ro = runOptions || {};
    if (!state.packs.length) return null;
    const p = params();
    const spec = resolveCalcLogicSpec(p, indicatorSelection());
    if (!spec) return null;

    // --- Auto-reverses (sandbox-first): choose best of 4 variants on rolling window ---
    // Variants are defined by UI checkboxes ReverseSides / ReverseSignals (engine uses XOR logic for signals).
    // In sandbox mode, switching ReverseSides requires flattening to avoid mixing old/new semantics.
    if (p.AutoReverses && isLiveSandbox()) {
      try {
        if (!state.live.autoReverses) state.live.autoReverses = { lastCheckedB: -1, activeKey: null };
        const packs = state.packs || [];
        const b = Math.min(...packs.map((x) => (x?.length || 0)).filter((n) => n > 0).map((n) => n - 1));
        const lookback = Math.max(50, Math.round(+p.AutoLookback || 220));
        const step = Math.max(1, Math.round(+p.AutoStep || 30));
        const shouldCheck = Number.isFinite(b) && b >= 0 && (state.live.autoReverses.lastCheckedB < 0 || (b - state.live.autoReverses.lastCheckedB) >= step);
        if (shouldCheck) {
          state.live.autoReverses.lastCheckedB = b;
          const a = Math.max(0, b - lookback + 1);
          const vol = volConfig();
          const stop = stopperConfig();
          const variants = [
            { sides: false, signals: false, key: "00" },
            { sides: true, signals: false, key: "10" },
            { sides: false, signals: true, key: "01" },
            { sides: true, signals: true, key: "11" }
          ];
          let best = null;
          for (const v of variants) {
            const pv = { ...p, ReverseSides: v.sides, ReverseSignals: v.signals };
            const out = E.runMulti(packs, spec, a, b, pv, vol, stop, {
              reverseSides: v.sides,
              reverseSignals: v.signals
            });
            const fin = out?.agg?.finresp;
            if (!Number.isFinite(fin)) continue;
            if (!best || fin > best.finresp) best = { ...v, finresp: fin };
          }
          if (best) {
            const curSides = !!$("param-reverse")?.checked;
            const curSignals = !!$("param-reverse-signals")?.checked;
            const needSwitch = best.sides !== curSides || best.signals !== curSignals;
            if (needSwitch) {
              // Flatten first to avoid position semantics mismatch
              await sellAllMarketLive();
              if ($("param-reverse")) $("param-reverse").checked = best.sides;
              if ($("param-reverse-signals")) $("param-reverse-signals").checked = best.signals;
              saveConfig();
              // Let HTML update summary on next UI sync.
              noteLiveTech("auto-reverses", `best=${best.key} fin=${fmt(best.finresp, 2)} sides=${best.sides ? "on" : "off"} signals=${best.signals ? "on" : "off"}`);
            }
          }
        }
      } catch (err) {
        noteLiveTech("auto-reverses-error", err.message);
      }
    }

    const skipped = [];
    const tail = MIN_WARMUP_BARS;
    const vol = volConfig();
    const portfolioCap = E.createPortfolioCap(vol);
    const perSec = [];
    let bRef = 0;
    let aRef = 0;
    const total = state.packs.length;
    state.live.finrespBootstrapProgress = { done: 0, total };
    try {
    for (let pi = 0; pi < total; pi++) {
      if (ro.shouldCancel?.()) break;
      if (pi > 0 && pi % 4 === 0) await yieldToUi();
      const candles = state.packs[pi];
      const sec = candles?.[0]?.sec || "?";
      if (!candles?.length || candles.length < 3) {
        skipped.push({ sec, error: "мало свечей для сигнала" });
        state.live.finrespBootstrapProgress = { done: pi + 1, total };
        continue;
      }
      const b = candles.length - 1;
      const a = Math.max(0, b - tail + 1);
      bRef = Math.max(bRef, b);
      aRef = aRef ? Math.min(aRef, a) : a;
      const r = E.runOnCandles(candles, spec, a, b, p, vol, {
        shouldCancel: ro.shouldCancel,
        sec,
        portfolioCap,
        reverseSides: !!p.ReverseSides,
        reverseSignals: !!p.ReverseSignals
      });
      if (!r.rows?.length) {
        skipped.push({ sec, error: "нет данных для сигнала на свечах" });
        state.live.finrespBootstrapProgress = { done: pi + 1, total };
        continue;
      }
      const last = r.rows.at(-1);
      const probe = E.probeLogicSignalsAtBar(candles, spec, p, {
        barIndex: b,
        pos: r.pos,
        entryBarIdx: r.simState?.entryBarIdx,
        entryMid: r.simState?.entryMid,
        entryBeta: r.simState?.entryBeta,
        reverse: p.Reverse,
        lastRow: last
      });
      perSec.push({
        sec,
        ...r,
        signalProbe: probe,
        lastBuy: +(last?.buy || 0),
        lastSell: +(last?.sell || 0)
      });
      state.live.finrespBootstrapProgress = { done: pi + 1, total };
      if (pi > 0 && pi % 8 === 0) syncLiveTradingUi();
    }
    } finally {
      state.live.finrespBootstrapProgress = null;
    }

    state.windowSkipped = skipped;
    if (!perSec.length) return null;
    const agg = aggregateFinrespLocal(perSec);
    return { perSec, agg, preStopperAgg: agg, stopper: { events: [] }, a: aRef, b: bRef, skipped, finrespMode: "tail" };
  }

  /** Подпись сигнала Op/Cl для тех. журнала. */
  function finrespSignalOpLabel(probe) {
    if (!probe?.ready) return probe?.reason === "warmup" ? "warmup" : "—";
    if (probe.longOp) return "longOp";
    if (probe.shortOp) return "shortOp";
    return "—";
  }

  function finrespSignalClLabel(probe) {
    if (!probe?.ready) return "—";
    if (probe.longCl) return "longCl";
    if (probe.shortCl) return "shortCl";
    return "—";
  }

  /** Запись FINRESP по инструментам в тех. журнал (сигнал vs целевая позиция). */
  function noteLiveFinrespDiagnostics(result) {
    if (!result?.perSec?.length) return;
    const bySec = {};
    let withPos = 0;
    let withOp = 0;
    for (const p of result.perSec) {
      const probe = p.signalProbe || {};
      const pos = +(p.pos || 0);
      const op = finrespSignalOpLabel(probe);
      const cl = finrespSignalClLabel(probe);
      const buy = +(p.lastBuy ?? p.rows?.at(-1)?.buy ?? 0);
      const sell = +(p.lastSell ?? p.rows?.at(-1)?.sell ?? 0);
      if (Math.abs(pos) > 1e-9) withPos += 1;
      if (op !== "—" && op !== "warmup") withOp += 1;
      bySec[p.sec] = { pos, op, cl, buy, sell, logicId: probe.logicId || "—", ready: !!probe.ready };
      const willTrade = Math.abs(pos) > 1e-9 ? "→ сделка" : (op !== "—" && op !== "warmup" ? "op без pos (лимит/фильтр?)" : "flat");
      noteLiveTech(
        "live-finresp-sec",
        `${p.sec} pos=${pos} op=${op} cl=${cl} buy=${buy} sell=${sell} ${willTrade}`,
        probe.logicId ? `logic=${probe.logicId}` : ""
      );
    }
    state.live.lastFinrespDiag = {
      at: new Date().toISOString(),
      mode: result.finrespMode || "tail",
      bySec,
      instrumentCount: result.perSec.length,
      withPos,
      withOp,
      skippedCount: (result.skipped || state.windowSkipped || []).length
    };
    noteLiveTech(
      "live-finresp-summary",
      `mode=${result.finrespMode || "tail"} instruments=${result.perSec.length} withPos=${withPos} opSignals=${withOp} skipped=${state.live.lastFinrespDiag.skippedCount}`,
      ""
    );
  }

  /** Почему reconcile не выставил заявку. */
  function reconcileAlignedReason(sec, targetPieces, currentPieces, delta) {
    const diag = state.live.lastFinrespDiag?.bySec?.[sec];
    const tgt = +targetPieces || 0;
    const cur = +currentPieces || 0;
    if (Math.abs(tgt) < 1e-9 && Math.abs(cur) < 1e-9) {
      if (diag?.op && diag.op !== "—" && diag.op !== "warmup") {
        return `сигнал ${diag.op} (${diag.logicId}), но pos=0 — портф.лимит или объём < лота`;
      }
      if (diag?.buy > 0 || diag?.sell > 0) {
        return `buy/sell на баре, но итоговая pos=0`;
      }
      return "нет входа на последнем баре";
    }
    if (Math.abs(tgt - cur) < 1e-9) return "уже на целевой позиции";
    return "дельта меньше порога лота";
  }

  /** Live-торговля: `liveFinrespPartialMessage`. */
  function liveFinrespPartialMessage(okN, skipN) {
    return `Сигнал по ${okN} инстр., без данных: ${skipN}. Торговля по доступным.`;
  }

  /** Live-торговля: `liveFinrespEmptyMessage`. */
  function liveFinrespEmptyMessage() {
    const skipN = state.windowSkipped?.length || 0;
    if (skipN) {
      return `Нет сигнала: у ${skipN} инстр. не хватает свечей в общем периоде. Сузьте список или дождитесь загрузки истории.`;
    }
    return "Нет сигнала логики на последних свечах.";
  }

  /** Запись в тех. журнал: `noteLiveFinrespSkipped`. */
  function noteLiveFinrespSkipped() {
    const skipped = state.windowSkipped || [];
    if (!skipped.length) return;
    const sample = skipped.slice(0, 8).map((f) => `${f.sec}:${f.error}`).join("; ");
    noteLiveTech("live-finresp-skipped", `count=${skipped.length}`, sample);
  }

  /** Пересчёт FINRESP на live-сессии при новом баре (если не пропущен). */
  async function tryLiveFinrespCalc(runOptions) {
    const ro = runOptions || {};
    if (isLiveTradingSession()) {
      if (ro.chartMode) {
        pinLiveSessionEquityWindow();
        let result = await calcResultAsync(null, ro);
        noteLiveFinrespDiagnostics(result);
        if (result?.perSec?.length) return { ...result, finrespMode: "window" };
        const tailChart = await calcLiveSignalsPerInstrument(ro);
        noteLiveFinrespDiagnostics(tailChart);
        if (tailChart?.perSec?.length) return tailChart;
        return null;
      }
      const tailResult = await calcLiveSignalsPerInstrument(ro);
      noteLiveFinrespDiagnostics(tailResult);
      pinLiveSessionEquityWindow();
      if (tailResult?.perSec?.length) return tailResult;
      let result = await calcResultAsync(null, ro);
      noteLiveFinrespDiagnostics(result);
      if (result?.perSec?.length) return { ...result, finrespMode: "window" };
      return null;
    }
    pinLiveWindowForAllInstruments();
    let result = await calcResultAsync(null, ro);
    if (result?.perSec?.length) return result;
    resetLiveWindowToCommonOverlap();
    result = await calcResultAsync(null, ro);
    if (result?.perSec?.length) return result;
    pinLiveWindowToLatestBar();
    result = await calcResultAsync(null, ro);
    if (result?.perSec?.length) return result;
    return calcLiveSignalsPerInstrument(ro);
  }

  /** Обновление: `updateLiveCandleBarMeta`. */
  function updateLiveCandleBarMeta() {
    const barTimes = liveMoexBarTimes(state.packs);
    state.live.lastCandleRefreshAt = new Date().toISOString();
    state.live.lastCandleBarTime = barTimes.calcEnd || barTimes.freshest || null;
    state.live.lastCandleBarTimeFresh = barTimes.freshest || null;
    if (liveHasAnyCandles()) syncLiveCandleDelayUi(isLiveMode());
  }

  /** file:// / без MOEX: только IndexedDB (без fetch MOEX). */
  async function refreshLiveCacheOnlyPacks(instruments, from, till, interval, existingByKey) {
    const byKey = new Map(existingByKey || []);
    const failures = [];
    const cache = state.candleCache || null;
    for (const inst of instruments || []) {
      const sec = inst.sec;
      const market = inst.market || "shares";
      const r = await E.loadInstrumentSec(sec, from, till, interval, market, cache, {});
      if (r.ok) {
        const key = instrumentKey(inst);
        const prev = byKey.get(key) || [];
        const merged = E.mergeCandleSeries(prev, r.pack);
        byKey.set(key, merged.map((c) => ({ ...c, sec, market })));
      } else {
        failures.push({
          sec: r.requestedSec || sec,
          market,
          error: r.error || "нет свечей в базе браузера"
        });
      }
    }
    return { byKey, failures };
  }

  /** Подпрограмма `fileProtocolLiveHint`. */
  function fileProtocolLiveHint() {
    return "file://: MOEX недоступен — песочница/T-Bank/база свечей; для MOEX запустите serve-calculator.ps1";
  }

  /** Подгрузка свечей MOEX/T-Bank для live-графиков и расчёта. */
  async function refreshLiveCandleStream(options) {
    if (state.live.candleRefreshPromise) return state.live.candleRefreshPromise;
    state.live.candleRefreshPromise = refreshLiveCandleStreamInner(options).finally(() => {
      state.live.candleRefreshPromise = null;
    });
    return state.live.candleRefreshPromise;
  }

  async function refreshLiveCandleStreamInner(options) {
    const opts = options || {};
    if (!isLiveMode() || !state.live.chartSession) return false;
    if (state.live.candleRefreshBusy || state.live.tradingActionBusy) return false;
    const needsBootstrap = !liveHasAnyCandles() || !state.lastResult?.perSec?.length;
    if (state.uiBusy && !needsBootstrap) return false;
    const instruments = selectedInstruments();
    if (!instruments.length) return false;
    state.live.candleRefreshBusy = true;
    syncLiveTradingUi();
    try {
      const { from, till, interval } = liveCandleStreamRange(instruments);
      const byKey = packsByInstrumentKey(state.packs);
      const candleSource = resolveLiveCandleSource();
      let refreshed;
      if (candleSource === "tbank") {
        if (!state.packs.length) {
          if (IS_FILE_PROTOCOL) {
            const cacheBoot = await refreshLiveCacheOnlyPacks(instruments, from, till, interval, byKey);
            refreshed = await refreshLiveTbankTail(instruments, from, till, interval, cacheBoot.byKey);
            refreshed.failures = [...(cacheBoot.failures || []), ...(refreshed.failures || [])];
          } else {
            const moexBoot = await E.refreshLiveMoexPacks(
              instruments,
              from,
              till,
              interval,
              byKey,
              state.candleCache || null
            );
            refreshed = await refreshLiveTbankTail(instruments, from, till, interval, moexBoot.byKey);
            refreshed.failures = [...(moexBoot.failures || []), ...(refreshed.failures || [])];
          }
        } else {
          refreshed = await refreshLiveTbankTail(instruments, from, till, interval, byKey);
        }
        state.live.candleSource = "tbank";
      } else if (IS_FILE_PROTOCOL) {
        refreshed = await refreshLiveCacheOnlyPacks(instruments, from, till, interval, byKey);
        state.live.candleSource = "cache";
      } else {
        refreshed = await E.refreshLiveMoexPacks(
          instruments,
          from,
          till,
          interval,
          byKey,
          state.candleCache || null
        );
        state.live.candleSource = "moex";
      }
      state.packs = orderPacksForInstruments(instruments, refreshed.byKey);
      state.failedInstruments = refreshed.failures;
      if (refreshed.failures?.length) {
        noteLiveTech(
          "live-candles-partial",
          refreshed.failures.map((f) => `${f.sec}: ${f.error}`).join("; "),
          `source=${state.live.candleSource}`
        );
      }
      state.lastLoadMeta = {
        periodKey: loadMetaKey(from, till, interval),
        keys: instruments.map(instrumentKey)
      };
      state.lastInstruments = instruments.map((i) => ({ sec: i.sec, market: i.market }));
      if (!state.packs.length) {
        const hint = IS_FILE_PROTOCOL ? fileProtocolLiveHint() : "MOEX не вернул свечи по выбранным инструментам.";
        throw new Error(hint);
      }
      state.movedSlider = "end";
      updateLiveCandleBarMeta();
      await recalcLivePortfolioMtmFromCandles();
      const result = await tryLiveFinrespCalc({ silent: true, ...opts });
      if (!result?.perSec?.length) {
        noteLiveFinrespSkipped();
        state.live.lastError = liveFinrespEmptyMessage();
        noteLiveTech(
          "live-candles-warn",
          state.live.lastError,
          `instruments=${instruments.length} tf=${interval} window=${$("calc-start")?.value}…${$("calc-end")?.value}`
        );
        pinLiveSessionEquityWindow();
        refreshLiveChartsUi();
        syncLiveTradingUi();
        return true;
      }
      state.lastResult = result;
      const skipN = state.windowSkipped?.length || 0;
      state.live.lastError = skipN
        ? liveFinrespPartialMessage(result.perSec.length, skipN)
        : "";
      applyResult(state.lastResult, {
        redrawCharts: opts.redrawCharts !== false,
        liveSession: true,
        silent: !!opts.silent
      });
      syncLiveTradingUi();
      return true;
    } catch (err) {
      state.live.lastError = err.message;
      syncLiveTradingUi();
      noteLiveTech("live-candles", err.message, `instruments=${selectedInstruments().length} tf=${$("calc-tf")?.value || "—"}`);
      return false;
    } finally {
      state.live.candleRefreshBusy = false;
      syncLiveTradingUi();
    }
  }

  /** Подпрограмма `validateLiveTradingStart`. */
  function validateLiveTradingStart() {
    applyEditorParams();
    const instruments = selectedInstruments();
    if (!instruments.length) {
      return { ok: false, error: "выберите инструменты" };
    }
    const spec = resolveCalcLogicSpec(params(), indicatorSelection());
    if (!spec) {
      return { ok: false, error: "выберите логику" };
    }
    if (!requireTbankDepositForRun()) {
      return { ok: false, error: "загрузите депозит T-Bank" };
    }
    const vol = volConfig();
    if (!(vol.deposit > 0)) {
      return { ok: false, error: "депозит должен быть > 0" };
    }
    if (!(vol.volume > 0)) {
      return { ok: false, error: "Volume должен быть > 0" };
    }
    if (!(vol.maxPositions > 0)) {
      return { ok: false, error: "Max positions должен быть > 0" };
    }
    return { ok: true, instruments, spec, vol };
  }

  /** Сверка позиций/заявок с брокером (T-Bank) или локальным ledger песочницы. */
  async function liveTradingReconcile() {
    if (!state.live.active) {
      noteLiveReconcileAbort("торговля не активна", `active=${!!state.live.active}`);
      return;
    }
    if (state.live.reconcileBusy) {
      noteLiveReconcileAbort("reconcile уже выполняется", "reconcileBusy=true");
      return;
    }
    if (state.live.tradingActionBusy) {
      noteLiveReconcileAbort("другая операция", "tradingActionBusy=true");
      return;
    }
    const sandbox = isLiveSandbox();
    if (!sandbox) {
      if (!(await ensureTbankTokenUnlocked({ interactive: false, openUi: false }))) {
        state.live.lastError = "Токен T-Bank не расшифрован — заявки на биржу не отправляются.";
        noteLiveReconcileAbort("токен не расшифрован", "ensureTbankTokenUnlocked=false");
        syncLiveTradingUi();
        return;
      }
      if (!state.tbank.selectedAccountId) {
        state.live.lastError = "Счёт T-Bank не выбран — заявки не отправляются.";
        noteLiveReconcileAbort("нет счёта T-Bank", `accounts=${state.tbank.accounts?.length ?? 0}`);
        syncLiveTradingUi();
        return;
      }
    }
    const targets = liveReconcileTargets();
    state.live.lastReconcileTargetRows = (targets || []).map((p) => ({
      sec: p.sec,
      pos: +p.pos || 0,
      finresp: p.finresp,
      market: selectedInstruments().find((i) => String(i.sec).toUpperCase() === String(p.sec || "").toUpperCase())?.market || "shares"
    }));
    if (!targets.length) {
      const n = state.lastResult?.perSec?.length ?? 0;
      if (n === 0 && (state.live.candleRefreshBusy || isLiveBootstrapWindow())) {
        return;
      }
      noteLiveReconcileAbort("нет целей reconcile", `lastResult.perSec=${n} manualFlatten=${!!state.live.manualFlatten}`);
      return;
    }
    state.live.reconcileBusy = true;
    const skipped = [];
    const failed = [];
    const targetDetails = [];
    let placed = 0;
    let aligned = 0;
    try {
      const actual = sandbox ? sandboxPositionsByTicker() : await tbankPositionsByTicker();
      const brokerKeys = [...actual.keys()].join(",") || "—";
      noteLiveTech("live-reconcile-start", `targets=${targets.length} sandbox=${sandbox}`, `brokerPos=${brokerKeys}`);
      for (const p of targets) {
        const secU = String(p.sec || "").toUpperCase();
        const instMeta = selectedInstruments().find((i) => String(i.sec).toUpperCase() === secU);
        const market = instMeta?.market || "shares";
        let im;
        try {
          im = await resolveLiveInstrumentMeta(p.sec, market);
        } catch (err) {
          failed.push(liveIssueEntry(p.sec, p.sec, { message: err.message, market }));
          targetDetails.push({ sec: p.sec, action: "fail-meta", error: err.message });
          continue;
        }
        if (!im) {
          skipped.push(liveIssueEntry(p.sec, p.sec, { reason: "не найден в T-Bank", market }));
          targetDetails.push({ sec: p.sec, action: "skip-no-instrument", market });
          continue;
        }
        const { ti, instrumentId, lot, ticker, classCode, instrumentName } = im;
        const targetPieces = +p.pos || 0;
        const cur = actual.get(ticker);
        const currentPieces = cur ? +cur.pieces : 0;
        const delta = targetPieces - currentPieces;
        if (!reconcileNeedsTrade(targetPieces, currentPieces, delta, lot)) {
          aligned += 1;
          const reason = reconcileAlignedReason(p.sec, targetPieces, currentPieces, delta);
          const diag = state.live.lastFinrespDiag?.bySec?.[p.sec];
          targetDetails.push({
            sec: p.sec,
            ticker,
            target: targetPieces,
            current: currentPieces,
            delta,
            lot,
            action: "aligned",
            reason,
            signalOp: diag?.op,
            signalCl: diag?.cl,
            logicId: diag?.logicId
          });
          continue;
        }
        let lots = piecesToLots(delta, lot);
        if (!lots && delta > 0 && targetPieces > 0) lots = 1;
        const direction = delta > 0 ? "ORDER_DIRECTION_BUY" : "ORDER_DIRECTION_SELL";
        const diag = state.live.lastFinrespDiag?.bySec?.[p.sec];
        targetDetails.push({
          sec: p.sec,
          ticker,
          target: targetPieces,
          current: currentPieces,
          delta,
          lot,
          lots,
          direction,
          action: "order",
          reason: "откроется сделка",
          signalOp: diag?.op,
          signalCl: diag?.cl,
          logicId: diag?.logicId
        });
        if (!sandbox) {
          const tradable = await tbankValidateTradable(instrumentId, ti);
          if (!tradable.ok) {
            skipped.push(liveIssueEntry(ticker, p.sec, {
              reason: tradable.reason,
              instrumentId,
              classCode,
              instrumentName,
              market,
              apiForbidden: liveIssueIsApiForbidden({ reason: tradable.reason })
            }));
            continue;
          }
        }
        const obGate = await liveObTrendAllowsOrder(instrumentId, direction);
        if (!obGate.skipped && !obGate.ok) {
          skipped.push(liveIssueEntry(ticker, p.sec, {
            reason: `@OBT: ${obGate.reason || "стакан не подтвердил"}`,
            instrumentId,
            classCode,
            instrumentName,
            market,
            direction,
            lots,
            obTrendMode: obGate.mode,
            obImb: obGate.imb
          }));
          noteLiveTech("live-obt-skip", obGate.reason || "—", `sec=${p.sec} mode=${obGate.mode || "—"} dir=${direction}`);
          continue;
        }
        try {
          noteLiveTech("live-post-order", `${ticker} ${direction} ${lots} lot`, `sec=${p.sec} uid=${instrumentId} market=${market} robot=market`);
          const ord = await postLiveOrder(instrumentId, direction, lots, p.sec, { market, tradeSource: "robot", orderType: "market" });
          if (!ord && !sandbox) {
            failed.push(liveIssueEntry(ticker, p.sec, { message: "PostOrder вернул пустой ответ", instrumentId, direction, lots, market }));
            continue;
          }
          placed += 1;
        } catch (err) {
          failed.push(liveIssueEntry(ticker, p.sec, {
            message: err.message,
            instrumentId,
            classCode,
            instrumentName,
            market,
            direction,
            lots,
            apiForbidden: liveIssueIsApiForbidden({ message: err.message })
          }));
        }
      }
      const issueText = summarizeLiveReconcileIssues(skipped, failed);
      if (issueText) state.live.lastError = issueText;
      else if (placed > 0) state.live.lastError = "";
      else if (aligned === targets.length && !skipped.length && !failed.length) {
        state.live.lastError = "";
        noteLiveTech("live-reconcile-aligned", `все ${aligned} инстр. уже на целевой позиции`, "заявки не нужны");
      }
      noteLiveReconcileToTech({
        at: new Date().toISOString(),
        placed,
        aligned,
        skipped,
        failed,
        targetCount: targets.length,
        targetDetails,
        sandbox
      });
      await refreshLiveOrders();
      await refreshLivePortfolioStats();
    } catch (err) {
      state.live.lastError = err.message;
      noteLiveReconcileToTech({
        at: new Date().toISOString(),
        placed: 0,
        aligned: 0,
        skipped: [],
        failed: [],
        targetCount: targets.length,
        targetDetails,
        fatal: err.message,
        sandbox
      });
    } finally {
      state.live.reconcileBusy = false;
      syncLiveTradingUi();
    }
  }

  /** Остановка периодического опроса: `stopLiveModePoll`. */
  function stopLiveModePoll() {
    if (state.live.pollTimer) clearInterval(state.live.pollTimer);
    state.live.pollTimer = null;
    if (state.live.delayUiTimer) clearInterval(state.live.delayUiTimer);
    state.live.delayUiTimer = null;
  }

  /**
   * Догрузить свечи/FINRESP после снятия глобального busy.
   * UX: если пользователь переключил live-режим во время расчёта,
   * то первый опрос свечей мог быть пропущен из-за `state.uiBusy`.
   */
  function queueLiveCandleRefreshIfNeeded() {
    if (!isLiveMode() || !state.live.chartSession) return;
    if (state.live.candleRefreshBusy || state.live.tradingActionBusy) return;
    const needsBootstrap = !liveHasAnyCandles() || !state.lastResult?.perSec?.length;
    if (!needsBootstrap) return;
    setTimeout(() => {
      if (!isLiveMode() || !state.live.chartSession) return;
      if (state.uiBusy || state.live.candleRefreshBusy || state.live.tradingActionBusy) return;
      void refreshLiveCandleStream({ silent: true }).catch(() => {});
    }, 50);
  }

  // === Live: опрос баров, FINRESP на сессии, задержка свечей ===

  /** Один цикл: свечи → FINRESP → reconcile (если торговля активна). */
  async function livePollTickAfterRefresh() {
    if (!isLiveMode() || !state.live.chartSession) return false;
    if (state.live.tradingActionBusy) return false;
    const ok = await refreshLiveCandleStream({ silent: true });
    if (!ok) return false;
    if (state.lastResult?.perSec?.length) refreshLiveChartsUi();
    if (state.live.active && state.lastResult?.perSec?.length) {
      await liveTradingReconcile();
      queueLiveChartsRefresh();
    }
    return ok;
  }

  /** Запуск периодического опроса: `startLiveModePoll`. */
  function startLiveModePoll() {
    stopLiveModePoll();
    if (!isLiveMode() || !state.live.chartSession) return;
    const runTick = () => {
      if (!isLiveMode() || !state.live.chartSession) {
        stopLiveModePoll();
        return;
      }
      if (state.live.candleRefreshBusy || (state.live.active && state.live.reconcileBusy) || state.live.tradingActionBusy) return;
      livePollTickAfterRefresh()
        .then((ok) => {
          if (!ok) {
            noteLiveTech("live-tick-skip-reconcile", "refreshLiveCandleStream=false", `lastError=${state.live.lastError || "—"}`);
          }
        })
        .catch((err) => {
          state.live.lastError = err.message;
          syncLiveTradingUi();
          noteLiveTech("live-tick", err.message, `tf=${$("calc-tf")?.value || "—"}`);
        });
    };
    const ms = liveCandlePollIntervalMs($("calc-tf").value);
    state.live.pollTimer = setInterval(runTick, ms);
    runTick();
    if (state.live.delayUiTimer) clearInterval(state.live.delayUiTimer);
    state.live.delayUiTimer = setInterval(() => {
      if (!isLiveMode()) {
        clearInterval(state.live.delayUiTimer);
        state.live.delayUiTimer = null;
        return;
      }
      syncLiveCandleDelayUi(true);
    }, 15000);
  }

  /** Подключение T-Bank перед live-торговлей (токен, счёт, депозит). */
  async function connectTbankForLive() {
    if (!isLiveMode()) return;
    if (!(await ensureTbankTokenUnlocked({ interactive: true, openUi: true }))) return;
    if (!state.tbank.accounts.length) await loadTbankAccounts();
    else if (!state.tbank.depositLoaded) await loadTbankDeposit();
    await refreshLiveOrders();
    await refreshLivePortfolioStats();
    startLiveStatsPoll();
    syncLiveTradingUi();
  }

  /** Вкл/выкл live-торговлю: старт/стоп опросов, reconcile, FINRESP на барах. */
  async function toggleLiveTrading() {
    if (!isLiveMode()) return;
    if (state.uiBusy) {
      state.live.lastError = "дождитесь окончания расчёта";
      syncLiveTradingUi();
      return;
    }
    if (state.live.active) {
      state.live.active = false;
      state.live.tradingStartedAt = null;
      state.live.lastError = "";
      syncLiveTradingUi();
      return;
    }
    clearLiveManualFlatten();
    state.live.lastError = "";
    syncLiveTradingUi();

    const startCheck = validateLiveTradingStart();
    if (!startCheck.ok) {
      state.live.lastError = startCheck.error;
      $("calc-status").textContent = `Нельзя начать торговлю: ${startCheck.error}.`;
      syncLiveTradingUi();
      return;
    }

    const sandbox = isLiveSandbox();
    if (!sandbox) {
      const unlockedForLive = await ensureTbankTokenUnlocked({ interactive: true, openUi: true });
      if (!unlockedForLive) {
        state.live.lastError = "нужен токен и пароль";
        syncLiveTradingUi();
        return;
      }
      if (!state.tbank.selectedAccountId) await loadTbankAccounts();
      if (!state.tbank.selectedAccountId) {
        state.live.lastError = "нет счёта T-Bank";
        setTbankStatus("Не удалось определить счёт T-Bank для торговли.", true);
        syncLiveTradingUi();
        return;
      }
    }

    ensureLiveChartSession();
    if (sandbox) {
      state.live.sessionPositionBaseline = sandboxPositionsByTicker();
      const sb = ensureSandboxState();
      if (!Number.isFinite(sb.startPortfolio)) {
        try { await enableLiveSandbox(); } catch (err) { noteLiveTech("live-sandbox-start", err.message); }
      } else {
        await updateSandboxPortfolioDisplay();
      }
    } else {
      try {
        state.live.sessionPositionBaseline = await tbankPositionsByTicker();
      } catch (err) {
        state.live.sessionPositionBaseline = null;
        noteLiveTech("live-session-baseline", err.message);
      }
    }
    state.live.active = true;
    state.live.tradingStartedAt = new Date().toISOString();
    state.live.realLegSeed = null;
    resetLiveFinrespBaselinesForTrading();
    state.live.lastError = "";
    syncLiveTradingUi();
    if (!state.live.pollTimer) startLiveModePoll();
    try {
      await livePollTickAfterRefresh();
      await refreshLiveOrders();
      syncLiveTradingUi();
    } catch (err) {
      state.live.lastError = err.message;
      syncLiveTradingUi();
      noteLiveTech("toggleLiveTrading", err.message);
    }
  }

  /** Закрытие позиции/заявки: `closeAllSandboxPositionsLive`. */
  async function closeAllSandboxPositionsLive() {
    const sb = ensureSandboxState();
    let sent = 0;
    const failed = [];
    while (sb.open.size > 0) {
      const pos = sb.open.values().next().value;
      if (!pos) break;
      const key = sandboxPosKey(pos.market || (pos.isFuture ? "futures" : "shares"), pos.ticker || pos.sec);
      try {
        const ok = await closeSandboxPositionAtMarket(pos, { skipUiRefresh: true, tradeSource: "sell-all" });
        if (!ok) {
          failed.push(`${pos.ticker}: не удалось закрыть`);
          sb.open.delete(key);
          continue;
        }
        sent += 1;
        renderSandboxPortfolioQuick();
        syncSandboxPositionsTable();
        await yieldToUi();
      } catch (err) {
        failed.push(`${pos.ticker}: ${err.message}`);
        sb.open.delete(key);
      }
    }
    sb.open.clear();
    state.live.openPositions = [];
    forceClearLivePositionsPanel();
    return { sent, failed };
  }

  /** Закрыть все позиции по рынку и отменить активные заявки. */
  async function sellAllMarketLive() {
    if (!isLiveMode() || state.live.tradingActionBusy) return;
    clearLiveManualFlatten();
    state.live.tradingActionBusy = true;
    cancelQueuedLiveChartsRefresh();
    const sellBtn = $("live-trading-sell-all");
    if (sellBtn) sellBtn.disabled = true;
    try {
      if (isLiveSandbox()) {
        const { sent, failed } = await closeAllSandboxPositionsLive();
        await updateSandboxPortfolioDisplay({ skipCharts: true, fetchPrices: false });
        renderLiveOrdersPanel();
        forceClearLivePositionsPanel();
        state.live.lastError = failed.length ? failed.join("; ") : (sent ? "" : "открытых фейк-позиций нет");
        const status = $("live-trading-status");
        if (status) {
          if (sent) status.textContent = failed.length ? `закрыто: ${sent} · ${state.live.lastError}` : `закрыто позиций: ${sent}`;
          else status.textContent = failed.length ? state.live.lastError : "открытых фейк-позиций нет";
        }
        return;
      }
      if (!(await ensureTbankTokenUnlocked())) return;
      if (!state.tbank.selectedAccountId) await loadTbankAccounts();
      if (!state.tbank.selectedAccountId) throw new Error("Счёт T-Bank не выбран.");
      const data = await tbankRequest("OperationsService/GetPositions", {
        accountId: state.tbank.selectedAccountId
      });
      let sent = 0;
      const skipped = [];
      const failed = [];
      const closeList = async (items, isFuture) => {
        for (const p of items || []) {
          const pieces = +p.balance || 0;
          if (pieces === 0) continue;
          const instrumentId = p.instrumentUid || p.figi;
          let lot = Math.max(1, +p.lot || 1);
          let meta = null;
          try {
            meta = await tbankGetInstrumentById(instrumentId);
            if (!p.lot && meta?.lot) lot = Math.max(1, +meta.lot);
          } catch (err) {
            failed.push(liveIssueEntry(instrumentId, instrumentId, { message: err.message }));
            continue;
          }
          let lots;
          let direction;
          if (isFuture) {
            lots = Math.abs(Math.round(pieces));
            direction = pieces > 0 ? "ORDER_DIRECTION_SELL" : "ORDER_DIRECTION_BUY";
          } else {
            lots = positionClosingLots({ lot, isFuture: false }, Math.abs(pieces));
            direction = pieces > 0 ? "ORDER_DIRECTION_SELL" : "ORDER_DIRECTION_BUY";
          }
          if (lots <= 0) continue;
          const ticker = meta?.ticker || instrumentId;
          const classCode = tbankInstField(meta, "classCode", "class_code") || "";
          const tradable = await tbankValidateTradable(instrumentId, meta);
          if (!tradable.ok) {
            skipped.push(liveIssueEntry(ticker, ticker, {
              reason: tradable.reason,
              instrumentId,
              classCode
            }));
            continue;
          }
          try {
            await postLiveOrder(instrumentId, direction, lots, ticker, {
              tradeSource: "sell-all",
              orderType: "market",
              market: isFuture ? "futures" : "shares"
            });
            sent += 1;
            await refreshLiveOpenPositions({ force: true });
          } catch (err) {
            failed.push(liveIssueEntry(ticker, ticker, {
              message: err.message,
              instrumentId,
              classCode,
              direction,
              lots
            }));
          }
        }
      };
      await closeList(data.securities, false);
      await closeList(data.futures, true);
      forceClearLivePositionsPanel();
      const issueText = summarizeLiveReconcileIssues(skipped, failed);
      state.live.lastError = issueText;
      noteLiveReconcileToTech({
        at: new Date().toISOString(),
        placed: sent,
        skipped,
        failed,
        targetCount: (data.securities?.length || 0) + (data.futures?.length || 0)
      });
      const status = $("live-trading-status");
      if (status) {
        if (sent) status.textContent = issueText ? `закрыто позиций: ${sent} · ${issueText}` : `закрыто позиций: ${sent}`;
        else status.textContent = issueText || "открытых позиций нет";
      }
      await refreshLiveOrders();
      await refreshLivePortfolioStats();
      await refreshLiveOpenPositions({ force: true });
      await new Promise((r) => setTimeout(r, 1200));
      await refreshLiveOpenPositions({ force: true });
      await refreshLivePortfolioStats();
      if (!state.live.openPositions?.length) forceClearLivePositionsPanel();
    } catch (err) {
      state.live.lastError = err.message;
      setTbankStatus(`Ошибка закрытия по рынку: ${err.message}`, true);
      noteLiveTech("live-close-all", err.message);
    } finally {
      state.live.tradingActionBusy = false;
      if (sellBtn) sellBtn.disabled = !isLiveMode() || state.uiBusy;
      try {
        if (state.live.active) {
          await refreshLiveCandleStream({ silent: true });
          await liveTradingReconcile();
        }
        if (isLiveSandbox()) {
          await updateSandboxPortfolioDisplay({ skipCharts: true, fetchPrices: false });
          renderLiveOrdersPanel();
          syncSandboxPositionsTable();
        } else {
          await refreshLiveOpenPositions({ force: true });
          await refreshLiveOrders();
        }
      } catch (err) {
        noteLiveTech("live-close-all-finish", err.message);
      }
      syncLiveTradingUi();
    }
  }

  /** Синхронизация UI/state: `syncAccountModeUi`. */
  function syncAccountModeUi() {
    state.accountMode = readAccountModeFromUi();
    const isTbank = state.accountMode === "tbank";
    const isLive = isLiveMode();
    const isTbankBacked = isTbankBackedMode();
    const deposit = $("vol-deposit");
    if (deposit) {
      deposit.readOnly = isTbankBacked;
      deposit.title = isTbankBacked
        ? "В режиме T-Bank депозит берётся из выбранного торгового счёта."
        : "";
    }
    if (isLive) {
      const stored = !!safeStorageGet(TBANK_TOKEN_STORE_KEY);
      const unlocked = !!state.tbank.token;
      if (stored && !unlocked) {
        setTbankStatus(
          "Режим реальной торговли. Токен сохранён локально — введите пароль в «Реальный счёт T-Bank» и нажмите «Расшифровать и подключить».",
          true
        );
      } else {
        setTbankStatus(
          state.tbank.depositLoaded
            ? `Режим реальной торговли. Счёт подключён, депозит: ${fmt(+deposit.value || 0, 0)} ₽.`
            : "Режим реальной торговли. Введите пароль — калькулятор расшифрует токен и подключит тот же счёт T-Bank."
        );
      }
    } else if (isTbank) {
      const stored = !!safeStorageGet(TBANK_TOKEN_STORE_KEY);
      if (stored && !state.tbank.token) {
        setTbankStatus(
          "Режим T-Bank активен. Токен сохранён — введите пароль в блоке «Реальный счёт T-Bank» и нажмите «Расшифровать и подключить».",
          true
        );
      } else {
        setTbankStatus(
          state.tbank.depositLoaded
            ? `Режим T-Bank активен. Депозит взят со счёта: ${fmt(+deposit.value || 0, 0)} ₽.`
            : "Режим T-Bank активен. Введите пароль: калькулятор расшифрует токен, загрузит счёт и возьмёт депозит автоматически."
        );
      }
    } else {
      setTbankStatus("Фиктивный кошелёк активен. Поле депозита работает вручную, как раньше.");
    }
    syncTbankSettingsState();
    syncLivePeriodControls();
    syncLiveTradingUi();
    if (isLive) {
      try {
        const needsUnlock = !!safeStorageGet(TBANK_TOKEN_STORE_KEY) && !state.tbank.token;
        if (!needsUnlock) ensureLiveChartSession();
        if (state.tbank.token) startLiveStatsPoll();
      } catch (err) {
        noteLiveTech("live-chart-session", err?.message || String(err));
        syncLiveTradingUi();
      }
    } else {
      endLiveChartSession();
      stopLiveStatsPoll();
    }
  }

  function fillTbankAccounts() {
    if (hasConnectors()) getBroker().fillAccountsFromStorage();
    else fillTbankAccountsFromStorage();
    syncTbankSettingsState();
  }

  function selectedTbankHostId() {
    if (hasConnectors()) return getBroker().selectedHostId();
    const id = safeStorageGet(TBANK_HOST_STORE_KEY) || "tinkoff";
    return TBANK_REST_BASES[id] ? id : "tinkoff";
  }

  function setTbankHostId(id) {
    if (hasConnectors()) return getBroker().setHostId(id);
    const safeId = TBANK_REST_BASES[id] ? id : "tinkoff";
    safeStorageSet(TBANK_HOST_STORE_KEY, safeId);
    return safeId;
  }

  async function tbankRequest(serviceMethod, body) {
    return getBroker().request(serviceMethod, body);
  }

  /** Сохранение: `saveTbankToken`. */
  async function saveTbankToken() {
    const token = $("tbank-token").value.trim();
    const passphrase = $("tbank-passphrase").value;
    if (!token) { setTbankStatus("Введите токен T-Bank Invest.", true); return; }
    if (passphrase.length < 8) { setTbankStatus("Пароль шифрования должен быть не короче 8 символов.", true); return; }
    try {
      const encrypted = await encryptTbankToken(token, passphrase);
      if (!safeStorageSet(TBANK_TOKEN_STORE_KEY, encrypted)) throw new Error("localStorage недоступен.");
      state.tbank.token = token;
      state.tbank.depositLoaded = false;
      $("tbank-token").value = "";
      setTbankStatus("Токен зашифрован и сохранён локально. При выборе T-Bank калькулятор сам загрузит счёт и депозит.");
      syncTbankSettingsState();
      if (isTbankBackedMode()) connectTbankAndLoadDeposit();
    } catch (err) {
      setTbankStatus(`Ошибка сохранения токена: ${err.message}`, true);
      noteTechError(`tbank-save-token: ${err.message}`);
    }
  }

  /** Получение значения: `getTbankPassphrase`. */
  function getTbankPassphrase(opts) {
    const options = opts || {};
    return ($("tbank-passphrase")?.value || "").trim() || "";
  }

  let tbankPassphraseModalResolve = null;
  let tbankPassphraseModalPromise = null;
  let tbankUnlockInFlight = null;

  /** Закрытие позиции/заявки: `closeTbankPassphraseModal`. */
  function closeTbankPassphraseModal(value) {
    const modal = document.getElementById("tbank-passphrase-modal");
    if (modal) modal.hidden = true;
    if (typeof tbankPassphraseModalResolve === "function") {
      const finish = tbankPassphraseModalResolve;
      tbankPassphraseModalResolve = null;
      tbankPassphraseModalPromise = null;
      finish(value ?? "");
    }
  }

  /** Показ UI/уведомления: `showTbankPassphraseModal`. */
  function showTbankPassphraseModal(title) {
    if (tbankPassphraseModalPromise) return tbankPassphraseModalPromise;
    bindTbankPassphraseModalUi();
    tbankPassphraseModalPromise = new Promise((resolve) => {
      const modal = document.getElementById("tbank-passphrase-modal");
      const input = document.getElementById("tbank-passphrase-modal-input");
      if (!modal || !input) {
        tbankPassphraseModalPromise = null;
        resolve(window.prompt(title || "Введите пароль для расшифровки локального токена T-Bank") || "");
        return;
      }
      const titleEl = document.getElementById("tbank-passphrase-modal-title");
      if (titleEl && title) titleEl.textContent = title;
      tbankPassphraseModalResolve = (val) => {
        tbankPassphraseModalResolve = null;
        tbankPassphraseModalPromise = null;
        resolve(val ?? "");
      };
      modal.hidden = false;
      input.value = "";
      setTimeout(() => { try { input.focus(); } catch (_) { /* ignore */ } }, 0);
    });
    return tbankPassphraseModalPromise;
  }

  /** Запрос пароля: поле на странице → модальное окно (file://) → window.prompt. */
  async function requestTbankPassphrase(opts) {
    const options = opts || {};
    let passphrase = getTbankPassphrase();
    if (passphrase) return passphrase;
    if (!options.allowPrompt) return "";
    const promptTitle = "Введите пароль для расшифровки локального токена T-Bank";
    if (IS_FILE_PROTOCOL || options.useModal) {
      passphrase = await showTbankPassphraseModal(promptTitle);
    } else {
      passphrase = window.prompt(promptTitle) || "";
    }
    if (passphrase && $("tbank-passphrase")) $("tbank-passphrase").value = passphrase;
    return passphrase;
  }

  /** Подпрограмма `openTbankPassphraseUi`. */
  function openTbankPassphraseUi(hint) {
    const details = $("tbank-settings");
    if (details) details.open = true;
    syncCollapsibleToggleLabel("tbank-settings", "tbank-settings-toggle");
    const pp = $("tbank-passphrase");
    if (pp) {
      try { pp.focus({ preventScroll: false }); } catch (_) { pp.focus(); }
    }
    if (hint) setTbankStatus(hint, true);
  }

  /** Ленивая инициализация/проверка: `ensureTbankTokenUnlocked`. */
  async function ensureTbankTokenUnlocked(opts) {
    const options = opts || {};
    if (state.tbank.token) return true;
    if (tbankUnlockInFlight) return tbankUnlockInFlight;

    const task = (async () => {
      const payload = safeStorageGet(TBANK_TOKEN_STORE_KEY);
      if (!payload) {
        setTbankStatus("Локально сохранённого токена нет. Сохраните токен в блоке «Реальный счёт T-Bank».", true);
        if (options.openUi !== false) openTbankPassphraseUi();
        return false;
      }
      const passphrase = await requestTbankPassphrase({
        allowPrompt: !!options.interactive,
        useModal: !!options.interactive || IS_FILE_PROTOCOL
      });
      closeTbankPassphraseModal();
      if (!passphrase) {
        const hint = options.interactive
          ? "Введите пароль в поле ниже или отмените запрос в диалоге."
          : "Токен сохранён локально — введите пароль в поле «Пароль для шифрования/расшифровки» и нажмите «Расшифровать и подключить» (или смените режим счёта ещё раз).";
        setTbankStatus(hint, true);
        if (options.openUi !== false) openTbankPassphraseUi(hint);
        return false;
      }
      try {
        state.tbank.token = await decryptTbankToken(payload, passphrase);
        state.tbank.depositLoaded = false;
        setTbankStatus("Токен расшифрован на текущую сессию. Загружаю счёт и депозит…");
        syncTbankSettingsState();
        return true;
      } catch (err) {
        state.tbank.token = null;
        setTbankStatus(`Не удалось расшифровать токен: ${err.message}`, true);
        noteTechError(`tbank-unlock-token: ${err.message}`);
        if (options.openUi !== false) openTbankPassphraseUi();
        return false;
      }
    })();

    tbankUnlockInFlight = task;
    try {
      return await task;
    } finally {
      if (tbankUnlockInFlight === task) tbankUnlockInFlight = null;
    }
  }

  /** Модалка пароля для расшифровки токена T-Bank. */
  async function unlockTbankTokenInteractive() {
    openTbankPassphraseUi();
    const ok = await ensureTbankTokenUnlocked({ interactive: true, openUi: true });
    if (!ok) return false;
    await connectTbankAndLoadDeposit({ interactive: true });
    if (isLiveMode()) await connectTbankForLive();
    return true;
  }

  async function loadTbankAccounts() {
    try {
      setTbankStatus("Загрузка счетов T-Bank…");
      await getBroker().loadAccounts();
      fillTbankAccounts();
      setTbankStatus(`Счёт T-Bank загружен: ${accountLabel(state.tbank.accounts.find((a) => a.id === state.tbank.selectedAccountId) || state.tbank.accounts[0])}. Загружаю депозит…`);
      if (isTbankBackedMode() && state.tbank.selectedAccountId) await loadTbankDeposit();
    } catch (err) {
      setTbankStatus(`Ошибка загрузки счетов: ${err.message}`, true);
      noteTechError(`tbank-load-accounts: ${err.message}`);
    }
  }

  async function loadTbankDeposit() {
    try {
      if (!state.tbank.selectedAccountId) throw new Error("Счёт T-Bank не загружен.");
      setTbankStatus("Загрузка портфеля T-Bank…");
      const amount = await getBroker().loadDepositAmount();
      $("vol-deposit").value = String(Math.round(amount));
      syncLeverageDisplay();
      syncAccountModeUi();
      setTbankStatus(`Депозит загружен из T-Bank: ${fmt(amount, 2)} ₽.`);
      saveConfig();
      if (state.packs.length) invalidateFinrespResult();
    } catch (err) {
      state.tbank.depositLoaded = false;
      setTbankStatus(`Ошибка загрузки депозита: ${err.message}`, true);
      noteTechError(`tbank-load-deposit: ${err.message}`);
    }
  }

  /** Подпрограмма `connectTbankAndLoadDeposit`. */
  async function connectTbankAndLoadDeposit(opts) {
    const options = opts && typeof opts === "object" ? opts : { interactive: !!opts };
    if (!isTbankBackedMode()) return;
    const unlocked = await ensureTbankTokenUnlocked({
      interactive: !!options.interactive,
      openUi: options.openUi !== false
    });
    if (!unlocked) return;
    if (!state.tbank.accounts.length) {
      await loadTbankAccounts();
      return;
    }
    if (state.tbank.selectedAccountId) await loadTbankDeposit();
    if (isLiveMode()) await refreshLiveOrders();
  }

  /** Подпрограмма `initAccountMode`. */
  function initAccountMode() {
    $("account-mode").value = "paper";
    state.accountMode = "paper";
    setTbankHostId(safeStorageGet(TBANK_HOST_STORE_KEY) || "tinkoff");
    state.tbank.selectedAccountId = safeStorageGet(TBANK_ACCOUNT_STORE_KEY);
    fillTbankAccounts();
    syncAccountModeUi();
  }

  /** Подпрограмма `requireTbankDepositForRun`. */
  function requireTbankDepositForRun() {
    if (!isTbankBackedMode()) return true;
    const deposit = +($("vol-deposit")?.value || 0);
    if (isLiveSandbox()) {
      if (deposit > 0) return true;
      const sb = state.live?.sandbox;
      if (sb && Number.isFinite(sb.startPortfolio) && sb.startPortfolio > 0) return true;
      const msg = "Для песочницы укажите депозит > 0 (поле «Депозит» в Volume).";
      $("calc-status").textContent = msg;
      setTbankStatus(msg, true);
      return false;
    }
    if (state.tbank.depositLoaded && deposit > 0) return true;
    const msg = "В режиме T-Bank сначала загрузите депозит из выбранного счёта.";
    $("calc-status").textContent = msg;
    setTbankStatus(msg, true);
    $("tbank-settings").open = true;
    syncCollapsibleToggleLabel("tbank-settings", "tbank-settings-toggle");
    return false;
  }
  /** Подпрограмма `handleAccountModeUserChange`. */
  async function handleAccountModeUserChange() {
    if ($("account-mode")?.value !== "live" && state.live.active) stopLiveTradingOnModeChange();
    state.accountMode = readAccountModeFromUi();
    saveConfig();
    if (state.accountMode === "tbank" || state.accountMode === "live") {
      await connectTbankAndLoadDeposit({ interactive: true, openUi: true });
      if (state.accountMode === "live") await connectTbankForLive();
    }
    syncAccountModeUi();
    if (state.accountMode !== "tbank" && state.accountMode !== "live") {
      if (state.packs.length && (!isTbankBackedMode() || state.tbank.depositLoaded)) invalidateFinrespResult();
    }
  }

  /** Привязать OK/Отмена модального окна пароля T-Bank (делегирование — работает до bindUiEvents). */
  function bindTbankPassphraseModalUi() {
    if (bindTbankPassphraseModalUi._done) return;
    bindTbankPassphraseModalUi._done = true;
    document.addEventListener("click", (ev) => {
      const id = ev.target?.id;
      if (id === "tbank-passphrase-modal-ok") {
        ev.preventDefault();
        closeTbankPassphraseModal(document.getElementById("tbank-passphrase-modal-input")?.value || "");
      } else if (id === "tbank-passphrase-modal-cancel") {
        ev.preventDefault();
        closeTbankPassphraseModal("");
      } else if (id === "tbank-passphrase-modal") {
        closeTbankPassphraseModal("");
      }
    });
    document.addEventListener("keydown", (ev) => {
      const modal = document.getElementById("tbank-passphrase-modal");
      if (!modal || modal.hidden) return;
      if (ev.target?.id !== "tbank-passphrase-modal-input") return;
      if (ev.key === "Enter") {
        ev.preventDefault();
        closeTbankPassphraseModal(document.getElementById("tbank-passphrase-modal-input")?.value || "");
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        closeTbankPassphraseModal("");
      }
    });
  }

    return {
      isLiveMode,
      isLiveSandbox,
      isTbankBackedMode,
      readAccountModeFromUi,
      setTbankStatus,
      syncTbankSettingsState,
      syncAccountModeUi,
      syncLiveTradingUi,
      syncLiveStatsHint,
      renderLiveFreeCashStat,
      renderLiveFinResultStat,
      snapshotLiveSessionPortfolioBaseline,
      liveFreeCashRub,
      liveFinResultRub,
      requireTbankDepositForRun,
      initAccountMode,
      connectTbankAndLoadDeposit,
      connectTbankForLive,
      saveTbankToken,
      unlockTbankTokenInteractive,
      ensureTbankTokenUnlocked,
      loadTbankAccounts,
      loadTbankDeposit,
      fillTbankAccounts,
      toggleLiveTrading,
      sellAllMarketLive,
      liveTradingReconcile,
      refreshLiveCandleStream,
      bootstrapLiveChartsSession,
      refreshLiveManualLimitPrice,
      refreshLiveChartsUi,
      refreshLiveEquityChartsUi,
      renderLiveOrdersPanel,
      exportTradeHistoryProtocolFile,
      buildTradeHistoryProtocol,
      renderLivePositionsPanel,
      syncLiveManualOrderUi,
      syncLivePeriodControls,
      placeManualLiveOrder,
      closeLivePositionAtMarket,
      closeLiveOrderAtMarket,
      onLiveSandboxToggle,
      enableLiveSandbox,
      disableLiveSandbox,
      stopLiveTradingOnModeChange,
      handleAccountModeUserChange,
      bindTbankPassphraseModalUi,
      closeTbankPassphraseModal,
      checkSandboxPortfolioStopperNotify,
      ensureSandboxStopperWatch,
      resetSandboxStopperWatch,
      syncTradeHistoryFromSources,
      noteLiveFinrespSkipped,
      tryLiveFinrespCalc,
      startLiveModePoll,
      stopLiveModePoll,
      queueLiveCandleRefreshIfNeeded,
      startLiveStatsPoll,
      stopLiveStatsPoll,
      startLiveOrderBookPoll,
      stopLiveOrderBookPoll,
      startLivePositionsPoll,
      stopLivePositionsPoll,
      fillLiveTradingInstrumentSelects,
      refreshLiveOrderBook,
      hideLivePositionsMenu,
      onLivePositionsMenuAction,
      onLivePositionsTableContextMenu,
      onLivePositionsPointerDown,
      onLivePositionsPointerEnd,
      onLiveOrderBookPriceDblClick,
      parseLiveManualInstrumentKey,
      tbankRequest,
      getBroker,
      tbankFindInstrument,
      tbankGetInstrumentById,
      tbankValidateTradable,
      tbankPostOrder,
      postLiveOrder,
      isOrderBuy,
      liveOrderRowId,
      liveDisplayFinresp,
      aggregateFinrespLocal,
      isLiveTradingSession,
      liveSessionStartTime,
      liveChartSessionNote,
      drawLiveChartPlaceholders,
      drawLiveEquityPlaceholders,
      sliceRowsForLiveSession,
      zeroBaseEquityRows,
      logicChartHeading,
      logicAbsentNote,
      orderMarkersForChart,
      chartDecorFromRows,
      buildModeRegionBands
    };

  }

  root.MultiLogicFinrespLive = { install };
})(typeof window !== "undefined" ? window : globalThis);
