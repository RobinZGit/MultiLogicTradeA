/*
 * UI и оркестрация калькулятора FINRESP (HTML + state + T-Bank live).
 *
 * Процедура / функция в JavaScript:
 *   — обе пишутся как function name() { … }
 *   — «функция» возвращает результат через return (selectedLogicIds, calcResultAsync, …)
 *   — «процедура» только меняет state/DOM и ничего не возвращает (invalidateFormChange, syncLiveTradingUi, …)
 *
 * Блоки ниже помечены комментариями // === … ===
 */
(() => {
  window.__mlFinresp = window.__mlFinresp || {};
  window.__mlFinresp.bootPhase = "started";
  window.__mlFinresp.lastBootError = null;
  const CALC_PAGE_VERSION = "2026-06-16-logic-help-v1";
  const AVG_PRICE_CHART_TITLE = "Средневзвешенная цена выбранных инструментов (Close)";
  const ML_CONFIG_KEY = "multilogic.finresp.config.v1";
  const CALC_PROGRESS = {
    LOAD_MAX: 33,
    FINRESP_START: 33,
    FINRESP_MAX: 66,
    CHARTS_START: 88,
    EQUITY_CHARTS_START: 93,
    RUN_MAX: 99
  };
  const FINRESP_STALE_MSG = "Параметры изменены — нажмите «Рассчитать».";
  const $ = (id) => document.getElementById(id);
  const IS_FILE_PROTOCOL = location.protocol === "file:";
  const TECH_LOG_MAX_ERRORS = 128;

  function bridgeSetResults(view) {
    const api = window.__mlFinrespBridge;
    if (!api || typeof api.setResults !== "function") return false;
    try {
      api.setResults(view);
      return true;
    } catch (_) {
      return false;
    }
  }
  function bridgeSetStatus(text) {
    const api = window.__mlFinrespBridge;
    if (!api || typeof api.setStatus !== "function") return false;
    try {
      api.setStatus(text);
      return true;
    } catch (_) {
      return false;
    }
  }
  let lastCalcStatusText = "";
  function setCalcStatus(text) {
    lastCalcStatusText = String(text ?? "");
    if (!bridgeSetStatus(lastCalcStatusText)) {
      const st = $("calc-status");
      if (st) st.textContent = lastCalcStatusText;
    }
  }
  function getCalcStatus() {
    return lastCalcStatusText || ($("calc-status")?.textContent ?? "");
  }
  function appendCalcStatus(suffix) {
    setCalcStatus(getCalcStatus() + suffix);
  }
  function bridgeApi() {
    return window.__mlFinrespBridge;
  }
  function bridgeSetFormCatalog(view) {
    const api = bridgeApi();
    if (!api || typeof api.setFormCatalog !== "function") return false;
    try {
      api.setFormCatalog(view);
      return true;
    } catch (_) {
      return false;
    }
  }
  function bridgeSetWindow(view) {
    const api = bridgeApi();
    if (!api || typeof api.setWindow !== "function") return false;
    try {
      api.setWindow(view);
      return true;
    } catch (_) {
      return false;
    }
  }
  function bridgeSetCharts(view) {
    const api = bridgeApi();
    if (!api || typeof api.setCharts !== "function") return false;
    try {
      api.setCharts(view);
      return true;
    } catch (_) {
      return false;
    }
  }
  function bridgeApplyInstrumentSelection(ids) {
    const api = bridgeApi();
    if (!api || typeof api.applyInstrumentSelection !== "function") return false;
    try {
      api.applyInstrumentSelection(ids);
      return true;
    } catch (_) {
      return false;
    }
  }
  function bridgeApplyLogicSelection(ids, cleared) {
    const api = bridgeApi();
    if (!api || typeof api.applyLogicSelection !== "function") return false;
    try {
      api.applyLogicSelection(ids, !!cleared);
      return true;
    } catch (_) {
      return false;
    }
  }
  function bridgeApplyFormSnapshot(snapshot) {
    const api = bridgeApi();
    if (!api || typeof api.applyFormSnapshot !== "function") return false;
    try {
      api.applyFormSnapshot(snapshot);
      return true;
    } catch (_) {
      return false;
    }
  }
  function readFormScalarsForConfig() {
    const api = bridgeApi();
    if (!api?.getFormSnapshot) return null;
    try {
      return api.getFormSnapshot();
    } catch (_) {
      return null;
    }
  }
  function publishInstrumentSelectionFromDom() {
    const sel = $("calc-sec");
    if (!sel) return;
    const ids = Array.from(sel.selectedOptions).map((o) => o.value).filter(Boolean);
    bridgeApplyInstrumentSelection(ids);
  }
  function bridgeReadInstrumentsFromDom() {
    return Array.from($("calc-sec").selectedOptions).map((o) => ({
      sec: o.value,
      market: o.dataset.market === "futures" ? "futures" : "shares"
    })).filter((i) => i.sec);
  }
  function bridgeReadLogicIdsFromDom() {
    const sel = $("calc-logic");
    if (!sel) return state.logicSelectionCleared ? [] : ["RND"];
    const ids = [...sel.selectedOptions].map((o) => o.value).filter(Boolean);
    if (ids.length) return ids;
    if (state.logicSelectionCleared) return [];
    return sel.value ? [sel.value] : ["RND"];
  }
  function publishWindowBridge() {
    const startEl = $("calc-start");
    const endEl = $("calc-end");
    bridgeSetWindow({
      start: +(startEl?.value ?? 0),
      end: +(endEl?.value ?? 0),
      min: +(startEl?.min ?? 0),
      max: +(endEl?.max ?? 0),
      disabled: !!startEl?.disabled,
      startLabel: $("calc-start-label")?.textContent ?? "—",
      endLabel: $("calc-end-label")?.textContent ?? "—"
    });
  }
  function installBridgeWindowHandler() {
    const api = bridgeApi();
    if (!api?.registerWindowHandler) return;
    api.registerWindowHandler((which, start, end) => {
      const startEl = $("calc-start");
      const endEl = $("calc-end");
      if (startEl) startEl.value = String(start);
      if (endEl) endEl.value = String(end);
      state.movedSlider = which;
      saveWindowAnchor();
      invalidateFormChange();
    });
    api.registerLogicAppliedHandler?.(() => {
      updatePositionSlHint();
      syncLogicSelectedHint();
      invalidateFormChange();
    });
  }
  function commissionDisplayText(commission) {
    if (!Number.isFinite(commission) || commission <= 0) return "0";
    return `−${fmt(commission)} ₽`;
  }
  function annDisplay(value) {
    return {
      text: fmtPct(value),
      color: !Number.isFinite(value) ? "" : value < 0 ? "#b91c1c" : "#047857"
    };
  }

  const techLog = {
    startedAt: new Date().toISOString(),
    errors: [],
    lastEvent: "boot"
  };

  /** Подпрограмма `pushTechLogLine`. */
  function pushTechLogLine(line) {
    techLog.errors.push(line);
    while (techLog.errors.length > TECH_LOG_MAX_ERRORS) techLog.errors.shift();
  }

  /** Запись в тех. журнал: `noteTechError`. */
  function noteTechError(msg) {
    pushTechLogLine(`${new Date().toISOString()} ${msg}`);
    updateTechInfo();
  }

  /** Запись в тех. журнал: `noteLiveTech`. */
  function noteLiveTech(tag, msg, extra) {
    const at = new Date().toISOString();
    const suffix = extra ? ` | ${extra}` : "";
    pushTechLogLine(`${at} ${tag}: ${msg}${suffix}`);
    techLog.lastEvent = tag;
    updateTechInfo();
  }

  /** Live-торговля: `liveIssueLine`. */
  function liveIssueLine(item) {
    if (!item) return "—";
    if (typeof item === "string") return item;
    return `${item.ticker || item.sec || "?"}: ${item.reason || item.message || "—"}`;
  }

  /** Live-торговля: `liveForbiddenLabel`. */
  function liveForbiddenLabel(item) {
    if (!item || typeof item === "string") return String(item || "?");
    return String(item.ticker || item.sec || "?");
  }

  /** Live-торговля: `liveIssueIsApiForbidden`. */
  function liveIssueIsApiForbidden(item) {
    if (!item) return false;
    if (typeof item === "string") {
      const t = item.toLowerCase();
      return t.includes("forbidden") || t.includes("api_trade");
    }
    if (item.apiForbidden) return true;
    const text = `${item.reason || ""} ${item.message || ""}`.toLowerCase();
    return text.includes("forbidden") || text.includes("api_trade")
      || text.includes("торговля через api недоступна");
  }

  /** Слияние: `mergeLiveForbiddenIssues`. */
  function mergeLiveForbiddenIssues(skipped, failed) {
    const out = [];
    const seen = new Set();
    for (const item of [...(skipped || []), ...(failed || [])]) {
      if (!liveIssueIsApiForbidden(item)) continue;
      const key = `${liveForbiddenLabel(item)}:${item.instrumentId || ""}:${item.reason || item.message || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  /** Форматирование для отображения: `formatLiveForbiddenTechLine`. */
  function formatLiveForbiddenTechLine(item) {
    const label = liveForbiddenLabel(item);
    if (typeof item === "string") return `${label} | ${item}`;
    const name = item.instrumentName || item.name || "—";
    return `${label} sec=${item.sec || label} name=${name} uid=${item.instrumentId || "—"} class=${item.classCode || "—"} market=${item.market || "—"} | ${item.reason || item.message || "API forbidden"}`;
  }

  /** Запись в тех. журнал: `noteLiveReconcileToTech`. */
  function noteLiveReconcileToTech(report) {
    if (!report) return;
    const at = report.at || new Date().toISOString();
    const forbidden = mergeLiveForbiddenIssues(report.skipped, report.failed);
    if (calcState?.live) {
      calcState.live.lastReconcile = report;
      calcState.live.apiForbiddenInstruments = forbidden;
    }
    techLog.lastEvent = "live-reconcile";
    const mode = report.sandbox ? "sandbox" : "real";
    pushTechLogLine(`${at} live-reconcile-summary: mode=${mode} placed=${report.placed ?? 0} aligned=${report.aligned ?? 0} skipped=${report.skipped?.length ?? 0} failed=${report.failed?.length ?? 0} targets=${report.targetCount ?? "—"}`);
    if (report.placed > 0) {
      pushTechLogLine(`${at} live-reconcile: placed=${report.placed} targets=${report.targetCount ?? "—"}`);
    }
    for (const td of report.targetDetails || []) {
      if (td.action === "aligned") {
        pushTechLogLine(`${at} live-target-aligned: ${td.sec || td.ticker} target=${td.target} broker=${td.current} delta=${td.delta} lot=${td.lot} reason=${td.reason || "—"}${td.signalOp ? ` op=${td.signalOp}` : ""}${td.logicId ? ` logic=${td.logicId}` : ""}`);
      } else if (td.action === "order") {
        pushTechLogLine(`${at} live-target-order: ${td.sec || td.ticker} target=${td.target} broker=${td.current} delta=${td.delta} lots=${td.lots} dir=${td.direction || "—"} reason=${td.reason || "откроется сделка"}${td.signalOp ? ` op=${td.signalOp}` : ""}${td.logicId ? ` logic=${td.logicId}` : ""}`);
      } else {
        pushTechLogLine(`${at} live-target-${td.action || "info"}: ${td.sec || "?"} ${td.error || td.market || ""}`);
      }
    }
    if (forbidden.length) {
      pushTechLogLine(`${at} live-api-forbidden-count: ${forbidden.length} tickers=${forbidden.map(liveForbiddenLabel).join(",")}`);
    }
    for (const f of forbidden) {
      pushTechLogLine(`${at} live-forbidden-instrument: ${formatLiveForbiddenTechLine(f)}`);
    }
    for (const s of report.skipped || []) {
      if (liveIssueIsApiForbidden(s)) continue;
      const extra = typeof s === "object"
        ? `uid=${s.instrumentId || "—"} class=${s.classCode || "—"} market=${s.market || "—"}`
        : "";
      pushTechLogLine(`${at} live-skip: ${liveIssueLine(s)}${extra ? ` | ${extra}` : ""}`);
    }
    for (const f of report.failed || []) {
      if (liveIssueIsApiForbidden(f)) continue;
      const extra = typeof f === "object"
        ? `uid=${f.instrumentId || "—"} dir=${f.direction || "—"} lots=${f.lots ?? "—"} class=${f.classCode || "—"}`
        : "";
      pushTechLogLine(`${at} live-fail: ${liveIssueLine(f)}${extra ? ` | ${extra}` : ""}`);
    }
    if (report.fatal) pushTechLogLine(`${at} live-reconcile-fatal: ${report.fatal}`);
    updateTechInfo();
  }

  /** Синхронизация подписи «Развернуть» / «Свернуть» у сворачиваемого блока. */
  function syncCollapsibleToggleLabel(detailsId, toggleId) {
    const details = typeof detailsId === "string" ? $(detailsId) : detailsId;
    const toggle = typeof toggleId === "string" ? $(toggleId) : toggleId;
    if (!details || !toggle) return;
    const open = details.open;
    toggle.textContent = open ? "Свернуть" : "Развернуть";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  /** Свернуть «Дополнительные параметры», если блок развёрнут (после «Рассчитать»). */
  function collapseExtraParamsIfOpen() {
    const details = $("extra-params");
    if (!details?.open) return;
    details.open = false;
    syncCollapsibleToggleLabel(details, "extra-params-toggle");
  }

  /** Привязка ссылки «Развернуть» / «Свернуть» к `<details>`. */
  function bindCollapsibleToggle(detailsId, toggleId) {
    const details = typeof detailsId === "string" ? $(detailsId) : detailsId;
    const toggle = typeof toggleId === "string" ? $(toggleId) : toggleId;
    if (!details || !toggle) return;
    const bindKey = `${details.id || detailsId}:${toggle.id || toggleId}`;
    bindCollapsibleToggle._bound = bindCollapsibleToggle._bound || new Set();
    if (bindCollapsibleToggle._bound.has(bindKey)) {
      syncCollapsibleToggleLabel(details, toggle);
      return;
    }
    bindCollapsibleToggle._bound.add(bindKey);
    /** Синхронизация UI/state: `syncLabel`. */
    function syncLabel() {
      syncCollapsibleToggleLabel(details, toggle);
    }
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      details.open = !details.open;
    });
    details.addEventListener("toggle", syncLabel);
    syncLabel();
  }

  /** «Тех. информация», доп. параметры, T-Bank — до полной инициализации (повторный вызов безопасен). */
  function bindCoreCollapsibleToggles() {
    bindCollapsibleToggle("tech-info-panel", "tech-info-toggle");
    bindCollapsibleToggle("logic-catalog-panel", "logic-catalog-toggle");
    bindCollapsibleToggle("extra-params", "extra-params-toggle");
    bindCollapsibleToggle("tbank-settings", "tbank-settings-toggle");
  }
  bindCoreCollapsibleToggles();

  /** Привязка сворачиваемых блоков live-панели (повторный вызов безопасен). */
  function bindLivePanelCollapsibleToggles() {
    bindCollapsibleToggle("live-manual-order-panel", "live-manual-order-toggle");
    bindCollapsibleToggle("live-order-book-panel", "live-order-book-toggle");
    bindCollapsibleToggle("live-positions-panel", "live-positions-toggle");
    bindCollapsibleToggle("live-trade-history-panel", "live-trade-history-toggle");
  }

  /** Построение структуры данных: `buildTechInfoText`. */
  function buildTechInfoText() {
    const E = window.MultiLogicFinrespEngine;
    const sec = $("calc-sec");
    const lines = [
      `pageVersion=${CALC_PAGE_VERSION}`,
      `startedAt=${techLog.startedAt}`,
      `lastEvent=${techLog.lastEvent}`,
      `url=${location.href}`,
      `protocol=${location.protocol}`,
      `fileProtocol=${IS_FILE_PROTOCOL}`,
      `moexCorsBlocked=${IS_FILE_PROTOCOL}`,
      `online=${navigator.onLine}`,
      `engineLoaded=${!!E}`,
      `createCandleCache=${!!E?.createCandleCache}`,
      `cacheVersion=${E?.CANDLE_CACHE_VERSION ?? "—"}`,
      `chartsModule=${typeof MLInstrumentChart !== "undefined" ? (MLInstrumentChart.version || "legacy") : "missing"}`,
      `tradeMarkersFromBar=${!!E?.tradeMarkersFromBar}`
    ];
    if (calcState) {
      const selected = typeof selectedInstruments === "function" ? selectedInstruments() : [];
      const cacheStats = calcState.candleCache?.stats?.();
      lines.push(
        `initOk=${!!calcState._initOk}`,
        `shareList=${calcState.shareList?.length ?? 0}`,
        `futuresList=${calcState.futuresList?.length ?? 0}`,
        `futuresFromMoex=${!!calcState.futuresFromMoex}`,
        `selectOptions=${sec?.options?.length ?? 0}`,
        `selected=${selected.length}`,
        `selectedSample=${selected.slice(0, 8).map((i) => i.sec).join(",") || "—"}`,
        `calcSecDisabled=${!!sec?.disabled}`,
        `calcRunDisabled=${!!$("calc-run")?.disabled}`,
        `allSharesCbDisabled=${!!$("calc-sec-all-shares")?.disabled}`,
        `allFuturesCbDisabled=${!!$("calc-sec-all-futures")?.disabled}`,
        `uiBusy=${!!calcState.uiBusy}`,
        `optimizing=${typeof isOptimizing === "function" ? isOptimizing() : false}`,
        `candleDb=${calcState.candleCache ? "on" : "off"}`,
        `candleDbName=${cacheStats?.dbName || "—"}`,
        `candleDbReady=${!!cacheStats?.ready}`,
        `cacheEntries=${cacheStats?.entries ?? 0}`,
        `cacheBars=${cacheStats?.bars ?? 0}`,
        `storageUsage=${cacheStats?.usage ?? "—"}`,
        `storageQuota=${cacheStats?.quota ?? "—"}`,
        `packs=${calcState.packs?.length ?? 0}`,
        `loadFailures=${calcState.failedInstruments?.length ?? 0}`,
        `windowSkipped=${calcState.windowSkipped?.length ?? 0}`,
        `calcWindow=${$("calc-start")?.value ?? "—"}…${$("calc-end")?.value ?? "—"}`,
        `calcWindowTime=${calcState.anchorStartTime || "—"}…${calcState.anchorEndTime || "—"}`,
        `windowSkippedSample=${(calcState.windowSkipped || []).slice(0, 6).map((f) => `${f.sec}:${f.error}`).join("; ") || "—"}`,
        `period=${$("calc-from")?.value || "—"}…${$("calc-till")?.value || "—"}`,
        `tf=${$("calc-tf")?.value || "—"}`,
        `logic=${selectedLogicIds().join(",") || "—"}`,
        `indicators=${typeof selectedIndicatorKeys === "function" ? selectedIndicatorKeys().join(",") : "—"}`,
        `accountMode=${calcState.accountMode || "paper"}`,
        `tbankTokenStored=${(() => { try { return !!localStorage.getItem("multilogic.finresp.tbank.token.v1"); } catch (_) { return false; } })()}`,
        `tbankTokenUnlocked=${!!calcState.tbank?.token}`,
        `pageOrigin=${location.origin || location.protocol}`,
        `tbankAccounts=${calcState.tbank?.accounts?.length ?? 0}`,
        `tbankAccountSelected=${calcState.tbank?.selectedAccountId ? "yes" : "no"}`,
        `tbankDepositLoaded=${!!calcState.tbank?.depositLoaded}`,
        `tbankApiHost=${(() => { try { return localStorage.getItem("multilogic.finresp.tbank.host.v1") || "tinkoff"; } catch (_) { return "tinkoff"; } })()}`,
        `prefixStocksLen=${($("prefix-stocks")?.value || "").length}`,
        `prefixFuturesLen=${($("prefix-futures")?.value || "").length}`
      );
      const lv = calcState.live;
      if (lv) {
        lines.push(
          `liveActive=${!!lv.active}`,
          `liveLastError=${lv.lastError || "—"}`,
          `liveSessionStarted=${lv.sessionStartedAt || "—"}`,
          `liveLastCandleBar=${lv.lastCandleBarTime || "—"}`,
          `liveLastCandleRefresh=${lv.lastCandleRefreshAt || "—"}`,
          `liveCandleRefreshBusy=${!!lv.candleRefreshBusy}`,
          `liveCandleRefreshInFlight=${!!lv.candleRefreshPromise}`,
          `liveLastCandleRefreshMs=${lv.lastCandleRefreshMs ?? "—"}`,
          `liveSandboxToggleBusy=${!!lv.sandboxToggleBusy}`,
          `liveTradingActionBusy=${!!lv.tradingActionBusy}`,
          `liveSellAllInFlight=${!!lv.sellAllInFlight}`,
          `liveFinrespBootstrap=${lv.finrespBootstrapProgress ? `${lv.finrespBootstrapProgress.done}/${lv.finrespBootstrapProgress.total}` : "—"}`,
          `liveOrderBookBusy=${!!lv.orderBookBusy}`,
          `liveLastOrderBookRefreshMs=${lv.lastOrderBookRefreshMs ?? "—"}`,
          `liveReconcileBusy=${!!lv.reconcileBusy}`,
          `liveOrderType=${$("live-order-type")?.value || "—"}`,
          `liveObTrendConfirm=${!!state.live?.obTrendConfirm}`,
          `liveSandboxMode=${!!$("live-sandbox-mode")?.checked}`,
          `livePollTimer=${!!lv.pollTimer}`,
          `liveHasLastResult=${!!calcState.lastResult?.perSec?.length}`,
          `liveFinrespMode=${lv.lastFinrespDiag?.mode || calcState.lastResult?.finrespMode || "—"}`,
          `liveFinrespInstruments=${lv.lastFinrespDiag?.instrumentCount ?? calcState.lastResult?.perSec?.length ?? 0}`,
          `liveFinrespWithPos=${lv.lastFinrespDiag?.withPos ?? "—"}`,
          `liveFinrespOpSignals=${lv.lastFinrespDiag?.withOp ?? "—"}`,
          `liveLastResultPos=${(calcState.lastResult?.perSec || []).slice(0, 12).map((p) => `${p.sec}:${+(p.pos || 0)}`).join(",") || "—"}`,
          `liveTradeHistory=${(lv.tradeHistory || []).length} real=${(lv.tradeHistory || []).filter((h) => !h.fake).length} fake=${(lv.tradeHistory || []).filter((h) => h.fake).length}`,
          `logicUsesObTrend=${(() => { try { return E?.logicUsesObTrend && typeof activeLogicLineRaw === "function" ? E.logicUsesObTrend(activeLogicLineRaw()) : "—"; } catch (_) { return "—"; } })()}`,
          `liveOrdersCount=${lv.orders?.length ?? 0}`,
          `liveOpenPositionsCount=${lv.openPositions?.length ?? 0}`,
          `livePortfolioValue=${Number.isFinite(lv.portfolioValue) ? lv.portfolioValue : "—"}`,
          `liveFreeCashRub=${Number.isFinite(lv.freeCashRub) ? lv.freeCashRub : "—"}`,
          `livePositionsMtm=${Number.isFinite(lv.positionsMtmRub) ? lv.positionsMtmRub : "—"}`,
          `liveCandleSource=${lv.candleSource || $("live-candle-source")?.value || "—"}`
        );
        const fd = lv.lastFinrespDiag;
        if (fd?.bySec) {
          const sample = Object.entries(fd.bySec).slice(0, 8)
            .map(([sec, d]) => `${sec}:pos=${d.pos} op=${d.op} logic=${d.logicId}`)
            .join("; ");
          lines.push(`liveFinrespDiagSample=${sample || "—"}`);
        }
        const r = lv.lastReconcile;
        if (r) {
          lines.push(
            `liveReconcileAt=${r.at || "—"}`,
            `liveReconcilePlaced=${r.placed ?? 0}`,
            `liveReconcileAligned=${r.aligned ?? 0}`,
            `liveReconcileSkipped=${r.skipped?.length ?? 0}`,
            `liveReconcileFailed=${r.failed?.length ?? 0}`,
            `liveReconcileTargets=${r.targetCount ?? "—"}`,
            `liveReconcileMode=${r.sandbox ? "sandbox" : "real"}`
          );
          if (r.targetDetails?.length) {
            lines.push("liveReconcile.targetDetails:");
            for (const td of r.targetDetails) {
              if (td.action === "aligned") {
                lines.push(`  ${td.sec}: aligned target=${td.target} broker=${td.current} reason=${td.reason || "—"}${td.signalOp ? ` op=${td.signalOp}` : ""}`);
              } else if (td.action === "order") {
                lines.push(`  ${td.sec}: ORDER target=${td.target} broker=${td.current} lots=${td.lots} ${td.direction || ""} reason=${td.reason || "откроется сделка"}`);
              } else {
                lines.push(`  ${td.sec}: ${td.action} ${td.error || ""}`);
              }
            }
          }
          if (r.skipped?.length) {
            lines.push("liveReconcile.skipped:");
            for (const s of r.skipped) {
              const extra = typeof s === "object" && s.instrumentId
                ? ` uid=${s.instrumentId} class=${s.classCode || "—"} market=${s.market || "—"}`
                : "";
              lines.push(`  ${liveIssueLine(s)}${extra}`);
            }
          }
          if (r.failed?.length) {
            lines.push("liveReconcile.failed:");
            for (const f of r.failed) {
              const extra = typeof f === "object"
                ? ` uid=${f.instrumentId || "—"} dir=${f.direction || "—"} lots=${f.lots ?? "—"} class=${f.classCode || "—"}`
                : "";
              lines.push(`  ${liveIssueLine(f)}${extra}`);
            }
          }
        }
        const abort = lv.lastReconcileAbort;
        if (abort) {
          lines.push(`liveReconcileAbortAt=${abort.at}`, `liveReconcileAbortReason=${abort.reason}`, `liveReconcileAbortDetail=${abort.detail || "—"}`);
        }
        const lpo = lv.lastPostOrder;
        if (lpo) {
          lines.push(
            `liveLastPostOrderAt=${lpo.at}`,
            `liveLastPostOrder=${lpo.sec} ${lpo.direction} lots=${lpo.lots} type=${lpo.orderType} status=${lpo.status} ok=${lpo.ok}`,
            `liveLastPostOrderMsg=${lpo.message || "—"}`,
            `liveLastPostOrderUid=${lpo.instrumentId || "—"}`
          );
        }
        const tr = lv.lastReconcileTargetRows;
        if (tr?.length) {
          lines.push("liveReconcileTargetRows:");
          for (const row of tr) {
            lines.push(`  ${row.sec} pos=${row.pos} market=${row.market || "—"}`);
          }
        }
        const forbidden = lv.apiForbiddenInstruments?.length
          ? lv.apiForbiddenInstruments
          : mergeLiveForbiddenIssues(r?.skipped, r?.failed);
        if (forbidden?.length) {
          lines.push(
            `liveApiForbiddenCount=${forbidden.length}`,
            `liveApiForbiddenTickers=${forbidden.map(liveForbiddenLabel).join(",")}`
          );
          lines.push("liveApiForbidden:");
          for (const f of forbidden) {
            lines.push(`  ${formatLiveForbiddenTechLine(f)}`);
          }
        }
      }
    }
    lines.push(`liveTradingStatus=${$("live-trading-status")?.textContent || "—"}`);
    lines.push(`statusLine=${getCalcStatus() || "—"}`);
    const cd = calcState?.lastChartDiag;
    if (cd?.instruments?.length) {
      lines.push(
        `chartDiagAt=${cd.builtAt || "—"}`,
        `chartDiagModule=${cd.chartsModule || "—"}`
      );
      for (const d of cd.instruments.slice(0, 16)) {
        lines.push(
          `chart.${d.sec}: rows=${d.rows} in=${d.tradeIn} out=${d.tradeOut} posStop=${d.posStop} crossNoMarker=${d.crossNoMarker ?? "—"} eqLine=${d.everHeld ? "on" : "off"}`
        );
      }
      const focus = cd.instruments.find((d) => d.sec === "AFLT") || cd.instruments[0];
      if (focus?.samples?.length) {
        lines.push(`chart.${focus.sec}.samples:`);
        for (const s of focus.samples) {
          lines.push(`  i=${s.i} t=${s.time} in=${s.tradeIn || "—"} out=${s.tradeOut || "—"} pos=${s.pos}`);
        }
      }
    }
    lines.push(`userAgent=${navigator.userAgent}`);
    if (techLog.errors.length) {
      lines.push("errors:");
      lines.push(...techLog.errors.map((e) => `  ${e}`));
    }
    return lines.join("\n");
  }

  /** Обновление: `updateTechInfo`. */
  function updateTechInfo(eventName) {
    if (eventName) techLog.lastEvent = eventName;
    const el = $("tech-info-text");
    if (!el) return;
    try {
      el.textContent = buildTechInfoText();
    } catch (err) {
      el.textContent = [
        `tech-info build error: ${err?.message || err}`,
        `lastEvent=${techLog.lastEvent}`,
        `pageVersion=${CALC_PAGE_VERSION}`,
        `protocol=${location.protocol}`,
        `engineLoaded=${!!window.MultiLogicFinrespEngine}`,
        `url=${location.href}`
      ].join("\n");
    }
  }
  updateTechInfo("boot");

  window.addEventListener("error", (ev) => {
    const msg = `window.error: ${ev.message || ev.type} @ ${ev.filename || "?"}:${ev.lineno || "?"}`;
    if (window.__mlFinresp?.bootPhase === "started") {
      window.__mlFinresp.lastBootError = `${ev.message || ev.type} @ ${ev.filename || "?"}:${ev.lineno || "?"}`;
    }
    noteTechError(msg);
  });
  window.addEventListener("unhandledrejection", (ev) => {
    const msg = ev.reason?.message || String(ev.reason ?? "rejection");
    noteTechError(`unhandledrejection: ${msg}`);
  });
  $("tech-info-copy")?.addEventListener("click", async () => {
    const text = buildTechInfoText();
    const techEl = $("tech-info-text");
    const prevTech = techEl?.textContent;
    try {
      await navigator.clipboard.writeText(text);
      techLog.lastEvent = "tech-copied";
      updateTechInfo();
      const msg = "Тех. информация скопирована в буфер обмена.";
      const prev = getCalcStatus();
      setCalcStatus(msg);
      if (techEl) techEl.textContent = `${msg}\n\n${text}`;
      setTimeout(() => {
        if (prev) setCalcStatus(prev);
        if (techEl && prevTech != null) techEl.textContent = prevTech;
        updateTechInfo("tech-copy-done");
      }, 2200);
    } catch (err) {
      noteTechError(`clipboard: ${err.message}`);
      if (techEl) {
        techEl.textContent = `Не удалось скопировать: ${err.message}\n\n${text}`;
      }
    }
  });
  $("tech-info-refresh")?.addEventListener("click", () => updateTechInfo("tech-refresh"));

  if (IS_FILE_PROTOCOL) {
    const warn = $("file-protocol-warn");
    if (warn) warn.hidden = false;
    noteTechError("file:// — MOEX fetch blocked by browser CORS");
    setCalcStatus(
      "file://: MOEX недоступен; реальная торговля и песочница работают (T-Bank / база свечей). Для MOEX — run-dev.bat (http://127.0.0.1:4200/finresp)."
    );
  }

  /** Показать/скрыть блок live до загрузки engine и полной инициализации (важно для file://). */
  function bootstrapLiveTradingPanelVisibility() {
    const panel = document.getElementById("live-trading-panel");
    const modeEl = document.getElementById("account-mode");
    if (!panel || !modeEl) return;
    const isLive = modeEl.value === "live";
    const sandbox = !!document.getElementById("live-sandbox-mode")?.checked;
    panel.hidden = !isLive;
    panel.classList.toggle("live-trading-panel--sandbox", isLive && sandbox);
    modeEl.classList.toggle("account-mode-select--live", isLive);
    document.querySelector("label.account-mode")?.classList.toggle("account-mode--live", isLive);
  }

  /** Подпрограмма `bootstrapRestoreAccountModeFromStorage`. */
  function bootstrapRestoreAccountModeFromStorage() {
    try {
      const raw = localStorage.getItem(ML_CONFIG_KEY);
      if (!raw) return;
      const cfg = JSON.parse(raw);
      const modeEl = document.getElementById("account-mode");
      if (modeEl && (cfg.accountMode === "live" || cfg.accountMode === "tbank" || cfg.accountMode === "paper")) {
        modeEl.value = cfg.accountMode;
      }
      const sb = document.getElementById("live-sandbox-mode");
      if (sb && cfg.live?.sandboxMode != null) sb.checked = !!cfg.live.sandboxMode;
    } catch (_) { /* ignore */ }
  }

  bootstrapRestoreAccountModeFromStorage();
  bootstrapLiveTradingPanelVisibility();

  let calcState = null;
  const E = window.MultiLogicFinrespEngine;
  if (!E) {
    noteTechError("engine.js not loaded (MultiLogicFinrespEngine missing)");
    setCalcStatus(
      "Ошибка: не загружен MultiLogic_FinrespCalculator.engine.js — положите файл рядом с HTML и обновите страницу (Ctrl+F5)."
    );
    window.__mlSyncAccountMode = () => bootstrapLiveTradingPanelVisibility();
    window.__mlFinrespVersion = `${CALC_PAGE_VERSION} (no-engine)`;
    window.__mlFinresp.bootPhase = "partial";
    bootstrapLiveTradingPanelVisibility();
    bindCoreCollapsibleToggles();
    updateTechInfo("init-fail-no-engine");
    return;
  }
  if (!window.MultiLogicFinrespLive) {
    noteTechError("live.js not loaded (MultiLogicFinrespLive missing)");
    setCalcStatus(
      "Ошибка: не загружен MultiLogic_FinrespCalculator.live.js — положите файл рядом с HTML и обновите страницу (Ctrl+F5)."
    );
    window.__mlSyncAccountMode = () => bootstrapLiveTradingPanelVisibility();
    window.__mlFinrespVersion = `${CALC_PAGE_VERSION} (no-live)`;
    window.__mlFinresp.bootPhase = "partial";
    bootstrapLiveTradingPanelVisibility();
    bindCoreCollapsibleToggles();
    updateTechInfo("init-fail-no-live");
    return;
  }
  const state = {
    _initOk: false,
    packs: [],
    shareList: [],
    futuresList: [],
    futuresFromMoex: false,
    bulkMode: null,
    movedSlider: "end",
    customLines: { ...E.DEFAULT_LOGIC_LINES },
    logicLineKeys: ["RND", "TBC", "UT", "UCT", "L5", "L1", "L2", "L3", "L4", "CML", "CMS", "sma_below", "sma_above", "sma_corridor_trend", "sma_corridor_anti"],
    pendingLogicImportKey: null,
    hiddenLogicKeys: [],
    logicLabels: {},
    logicSelectionCleared: false,
    anchorStartTime: null,
    anchorEndTime: null,
    hasWindow: false,
    userDateRangeTouched: false,
    failedInstruments: [],
    windowSkipped: [],
    lastInstruments: [],
    lastLoadMeta: null,
    lastResult: null,
    lastProtocol: null,
    loadedProtocol: null,
    equityConfigMarkers: [],
    lastEquityConfigFp: null,
    lastEquityChartCtx: null,
    prevSelectCount: 0,
    runGeneration: 0,
    runCancelRequested: false,
    runCheckpoint: null,
    workerRequestId: 0,
    calcWorker: null,
    workerPendingReject: null,
    runBusyOwner: null,
    uiBusy: false,
    restoringConfig: false,
    restoredSelectedInstruments: [],
    restoredLogicIds: null,
    savedEquityDeltaPeriod: null,
    logicPickerSnapshot: null,
    accountMode: "paper",
    tbank: {
      token: null,
      accounts: [],
      selectedAccountId: "",
      depositLoaded: false
    },
    live: {
      active: false,
      pollTimer: null,
      delayUiTimer: null,
      orders: [],
      instrumentCache: new Map(),
      tradingStatusCache: new Map(),
      reconcileBusy: false,
      sandboxToggleBusy: false,
      tradingActionBusy: false,
      manualFlatten: false,
      candleRefreshBusy: false,
      lastCandleRefreshAt: null,
      lastCandleBarTime: null,
      lastCandleBarTimeFresh: null,
      candleSource: null,
      lastError: "",
      lastReconcile: null,
      apiForbiddenInstruments: [],
      portfolioValue: null,
      modelFinresp: null,
      modelCommission: null,
      realPortfolioValue: null,
      freeCashRub: null,
      positionsMtmRub: null,
      portfolioPositions: [],
      commissionPaid: null,
      sandbox: {
        startPortfolio: null,
        cash: null,
        cashDelta: 0,
        commissionTotal: 0,
        open: new Map(),
        closed: [],
        orders: []
      },
      sessionStartedAt: null,
      sessionPositionBaseline: null,
      chartSession: null,
      preCalcSnapshot: null,
      chartsBootstrapBusy: false,
      openPositions: [],
      positionsUpdatedAt: null,
      positionsError: "",
      statsTimer: null,
      orderBookTimer: null,
      orderBookBusy: false,
      positionsTimer: null,
      positionsBusy: false,
      obTrendConfirm: false,
      obTrendCache: new Map(),
      positionsMenuIdx: null,
      manualPriceSec: "",
      tradeHistory: [],
      brokerOperations: []
    },
    optim: {
      active: null,
      bestFinresp: -Infinity,
      bestValue: 0,
      candidates: [],
      candidateIndex: 0,
      dots: 0,
      dotTimer: null,
      runToken: 0
    }
  };
  calcState = state;
  const INDICATOR_OPTIONS = E.INDICATOR_OPTIONS || [
    { key: "sma", label: "SMA" },
    { key: "atr", label: "ATR" },
    { key: "stoch", label: "Stoch" },
    { key: "linreg", label: "LinReg" },
    { key: "macd", label: "MACD" },
    { key: "cci", label: "CCI" },
    { key: "bollinger", label: "Bollinger" },
    { key: "momentum", label: "Momentum" },
    { key: "vwap", label: "VWAP" }
  ];
  const INDICATOR_LABELS = Object.fromEntries(INDICATOR_OPTIONS.map((x) => [x.key, x.label]));
  const OPT_BTN_ICON = "⚡";
  const OPT_BUTTONS = [
    { kind: "sl", btnId: "opt-sl", inputId: "param-sl", label: "@SL", position: true },
    { kind: "tp", btnId: "opt-tp", inputId: "param-tp", label: "@TP", position: true },
    { kind: "atr-sl", btnId: "opt-atr-sl", inputId: "param-atr-sl", label: "ATR SL/TP", integer: true, position: true },
    { kind: "cma-len", btnId: "opt-cma-len", inputId: "param-cma-len", label: "@CmaLen", integer: true, position: true },
    { kind: "cma-pow", btnId: "opt-cma-pow", inputId: "param-cma-pow", label: "@CmaPow", position: true },
    { kind: "lr", btnId: "opt-lr", inputId: "param-lr", label: "@LR", integer: true, position: true },
    { kind: "lin-k", btnId: "opt-lin-k", inputId: "param-lin-k", label: "@K", position: true },
    { kind: "strict", btnId: "opt-strict", inputId: "param-strict", label: "@Strict", integer: true, position: true },
    { kind: "reverse", btnId: "opt-reverse", inputId: "param-reverse", label: "Реверс сторон", boolean: true, position: true },
    { kind: "p-sl", btnId: "opt-stopper-sl", inputId: "stopper-sl-mult", label: "@@SL" },
    { kind: "p-tp", btnId: "opt-stopper-tp", inputId: "stopper-tp-mult", label: "@@TP" },
    { kind: "p-atr", btnId: "opt-stopper-atr", inputId: "stopper-atr-len", label: "@@ATR", integer: true },
    { kind: "indicators", btnId: "opt-indicators", label: "индикаторы", indicators: true }
  ];
  const DATE_MIN = "2020-01-01";
  const DEFAULT_RANGE_DAYS = 30;
  const DEFAULT_END_LAG_DAYS = 2;
  const TBANK_REST_BASES = {
    tinkoff: "https://invest-public-api.tinkoff.ru/rest/tinkoff.public.invest.api.contract.v1.",
    tbank: "https://invest-public-api.tbank.ru/rest/tinkoff.public.invest.api.contract.v1."
  };
  const TBANK_TOKEN_STORE_KEY = "multilogic.finresp.tbank.token.v1";
  const TBANK_ACCOUNT_STORE_KEY = "multilogic.finresp.tbank.account.v1";
  const TBANK_HOST_STORE_KEY = "multilogic.finresp.tbank.host.v1";
  const CONFIG_STORE_KEY = "multilogic.finresp.config.v1";
  const TBANK_CRYPTO_ITERATIONS = 210000;
  const MOEX_MINUTES_PER_SESSION = 530;
  const MIN_WARMUP_BARS = 220;
  const TF_LIMITS = {
    "1": { label: "1 мин", maxDays: 7, maxBars: 900 },
    "5": { label: "5 мин", maxDays: 7, maxBars: 900 },
    "10": { label: "10 мин", maxDays: 31, maxBars: 1200 },
    "15": { label: "15 мин", maxDays: 14, maxBars: 1200 },
    "60": { label: "1 час", maxDays: 99999, maxBars: 999999 },
    "24": { label: "1 день", maxDays: 99999, maxBars: 999999 }
  };
  const RUB_SIGN = "\u20BD";
  const fmt = (v, d = 2) => Number.isFinite(v) ? v.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";
  const fmtSignedRub = (v, d = 2) => {
    if (!Number.isFinite(v)) return "—";
    if (v < 0) return `\u2212${fmt(Math.abs(v), d)}`;
    return fmt(v, d);
  };
  const fmtPct = (v) => Number.isFinite(v) ? `${v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %` : "—";
  const fmtBytes = (v) => {
    if (!Number.isFinite(v)) return "—";
    const units = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
    let n = v;
    let u = 0;
    while (n >= 1024 && u < units.length - 1) {
      n /= 1024;
      u += 1;
    }
    return `${n.toLocaleString("ru-RU", { maximumFractionDigits: u ? 1 : 0 })} ${units[u]}`;
  };

  const safeStorageGet = (key) => {
    try { return localStorage.getItem(key) || ""; }
    catch (_) { return ""; }
  };
  const safeStorageSet = (key, value) => {
    try { localStorage.setItem(key, value); return true; }
    catch (_) { return false; }
  };
  const safeStorageRemove = (key) => {
    try { localStorage.removeItem(key); return true; }
    catch (_) { return false; }
  };

  /** Чтение из формы/state: `readSavedConfig`. */
  function readSavedConfig() {
    const raw = safeStorageGet(CONFIG_STORE_KEY);
    if (!raw) return null;
    try {
      const cfg = JSON.parse(raw);
      return cfg && cfg.v === 1 ? cfg : null;
    } catch (_) {
      return null;
    }
  }

  /** Установка значения: `setValueIfExists`. */
  function setValueIfExists(id, value) {
    const el = $(id);
    if (!el || value == null) return;
    el.value = String(value);
  }

  /** Логика FINRESP: `logicLinesConfig`. */
  function logicLinesConfig() {
    const out = {};
    document.querySelectorAll("#logic-lines textarea").forEach((ta) => {
      out[ta.dataset.key] = ta.value;
    });
    return out;
  }

  /** Скрытые (удалённые из каталога) ключи логик. */
  function hiddenLogicKeySet() {
    if (!Array.isArray(state.hiddenLogicKeys)) state.hiddenLogicKeys = [];
    return new Set(state.hiddenLogicKeys);
  }

  /** Убрать скрытые логики из каталога и state (не восстанавливать при reload). */
  function purgeHiddenLogicsFromState() {
    const hidden = hiddenLogicKeySet();
    if (!hidden.size) return;
    state.logicLineKeys = (state.logicLineKeys || []).filter((k) => !hidden.has(k));
    for (const k of hidden) {
      delete state.customLines[k];
      delete state.logicLabels[k];
    }
  }

  /** logicLines для localStorage — без скрытых ключей. */
  function visibleLogicLinesConfig() {
    const out = logicLinesConfig();
    for (const k of hiddenLogicKeySet()) delete out[k];
    return out;
  }

  /** Сериализация state в localStorage config. */
  function collectConfig() {
    const formSnap = readFormScalarsForConfig();
    return {
      v: 1,
      savedAt: new Date().toISOString(),
      accountMode: formSnap?.accountMode || $("account-mode")?.value || "paper",
      timeframe: formSnap?.timeframe || $("calc-tf")?.value || "60",
      from: formSnap?.from || $("calc-from")?.value || "",
      till: formSnap?.till || $("calc-till")?.value || "",
      logic: (formSnap?.logicIds?.[0]) || primaryLogicId(),
      logics: formSnap?.logicIds?.length ? formSnap.logicIds.slice() : selectedLogicIds(),
      selectedInstruments: selectedInstruments(),
      volume: {
        type: $("vol-type")?.value || "Deposit percent",
        value: $("vol-value")?.value || "",
        deposit: $("vol-deposit")?.value || "",
        maxPositions: $("vol-maxpos")?.value || "",
        commissionPct: $("commission-pct")?.value || "0.02"
      },
      live: {
        orderType: $("live-order-type")?.value || "market",
        candleSource: $("live-candle-source")?.value || "auto",
        manual: {
          sec: $("live-manual-sec")?.value || "",
          direction: $("live-manual-direction")?.value || "buy",
          orderType: $("live-manual-order-type")?.value || "market",
          qty: $("live-manual-qty")?.value || "1",
          price: $("live-manual-price")?.value || ""
        },
        orderBook: {
          sec: $("live-order-book-sec")?.value || ""
        },
        obTrendConfirm: !!state.live?.obTrendConfirm,
        sandboxMode: !!$("live-sandbox-mode")?.checked
      },
      params: {
        sl: $("param-sl")?.value || "",
        tp: $("param-tp")?.value || "",
        atrSl: $("param-atr-sl")?.value || "",
        smaCorridor: $("param-sma-corridor")?.value || "",
        cmaLen: $("param-cma-len")?.value || "",
        cmaPow: $("param-cma-pow")?.value || "",
        lr: $("param-lr")?.value || "",
        linK: $("param-lin-k")?.value || "",
        strict: $("param-strict")?.value || "",
        reverseSides: !!$("param-reverse")?.checked,
        reverseSignals: !!$("param-reverse-signals")?.checked,
        autoReverses: !!$("param-auto-reverses")?.checked,
        autoLookback: $("param-auto-reverses-lookback")?.value || "",
        autoStep: $("param-auto-reverses-step")?.value || "",
        sandboxMatchMode: $("live-sandbox-match-mode")?.value || "fifo"
      },
      stopper: {
        slMult: $("stopper-sl-mult")?.value || "",
        tpMult: $("stopper-tp-mult")?.value || "",
        atrLen: $("stopper-atr-len")?.value || "",
        ref: $("stopper-ref")?.value || ""
      },
      prefixes: {
        stocks: $("prefix-stocks")?.value || "",
        futures: $("prefix-futures")?.value || ""
      },
      indicators: selectedIndicatorKeys(),
      logicLines: visibleLogicLinesConfig(),
      logicLineKeys: state.logicLineKeys.filter((k) => !hiddenLogicKeySet().has(k)),
      hiddenLogicKeys: (state.hiddenLogicKeys || []).slice(),
      logicCatalogVersion: 4,
      logicLabels: { ...state.logicLabels },
      randomPriceShift: !!$("random-price-shift")?.checked,
      charts: {
        equityDeltaPeriod: equityDeltaPeriod()
      }
    };
  }

  /** Сохранение: `saveConfig`. */
  function saveConfig() {
    if (state.restoringConfig) return;
    try {
      safeStorageSet(CONFIG_STORE_KEY, JSON.stringify(collectConfig()));
    } catch (err) {
      noteTechError(`save-config: ${err.message}`);
    }
  }

  const OBT_TREND_CHECKBOX_IDS = ["live-ob-trend-confirm", "live-ob-trend-confirm-panel"];

  /** Синхронизация галочек @OBT (доп. параметры ↔ блок «Реальная торговля»). */
  function syncObTrendConfirmUi(skipId) {
    const on = !!state.live.obTrendConfirm;
    for (const id of OBT_TREND_CHECKBOX_IDS) {
      if (id === skipId) continue;
      const el = $(id);
      if (el && el.checked !== on) el.checked = on;
    }
  }

  /** Единая настройка `state.live.obTrendConfirm`. */
  function setObTrendConfirm(on, sourceId) {
    state.live.obTrendConfirm = !!on;
    syncObTrendConfirmUi(sourceId);
    saveConfig();
  }

  /** Привязка обеих галочек @OBT к одному state. */
  function bindObTrendConfirmUi() {
    for (const id of OBT_TREND_CHECKBOX_IDS) {
      const el = $(id);
      if (!el || el.dataset.obTrendBound) continue;
      el.dataset.obTrendBound = "1";
      el.addEventListener("change", () => setObTrendConfirm(el.checked, id));
    }
    syncObTrendConfirmUi();
  }

  /** Восстановление формы и state из сохранённого config. */
  function applySavedConfig() {
    const cfg = readSavedConfig();
    if (!cfg) return false;
    state.restoringConfig = true;
    try {
      if (cfg.accountMode === "tbank" || cfg.accountMode === "paper" || cfg.accountMode === "live") {
        $("account-mode").value = cfg.accountMode;
      }
      setValueIfExists("calc-tf", cfg.timeframe);
      setValueIfExists("calc-from", cfg.from);
      setValueIfExists("calc-till", cfg.till);
      state.restoredLogicIds = Array.isArray(cfg.logics)
        ? cfg.logics.filter(Boolean)
        : (cfg.logic ? [cfg.logic] : null);
      state.logicSelectionCleared = Array.isArray(cfg.logics) && cfg.logics.length === 0;
      setValueIfExists("vol-type", cfg.volume?.type);
      setValueIfExists("vol-value", cfg.volume?.value);
      setValueIfExists("vol-deposit", cfg.volume?.deposit);
      setValueIfExists("vol-maxpos", cfg.volume?.maxPositions);
      if (cfg.volume?.commissionPct != null) {
        setValueIfExists("commission-pct", cfg.volume.commissionPct);
      } else if (cfg.volume?.commissionValue != null) {
        setValueIfExists("commission-pct", cfg.volume.commissionValue);
      } else if (cfg.volume?.commissionType === "Percent" && cfg.volume?.commissionValue != null) {
        setValueIfExists("commission-pct", cfg.volume.commissionValue);
      }
      setValueIfExists("live-order-type", cfg.live?.orderType);
      setValueIfExists("live-candle-source", cfg.live?.candleSource);
      if (cfg.live?.obTrendConfirm != null) {
        state.live.obTrendConfirm = !!cfg.live.obTrendConfirm;
      }
      if ($("live-sandbox-mode")) {
        $("live-sandbox-mode").checked = !!cfg.live?.sandboxMode;
      }
      if ($("live-sandbox-match-mode")) {
        const mm = cfg.params?.sandboxMatchMode || cfg.live?.sandboxMatchMode;
        $("live-sandbox-match-mode").value = mm === "lifo" ? "lifo" : "fifo";
      }
      setValueIfExists("live-manual-direction", cfg.live?.manual?.direction);
      setValueIfExists("live-manual-order-type", cfg.live?.manual?.orderType);
      setValueIfExists("live-manual-qty", cfg.live?.manual?.qty);
      setValueIfExists("live-manual-price", cfg.live?.manual?.price);
      state.restoredManualSec = cfg.live?.manual?.sec || "";
      state.restoredOrderBookSec = cfg.live?.orderBook?.sec || cfg.live?.manual?.sec || "";
      setValueIfExists("param-sl", cfg.params?.sl);
      setValueIfExists("param-tp", cfg.params?.tp);
      setValueIfExists("param-atr-sl", cfg.params?.atrSl);
      setValueIfExists("param-sma-corridor", cfg.params?.smaCorridor);
      setValueIfExists("param-cma-len", cfg.params?.cmaLen);
      setValueIfExists("param-cma-pow", cfg.params?.cmaPow);
      setValueIfExists("param-lr", cfg.params?.lr);
      setValueIfExists("param-lin-k", cfg.params?.linK);
      setValueIfExists("param-strict", cfg.params?.strict);
      setValueIfExists("param-auto-reverses-lookback", cfg.params?.autoLookback);
      setValueIfExists("param-auto-reverses-step", cfg.params?.autoStep);
      if ($("param-auto-reverses")) $("param-auto-reverses").checked = !!(cfg.params?.autoReverses ?? cfg.params?.AutoReverses);
      if ($("param-reverse")) {
        $("param-reverse").checked = !!(cfg.params?.reverseSides ?? cfg.params?.ReverseSides ?? cfg.params?.reverse ?? cfg.params?.Reverse);
      }
      if ($("param-reverse-signals")) {
        $("param-reverse-signals").checked = !!(cfg.params?.reverseSignals ?? cfg.params?.ReverseSignals);
      }
      setValueIfExists("stopper-sl-mult", cfg.stopper?.slMult);
      setValueIfExists("stopper-tp-mult", cfg.stopper?.tpMult);
      setValueIfExists("stopper-atr-len", cfg.stopper?.atrLen);
      setValueIfExists("stopper-ref", cfg.stopper?.ref);
      if ($("random-price-shift")) {
        $("random-price-shift").checked = !!cfg.randomPriceShift;
      }
      state.savedEquityDeltaPeriod = cfg.charts?.equityDeltaPeriod ?? null;
      setValueIfExists("equity-delta-period", normalizeEquityDeltaTf(state.savedEquityDeltaPeriod));
      if (cfg.prefixes?.stocks != null && String(cfg.prefixes.stocks).trim()) {
        setValueIfExists("prefix-stocks", cfg.prefixes.stocks);
      }
      if (cfg.prefixes?.futures != null && String(cfg.prefixes.futures).trim()) {
        setValueIfExists("prefix-futures", cfg.prefixes.futures);
      }
      if (Array.isArray(cfg.indicators)) applyIndicatorSelection(cfg.indicators);
      if (Array.isArray(cfg.hiddenLogicKeys)) {
        state.hiddenLogicKeys = cfg.hiddenLogicKeys.filter(Boolean);
      } else if (!Array.isArray(state.hiddenLogicKeys)) {
        state.hiddenLogicKeys = [];
      }
      if (Array.isArray(cfg.logicLineKeys) && cfg.logicLineKeys.length) {
        state.logicLineKeys = cfg.logicLineKeys.filter(Boolean);
        if (!cfg.hiddenLogicKeys?.length) {
          const savedKeys = new Set(state.logicLineKeys);
          const savedLines = cfg.logicLines && typeof cfg.logicLines === "object" ? cfg.logicLines : {};
          for (const k of DEFAULT_LOGIC_LINE_KEYS) {
            if (!savedKeys.has(k) && savedLines[k] == null && !state.hiddenLogicKeys.includes(k)) {
              state.hiddenLogicKeys.push(k);
            }
          }
        }
      }
      const hidden = hiddenLogicKeySet();
      if (cfg.logicLines && typeof cfg.logicLines === "object") {
        for (const [k, v] of Object.entries(cfg.logicLines)) {
          if (hidden.has(k)) continue;
          state.customLines[k] = v;
        }
      }
      purgeHiddenLogicsFromState();
      ensureDefaultLogicLines();
      if (cfg.logicLabels && typeof cfg.logicLabels === "object") {
        state.logicLabels = {};
        for (const [k, v] of Object.entries(cfg.logicLabels)) {
          if (!hidden.has(k)) state.logicLabels[k] = v;
        }
      }
      ensureLogicLineKeys();
      fillLogicEditor();
      fillLogicSelect();
      state.restoredSelectedInstruments = Array.isArray(cfg.selectedInstruments) ? cfg.selectedInstruments : [];
      syncObTrendConfirmUi();
      return true;
    } finally {
      state.restoringConfig = false;
    }
  }

  /** Применение настроек/результата: `applyRestoredInstrumentSelection`. */
  function applyRestoredInstrumentSelection() {
    const saved = state.restoredSelectedInstruments || [];
    if (!saved.length) return;
    const keys = new Set(saved.map((i) => `${i.market === "futures" ? "futures" : "shares"}:${String(i.sec || "").trim().toUpperCase()}`));
    const matched = new Set();
    for (const o of $("calc-sec").options) {
      const key = `${o.dataset.market === "futures" ? "futures" : "shares"}:${String(o.value || "").trim().toUpperCase()}`;
      o.selected = keys.has(key);
      if (o.selected) matched.add(key);
    }
    for (const inst of saved) {
      const market = inst.market === "futures" ? "futures" : "shares";
      const sec = String(inst.sec || "").trim();
      if (!sec) continue;
      const key = `${market}:${sec.toUpperCase()}`;
      if (matched.has(key)) continue;
      const o = document.createElement("option");
      o.value = sec;
      o.textContent = market === "futures" ? `${sec} (фьюч)` : sec;
      o.dataset.market = market;
      o.selected = true;
      $("calc-sec").appendChild(o);
      matched.add(key);
    }
    syncSelectAllCheckboxes();
    state.prevSelectCount = selectedInstrumentCount();
    publishInstrumentSelectionFromDom();
  }

  /** Подпрограмма `bytesToBase64`. */
  function bytesToBase64(bytes) {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  }

  /** Подпрограмма `base64ToBytes`. */
  function base64ToBytes(value) {
    const s = atob(value);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  /** Подпрограмма `cryptoAvailable`. */
  function cryptoAvailable() {
    return !!(window.crypto?.subtle && window.crypto?.getRandomValues && window.TextEncoder && window.TextDecoder);
  }

  /** Подпрограмма `deriveTbankKey`. */
  async function deriveTbankKey(passphrase, salt, iterations) {
    const enc = new TextEncoder();
    const material = await crypto.subtle.importKey(
      "raw",
      enc.encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /** Подпрограмма `encryptTbankToken`. */
  async function encryptTbankToken(token, passphrase) {
    if (!cryptoAvailable()) throw new Error("Web Crypto недоступен в этом браузере/режиме.");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveTbankKey(passphrase, salt, TBANK_CRYPTO_ITERATIONS);
    const data = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(token)
    );
    return JSON.stringify({
      v: 1,
      alg: "AES-GCM",
      kdf: "PBKDF2-SHA256",
      iterations: TBANK_CRYPTO_ITERATIONS,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(data))
    });
  }

  /** Подпрограмма `decryptTbankToken`. */
  async function decryptTbankToken(payload, passphrase) {
    if (!cryptoAvailable()) throw new Error("Web Crypto недоступен в этом браузере/режиме.");
    const box = JSON.parse(payload);
    if (box?.v !== 1 || !box.salt || !box.iv || !box.data) {
      throw new Error("Неподдерживаемый формат сохранённого токена.");
    }
    const salt = base64ToBytes(box.salt);
    const iv = base64ToBytes(box.iv);
    const key = await deriveTbankKey(passphrase, salt, Number(box.iterations) || TBANK_CRYPTO_ITERATIONS);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      base64ToBytes(box.data)
    );
    return new TextDecoder().decode(plain);
  }

  /** Подпрограмма `moneyValueToNumber`. */
  function moneyValueToNumber(value) {
    if (!value) return NaN;
    const units = Number(value.units ?? 0);
    const nano = Number(value.nano ?? 0);
    return units + nano / 1000000000;
  }

  /** Свободные рублёвые средства на счёте (T-Bank Positions.money; может быть < 0 при марже). */
  function rubFreeCashFromTbankPositions(posData) {
    let sum = 0;
    let found = false;
    for (const m of posData?.money || []) {
      const cur = String(m.currency || "").toLowerCase();
      if (cur !== "rub" && cur !== "rur") continue;
      const v = moneyValueToNumber(m);
      if (Number.isFinite(v)) {
        sum += v;
        found = true;
      }
    }
    return found ? sum : NaN;
  }

  /** Подпрограмма `moneyValueRub`. */
  function moneyValueRub(value) {
    if (!value) return NaN;
    const cur = String(value.currency || "rub").toLowerCase();
    if (cur !== "rub" && cur !== "rur") return NaN;
    return moneyValueToNumber(value);
  }

  /** Подпрограмма `accountLabel`. */
  function accountLabel(account) {
    const name = account.name || "Без названия";
    const type = account.type || "тип ?";
    const access = account.accessLevel || account.access_level || "доступ ?";
    return `${name} · ${type} · ${access} · ${account.id}`;
  }

  /** Разбор строки/времени/ключа: `parseMoexTime`. */
  function parseMoexTime(t) {
    if (!t || t === "—") return null;
    const d = new Date(String(t).replace(" ", "T"));
    return Number.isFinite(d.getTime()) ? d : null;
  }

  /** Подпрограмма `calendarDateOnly`. */
  function calendarDateOnly(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /** Подпрограмма `calendarDaysBetweenTimes`. */
  function calendarDaysBetweenTimes(t0, t1) {
    const d0 = parseMoexTime(t0);
    const d1 = parseMoexTime(t1);
    if (!d0 || !d1) return null;
    const elapsed = (calendarDateOnly(d1) - calendarDateOnly(d0)) / 86400000;
    if (elapsed < 1) return null;
    return elapsed;
  }

  /** Подпрограмма `calendarDaysBetweenFormDates`. */
  function calendarDaysBetweenFormDates(fromStr, tillStr) {
    const d0 = parseDay(fromStr);
    const d1 = parseDay(tillStr);
    if (!Number.isFinite(d0.getTime()) || !Number.isFinite(d1.getTime())) return null;
    const elapsed = Math.round((calendarDateOnly(d1) - calendarDateOnly(d0)) / 86400000);
    if (elapsed < 1) return null;
    return elapsed;
  }

  /** Подпрограмма `robotOperatingDays`. */
  function robotOperatingDays() {
    return calendarDaysBetweenFormDates($("calc-from").value, $("calc-till").value);
  }

  /** Подпрограмма `annualPeriodDays`. */
  function annualPeriodDays(windowStart, windowEnd, opts) {
    const live = opts?.liveSession || (typeof isLiveTradingSession === "function" && isLiveTradingSession());
    if (live) {
      const cal = calendarDaysBetweenTimes(windowStart, windowEnd);
      if (cal != null) return cal;
      const d0 = parseMoexTime(windowStart);
      const d1 = parseMoexTime(windowEnd);
      if (d0 && d1 && d1 >= d0) {
        return Math.max((d1 - d0) / 86400000, 1 / 1440);
      }
      return null;
    }
    return robotOperatingDays() ?? calendarDaysBetweenTimes(windowStart, windowEnd);
  }

  /** Начало периода FINRESP / % годовых в live (сессия или старт торговли). */
  function liveFinrespPeriodStart() {
    if (typeof isLiveTradingSession !== "function" || !isLiveTradingSession()) return null;
    if (state.live.active && state.live.tradingStartedAt) {
      return formatMoexBarTime(state.live.tradingStartedAt) || liveSessionStartTime();
    }
    return liveSessionStartTime();
  }

  /** Подпрограмма `annualSimplePct`. */
  function annualSimplePct(finresp, deposit, days) {
    if (!deposit || deposit <= 0 || !days || days <= 0) return null;
    const profitFraction = finresp / deposit;
    const elapsedYears = days / 365;
    return (profitFraction / elapsedYears) * 100;
  }

  /** Подпрограмма `annualCompoundPct`. */
  function annualCompoundPct(finresp, deposit, days) {
    if (!deposit || deposit <= 0 || !days || days <= 0) return null;
    const ratio = 1 + finresp / deposit;
    if (ratio <= 0) return null;
    const elapsedYears = days / 365;
    return (Math.pow(ratio, 1 / elapsedYears) - 1) * 100;
  }

  /** Установка значения: `setAnnMetric`. */
  function setAnnMetric(id, value) {
    const el = $(id);
    el.textContent = fmtPct(value);
    if (!Number.isFinite(value)) {
      el.style.color = "";
      return;
    }
    el.style.color = value < 0 ? "#b91c1c" : "#047857";
  }

  /** Установка значения: `setCommissionMetric`. */
  function setCommissionMetric(id, commission) {
    const el = $(id);
    if (!el) return;
    if (!Number.isFinite(commission) || commission <= 0) {
      el.textContent = "0";
    } else {
      el.textContent = `−${fmt(commission)} ₽`;
    }
    el.style.color = "#b91c1c";
  }

  /** Комиссия: `commissionPctValue`. */
  function commissionPctValue() {
    const s = String($("commission-pct")?.value ?? "").trim();
    if (s === "") return 0;
    const raw = +s;
    return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  }

  /** Комиссия: `commissionConfig`. */
  function commissionConfig() {
    return E.normalizeCommission({ type: "Percent", value: commissionPctValue() });
  }

  /** Расчёт: `calcLeverageAmount`. */
  function calcLeverageAmount() {
    const volumePct = +$("vol-value")?.value || 0;
    const maxPos = Math.max(0, +$("vol-maxpos")?.value ?? E.DEFAULT_VOLUME.maxPositions);
    return maxPos * volumePct / 100;
  }

  /** Синхронизация UI/state: `syncLeverageDisplay`. */
  function syncLeverageDisplay() {
    const amount = calcLeverageAmount();
    const text = Number.isFinite(amount) && amount > 0 ? fmt(amount, 2) : "—";
    const volEl = $("vol-leverage-value");
    const liveEl = $("live-leverage-value");
    if (volEl) volEl.textContent = text;
    if (liveEl) liveEl.textContent = text;
  }
  const currentLimit = () => TF_LIMITS[$("calc-tf").value] || TF_LIMITS["60"];
  const formatDay = (dt) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const parseDay = (v) => {
    if (!v) return new Date(NaN);
    const [y, m, d] = String(v).split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const todayDate = () => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  };

  /** Подпрограмма `barsPerTradingDay`. */
  function barsPerTradingDay(tf) {
    if (tf === "1") return MOEX_MINUTES_PER_SESSION;
    if (tf === "5") return Math.ceil(MOEX_MINUTES_PER_SESSION / 5);
    if (tf === "10") return Math.ceil(MOEX_MINUTES_PER_SESSION / 10);
    if (tf === "15") return Math.ceil(MOEX_MINUTES_PER_SESSION / 15);
    if (tf === "60") return Math.ceil(MOEX_MINUTES_PER_SESSION / 60);
    if (tf === "24") return 1;
    return Math.ceil(MOEX_MINUTES_PER_SESSION / 60);
  }

  /** Проверка булева условия: `isUnlimitedPeriodTf`. */
  function isUnlimitedPeriodTf(tf) {
    return tf === "60" || tf === "24";
  }

  /** Подпрограмма `calendarSpanDays`. */
  function calendarSpanDays() {
    const { min, max } = dateBounds();
    return Math.max(1, Math.round((max - min) / 86400000));
  }

  /** Подпрограмма `maxCalcDays`. */
  function maxCalcDays(tf, instrumentCount) {
    if (isUnlimitedPeriodTf(tf)) return calendarSpanDays();
    const lim = TF_LIMITS[tf] || TF_LIMITS["60"];
    const n = Math.max(1, instrumentCount || 1);
    const bpd = barsPerTradingDay(tf);
    const minDays = Math.ceil(MIN_WARMUP_BARS / bpd);
    const daysByBars = Math.floor(lim.maxBars / (bpd * Math.sqrt(n)));
    return Math.max(minDays, Math.min(lim.maxDays, daysByBars));
  }

  /** Подпрограмма `dateBounds`. */
  function dateBounds() {
    return { min: parseDay(DATE_MIN), max: todayDate() };
  }

  /** Подпрограмма `initDateInputs`. */
  function initDateInputs() {
    const maxStr = formatDay(todayDate());
    for (const id of ["calc-from", "calc-till"]) {
      const el = $(id);
      el.min = DATE_MIN;
      el.max = maxStr;
      el.disabled = false;
      el.readOnly = false;
    }
    const month = $("calc-month");
    month.min = DATE_MIN.slice(0, 7);
    month.max = maxStr.slice(0, 7);
    month.disabled = false;
  }

  /** Синхронизация UI/state: `syncMonthInputFromDates`. */
  function syncMonthInputFromDates() {
    const month = $("calc-month");
    if (!month) return;
    const from = $("calc-from").value;
    const till = $("calc-till").value;
    if (!from || !till || from.slice(0, 7) !== till.slice(0, 7)) {
      month.value = "";
      return;
    }

    const [year, monthNumber] = from.slice(0, 7).split("-").map(Number);
    const { min, max } = dateBounds();
    let monthFrom = new Date(year, monthNumber - 1, 1);
    let monthTill = new Date(year, monthNumber, 0);
    if (monthFrom < min) monthFrom = min;
    if (monthTill > max) monthTill = max;
    month.value = from === formatDay(monthFrom) && till === formatDay(monthTill)
      ? from.slice(0, 7)
      : "";
  }

  /** Применение настроек/результата: `applyMonthSelection`. */
  function applyMonthSelection() {
    const value = $("calc-month").value;
    if (!value) return;
    const [year, month] = value.split("-").map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return;

    const { min, max } = dateBounds();
    let from = new Date(year, month - 1, 1);
    let till = new Date(year, month, 0);
    if (from < min) from = min;
    if (till > max) till = max;
    if (from > till) from = till;

    $("calc-from").value = formatDay(from);
    $("calc-till").value = formatDay(till);
    state.userDateRangeTouched = true;
    const narrowed = enforceDateRange("till", selectedInstrumentCount());
    clearWindowAnchor();
    syncMonthInputFromDates();
    updateDateHint(selectedInstrumentCount());
    setCalcStatus(narrowed      ? "Месяц выбран, но период сужен лимитом таймфрейма/числа инструментов."
      : "Выбран полный месяц расчёта.");
  }

  /** Выбранные элементы UI: `selectedInstrumentCount`. */
  function selectedInstrumentCount() {
    return selectedInstruments().length;
  }

  /** Обновление: `updateDateHint`. */
  function updateDateHint(instrumentCount) {
    const tf = $("calc-tf").value;
    const n = instrumentCount ?? selectedInstrumentCount();
    const lim = currentLimit();
    if (!n) {
      $("calc-date-hint").textContent =
        `Календарь: ${DATE_MIN} — сегодня · по умолчанию ${DEFAULT_RANGE_DAYS} дн., конец −${DEFAULT_END_LAG_DAYS} дн. · сужение — при выборе бумаг и ТФ`;
      return;
    }
    if (isUnlimitedPeriodTf(tf)) {
      $("calc-date-hint").textContent =
        `Календарь: ${DATE_MIN} — сегодня · для ${lim.label} период не ограничивается (${n} инстр.)`;
      return;
    }
    const maxD = maxCalcDays(tf, n);
    $("calc-date-hint").textContent =
      `Календарь: ${DATE_MIN} — сегодня · макс. период ~${maxD} дн. (${lim.label}, ${n} инстр.)`;
  }

  /** Подпрограмма `params`. */
  function params() {
    const sl = Math.max(0, +$("param-sl").value);
    const tp = Math.max(0, +$("param-tp").value);
    const atrRaw = +$("param-atr-sl").value;
    const atrLen = Number.isFinite(atrRaw) && atrRaw >= 2
      ? Math.round(atrRaw)
      : ((sl > 0 || tp > 0) ? E.DEFAULT_PARAMS.slTpAtrLen : 2);
    const strictRaw = +$("param-strict").value;
    const strict = Number.isFinite(strictRaw) && strictRaw >= 1 && strictRaw <= 5
      ? Math.round(strictRaw)
      : E.DEFAULT_PARAMS.Strict;
    return {
      LR: +$("param-lr").value || E.DEFAULT_PARAMS.LR,
      LinK: Math.max(0.1, +$("param-lin-k").value ?? E.DEFAULT_PARAMS.LinK),
      Strict: strict,
      SL: sl,
      TP: tp,
      slTpAtrLen: atrLen,
      smaCorridorAtr: Math.max(0, +$("param-sma-corridor").value ?? E.DEFAULT_PARAMS.smaCorridorAtr),
      CmaLen: Math.max(2, Math.round(+$("param-cma-len").value || E.DEFAULT_PARAMS.CmaLen)),
      CmaPow: Math.max(0, +$("param-cma-pow").value ?? E.DEFAULT_PARAMS.CmaPow),
      ReverseSides: !!$("param-reverse")?.checked,
      ReverseSignals: !!$("param-reverse-signals")?.checked,
      AutoReverses: !!$("param-auto-reverses")?.checked,
      AutoLookback: Math.max(50, Math.round(+$("param-auto-reverses-lookback")?.value || 220)),
      AutoStep: Math.max(1, Math.round(+$("param-auto-reverses-step")?.value || 30))
    };
  }

  /** Подпрограмма `volConfig`. */
  function volConfig() {
    return {
      volumeType: $("vol-type").value,
      volume: +$("vol-value").value || E.DEFAULT_VOLUME.volume,
      deposit: +$("vol-deposit").value || E.DEFAULT_VOLUME.deposit,
      maxPositions: Math.max(0, +$("vol-maxpos").value ?? E.DEFAULT_VOLUME.maxPositions),
      commission: commissionConfig()
    };
  }



  // === LIVE: installed from MultiLogic_FinrespCalculator.live.js ===
  const __mlLiveDeps = {
    state, E, $, fmt, fmtSignedRub, RUB_SIGN, IS_FILE_PROTOCOL,
    TBANK_REST_BASES, TBANK_TOKEN_STORE_KEY, TBANK_ACCOUNT_STORE_KEY, TBANK_HOST_STORE_KEY,
    TBANK_CRYPTO_ITERATIONS, safeStorageGet, safeStorageSet, safeStorageRemove,
    moneyValueRub, moneyValueToNumber, accountLabel, rubFreeCashFromTbankPositions,
    encryptTbankToken, decryptTbankToken,
    get params() { return params; },
    get volConfig() { return volConfig; },
    get stopperConfig() { return stopperConfig; },
    get commissionPctValue() { return commissionPctValue; },
    noteLiveTech, noteTechError, updateTechInfo, saveConfig,
    get selectedInstruments() { return selectedInstruments; },
    get selectedInstrumentCount() { return selectedInstrumentCount; },
    get instrumentKey() { return instrumentKey; },
    get packsByInstrumentKey() { return packsByInstrumentKey; },
    get orderPacksForInstruments() { return orderPacksForInstruments; },
    get loadMetaKey() { return loadMetaKey; },
    get selectedLogicIds() { return selectedLogicIds; },
    get primaryLogicId() { return primaryLogicId; },
    get logicDisplayName() { return logicDisplayName; },
    get resolveCalcLogicSpec() { return resolveCalcLogicSpec; },
    get calcResultAsync() { return calcResultAsync; },
    get yieldToUi() { return yieldToUi; },
    get syncChartBox() { return syncChartBox; },
    get invalidateFinrespResult() { return invalidateFinrespResult; },
    get syncLeverageDisplay() { return syncLeverageDisplay; },
    INDICATOR_OPTIONS, MIN_WARMUP_BARS, MOEX_MINUTES_PER_SESSION,
    get applyEditorParams() { return applyEditorParams; },
    get indicatorSelection() { return indicatorSelection; },
    get normalizeSliders() { return normalizeSliders; },
    get finrespRunOptions() { return finrespRunOptions; },
    get bindCollapsibleToggle() { return bindCollapsibleToggle; },
    get syncCollapsibleToggleLabel() { return syncCollapsibleToggleLabel; },
    get bindLivePanelCollapsibleToggles() { return bindLivePanelCollapsibleToggles; },
    get syncPageVersionBadge() { return syncPageVersionBadge; },
    get liveMoexBarTimes() { return liveMoexBarTimes; },
    noteLiveReconcileToTech, liveIssueLine, mergeLiveForbiddenIssues,
    liveForbiddenLabel, formatLiveForbiddenTechLine, liveIssueIsApiForbidden, techLog,
    get refPack() { return refPack; },
    get drawCharts() { return drawCharts; },
    get drawEquityCharts() { return drawEquityCharts; },
    get applyResult() { return applyResult; },
    get setCommissionMetric() { return setCommissionMetric; },
    get formatMoexBarTime() { return formatMoexBarTime; },
    get parseMoexTime() { return parseMoexTime; },
    get parseDay() { return parseDay; },
    get formatDay() { return formatDay; },
    get todayDate() { return todayDate; },
    get addDays() { return addDays; },
    get maxCalcDays() { return maxCalcDays; },
    get formatLiveRefreshClock() { return formatLiveRefreshClock; },
    get logicEquityLabel() { return logicEquityLabel; },
    get equityCatalogLogicKeys() { return equityCatalogLogicKeys; },
    get selectedEquityLogicKeys() { return selectedEquityLogicKeys; },
    get totalEquityTitle() { return totalEquityTitle; },
    get finrespEquityTitle() { return finrespEquityTitle; },
    get referenceEquityTitle() { return referenceEquityTitle; },
    get currentLimit() { return currentLimit; },
    get commonTimeRange() { return commonTimeRange; },
    get findFirstIndexAtOrAfter() { return findFirstIndexAtOrAfter; },
    get findLastIndexAtOrBefore() { return findLastIndexAtOrBefore; },
    get rowIndexByTime() { return rowIndexByTime; }
  };
  const __mlLive = MultiLogicFinrespLive.install(__mlLiveDeps);
  const {
    isLiveMode, isLiveSandbox, isTbankBackedMode, readAccountModeFromUi,
    setTbankStatus, syncTbankSettingsState, syncAccountModeUi, syncLiveTradingUi,
    syncLiveStatsHint, renderLiveFreeCashStat, renderLiveFinResultStat,
    snapshotLiveSessionPortfolioBaseline, liveFreeCashRub, liveFinResultRub,
    requireTbankDepositForRun, initAccountMode, connectTbankAndLoadDeposit,
    connectTbankForLive, saveTbankToken, unlockTbankTokenInteractive,
    ensureTbankTokenUnlocked, loadTbankAccounts, loadTbankDeposit, fillTbankAccounts,
    toggleLiveTrading, sellAllMarketLive, liveTradingReconcile, refreshLiveCandleStream,
    refreshLiveManualLimitPrice, refreshLiveChartsUi, refreshLiveEquityChartsUi,
    renderLiveOrdersPanel, renderLivePositionsPanel, syncLiveManualOrderUi,
    syncLivePeriodControls, placeManualLiveOrder,
    closeLivePositionAtMarket, closeLiveOrderAtMarket, onLiveSandboxToggle,
    enableLiveSandbox, disableLiveSandbox, stopLiveTradingOnModeChange,
    handleAccountModeUserChange, checkSandboxPortfolioStopperNotify,
    ensureSandboxStopperWatch, resetSandboxStopperWatch, syncTradeHistoryFromSources,
    noteLiveFinrespSkipped, tryLiveFinrespCalc, startLiveModePoll, stopLiveModePoll,
    queueLiveCandleRefreshIfNeeded,
    startLiveStatsPoll, stopLiveStatsPoll, startLiveOrderBookPoll, stopLiveOrderBookPoll,
    startLivePositionsPoll, stopLivePositionsPoll, fillLiveTradingInstrumentSelects,
    refreshLiveOrderBook, scheduleRefreshLiveOrderBook, hideLivePositionsMenu, onLivePositionsMenuAction,
    onLivePositionsTableContextMenu, onLivePositionsPointerDown, onLivePositionsPointerEnd,
    onLiveOrderBookPriceDblClick, parseLiveManualInstrumentKey,
    tbankRequest, tbankFindInstrument, tbankGetInstrumentById, tbankValidateTradable,
    tbankPostOrder, postLiveOrder, isOrderBuy, liveOrderRowId, liveDisplayFinresp,
    aggregateFinrespLocal, bindTbankPassphraseModalUi,
    isLiveTradingSession, liveSessionStartTime, liveChartSessionNote,
    drawLiveChartPlaceholders, drawLiveEquityPlaceholders,
    sliceRowsForLiveSession, zeroBaseEquityRows,
    logicChartHeading, logicAbsentNote, orderMarkersForChart, chartDecorFromRows,
    buildModeRegionBands
  } = __mlLive;
  bindTbankPassphraseModalUi();

  /** Подпрограмма `randomPriceShiftEnabled`. */
  function randomPriceShiftEnabled() {
    return !!$("random-price-shift")?.checked;
  }

  /** Подпрограмма `signalPacksForCalc`. */
  function signalPacksForCalc() {
    if (!randomPriceShiftEnabled()) return null;
    return E.applyRandomPriceShift(state.packs);
  }

  /** Подпрограмма `finrespRunOptions`. */
  function finrespRunOptions() {
    const signalPacks = signalPacksForCalc();
    const reverseSignals = !!$("param-reverse-signals")?.checked;
    const opts = reverseSignals ? { reverseSignals } : {};
    if (signalPacks) opts.signalPacks = signalPacks;
    return Object.keys(opts).length ? opts : undefined;
  }

  /** Синхронизация UI/state: `syncPageVersionBadge`. */
  function syncPageVersionBadge() {
    const mainBadge = $("calc-page-version-badge");
    if (mainBadge) mainBadge.textContent = `v ${CALC_PAGE_VERSION}`;
    const liveBadge = $("live-page-version-badge");
    if (liveBadge) liveBadge.textContent = CALC_PAGE_VERSION;
  }


  /** Остановка периодического опроса: `stopperConfig`. */
  function stopperConfig() {
    const slMult = Math.max(0, +$("stopper-sl-mult").value || 0);
    const tpMult = Math.max(0, +$("stopper-tp-mult").value || 0);
    const atrRaw = +$("stopper-atr-len").value;
    const atrLen = Number.isFinite(atrRaw) && atrRaw >= 2
      ? Math.round(atrRaw)
      : E.DEFAULT_STOPPER.atrLen;
    return {
      useSl: slMult > 0,
      useTp: tpMult > 0,
      slMult,
      tpMult,
      atrLen,
      refEquity: Math.max(0, +$("stopper-ref").value || 0)
    };
  }

  /** Выбранные элементы UI: `selectedIndicatorKeys`. */
  function selectedIndicatorKeys() {
    const boxes = Array.from(document.querySelectorAll("#indicator-toggles input[type=checkbox]"));
    if (!boxes.length) return INDICATOR_OPTIONS.map((x) => x.key);
    return boxes.filter((el) => el.checked).map((el) => el.value).filter(Boolean);
  }

  /** Подпрограмма `indicatorSelection`. */
  function indicatorSelection() {
    const selected = new Set(selectedIndicatorKeys());
    const out = {};
    for (const { key } of INDICATOR_OPTIONS) out[key] = selected.has(key);
    return out;
  }

  /** Нормализация входных данных: `normalizeIndicatorCandidate`. */
  function normalizeIndicatorCandidate(value) {
    const keys = INDICATOR_OPTIONS.map((x) => x.key);
    if (Array.isArray(value)) {
      const set = new Set(value.map((x) => String(x || "").toLowerCase()));
      return keys.filter((key) => set.has(key));
    }
    if (value && typeof value === "object") {
      return keys.filter((key) => !!value[key]);
    }
    if (typeof value === "string") {
      return normalizeIndicatorCandidate(value.split(",").map((x) => x.trim()));
    }
    return selectedIndicatorKeys();
  }

  /** Подпрограмма `indicatorCandidateLabel`. */
  function indicatorCandidateLabel(value) {
    const keys = normalizeIndicatorCandidate(value);
    return keys.length ? keys.map((key) => INDICATOR_LABELS[key] || key).join("+") : "нет индикаторов";
  }

  /** Применение настроек/результата: `applyIndicatorSelection`. */
  function applyIndicatorSelection(value) {
    const keys = new Set(normalizeIndicatorCandidate(value));
    document.querySelectorAll("#indicator-toggles input[type=checkbox]").forEach((el) => {
      el.checked = keys.has(el.value);
    });
  }

  /** Установка значения: `setIndicatorInputsDisabled`. */
  function setIndicatorInputsDisabled(disabled) {
    document.querySelectorAll("#indicator-toggles input[type=checkbox]").forEach((el) => {
      el.disabled = disabled;
    });
  }

  /** Синхронизация UI/state: `syncVolumeFields`. */
  function syncVolumeFields() {
    const t = $("vol-type").value;
    $("vol-deposit-wrap").style.display = t === "Deposit percent" ? "" : "none";
    const labels = {
      "Deposit percent": "Volume, % депозита",
      "Contracts": "Volume, контракты",
      "Contract currency": "Volume, в валюте контракта, ₽"
    };
    $("vol-value-label").textContent = labels[t] || "Volume";
    syncLeverageDisplay();
    syncAccountModeUi();
  }

  /** Выбранные элементы UI: `selectedInstruments`. */
  function selectedInstruments() {
    const api = bridgeApi();
    if (api?.getSelectedInstruments) {
      try {
        return api.getSelectedInstruments();
      } catch (_) { /* fallback */ }
    }
    return bridgeReadInstrumentsFromDom();
  }

  /** Выбранные элементы UI: `selectedSecs`. */
  function selectedSecs() {
    return selectedInstruments().map((i) => i.sec);
  }

  /** Инструмент портфеля: `instrumentKey`. */
  function instrumentKey(inst) {
    const sec = inst?.sec ?? inst;
    const market = inst?.market === "futures" ? "futures" : "shares";
    return `${market}:${String(sec || "").trim().toUpperCase()}`;
  }

  /** Загрузка данных: `loadMetaKey`. */
  function loadMetaKey(from, till, interval) {
    return `${from}|${till}|${interval}`;
  }

  /** Подпрограмма `packsByInstrumentKey`. */
  function packsByInstrumentKey(packs) {
    const map = new Map();
    for (const pack of packs || []) {
      if (pack?.[0]) map.set(instrumentKey(pack[0]), pack);
    }
    return map;
  }

  /** Заявка/ордер: `orderPacksForInstruments`. */
  function orderPacksForInstruments(instruments, byKey) {
    const out = [];
    for (const inst of instruments) {
      let pack = byKey.get(instrumentKey(inst));
      if (!pack) {
        const secUpper = String(inst.sec || "").trim().toUpperCase();
        for (const candidate of byKey.values()) {
          if (String(candidate[0]?.sec || "").trim().toUpperCase() === secUpper) {
            pack = candidate;
            break;
          }
        }
      }
      if (pack?.length) out.push(pack);
    }
    return out;
  }

  /** Подпрограмма `tryRefreshFromLoadedPacks`. */
  function tryRefreshFromLoadedPacks() {
    if (!state.packs.length || state.uiBusy || isOptimizing()) return false;
    const instruments = selectedInstruments();
    if (!instruments.length) return false;
    const from = $("calc-from").value;
    const till = $("calc-till").value;
    const interval = $("calc-tf").value;
    if (state.lastLoadMeta?.periodKey !== loadMetaKey(from, till, interval)) return false;
    const byKey = packsByInstrumentKey(state.packs);
    if (instruments.length > byKey.size) return false;
    if (!instruments.every((i) => byKey.has(instrumentKey(i)))) return false;
    state.packs = orderPacksForInstruments(instruments, byKey);
    state.lastInstruments = instruments.map((i) => ({ sec: i.sec, market: i.market }));
    state.failedInstruments = (state.failedInstruments || []).filter((f) =>
      instruments.some((i) => instrumentKey(i) === instrumentKey({ sec: f.sec, market: f.market }))
    );
    state.windowSkipped = [];
    setSliderBounds(true);
    saveWindowAnchor();
    updateTechInfo("selection-refreshed");
    return true;
  }

  /** Подпрограмма `selectNonNegativeFinrespInstruments`. */
  function selectNonNegativeFinrespInstruments() {
    if (state.uiBusy || isOptimizing()) return;
    const result = state.lastResult;
    if (!result?.perSec?.length) {
      setCalcStatus("Сначала нажмите «Рассчитать», чтобы получить FINRESP по инструментам.");
      return;
    }
    const negative = result.perSec.filter((p) => Number(p.finresp) < 0);
    if (!negative.length) {
      setCalcStatus("Инструментов с отрицательным FINRESP нет — выбор не изменён.");
      return;
    }
    const negativeSecs = new Set(negative.map((p) => String(p.sec || "").trim().toUpperCase()));
    const selectedOptions = Array.from($("calc-sec").selectedOptions);
    const remainingOptions = selectedOptions.filter((o) => !negativeSecs.has(String(o.value || "").trim().toUpperCase()));
    if (!remainingOptions.length) {
      setCalcStatus("Все рассчитанные инструменты имеют отрицательный FINRESP — выбор не изменён.");
      return;
    }

    for (const o of $("calc-sec").options) {
      if (o.selected && negativeSecs.has(String(o.value || "").trim().toUpperCase())) {
        o.selected = false;
      }
    }
    syncSelectAllCheckboxes();
    publishInstrumentSelectionFromDom();
    const instruments = selectedInstruments();
    state.bulkMode = resolveBulkMode(instruments);
    state.prevSelectCount = instruments.length;
    state.lastResult = null;
    applyUiLocks();
    const removedLabel = negative.map((p) => `${p.sec}:${fmt(p.finresp)}`).join(" · ");
    const refreshed = tryRefreshFromLoadedPacks();
    if (refreshed) {
      setCalcStatus(`Отбор выполнен: удалено ${negative.length} инстр. с FINRESP < 0 (${removedLabel}). Нажмите «Рассчитать».`);
    } else {
      setCalcStatus(`Отбор выполнен: удалено ${negative.length} инстр. с FINRESP < 0 (${removedLabel}). Нажмите «Рассчитать» для обновления.`);
    }
    saveConfig();
  }

  /** Синхронизация UI/state: `syncMarketCheckbox`. */
  function syncMarketCheckbox(market, cbId) {
    const sel = $("calc-sec");
    const cb = $(cbId);
    if (!cb) return;
    const opts = Array.from(sel.options).filter((o) => o.dataset.market === market);
    if (!opts.length) {
      cb.checked = false;
      cb.indeterminate = false;
      return;
    }
    const n = opts.filter((o) => o.selected).length;
    cb.indeterminate = false;
    cb.checked = n > 0 && n === opts.length;
  }

  /** Синхронизация UI/state: `syncSelectAllCheckboxes`. */
  function syncSelectAllCheckboxes() {
    syncMarketCheckbox("shares", "calc-sec-all-shares");
    syncMarketCheckbox("futures", "calc-sec-all-futures");
  }

  /** Установка значения: `setSelectAllMarket`. */
  function setSelectAllMarket(market, checked) {
    const sel = $("calc-sec");
    for (const o of sel.options) {
      if (o.dataset.market === market) o.selected = checked;
    }
    syncSelectAllCheckboxes();
    publishInstrumentSelectionFromDom();
  }

  /** Обработчик события UI: `onMarketCheckboxChange`. */
  function onMarketCheckboxChange(market, cbId) {
    const cb = $(cbId);
    if (cb.disabled) return;
    setSelectAllMarket(market, cb.checked);
    onSecSelectionChanged();
  }

  /** Подпрограмма `allSharesInListSelected`. */
  function allSharesInListSelected() {
    const opts = Array.from($("calc-sec").options).filter((o) => o.dataset.market === "shares");
    return opts.length > 0 && opts.every((o) => o.selected);
  }

  /** Разрешение id/метаданных: `resolveBulkMode`. */
  function resolveBulkMode(instruments) {
    if (!instruments.length) return null;
    const hasFutures = instruments.some((i) => i.market === "futures");
    const hasShares = instruments.some((i) => i.market === "shares");
    if (hasShares && !hasFutures && allSharesInListSelected()) return "shares";
    if (hasFutures && !hasShares && allFuturesInListSelected()) return "futures";
    return null;
  }

  /** Подпрограмма `releaseRunBusy`. */
  function releaseRunBusy(runGen) {
    if (state.runBusyOwner === runGen) {
      state.runBusyOwner = null;
      setBusy(false);
    }
  }

  /** Обработчик события UI: `onSecSelectionChanged`. */
  function onSecSelectionChanged() {
    invalidateFinrespResult(false);
    applyUiLocks();
    syncSelectAllCheckboxes();
    const n = selectedInstrumentCount();
    const prev = state.prevSelectCount || 0;
    if (n > 0) {
      const narrowed = enforceDateRange("till", n);
      if (narrowed) clearWindowAnchor();
      updateDateHint(n);
      if (!state.userDateRangeTouched && n < prev && relaxDateRangeForInstrumentCount(n)) {
        clearWindowAnchor();
        state.lastLoadMeta = null;
        setCalcStatus(`Выбор уменьшен — период расширен до ~${maxCalcDays($("calc-tf").value, n)} дн. Нажмите «Рассчитать».`);
      } else if (narrowed) {
        setCalcStatus(`Период сужен до ~${maxCalcDays($("calc-tf").value, n)} дн. для выбранных инструментов.`);
      }
    } else {
      enforceDateRange("till", 0);
      updateDateHint(0);
    }
    state.prevSelectCount = n;
    if (tryRefreshFromLoadedPacks()) {
      if (n > 0 && state.packs.length) invalidateFinrespResult();
    } else if (n > 0 && state.packs.length) {
      const instruments = selectedInstruments();
      const byKey = packsByInstrumentKey(state.packs);
      const missing = instruments.filter((i) => !byKey.has(instrumentKey(i)));
      if (missing.length) {
        setCalcStatus(`Выбор изменён (+${missing.length} новых) — нажмите «Рассчитать» для загрузки и пересчёта.`);
      } else {
        invalidateFinrespResult();
      }
    }
    updateTechInfo("selection-changed");
    saveConfig();
    if (isLiveMode()) {
      fillLiveTradingInstrumentSelects();
      refreshLiveChartsUi();
      if (state.live.chartSession && !state.live.candleRefreshBusy) {
        void refreshLiveCandleStream({ silent: true });
      }
    }
  }

  /** Проверка булева условия: `isOptimizing`. */
  function isOptimizing() {
    return state.optim.active != null;
  }

  /** Подпрограмма `roundParam`. */
  function roundParam(v) {
    return Math.round(v * 100) / 100;
  }

  /** Подпрограмма `optimStepSize`. */
  function optimStepSize(value, min, max) {
    const ref = value > 0 ? value : Math.max((max - min) * 0.1, 0.1);
    return Math.max(ref * 0.02, 0.02);
  }

  /** Подпрограмма `enumerateOptimValues`. */
  function enumerateOptimValues(min, max, integer) {
    const vals = [];
    const seen = new Set();
    let v = min;
    while (v <= max + 1e-9) {
      const r = integer ? Math.round(v) : roundParam(v);
      if (!seen.has(r)) {
        seen.add(r);
        vals.push(r);
      }
      if (r >= max) break;
      const step = integer
        ? Math.max(1, Math.round(Math.max(r, 1) * 0.02))
        : optimStepSize(r, min, max);
      v = integer ? r + step : roundParam(r + step);
      if (vals.length > 5000) break;
    }
    return vals;
  }

  /** Подпрограмма `enumerateIndicatorSelections`. */
  function enumerateIndicatorSelections() {
    const keys = INDICATOR_OPTIONS.map((x) => x.key);
    const vals = [];
    const fullMask = (1 << keys.length) - 1;
    for (let mask = fullMask; mask > 0; mask--) {
      const item = [];
      for (let i = 0; i < keys.length; i++) {
        if (mask & (1 << i)) item.push(keys[i]);
      }
      vals.push(item);
    }
    return vals;
  }

  /** Подпрограмма `optimMeta`. */
  function optimMeta(kind) {
    return OPT_BUTTONS.find((x) => x.kind === kind);
  }

  /** Проверка булева условия: `isIndicatorOptimKind`. */
  function isIndicatorOptimKind(kind) {
    return !!optimMeta(kind)?.indicators;
  }

  /** Подпрограмма `optimDisplayLabel`. */
  function optimDisplayLabel(kind) {
    const m = optimMeta(kind);
    return m?.label || kind.toUpperCase();
  }

  /** Подпрограмма `optimValueLabel`. */
  function optimValueLabel(kind, value) {
    if (isIndicatorOptimKind(kind)) return indicatorCandidateLabel(value);
    if (optimMeta(kind)?.boolean) return value ? "вкл" : "выкл";
    return String(optimCandidateValue(kind, value));
  }

  /** Остановка периодического опроса: `stopOptimLabel`. */
  function stopOptimLabel() {
    const dots = ".".repeat(state.optim.dots % 4);
    return `Остановить${dots}`;
  }

  const CALC_LOCK_SELECTOR = "#finresp-calc input, #finresp-calc select, #finresp-calc textarea, #finresp-calc button, #account-mode";

  /** Подпрограмма `yieldToUi`. */
  function yieldToUi() {
    return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  }

  /** Подпрограмма `mapLoadProgressPct`. */
  function mapLoadProgressPct(done, total) {
    const t = Math.max(1, +total || 1);
    const d = Math.max(0, Math.min(t, +done || 0));
    return Math.round((d / t) * CALC_PROGRESS.LOAD_MAX);
  }

  /** Прогресс построения mini-графиков по инструментам (88–93%). */
  function mapInstrumentChartProgressPct(done, total) {
    const t = Math.max(1, +total || 1);
    const d = Math.max(0, Math.min(t, +done || 0));
    const span = CALC_PROGRESS.EQUITY_CHARTS_START - CALC_PROGRESS.CHARTS_START;
    return CALC_PROGRESS.CHARTS_START + Math.round((d / t) * span);
  }

  /** Прогресс equity: расчёт (65%) и отрисовка (35%) в диапазоне 93–99%. */
  function mapEquityPhaseProgressPct(phase, done, total) {
    const t = Math.max(1, +total || 1);
    const d = Math.max(0, Math.min(t, +done || 0));
    const span = CALC_PROGRESS.RUN_MAX - CALC_PROGRESS.EQUITY_CHARTS_START;
    const calcSpan = Math.round(span * 0.65);
    const renderSpan = span - calcSpan;
    const base = CALC_PROGRESS.EQUITY_CHARTS_START;
    if (phase === "render") {
      return base + calcSpan + Math.round((d / t) * renderSpan);
    }
    return base + Math.round((d / t) * calcSpan);
  }

  function mapEquityProgressPct(done, total) {
    return mapEquityPhaseProgressPct("calc", done, total);
  }

  /** Установка значения: `setCalcProgress`. */
  function setCalcProgress(message, pct, opts) {
    const options = opts || {};
    const text = String(message || "").trim() || "…";
    const el = $("calc-progress-text");
    const bar = $("calc-progress-bar");
    const barWrap = $("calc-progress-bar-wrap");
    const hasPct = Number.isFinite(pct);
    let p = hasPct ? Math.round(Math.max(0, Math.min(100, pct))) : null;
    if (hasPct && !options.final) p = Math.min(CALC_PROGRESS.RUN_MAX, p);
    const pctLabel = hasPct ? `${p}%` : "";
    if (el) el.textContent = hasPct ? `${text} — ${pctLabel}` : text;
    if (bar) bar.style.width = hasPct ? `${p}%` : "0%";
    if (barWrap && hasPct) barWrap.setAttribute("aria-valuenow", String(p));
    const banner = $("calc-progress-banner");
    if (banner) banner.hidden = false;
    if (!options.final) {
      setCalcStatus(hasPct ? `${text} — ${pctLabel}` : text);
    }
  }

  /** Подпрограмма `finishCalcProgress`. */
  async function finishCalcProgress(message) {
    setCalcProgress(message || "Расчёт завершён", 100, { final: true });
    await yieldToUi();
  }

  /** Подпрограмма: после расчёта прокрутить к блоку FINRESP/результатов. */
  function scrollResultsIntoView() {
    const el = $("calc-result-hero") || $("finresp-calc");
    if (!el || typeof el.scrollIntoView !== "function") return;
    el.scrollIntoView({ block: "start", inline: "nearest", behavior: "smooth" });
  }

  /** Подпрограмма `clearCalcProgress`. */
  function clearCalcProgress() {
    const banner = $("calc-progress-banner");
    if (banner) {
      banner.hidden = true;
      banner.setAttribute("aria-busy", "false");
    }
    const bar = $("calc-progress-bar");
    if (bar) bar.style.width = "0%";
    const barWrap = $("calc-progress-bar-wrap");
    if (barWrap) barWrap.setAttribute("aria-valuenow", "0");
  }

  /** Проверка булева условия: `isRunCancelled`. */
  function isRunCancelled(runGen) {
    return state.runCancelRequested || (runGen != null && runGen !== state.runGeneration);
  }

  /** Подпрограмма `trackRunCheckpoint`. */
  function trackRunCheckpoint(detail) {
    if (!detail) return;
    state.runCheckpoint = {
      phase: detail.phase || state.runCheckpoint?.phase || "",
      lastCandleTime: detail.candleTime || state.runCheckpoint?.lastCandleTime || null,
      lastSec: detail.sec || state.runCheckpoint?.lastSec || "",
      done: detail.done ?? state.runCheckpoint?.done,
      total: detail.total ?? state.runCheckpoint?.total
    };
  }

  /** Подпрограмма `terminateCalcWorker`. */
  function terminateCalcWorker() {
    if (state.calcWorker) {
      try { state.calcWorker.terminate(); } catch (_) { /* ignore */ }
      state.calcWorker = null;
    }
  }

  /** Сброс состояния: `resetEquityConfigMarkers`. */
  function resetEquityConfigMarkers() {
    state.equityConfigMarkers = [];
    state.lastEquityConfigFp = null;
  }

  /** Сброс состояния: `resetFinrespDisplay`. */
  function resetFinrespDisplay() {
    /* Процедура: очистить FINRESP, графики инструментов и lastResult без пересчёта. */
    syncChartBox($("calc-chart"), "");
    syncChartBox($("calc-chart-equity"), "");
    if (!bridgeSetResults({
      finrespText: "—",
      finrespColor: "",
      grossText: "—",
      grossColor: "",
      commissionText: "0",
      commissionColor: "#b91c1c",
      annSimpleText: "—",
      annSimpleColor: "",
      annCompoundText: "—",
      annCompoundColor: "",
      candleCount: "—",
      position: "—",
      cash: "—",
      bySecText: "—",
      annHintText: ""
    })) {
      $("calc-finresp").textContent = "—";
      $("calc-finresp").style.color = "";
      const grossReset = $("calc-finresp-gross");
      if (grossReset) {
        grossReset.textContent = "—";
        grossReset.style.color = "";
      }
      setCommissionMetric("calc-commission", 0);
      $("calc-ann-simple").textContent = "—";
      $("calc-ann-compound").textContent = "—";
      $("calc-count").textContent = "—";
      $("calc-pos").textContent = "—";
      $("calc-cash").textContent = "—";
      $("calc-bysec").textContent = "—";
      const annHint = $("calc-ann-hint");
      if (annHint) annHint.textContent = "";
    }
    state.lastResult = null;
    state.windowSkipped = [];
    applyUiLocks();
  }

  // === FINRESP: сброс при изменении формы (без автопересчёта) ===

  /** Процедура: сбросить отображение FINRESP; опционально — текст в calc-status. */
  function invalidateFinrespResult(message) {
    if (isOptimizing()) return;
    resetFinrespDisplay();
    /* Графики equity не пересчитываем — только «Рассчитать» (applyResult → drawEquityCharts). */
    if (message !== false) {
      setCalcStatus(message || FINRESP_STALE_MSG);
    }
  }

  /** Процедура: сохранить config и пометить результат устаревшим (ждём «Рассчитать»). */
  function invalidateFormChange(options) {
    const opts = options || {};
    if (!opts.skipSave) saveConfig();
    if (isOptimizing()) return;
    invalidateFinrespResult(opts.message);
  }

  /** Подпрограмма `requestStopRun`. */
  function requestStopRun() {
    if (!state.uiBusy) return;
    state.runCancelRequested = true;
    const owner = state.runBusyOwner;
    state.runGeneration++;
    if (state.workerPendingReject) {
      try { state.workerPendingReject(new Error("cancelled")); } catch (_) { /* ignore */ }
      state.workerPendingReject = null;
    }
    terminateCalcWorker();
    state.runCheckpoint = null;
    resetFinrespDisplay();
    setCalcStatus("Расчёт остановлен.");
    releaseRunBusy(owner);
    updateTechInfo("run-cancelled");
  }

  /** Подпрограмма `finishCancelledRun`. */
  async function finishCancelledRun(runGen, loadedData) {
    if (loadedData?.packs?.length) {
      state.packs = loadedData.packs;
      state.failedInstruments = loadedData.failures || [];
      state.lastLoadMeta = {
        periodKey: loadedData.periodKey,
        keys: (state.lastInstruments || []).map(instrumentKey)
      };
      if (!state.hasWindow) setSliderBounds(false);
    }
    state.runCancelRequested = false;
    state.runCheckpoint = null;
    if (!state.uiBusy) return;
    resetFinrespDisplay();
    setCalcStatus("Расчёт остановлен.");
    releaseRunBusy(runGen);
    updateTechInfo("run-cancelled");
    await yieldToUi();
  }

  /** Установка значения: `setFormLocked`. */
  function setFormLocked(lock) {
    document.body.classList.toggle("calc-running", !!lock);
    const banner = $("calc-progress-banner");
    if (banner) banner.setAttribute("aria-busy", lock ? "true" : "false");
    const stopBtn = $("calc-progress-stop");
    if (stopBtn) {
      stopBtn.hidden = !lock;
      stopBtn.disabled = !lock;
    }
    document.querySelectorAll(CALC_LOCK_SELECTOR).forEach((el) => {
      if (lock) {
        if (el.dataset.calcLockPrev == null) el.dataset.calcLockPrev = el.disabled ? "1" : "0";
        el.disabled = true;
      } else if (el.dataset.calcLockPrev != null) {
        el.disabled = el.dataset.calcLockPrev === "1";
        delete el.dataset.calcLockPrev;
      }
    });
  }

  /** Получение значения: `getCalcWorker`. */
  function getCalcWorker() {
    if (state.calcWorker) return state.calcWorker;
    if (typeof Worker === "undefined") return null;
    try {
      state.calcWorker = new Worker((window.__mlFinrespAssetBase || "") + "MultiLogic_FinrespCalculator.worker.js");
      return state.calcWorker;
    } catch (err) {
      noteTechError(`worker-init: ${err.message}`);
      return null;
    }
  }

  /** Построение структуры данных: `buildRunProgressHandler`. */
  function buildRunProgressHandler(runOptions) {
    const ro = runOptions || {};
    if (ro.silent) return null;
    return (pct, text, detail) => {
      trackRunCheckpoint(detail);
      setCalcProgress(text, pct);
    };
  }

  /** Запуск расчёта: `runMultiInWorker`. */
  function runMultiInWorker(packs, spec, a, b, params, volConfig, sc, randomPriceShift, runOptions) {
    const ro = runOptions || {};
    const worker = getCalcWorker();
    const progressOpts = {
      ...(randomPriceShift ? { signalPacks: E.applyRandomPriceShift(packs) } : {}),
      shouldCancel: ro.shouldCancel,
      ...(ro.silent ? {} : { onProgress: buildRunProgressHandler(ro) })
    };
    if (!worker) {
      return E.runMultiAsync(packs, spec, a, b, params, volConfig, sc, progressOpts);
    }
    const id = ++state.workerRequestId;
    return new Promise((resolve, reject) => {
      state.workerPendingReject = reject;
      const onMsg = (e) => {
        if (!e.data || e.data.id !== id) return;
        if (e.data.type === "progress") {
          if (!ro.silent) {
            trackRunCheckpoint(e.data.detail);
            setCalcProgress(e.data.text, e.data.pct);
          }
          return;
        }
        worker.removeEventListener("message", onMsg);
        worker.removeEventListener("error", onErr);
        state.workerPendingReject = null;
        if (e.data.ok) resolve(e.data.result);
        else reject(new Error(e.data.error || "worker failed"));
      };
      const onErr = (err) => {
        worker.removeEventListener("message", onMsg);
        worker.removeEventListener("error", onErr);
        state.workerPendingReject = null;
        reject(err);
      };
      worker.addEventListener("message", onMsg);
      worker.addEventListener("error", onErr);
      worker.postMessage({ id, packs, spec, startIdx: a, endIdx: b, params, volConfig, stopperConfig: sc, randomPriceShift: !!randomPriceShift });
    });
  }

  /**
   * Функция (async): полный расчёт FINRESP по state.packs и окну ползунков.
   * Берёт spec из resolveCalcLogicSpec; worker или E.runMultiAsync.
   */
  async function calcResultAsync(optimCtx, runOptions) {
    const ro = runOptions || {};
    if (!state.packs.length) return null;
    const [a, b] = normalizeSliders();
    const p = optimCtx?.params ?? params();
    const sc = optimCtx?.stopper ?? stopperConfig();
    const indicators = optimCtx?.indicators ?? indicatorSelection();
    const spec = resolveCalcLogicSpec(p, indicators);
    if (!spec) return null;

    if (!optimCtx && !ro._obWarnDone) {
      const obWarn = collectObCalcWarnings(selectedLogicIds());
      if (obWarn.blocking.length) {
        if (!ro.silent) setCalcStatus(obWarn.blocking[0]);
        return null;
      }
      if (obWarn.notes.length && !ro.silent) {
        setCalcStatus(obWarn.notes.join(" "));
        await yieldToUi();
      }
    }

    // AutoReverses (calc mode): evaluate 4 variants on last @@AutoLookback bars and switch checkboxes.
    // Only for normal calculations (not optimization trials) and only once per run.
    if (!optimCtx && p.AutoReverses && !ro._autoReversesDone) {
      const lookback = Math.max(50, Math.round(+p.AutoLookback || 220));
      const evalA = Math.max(a, b - lookback + 1);
      const evalB = b;
      const variants = [
        { sides: false, signals: false, key: "00" },
        { sides: true, signals: false, key: "10" },
        { sides: false, signals: true, key: "01" },
        { sides: true, signals: true, key: "11" }
      ];
      let best = null;
      try {
        if (!ro.silent) {
          setCalcProgress("AutoReverses: выбор лучшего варианта…", CALC_PROGRESS.FINRESP_START);
          await yieldToUi();
        }
        for (const v of variants) {
          if (ro.shouldCancel?.()) throw new Error("cancelled");
          const pv = { ...p, ReverseSides: v.sides, ReverseSignals: v.signals };
          const out = await runMultiInWorker(
            state.packs,
            resolveCalcLogicSpec(pv, indicators),
            evalA,
            evalB,
            pv,
            volConfig(),
            sc,
            randomPriceShiftEnabled(),
            { ...ro, silent: true, _autoReversesDone: true }
          );
          const fin = out?.agg?.finresp;
          if (!Number.isFinite(fin)) continue;
          if (!best || fin > best.finresp) best = { ...v, finresp: fin };
        }
      } catch (err) {
        // ignore and fall back to current checkboxes
        if (!ro.silent) noteTechError(`auto-reverses-calc: ${err.message}`);
      }
      if (best) {
        const needSides = best.sides;
        const needSignals = best.signals;
        const curSides = !!$("param-reverse")?.checked;
        const curSignals = !!$("param-reverse-signals")?.checked;
        if (needSides !== curSides) $("param-reverse").checked = needSides;
        if (needSignals !== curSignals) $("param-reverse-signals").checked = needSignals;
        syncReverseUi();
        syncReverseSignalsUi();
        updateAtParamsSummary();
        saveConfig();
        if (!ro.silent) {
          setCalcStatus(`AutoReverses: выбран вариант ${best.key} (FINRESP ${fmt(best.finresp)} ₽ на последних ${lookback} свечах).`);
        }
        // re-run with updated params from UI
        return await calcResultAsync(null, { ...ro, _autoReversesDone: true });
      }
    }

    if (!ro.silent) {
      setCalcProgress("Расчёт FINRESP (фоновый поток)…", CALC_PROGRESS.FINRESP_START);
      await yieldToUi();
    }
    let workerOut;
    try {
      workerOut = await runMultiInWorker(
        state.packs, spec, a, b, p, volConfig(), sc, randomPriceShiftEnabled(), ro
      );
    } catch (err) {
      if (state.runCancelRequested || err?.message === "cancelled") throw err;
      if (ro.shouldCancel?.()) throw new Error("cancelled");
      noteTechError(`worker-fallback: ${err.message}`);
      if (!ro.silent) {
        setCalcProgress("Расчёт FINRESP (основной поток)…", CALC_PROGRESS.FINRESP_START);
        await yieldToUi();
      }
      workerOut = await E.runMultiAsync(state.packs, spec, a, b, p, volConfig(), sc, {
        ...finrespRunOptions(),
        shouldCancel: ro.shouldCancel,
        ...(ro.silent ? {} : { onProgress: buildRunProgressHandler(ro) })
      });
    }
    const { perSec, agg, preStopperAgg, stopper, skipped } = workerOut;
    state.windowSkipped = skipped || [];
    if (!perSec?.length) return null;
    return { perSec, agg, preStopperAgg, stopper, a, b, skipped };
  }

  /** Применение настроек/результата: `applyUiLocks`. */
  function applyUiLocks() {
    const lock = state.uiBusy || isOptimizing();
    setFormLocked(state.uiBusy);
    syncLiveTradingUi();
    $("calc-run").disabled = lock;
    $("calc-select-positive").disabled = lock || !state.lastResult?.perSec?.length;
    $("prefix-pick-stocks").disabled = lock;
    $("prefix-pick-futures").disabled = lock;
    const secOpts = Array.from($("calc-sec").options);
    $("calc-sec-all-shares").disabled = lock || !secOpts.some((o) => o.dataset.market === "shares");
    $("calc-sec-all-futures").disabled = lock || !secOpts.some((o) => o.dataset.market === "futures");
    setIndicatorInputsDisabled(lock);
  }

  /** Синхронизация UI/state: `syncOptimButtons`. */
  function syncOptimButtons() {
    const active = state.optim.active;
    for (const { kind, btnId } of OPT_BUTTONS) {
      const btn = $(btnId);
      if (!btn) continue;
      const meta = optimMeta(kind);
      const on = active === kind;
      btn.disabled = active != null && !on;
      btn.classList.toggle("calc-opt-btn-active", on);
      btn.textContent = on ? stopOptimLabel() : OPT_BTN_ICON;
      btn.title = on ? "Остановить оптимизацию" : `Оптимизировать ${meta?.label || kind}`;
      btn.setAttribute("aria-label", btn.title);
    }
    const lock = isOptimizing();
    for (const { inputId } of OPT_BUTTONS) {
      if (inputId) $(inputId).readOnly = lock;
    }
    setIndicatorInputsDisabled(state.uiBusy || lock);
    applyUiLocks();
  }

  /** Запуск периодического опроса: `startOptimDots`. */
  function startOptimDots() {
    stopOptimDots();
    state.optim.dots = 0;
    state.optim.dotTimer = setInterval(() => {
      state.optim.dots += 1;
      if (state.optim.active) syncOptimButtons();
    }, 420);
  }

  /** Остановка периодического опроса: `stopOptimDots`. */
  function stopOptimDots() {
    if (state.optim.dotTimer) {
      clearInterval(state.optim.dotTimer);
      state.optim.dotTimer = null;
    }
  }

  /** Подпрограмма `finishOptim`. */
  function finishOptim(token, autoDone) {
    if (token !== state.optim.runToken || !state.optim.active) return;
    const kind = state.optim.active;
    const meta = optimMeta(kind);
    const bestValue = optimCandidateValue(kind, state.optim.bestValue);
    const bestLabel = optimValueLabel(kind, bestValue);
    const bestFinresp = state.optim.bestFinresp;
    state.optim.runToken += 1;
    state.optim.active = null;
    state.optim.bestValue = bestValue;
    stopOptimDots();
    syncOptimButtons();
    if (meta?.indicators) applyIndicatorSelection(bestValue);
    else if (meta?.boolean && meta?.inputId) $(meta.inputId).checked = !!bestValue;
    else if (meta?.inputId) $(meta.inputId).value = String(bestValue);
    syncReverseUi();
    const result = calcResult(optimRunContext(kind, bestValue));
    if (result) applyResult(result, { redrawCharts: true, redrawChartsAsync: true });
    const scoreNote = isPositionOptimKind(kind) ? " (FINRESP до портф. Stopper)" : "";
    setCalcStatus(
      autoDone
      ? `Оптимизация ${optimDisplayLabel(kind)} завершена: лучшее ${bestLabel}, FINRESP ${fmt(bestFinresp)} ₽${scoreNote}`
      : `Оптимизация ${optimDisplayLabel(kind)} остановлена: лучшее ${bestLabel}, FINRESP ${fmt(bestFinresp)} ₽${scoreNote}`
    );
  }

  /** Остановка периодического опроса: `stopOptim`. */
  function stopOptim() {
    if (!state.optim.active) return;
    const token = state.optim.runToken;
    finishOptim(token, false);
  }

  /** Подпрограмма `optimCandidateValue`. */
  function optimCandidateValue(kind, value) {
    const meta = optimMeta(kind);
    if (meta?.indicators) return normalizeIndicatorCandidate(value);
    if (meta?.boolean) return !!value;
    return meta?.integer ? Math.round(value) : roundParam(value);
  }

  /** Проверка булева условия: `isPositionOptimKind`. */
  function isPositionOptimKind(kind) {
    return !!optimMeta(kind)?.position;
  }

  /** Подпрограмма `optimScore`. */
  function optimScore(trial, kind) {
    if (!trial) return -Infinity;
    if (isPositionOptimKind(kind)) {
      return trial.preStopperAgg?.finresp ?? trial.agg.finresp;
    }
    return trial.agg.finresp;
  }

  /** Подпрограмма `optimRunContext`. */
  function optimRunContext(kind, value) {
    const cv = optimCandidateValue(kind, value);
    const p = params();
    const sc = stopperConfig();
    switch (kind) {
      case "sl":
        return { params: { ...p, SL: Math.max(0, cv) }, stopper: sc };
      case "tp":
        return { params: { ...p, TP: Math.max(0, cv) }, stopper: sc };
      case "atr-sl":
        return { params: { ...p, slTpAtrLen: Math.max(2, Math.round(cv)) }, stopper: sc };
      case "cma-len":
        return { params: { ...p, CmaLen: Math.max(2, Math.round(cv)) }, stopper: sc };
      case "cma-pow":
        return { params: { ...p, CmaPow: Math.max(0, cv) }, stopper: sc };
      case "lr":
        return { params: { ...p, LR: Math.max(2, Math.round(cv)) }, stopper: sc };
      case "lin-k":
        return { params: { ...p, LinK: Math.max(0.1, cv) }, stopper: sc };
      case "strict":
        return { params: { ...p, Strict: Math.max(1, Math.min(5, Math.round(cv))) }, stopper: sc };
      case "reverse":
        return { params: { ...p, ReverseSides: !!cv }, stopper: sc };
      case "p-sl": {
        const slMult = Math.max(0, cv);
        return { params: p, stopper: { ...sc, slMult, useSl: slMult > 0 } };
      }
      case "p-tp": {
        const tpMult = Math.max(0, cv);
        return { params: p, stopper: { ...sc, tpMult, useTp: tpMult > 0 } };
      }
      case "p-atr":
        return { params: p, stopper: { ...sc, atrLen: Math.max(2, Math.round(cv)) } };
      case "indicators":
        return { params: p, stopper: sc, indicators: cv };
      default:
        return { params: p, stopper: sc };
    }
  }

  /** Расчёт: `calcResult`. */
  function calcResult(optimCtx) {
    if (!state.packs.length) return null;
    const [a, b] = normalizeSliders();
    const p = optimCtx?.params ?? params();
    const sc = optimCtx?.stopper ?? stopperConfig();
    const indicators = optimCtx?.indicators ?? indicatorSelection();
    const spec = resolveCalcLogicSpec(p, indicators);
    if (!spec) return null;
    const { perSec, agg, preStopperAgg, stopper, skipped } = E.runMulti(
      state.packs, spec, a, b, p, volConfig(), sc, finrespRunOptions()
    );
    state.windowSkipped = skipped || [];
    if (!perSec.length) return null;
    return { perSec, agg, preStopperAgg, stopper, a, b, skipped };
  }

  /** Подпрограмма `optimLoop`. */
  async function optimLoop(token) {
    if (token !== state.optim.runToken || !state.optim.active) return;
    const kind = state.optim.active;
    const meta = optimMeta(kind);
    const input = meta.inputId ? $(meta.inputId) : null;

    if (state.optim.candidateIndex >= state.optim.candidates.length) {
      finishOptim(token, true);
      return;
    }

    const candidate = state.optim.candidates[state.optim.candidateIndex];
    state.optim.candidateIndex += 1;
    if (meta.indicators) applyIndicatorSelection(candidate);
    else if (meta.boolean && input) input.checked = !!candidate;
    const trial = calcResult(optimRunContext(kind, candidate));
    const score = optimScore(trial, kind);
    if (trial && score > state.optim.bestFinresp) {
      state.optim.bestFinresp = score;
      state.optim.bestValue = optimCandidateValue(kind, candidate);
    }
    const candLabel = optimValueLabel(kind, candidate);
    if (input && !meta.indicators) {
      if (meta.boolean) input.checked = !!optimCandidateValue(kind, candidate);
      else input.value = String(optimCandidateValue(kind, candidate));
    }
    if (trial) {
      applyResult(trial, {
        redrawCharts: false,
        optimTrial: true,
        optimNote: `${optimDisplayLabel(kind)} ${candLabel}`
      });
    }
    await new Promise((r) => setTimeout(r, 40));
    optimLoop(token);
  }

  /** Загрузить свечи из кэша/MOEX в state.packs для оптимизации без полного «Рассчитать». */
  async function ensurePacksForOptim() {
    if (state.packs.length) return true;
    const instruments = selectedInstruments();
    if (!instruments.length) return false;
    const from = $("calc-from").value;
    const till = $("calc-till").value;
    const interval = $("calc-tf").value;
    try {
      const loaded = await ensureInstrumentPacks(instruments, from, till, interval);
      if (!loaded.packs.length) return false;
      state.packs = loaded.packs;
      state.failedInstruments = loaded.failures;
      state.windowSkipped = [];
      state.lastLoadMeta = {
        periodKey: loaded.periodKey,
        keys: instruments.map(instrumentKey)
      };
      state.lastInstruments = instruments.map((i) => ({ sec: i.sec, market: i.market }));
      state.movedSlider = "end";
      setSliderBounds(false);
      saveWindowAnchor();
      updateTechInfo("optim-packs-ready");
      return true;
    } catch (err) {
      noteTechError(`ensurePacksForOptim: ${err.message}`);
      return false;
    }
  }

  /** Подпрограмма `toggleOptim`. */
  async function toggleOptim(kind) {
    if (state.uiBusy) return;
    if (state.optim.active === kind) {
      stopOptim();
      return;
    }
    const meta = optimMeta(kind);
    const label = meta?.label || kind;
    if (!window.confirm(
      `Хотите оптимизировать параметр ${label}?\n\n`
      + "Будут перебраны допустимые значения; останется вариант с лучшим FINRESP."
    )) {
      return;
    }
    if (!state.packs.length) {
      setCalcStatus("Подготовка свечей для оптимизации…");
      await yieldToUi();
      const ready = await ensurePacksForOptim();
      if (!ready) {
        setCalcStatus("Сначала загрузите свечи — нажмите «Рассчитать» (кэш пуст или период не совпадает).");
        return;
      }
    }
    if (state.optim.active) stopOptim();
    const input = meta.inputId ? $(meta.inputId) : null;
    let startValue;
    let candidates;
    if (meta.indicators) {
      startValue = optimCandidateValue(kind, selectedIndicatorKeys());
      candidates = enumerateIndicatorSelections();
    } else if (meta.boolean) {
      startValue = optimCandidateValue(kind, !!input?.checked);
      candidates = [false, true];
      if (input) input.checked = !!startValue;
    } else {
      if (!input) {
        setCalcStatus(`Нет поля ввода для ${label}.`);
        return;
      }
      const min = +input.min || 0;
      const max = +input.max || 50;
      const rawStart = Math.max(+input.value || 0, min);
      startValue = optimCandidateValue(kind, rawStart);
      candidates = enumerateOptimValues(min, max, !!meta.integer);
      input.value = String(startValue);
    }
    state.optim.active = kind;
    state.optim.candidates = candidates;
    state.optim.candidateIndex = 0;
    state.optim.bestValue = startValue;
    const cur = calcResult(optimRunContext(kind, startValue));
    state.optim.bestFinresp = optimScore(cur, kind);
    state.optim.runToken += 1;
    const token = state.optim.runToken;
    startOptimDots();
    syncOptimButtons();
    optimLoop(token);
  }

  /** Установка значения: `setBusy`. */
  function setBusy(busy) {
    state.uiBusy = busy;
    if (!busy) clearCalcProgress();
    applyUiLocks();
    if (!state.uiBusy && !isOptimizing()) syncOptimButtons();
    if (!busy && typeof queueLiveCandleRefreshIfNeeded === "function") {
      queueLiveCandleRefreshIfNeeded();
    }
  }

  /** Обновление: `updateSecHint`. */
  function updateSecHint() {
    const futLabel = state.futuresFromMoex
      ? `${state.futuresList.length} фьючерсов MOEX (за период расчёта)`
      : `${state.futuresList.length} префиксов фьючерсов из поля`;
    const hint =
      `${state.shareList.length} тикеров акций · ${futLabel}`;
    if (!bridgeSetFormCatalog({ secHintText: hint })) {
      $("calc-sec-hint").textContent = hint;
    }
  }

  /** Заполнение select/списка: `fillSecSelect`. */
  function fillSecSelect(opts) {
    const options = opts || {};
    const sel = $("calc-sec");
    const prev = new Set(selectedSecs());
    if (options.preserveSecs?.length) {
      for (const id of options.preserveSecs) prev.add(id);
    }
    sel.innerHTML = "";
    const addOptions = (ids, market) => {
      for (const id of ids) {
        const o = document.createElement("option");
        o.value = id;
        o.textContent = id;
        o.dataset.market = market;
        const selectFutures = options.selectFutures && market === "futures";
        if (selectFutures || prev.has(id)) {
          o.selected = true;
        }
        sel.appendChild(o);
      }
    };
    addOptions(state.shareList, "shares");
    addOptions(state.futuresList, "futures");
    sel.disabled = !state.shareList.length && !state.futuresList.length;
    syncSelectAllCheckboxes();
    const instrumentOptions = [
      ...state.shareList.map((id) => ({ id, market: "shares" })),
      ...state.futuresList.map((id) => ({ id, market: "futures" }))
    ];
    bridgeSetFormCatalog({
      instrumentOptions,
      instrumentsDisabled: !!sel.disabled
    });
    publishInstrumentSelectionFromDom();
  }

  /** Подпрограмма `initPrefixFields`. */
  function initPrefixFields() {
    $("prefix-stocks").value = E.DEFAULT_STOCK_TICKERS_RAW;
    $("prefix-futures").value = E.DEFAULT_FUTURES_PREFIXES_RAW;
  }

  /** Пустые поля префиксов (часто из localStorage) — подставить встроенный список. */
  function ensurePrefixFieldsNotEmpty() {
    const stocksEl = $("prefix-stocks");
    const futuresEl = $("prefix-futures");
    let repaired = false;
    if (stocksEl && !String(stocksEl.value || "").trim()) {
      stocksEl.value = E.DEFAULT_STOCK_TICKERS_RAW;
      repaired = true;
    }
    if (futuresEl && !String(futuresEl.value || "").trim()) {
      futuresEl.value = E.DEFAULT_FUTURES_PREFIXES_RAW;
      repaired = true;
    }
    return repaired;
  }

  /** Подпрограмма `reloadShareList`. */
  function reloadShareList() {
    ensurePrefixFieldsNotEmpty();
    state.shareList = E.listShareTickers($("prefix-stocks").value);
    fillSecSelect();
    updateSecHint();
  }

  /** Подпрограмма `reloadFuturesList`. */
  function reloadFuturesList() {
    ensurePrefixFieldsNotEmpty();
    state.futuresList = E.listFuturesPrefixes($("prefix-futures").value);
    state.futuresFromMoex = false;
    fillSecSelect();
    updateSecHint();
  }

  /** Подпрограмма `reloadFuturesListFromMoex`. */
  async function reloadFuturesListFromMoex() {
    const from = $("calc-from").value;
    const till = $("calc-till").value;
    state.futuresList = await E.fetchFuturesList($("prefix-futures").value, { from, till });
    state.futuresFromMoex = true;
    fillSecSelect({ selectFutures: true });
    updateSecHint();
    return state.futuresList.length;
  }

  /** Подпрограмма `allFuturesInListSelected`. */
  function allFuturesInListSelected() {
    const opts = Array.from($("calc-sec").options).filter((o) => o.dataset.market === "futures");
    return opts.length > 0 && opts.every((o) => o.selected);
  }

  /** Подпрограмма `expandFuturesForCalcPeriod`. */
  async function expandFuturesForCalcPeriod(instruments) {
    const futuresInst = instruments.filter((i) => i.market === "futures");
    if (!futuresInst.length) return instruments;
    const from = $("calc-from").value;
    const till = $("calc-till").value;
    const prefixes = $("prefix-futures").value;
    const selectedSecs = futuresInst.map((i) => i.sec);
    const allContracts = await E.fetchFuturesList(prefixes, { from, till });
    const expanded = allFuturesInListSelected()
      ? allContracts
      : await E.expandFuturesSelection(selectedSecs, prefixes, { from, till });
    if (expanded.length) {
      state.futuresList = allContracts;
      state.futuresFromMoex = true;
      const shareSecs = instruments.filter((i) => i.market === "shares").map((i) => i.sec);
      fillSecSelect({ preserveSecs: [...shareSecs, ...expanded] });
      updateSecHint();
    }
    const shares = instruments.filter((i) => i.market === "shares");
    return [...shares, ...expanded.map((sec) => ({ sec, market: "futures" }))];
  }

  /** Подпрограмма `initInstrumentLists`. */
  function initInstrumentLists() {
    reloadShareList();
    reloadFuturesList();
  }

  /** Форматирование для отображения: `formatBySec`. */
  function formatBySec(bySec, limit = 40) {
    const entries = Object.entries(bySec).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const shown = entries.slice(0, limit).map(([k, v]) => `${k}:${fmt(v)}`).join(" · ");
    const rest = entries.length - limit;
    return rest > 0 ? `${shown} · …ещё ${rest}` : shown;
  }

  // === Выбор логики (calc-logic, множественный) ===

  const DEFAULT_LOGIC_LINE_KEYS = [
    "RND", "TBC", "UT", "UCT", "L5", "L1", "L2", "L3", "L4", "CML", "CMS",
    "sma_below", "sma_above", "sma_corridor_trend", "sma_corridor_anti",
    "OB_SMA", "OB_ONLY"
  ];

  /** CM (long+short) → CML + CMS в каталоге; старый ключ CM скрываем. */
  function migrateCmLogicKeys() {
    if (!Array.isArray(state.hiddenLogicKeys)) state.hiddenLogicKeys = [];
    const hidden = new Set(state.hiddenLogicKeys);
    if (!hidden.has("CM")) {
      state.hiddenLogicKeys.push("CM");
      hidden.add("CM");
    }
    if (!Array.isArray(state.logicLineKeys)) return;
    const cmIdx = state.logicLineKeys.indexOf("CM");
    if (cmIdx < 0) return;
    const insert = [];
    if (!state.logicLineKeys.includes("CML")) insert.push("CML");
    if (!state.logicLineKeys.includes("CMS")) insert.push("CMS");
    state.logicLineKeys.splice(cmIdx, 1, ...insert);
    if (state.customLines?.CM && E.DEFAULT_LOGIC_LINES) {
      if (!state.customLines.CML && E.DEFAULT_LOGIC_LINES.CML) {
        state.customLines.CML = E.DEFAULT_LOGIC_LINES.CML;
      }
      if (!state.customLines.CMS && E.DEFAULT_LOGIC_LINES.CMS) {
        state.customLines.CMS = E.DEFAULT_LOGIC_LINES.CMS;
      }
    }
  }

  /** Подпись логики в списке выбора. */
  function logicDisplayName(id) {
    if (state.logicLabels?.[id]) return state.logicLabels[id];
    const meta = E.BUILTIN_META.find((m) => m.id === id || m.key === id);
    if (meta?.name) return meta.name;
    return id;
  }

  /** Текст справки по встроенной или пользовательской логике. */
  function logicHelpText(key) {
    const line = state.customLines?.[key] ?? E.DEFAULT_LOGIC_LINES?.[key] ?? "";
    const auto = explainLogicLineShort(line);
    const meta = E.BUILTIN_META.find((m) => m.id === key || m.key === key);
    if (meta?.helpText) return meta.helpText + (auto ? `\n\n---\n\nКратко по формулам в строке:\n${auto}` : "");
    const note = line.match(/Note\(([^)]*)\)/)?.[1];
    if (note) {
      return [
        "Пользовательская логика.",
        "",
        `Метка Note: ${note}`,
        "",
        "Встроенная расшифровка формул не задана — смотрите строку Op/Cl и раздел «Справка» калькулятора.",
        ...(auto ? ["", "---", "", "Кратко по формулам в строке:", auto] : [])
      ].join("\n");
    }
    return [
      "Пользовательская или изменённая логика. Встроенное описание формул не задано — смотрите строку Op/Cl и раздел «Справка» калькулятора.",
      ...(auto ? ["", "---", "", "Кратко по формулам в строке:", auto] : [])
    ].join("\n");
  }

  function explainLogicLineShort(line) {
    const src = String(line || "");
    if (!src.trim()) return "";
    const seen = new Set();
    const out = [];
    // KIND(params)(signal) — простой парсер для кратких подсказок в help (не заменяет AST).
    const re = /([A-Za-z][A-Za-z0-9_.]*)\(([^()]*)\)\(([^()]*)\)/g;
    let m;
    while ((m = re.exec(src))) {
      const kind = m[1];
      const params = m[2];
      const signal = m[3];
      const key = `${kind}(${params})(${signal})`;
      if (seen.has(key)) continue;
      seen.add(key);
      const hint = atomHint(kind, params, signal);
      if (hint) out.push(`- ${key} — ${hint}`);
    }
    return out.join("\n");
  }

  function atomHint(kind, params, signal) {
    const k = String(kind || "");
    const s = String(signal || "");
    const p = String(params || "");
    if (k === "SMA") {
      if (s === "Ab") return "цена выше SMA";
      if (s === "Bl") return "цена ниже SMA";
      if (s === "Up") return "SMA растёт";
      if (s === "Dn") return "SMA падает";
      return "сигнал относительно SMA";
    }
    if (k === "CMA") {
      if (s === "Ab") return "цена выше CMA";
      if (s === "Bl") return "цена ниже CMA";
      return "сигнал относительно CMA";
    }
    if (k === "LinReg") {
      if (s === "AbUp") return "цена/канал в верхней зоне, тренд вверх";
      if (s === "BlLo") return "цена/канал в нижней зоне, тренд вниз";
      if (s === "AbLinK") return "выше верхней границы канала (центр + K×ATR)";
      if (s === "BlLinK") return "ниже нижней границы канала (центр − K×ATR)";
      if (s === "AbRegK") return "выше верхней границы дрейфующего канала";
      if (s === "BlRegK") return "ниже нижней границы дрейфующего канала";
      return "сигнал по линейной регрессии/каналу";
    }
    if (k === "ATR") {
      if (s === "GrOk") return "волатильность/ATR растёт (есть движение)";
      return "условие по ATR";
    }
    if (k === "Stoch" || k === "TotStoch") {
      const name = k === "TotStoch" ? "TotStoch" : "Stoch";
      if (/K<=\s*10/.test(s) || /K<=\s*20/.test(s)) return `${name}: перепроданность (низкие K)`;
      if (/K>=\s*90/.test(s) || /K>=\s*80/.test(s)) return `${name}: перекупленность (высокие K)`;
      return `${name}: условие по K/D`;
    }
    if (k === "CCI") {
      if (/>=\s*100/.test(s)) return "CCI в сильной зоне тренда вверх";
      if (/<=\s*-100/.test(s)) return "CCI в сильной зоне тренда вниз";
      return "условие по CCI";
    }
    if (k === "MACD") {
      if (s === "Macd>Sig") return "MACD выше сигнальной";
      if (s === "Macd<Sig") return "MACD ниже сигнальной";
      return "условие по MACD";
    }
    if (k === "Momentum") {
      if (/>\s*0/.test(s)) return "импульс положительный";
      if (/<\s*0/.test(s)) return "импульс отрицательный";
      return "условие по Momentum";
    }
    if (k === "VWAP") {
      if (s === "Ab") return "цена выше VWAP";
      if (s === "Bl") return "цена ниже VWAP";
      return "условие по VWAP";
    }
    if (k === "Bollinger") {
      if (s === "AbUp") return "пробой/нахождение в верхней зоне Боллинджера";
      if (s === "BlLo") return "пробой/нахождение в нижней зоне Боллинджера";
      return "условие по Боллинджеру";
    }
    if (k === "Rand") {
      if (s === "IsOk") return "случайный сигнал с вероятностью P";
      return "случайный сигнал";
    }
    if (k === "OB.Imb") {
      if (/BuyOk/.test(s)) return "дисбаланс bid/ask в пользу покупок";
      if (/SellOk/.test(s)) return "дисбаланс bid/ask в пользу продаж";
      return "дисбаланс стакана (imbalance)";
    }
    if (k === "OB.Spr") {
      if (s === "Tight") return "спред достаточно узкий (<= Max)";
      return "условие по спреду стакана";
    }
    if (k === "OB.Depth") {
      if (s === "Liquid") return "достаточная ликвидность на глубине D (>= Min)";
      return "условие по глубине/ликвидности стакана";
    }
    return "";
  }

  /** Показать диалог с расшифровкой логики. */
  function showLogicHelp(key) {
    const dlg = $("logic-help-dialog");
    if (!dlg) return;
    const title = logicDisplayName(key);
    const titleEl = dlg.querySelector(".logic-help-title");
    const bodyEl = dlg.querySelector(".logic-help-body");
    if (titleEl) titleEl.textContent = `${key} — ${title}`;
    if (bodyEl) bodyEl.textContent = logicHelpText(key);
    if (typeof dlg.showModal === "function") dlg.showModal();
  }

  /** Ключи каталога: дефолтные L/SMA + пользовательские U*; скрытые (hiddenLogicKeys) не показываются. */
  function ensureLogicLineKeys() {
    if (!Array.isArray(state.hiddenLogicKeys)) state.hiddenLogicKeys = [];
    const hidden = new Set(state.hiddenLogicKeys);
    migrateCmLogicKeys();
    if (!Array.isArray(state.logicLineKeys) || !state.logicLineKeys.length) {
      state.logicLineKeys = DEFAULT_LOGIC_LINE_KEYS.filter((k) => !hidden.has(k));
    }
    state.logicLineKeys = state.logicLineKeys.filter((k) => !hidden.has(k));
    const seen = new Set(state.logicLineKeys);
    for (const k of DEFAULT_LOGIC_LINE_KEYS) {
      if (!seen.has(k) && !hidden.has(k)) {
        state.logicLineKeys.push(k);
        seen.add(k);
      }
    }
    for (const k of Object.keys(state.customLines || {})) {
      if (!seen.has(k) && !hidden.has(k)) {
        state.logicLineKeys.push(k);
        seen.add(k);
      }
    }
    normalizeLogicLineKeyOrder();
  }

  /** Порядок ключей каталога: встроенные — как DEFAULT_LOGIC_LINE_KEYS, затем пользовательские U*. */
  function normalizeLogicLineKeyOrder() {
    const hidden = hiddenLogicKeySet();
    const set = new Set(state.logicLineKeys.filter((k) => !hidden.has(k)));
    const ordered = DEFAULT_LOGIC_LINE_KEYS.filter((k) => set.has(k));
    for (const k of state.logicLineKeys) {
      if (!ordered.includes(k) && !hidden.has(k)) ordered.push(k);
    }
    state.logicLineKeys = ordered;
  }

  /** Ленивая инициализация/проверка: `ensureDefaultLogicLines`. */
  function ensureDefaultLogicLines() {
    const hidden = hiddenLogicKeySet();
    for (const k of DEFAULT_LOGIC_LINE_KEYS) {
      if (hidden.has(k)) continue;
      if (state.customLines[k] == null && E.DEFAULT_LOGIC_LINES[k] != null) {
        state.customLines[k] = E.DEFAULT_LOGIC_LINES[k];
      }
    }
    for (const k of ["sma_below", "sma_above", "sma_corridor_trend", "sma_corridor_anti"]) {
      if (hidden.has(k)) continue;
      const line = state.customLines[k];
      if (line && /SmaSpread|SmaCorridor/i.test(line) && E.DEFAULT_LOGIC_LINES[k]) {
        state.customLines[k] = E.DEFAULT_LOGIC_LINES[k];
      }
      if (line && /\bSMA\s*\(\s*3\s*[;)]/i.test(line) && E.DEFAULT_LOGIC_LINES[k]) {
        state.customLines[k] = E.DEFAULT_LOGIC_LINES[k];
      }
    }
  }

  /** Логика FINRESP: `logicLineText`. */
  function logicLineText(logicId) {
    return state.customLines?.[logicId] ?? E.DEFAULT_LOGIC_LINES?.[logicId] ?? "";
  }

  /** Нормализация входных данных: `normalizeLogicKey`. */
  function normalizeLogicKey(raw) {
    const s = String(raw || "").trim().replace(/\s+/g, "_");
    if (!s) return "";
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(s)) return "";
    return s;
  }

  /** Подпрограмма `allocNextUserLogicKey`. */
  function allocNextUserLogicKey() {
    let n = 1;
    while (state.logicLineKeys.includes(`U${n}`) || state.customLines[`U${n}`]) n += 1;
    return `U${n}`;
  }

  /** Подпрограмма `selectLogicInCalc`. */
  function selectLogicInCalc(key) {
    const sel = $("calc-logic");
    if (!sel || !key) return;
    let found = false;
    for (const o of sel.options) {
      if (o.value === key) {
        o.selected = true;
        found = true;
      }
    }
    if (found) syncLogicSelectedHint();
  }

  /** Добавление: `addUserLogicLine`. */
  function addUserLogicLine(lineText, srcKey) {
    readLogicEditor();
    const key = allocNextUserLogicKey();
    const template = srcKey
      ? (state.customLines[srcKey] || "")
      : (state.customLines.L5 || E.DEFAULT_LOGIC_LINES.L5 || "");
    state.customLines[key] = String(lineText ?? "").trim() ? String(lineText) : template;
    if (srcKey) {
      state.logicLabels[key] = `${logicDisplayName(srcKey)} (копия)`;
    } else {
      state.logicLabels[key] = key;
    }
    state.logicLineKeys.push(key);
    fillLogicEditor();
    fillLogicSelect();
    selectLogicInCalc(key);
    saveConfig();
    invalidateFormChange();
    const panel = $("logic-catalog-panel");
    if (panel && !panel.open) panel.open = true;
    syncCollapsibleToggleLabel(panel, "logic-catalog-toggle");
    panel?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const ta = document.querySelector(`#logic-lines textarea[data-key="${key}"]`);
    if (ta) {
      try { ta.focus(); } catch (_) { /* ignore */ }
    }
  }

  /** Подпрограмма `promptAddLogicLine`. */
  function promptAddLogicLine() {
    const line = window.prompt(
      "Строка логики Op/Cl для новой записи.\nМожно вставить сразу или оставить пусто — отредактируете в блоке «Логики» (шаблон — L5).",
      ""
    );
    if (line === null) return;
    addUserLogicLine(line, null);
  }

  /** Копирование: `copyLogicLine`. */
  function copyLogicLine(srcKey) {
    if (!srcKey) return;
    readLogicEditor();
    addUserLogicLine(state.customLines[srcKey] || "", srcKey);
  }

  /** Удалить логику из каталога, выбора и equity; в каталоге должна остаться ≥1 логика. */
  function deleteLogicLine(key) {
    if (!key) return;
    ensureLogicLineKeys();
    if (state.logicLineKeys.length <= 1) {
      setCalcStatus("Нельзя удалить последнюю логику в каталоге.");
      return;
    }
    const name = logicDisplayName(key);
    if (!window.confirm(`Удалить логику «${name}» (${key})?\n\nОна исчезнет из списка выбора, редактора и equity.`)) {
      return;
    }
    readLogicEditor();
    if (!Array.isArray(state.hiddenLogicKeys)) state.hiddenLogicKeys = [];
    if (!state.hiddenLogicKeys.includes(key)) state.hiddenLogicKeys.push(key);
    state.logicLineKeys = state.logicLineKeys.filter((k) => k !== key);
    purgeHiddenLogicsFromState();
    fillLogicEditor();
    fillLogicSelect();
    saveConfig();
    invalidateFormChange();
    updatePositionSlHint();
    setCalcStatus(`Логика «${name}» удалена из каталога.`);
  }

  const LOGIC_CATALOG_FORMAT = "multilogic-finresp-logic-catalog-v1";

  /** Скачать JSON-файл из объекта. */
  function downloadJsonFile(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const CALC_PROTOCOL_FORMAT = "multilogic-finresp-trade-protocol-v1";

  function protocolNowIso() {
    try { return new Date().toISOString(); }
    catch { return String(Date.now()); }
  }

  function normalizeProtocolTicker(p) {
    return String(p?.sec || p?.ticker || p?.symbol || p?.code || "").trim();
  }

  function protocolEventsFromRows(rows) {
    const out = [];
    const list = Array.isArray(rows) ? rows : [];
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      const buy = +r.buy || 0;
      const sell = +r.sell || 0;
      const hasExec = buy !== 0 || sell !== 0;
      const hasMarker = !!(r.tradeIn || r.tradeOut || r.tradeInLogic || r.tradeOutLogic);
      if (!hasExec && !hasMarker) continue;
      out.push({
        idx: i,
        time: r.time,
        price: r.close,
        buy,
        sell,
        pos: r.pos ?? null,
        cash: r.cash ?? null,
        commission: r.commission ?? null,
        // markers (compact, but enough to diff runs)
        tradeIn: r.tradeIn ?? null,
        tradeOut: r.tradeOut ?? null,
        tradeOutSide: r.tradeOutSide ?? null,
        tradeInLogic: r.tradeInLogic ?? null,
        tradeInSignal: r.tradeInSignal ?? null,
        tradeInExpr: r.tradeInExpr ?? null,
        tradeOutLogic: r.tradeOutLogic ?? null,
        tradeOutSignal: r.tradeOutSignal ?? null,
        tradeOutExpr: r.tradeOutExpr ?? null,
        posStop: r.posStop ?? null
      });
    }
    return out;
  }

  function buildCalcTradeProtocol(result) {
    if (!result?.perSec?.length) return null;
    const p = params();
    const sc = stopperConfig();
    const vol = volConfig();
    const spec = resolveCalcLogicSpec(p, indicatorSelection());
    const perSec = (result.perSec || []).map((ps) => {
      const ticker = normalizeProtocolTicker(ps) || "?";
      const rows = ps.rows || [];
      return {
        ticker,
        figi: ps.figi ?? null,
        board: ps.board ?? null,
        finresp: ps.finresp ?? null,
        commission: ps.commission ?? null,
        rowsCount: rows.length,
        events: protocolEventsFromRows(rows)
      };
    });
    const eventsTotal = perSec.reduce((m, x) => m + (x.events?.length || 0), 0);
    return {
      format: CALC_PROTOCOL_FORMAT,
      exportedAt: protocolNowIso(),
      window: { a: result.a ?? null, b: result.b ?? null },
      calc: {
        tf: $("calc-tf")?.value || null,
        periodFrom: $("calc-from")?.value || null,
        periodTill: $("calc-till")?.value || null
      },
      params: p,
      stopper: sc,
      volume: vol,
      logicSpec: spec,
      agg: result.agg || null,
      eventsTotal,
      perSec
    };
  }

  function syncProtocolUi() {
    const proto = state.lastProtocol || null;
    const hintText = proto
      ? `Событий: ${proto.eventsTotal} · формат: ${proto.format}`
      : "Протокол появится после «Рассчитать».";
    if (!bridgeSetResults({
      protocolHintText: hintText,
      protocolDownloadEnabled: !!proto
    })) {
      const btn = $("calc-protocol-download");
      const hint = $("calc-protocol-hint");
      if (btn) {
        btn.setAttribute("aria-disabled", proto ? "false" : "true");
        btn.style.opacity = proto ? "" : ".6";
      }
      if (hint) hint.textContent = hintText;
    }
  }

  function downloadLastProtocol() {
    const proto = state.lastProtocol;
    if (!proto) {
      setCalcStatus("Сначала нажмите «Рассчитать», чтобы появился протокол.");
      return;
    }
    const day = formatDay(todayDate());
    downloadJsonFile(`multilogic_trade_protocol_${day}.json`, proto);
  }

  function loadProtocolFromFileInput(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const data = JSON.parse(text);
        if (!data || typeof data !== "object") throw new Error("not an object");
        state.loadedProtocol = data;
        setCalcStatus(`Загружен протокол: ${data.format || "?"} · событий: ${data.eventsTotal ?? "?"}.`);
      } catch (err) {
        setCalcStatus(`Ошибка протокола JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  /** Payload каталога логик для экспорта (одна или все). */
  function buildLogicCatalogPayload(keys) {
    readLogicEditor();
    ensureLogicLineKeys();
    const list = (keys || state.logicLineKeys).filter(Boolean);
    const logicLines = {};
    const logicLabels = {};
    for (const key of list) {
      logicLines[key] = state.customLines[key] ?? E.DEFAULT_LOGIC_LINES[key] ?? "";
      if (state.logicLabels?.[key]) logicLabels[key] = state.logicLabels[key];
    }
    return {
      format: LOGIC_CATALOG_FORMAT,
      exportedAt: new Date().toISOString(),
      logicLineKeys: list.slice(),
      logicLines,
      logicLabels
    };
  }

  /** Разбор текста/JSON файла логики. */
  function parseLogicImportFileText(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try { return JSON.parse(trimmed); }
      catch (err) { throw new Error(`JSON: ${err.message}`); }
    }
    return { _plain: trimmed };
  }

  /** Из payload файла — строка логики для ключа. */
  function logicLineTextFromImportData(data, targetKey) {
    if (!data) return null;
    if (typeof data === "string") return data;
    if (data._plain) return data._plain;
    if (data.logicLines && typeof data.logicLines === "object") {
      const keys = Array.isArray(data.logicLineKeys) && data.logicLineKeys.length
        ? data.logicLineKeys
        : Object.keys(data.logicLines);
      if (targetKey && data.logicLines[targetKey] != null) return String(data.logicLines[targetKey]);
      const first = keys.find((k) => data.logicLines[k] != null);
      if (first != null) return String(data.logicLines[first]);
    }
    if (data.line != null) return String(data.line);
    return null;
  }

  /** Экспорт одной логики в JSON (тот же формат, что каталог). */
  function exportLogicLine(key) {
    if (!key) return;
    const payload = buildLogicCatalogPayload([key]);
    downloadJsonFile(`multilogic_logic_${key}.json`, payload);
    setCalcStatus(`Логика «${logicDisplayName(key)}» экспортирована в файл.`);
  }

  /** Экспорт всего каталога логик. */
  function exportLogicCatalog() {
    const payload = buildLogicCatalogPayload();
    downloadJsonFile(`multilogic_logic_catalog_${formatDay(todayDate())}.json`, payload);
    setCalcStatus(`Экспортировано ${payload.logicLineKeys.length} логик в файл.`);
  }

  /** Сброс каталога к встроенным логикам (без диалога). */
  function restoreDefaultLogicCatalogCore() {
    readLogicEditor();
    state.hiddenLogicKeys = [];
    state.logicLineKeys = DEFAULT_LOGIC_LINE_KEYS.slice();
    state.logicLabels = {};
    state.customLines = { ...E.DEFAULT_LOGIC_LINES };
    state.logicSelectionCleared = true;
    state.restoredLogicIds = [];
    fillLogicEditor();
    fillLogicSelect();
  }

  /** Значения @@/@, объём, комиссия и индикаторы — как в engine defaults. */
  function applyDefaultParamsToUi() {
    const p = E.DEFAULT_PARAMS;
    const s = E.DEFAULT_STOPPER;
    const v = E.DEFAULT_VOLUME;
    setValueIfExists("param-sl", p.SL);
    setValueIfExists("param-tp", p.TP);
    setValueIfExists("param-atr-sl", p.slTpAtrLen);
    setValueIfExists("param-sma-corridor", p.smaCorridorAtr);
    setValueIfExists("param-cma-len", p.CmaLen);
    setValueIfExists("param-cma-pow", p.CmaPow);
    setValueIfExists("param-lr", p.LR);
    setValueIfExists("param-lin-k", p.LinK);
    setValueIfExists("param-strict", p.Strict);
    if ($("param-reverse")) $("param-reverse").checked = !!(p.ReverseSides ?? p.Reverse);
    setValueIfExists("stopper-sl-mult", s.slMult);
    setValueIfExists("stopper-tp-mult", s.tpMult);
    setValueIfExists("stopper-atr-len", s.atrLen);
    setValueIfExists("stopper-ref", s.refEquity);
    setValueIfExists("vol-type", v.volumeType);
    setValueIfExists("vol-value", v.volume);
    setValueIfExists("vol-deposit", v.deposit);
    setValueIfExists("vol-maxpos", v.maxPositions);
    setValueIfExists("commission-pct", E.DEFAULT_COMMISSION.value);
    if ($("random-price-shift")) $("random-price-shift").checked = false;
    document.querySelectorAll("#indicator-toggles input[type=checkbox]").forEach((el) => {
      el.checked = true;
    });
    initPrefixFields();
    initInstrumentLists();
    syncVolumeFields();
    syncLeverageDisplay();
  }

  /** Кнопка «Установить параметры по умолчанию» (+ опционально логики). */
  function restoreCalcDefaultsInteractive() {
    if (!window.confirm(
      "Установить параметры по умолчанию?\n\n"
      + "@@/@, портфельный Stopper, объём, комиссия, индикаторы и списки MOEX."
    )) {
      return;
    }
    const resetLogics = window.confirm(
      "Также сбросить каталог логик к встроенным?\n\n"
      + "Да — восстановить строки Op/Cl из кода (выбор в списке «Логика» будет сброшен).\n"
      + "Нет — только параметры."
    );
    applyDefaultParamsToUi();
    if (resetLogics) restoreDefaultLogicCatalogCore();
    renderFromParams();
    saveConfig();
    invalidateFormChange();
    updatePositionSlHint();
    syncLogicSelectedHint();
    setCalcStatus(
      resetLogics
      ? "Параметры и каталог логик восстановлены по умолчанию. Выберите логику и нажмите «Рассчитать»."
      : "Параметры установлены по умолчанию. Нажмите «Рассчитать»."
    );
  }

  /** Сброс каталога к встроенным логикам; выбор в списке «Логика» — пустой. */
  function restoreDefaultLogicCatalog() {
    if (!window.confirm(
      "Восстановить встроенные логики из кода?\n\n"
      + "Будут сброшены все правки строк, добавленные и удалённые логики. "
      + "В списке «Логика» ничего не останется выбранным."
    )) {
      return;
    }
    restoreDefaultLogicCatalogCore();
    saveConfig();
    invalidateFormChange();
    updatePositionSlHint();
    setCalcStatus("Каталог логик восстановлен по умолчанию. Выберите логику для расчёта.");
  }

  /** Импорт каталога логик из JSON (замена текущего списка). */
  function importLogicCatalogFromData(data) {
    if (!data || typeof data !== "object") throw new Error("Пустой или неверный файл.");
    if (data._plain) throw new Error("Для импорта каталога нужен JSON (format=multilogic-finresp-logic-catalog-v1).");
    let keys = Array.isArray(data.logicLineKeys) ? data.logicLineKeys.slice() : Object.keys(data.logicLines || {});
    keys = keys.map((k) => String(k || "").trim()).filter(Boolean);
    if (!keys.length) throw new Error("В файле нет логик.");
    const lines = data.logicLines && typeof data.logicLines === "object" ? data.logicLines : {};
    const labels = data.logicLabels && typeof data.logicLabels === "object" ? data.logicLabels : {};
    if (!window.confirm(`Загрузить ${keys.length} логик из файла?\n\nТекущий каталог будет заменён.`)) {
      return;
    }
    readLogicEditor();
    state.logicLineKeys = keys;
    for (const key of keys) {
      state.customLines[key] = String(lines[key] ?? "");
      if (labels[key]) state.logicLabels[key] = String(labels[key]);
      else delete state.logicLabels[key];
      state.hiddenLogicKeys = (state.hiddenLogicKeys || []).filter((h) => h !== key);
    }
    ensureDefaultLogicLines();
    fillLogicEditor();
    fillLogicSelect();
    saveConfig();
    invalidateFormChange();
    updatePositionSlHint();
    setCalcStatus(`Загружено ${keys.length} логик из файла. Нажмите «Применить» или «Рассчитать».`);
  }

  /** Импорт одной строки логики в выбранный ключ каталога. */
  function importLogicLineFromData(data, targetKey) {
    if (!targetKey) return;
    const line = logicLineTextFromImportData(data, targetKey);
    if (line == null || !String(line).trim()) throw new Error("В файле нет строки логики.");
    readLogicEditor();
    state.customLines[targetKey] = String(line).trim();
    fillLogicEditor();
    saveConfig();
    invalidateFormChange();
    setCalcStatus(`Логика «${logicDisplayName(targetKey)}» загружена из файла.`);
  }

  /** Чтение файла логики и импорт (одна или весь каталог). */
  async function importLogicFromFile(file, targetKey) {
    if (!file) return;
    const text = await file.text();
    const data = parseLogicImportFileText(text);
    if (targetKey) importLogicLineFromData(data, targetKey);
    else importLogicCatalogFromData(data);
  }

  /** Функция: id выбранных логик в порядке приоритета (верх списка = первая). */
  function selectedLogicIds() {
    const api = bridgeApi();
    if (api?.getSelectedLogicIds) {
      try {
        return api.getSelectedLogicIds();
      } catch (_) { /* fallback */ }
    }
    return bridgeReadLogicIdsFromDom();
  }

  /** Функция: первая логика в списке (для @OBT, подсказок, live). */
  function primaryLogicId() {
    return selectedLogicIds()[0] || "RND";
  }

  /** Процедура: восстановить selectedOptions из config.logics / config.logic. */
  function applySavedLogicSelection(cfg) {
    const sel = $("calc-logic");
    if (!sel) return;
    const ids = Array.isArray(cfg?.logics)
      ? cfg.logics.filter(Boolean)
      : (cfg?.logic ? [cfg.logic] : []);
    const allowed = new Set([...sel.options].map((o) => o.value));
    const pick = ids.filter((id) => allowed.has(id));
    for (const o of sel.options) {
      o.selected = pick.includes(o.value);
    }
    if (!pick.length) {
      if (Array.isArray(cfg?.logics) && cfg.logics.length === 0) {
        state.logicSelectionCleared = true;
      } else if (sel.options.length) {
        const fallback = allowed.has("RND") ? "RND" : (allowed.has("UT") ? "UT" : (allowed.has("UCT") ? "UCT" : (allowed.has("L5") ? "L5" : sel.options[0].value)));
        for (const o of sel.options) o.selected = o.value === fallback;
        state.logicSelectionCleared = false;
      }
    } else {
      state.logicSelectionCleared = false;
    }
    syncLogicSelectedHint();
  }

  /** Процедура: атрибут size у select — когда панель выбора открыта. */
  function syncLogicSelectSize() {
    const sel = $("calc-logic");
    if (!sel) return;
    const picker = $("calc-logic-picker");
    if (!picker?.classList.contains("calc-logic-picker--open")) return;
    const optN = sel.options.length || 1;
    sel.size = Math.min(12, Math.max(5, Math.min(optN, 9)));
  }

  /** Сворачиваемый выбор логик: клик — развернуть, OK — применить и свернуть. */
  function bindLogicPickerUi() {
    if (bindLogicPickerUi._done) return;
    bindLogicPickerUi._done = true;
    if (bridgeApi()?.setFormCatalog) return;
    const collapsed = $("calc-logic-picker-collapsed");
    const okBtn = $("calc-logic-ok");
    collapsed?.addEventListener("click", () => openLogicPicker());
    collapsed?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        openLogicPicker();
      }
    });
    okBtn?.addEventListener("click", () => closeLogicPicker(true));
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && $("calc-logic-picker")?.classList.contains("calc-logic-picker--open")) {
        closeLogicPicker(false);
      }
    });
  }

  /** Краткая подпись логик для бейджа live-панели. */
  function liveLogicsBadgeShort(ids) {
    if (!ids.length) return "Логики: —";
    if (ids.length === 1) return `Логики: ${ids[0]}`;
    if (ids.length <= 3) return `Логики: ${ids.join(" → ")}`;
    return `Логики: ${ids.slice(0, 2).join(" → ")} +${ids.length - 2}`;
  }

  /** Развёрнутый список логик для бейджа live-панели. */
  function liveLogicsBadgeDetailHtml(ids) {
    if (!ids.length) {
      return '<p class="live-logics-badge-empty">Не выбрано. В блоке «Логика» калькулятора отметьте одну или несколько строк (Ctrl+клик). Порядок сверху вниз — приоритет при live-торговле.</p>';
    }
    const items = ids.map((id, i) => {
      const name = logicDisplayName(id);
      const label = name === id ? `<strong>${id}</strong>` : `<strong>${id}</strong> — ${name}`;
      return `<li class="live-logic-picked-row"><span class="live-logic-picked-label">${label}</span><button type="button" class="live-logic-picked-trash" data-live-remove-logic="${id}" title="Убрать логику из выбора" aria-label="Убрать логику из выбора">🗑</button></li>`;
    }).join("");
    return `<p style="margin:0 0 .25rem;font-weight:600">Выбрано ${ids.length} (порядок приоритета):</p><ol>${items}</ol>`;
  }

  /** Бейдж «Логики» в баннере «Реальная торговля». */
  function syncLiveLogicsBadge() {
    const shortEl = $("live-logics-badge-short");
    const detailEl = $("live-logics-badge-detail");
    if (!shortEl && !detailEl) return;
    const ids = selectedLogicIds();
    const short = liveLogicsBadgeShort(ids);
    if (shortEl) shortEl.textContent = short;
    if (detailEl) detailEl.innerHTML = liveLogicsBadgeDetailHtml(ids);
    const summary = $("live-logics-badge-summary");
    if (summary) summary.title = ids.length
      ? `${short}. Клик — полный список.`
      : "Логики не выбраны. Клик — подсказка.";
  }

  /** Удалить одну логику из текущего выбора (live badge). */
  function removeSelectedLogicId(id) {
    const removeId = String(id || "").trim();
    if (!removeId) return;
    const prev = selectedLogicIds();
    const next = prev.filter((x) => x !== removeId);
    if (next.length === prev.length) return;
    const cleared = next.length === 0;
    state.logicSelectionCleared = cleared;
    if (bridgeApplyLogicSelection(next, cleared)) return;
    const sel = $("calc-logic");
    if (sel) {
      const set = new Set(next);
      [...sel.options].forEach((o) => { o.selected = set.has(o.value); });
    }
    syncLogicSelectedHint();
    saveConfig();
    invalidateFormChange();
  }

  /** Процедура: цветные чипы выбранных логик (свёрнутый вид). */
  function renderLogicSelectedChips() {
    if (bridgeApi()?.setFormCatalog) {
      bridgeApplyLogicSelection(selectedLogicIds(), state.logicSelectionCleared);
      return;
    }
    const chipsEl = $("calc-logic-chips");
    const collapsed = $("calc-logic-picker-collapsed");
    if (!chipsEl) return;
    chipsEl.replaceChildren();
    const ids = selectedLogicIds();
    if (!ids.length) {
      const empty = document.createElement("span");
      empty.className = "calc-logic-chip calc-logic-chip--empty";
      empty.textContent = state.logicSelectionCleared ? "— не выбрано" : "— не выбрано (по умолчанию UT)";
      chipsEl.appendChild(empty);
      if (collapsed) {
        collapsed.setAttribute("aria-label", "Логика не выбрана. Нажмите, чтобы выбрать.");
      }
      return;
    }
    ids.forEach((id, i) => {
      if (i > 0) {
        const arrow = document.createElement("span");
        arrow.className = "calc-logic-chip-arrow";
        arrow.textContent = "→";
        arrow.setAttribute("aria-hidden", "true");
        chipsEl.appendChild(arrow);
      }
      const chip = document.createElement("span");
      const obMeta = logicObMeta(id);
      chip.className = "calc-logic-chip"
        + (obMeta.requiresOrderBook ? " calc-logic-chip--ob" : "")
        + (obMeta.obProfile === "only" ? " calc-logic-chip--ob-only" : "");
      chip.style.setProperty("--logic-color", equityLogicColor(id));
      const ord = document.createElement("span");
      ord.className = "calc-logic-chip-ord";
      ord.textContent = String(i + 1);
      chip.appendChild(ord);
      const key = document.createElement("span");
      key.className = "calc-logic-chip-key";
      key.textContent = id;
      chip.appendChild(key);
      const name = logicDisplayName(id);
      if (name && name !== id) {
        const nameEl = document.createElement("span");
        nameEl.className = "calc-logic-chip-name";
        nameEl.textContent = name;
        chip.appendChild(nameEl);
      }
      chip.title = name !== id ? `${id} — ${name}` : id;
      chipsEl.appendChild(chip);
    });
    if (collapsed) {
      const names = ids.map((id) => logicDisplayName(id));
      const summary = ids.length === 1
        ? names[0]
        : `Выбрано ${ids.length}, порядок: ${names.join(" → ")}`;
      collapsed.setAttribute("aria-label", `${summary}. Нажмите, чтобы изменить.`);
    }
  }

  function openLogicPicker() {
    const picker = $("calc-logic-picker");
    const panel = $("calc-logic-picker-panel");
    const collapsed = $("calc-logic-picker-collapsed");
    const sel = $("calc-logic");
    if (!picker || !panel || picker.classList.contains("calc-logic-picker--open")) return;
    state.logicPickerSnapshot = selectedLogicIds().slice();
    picker.classList.add("calc-logic-picker--open");
    panel.hidden = false;
    collapsed?.setAttribute("aria-expanded", "true");
    syncLogicSelectSize();
    sel?.focus();
  }

  function closeLogicPicker(apply) {
    const picker = $("calc-logic-picker");
    const panel = $("calc-logic-picker-panel");
    const collapsed = $("calc-logic-picker-collapsed");
    const sel = $("calc-logic");
    if (!picker || !panel) return;
    if (!apply && state.logicPickerSnapshot && sel) {
      const snap = new Set(state.logicPickerSnapshot);
      for (const o of sel.options) o.selected = snap.has(o.value);
    }
    if (apply && sel) {
      if ([...sel.selectedOptions].length) state.logicSelectionCleared = false;
      updatePositionSlHint();
      syncLogicSelectedHint();
      invalidateFormChange();
    } else {
      renderLogicSelectedChips();
    }
    state.logicPickerSnapshot = null;
    picker.classList.remove("calc-logic-picker--open");
    panel.hidden = true;
    collapsed?.setAttribute("aria-expanded", "false");
    collapsed?.focus();
  }

  /** Метаданные OB-логики для UI и предупреждений расчёта. */
  function logicObMeta(id) {
    const reg = E.BUILTIN_META.find((m) => m.id === id || m.key === id);
    const line = logicLineText(id);
    const profile = E.analyzeLogicObProfile(line, params());
    const obProfile = reg?.obProfile
      || (profile.obOnly ? "only" : profile.obMixed ? "mixed" : profile.usesOb ? "mixed" : null);
    return {
      obProfile,
      requiresOrderBook: !!reg?.requiresOrderBook || profile.usesOb
    };
  }

  /** Предупреждения при «Рассчитать» для логик со стаканом. */
  function collectObCalcWarnings(logicIds) {
    const blocking = [];
    const notes = [];
    const ids = Array.isArray(logicIds) ? logicIds.filter(Boolean) : [];
    if (!ids.length) return { blocking, notes };
    const profiles = ids.map((id) => ({ id, ...logicObMeta(id) }));
    const allObOnly = profiles.every((p) => p.obProfile === "only");
    for (const p of profiles) {
      const name = logicDisplayName(p.id);
      if (p.obProfile === "only") {
        if (allObOnly) {
          blocking.push(
            allObOnly && ids.length === 1
              ? `Логика «${name}» содержит только сигналы стакана (OB.*). В расчёте FINRESP стакан недоступен — используйте live-режим с T-Bank.`
              : `Выбраны только OB-логики — расчёт FINRESP по стакану невозможен. Используйте live-режим.`
          );
          break;
        }
        notes.push(`«${name}»: в расчёте не участвует (только стакан / live).`);
      } else if (p.obProfile === "mixed") {
        notes.push(`«${name}»: OB-условия в расчёте отключены (работают в live).`);
      }
    }
    return { blocking, notes };
  }

  function syncLogicObHint() {
    const ids = selectedLogicIds();
    const ob = collectObCalcWarnings(ids);
    let hint = "Каталог редактируется в блоке «Логики» ниже (под доп. параметрами).";
    const parts = [];
    if (ob.blocking.length) parts.push(ob.blocking[0]);
    else if (ob.notes.length) parts.push(ob.notes.join(" "));
    const hasObCatalog = state.logicLineKeys.some((k) => logicObMeta(k).requiresOrderBook);
    if (hasObCatalog) parts.push("Логики со стаканом (OB) выделены в списке цветом и курсивом.");
    if (parts.length) hint = parts.join(" ");
    const el = $("calc-logic-hint");
    if (el) el.textContent = hint;
    bridgeSetFormCatalog({ logicHintText: hint });
  }

  /** Процедура: текст «Выбрано N (порядок): …» над списком логик. */
  function syncLogicSelectedHint() {
    renderLogicSelectedChips();
    syncLogicSelectSize();
    syncLiveLogicsBadge();
    syncLogicObHint();
  }

  /** Функция: spec для расчёта — одна логика или multi_logic (engine.resolveLogicSpecStack). */
  function resolveCalcLogicSpec(p, indicators) {
    return E.resolveLogicSpecStack(selectedLogicIds(), state.customLines, p, indicators);
  }

  /** Процедура: заполнить #calc-logic из каталога логик. */
  function fillLogicSelect() {
    ensureLogicLineKeys();
    ensureDefaultLogicLines();
    const sel = $("calc-logic");
    const prev = selectedLogicIds();
    sel.innerHTML = "";
    for (const key of state.logicLineKeys) {
      const o = document.createElement("option");
      const obMeta = logicObMeta(key);
      o.value = key;
      o.textContent = logicDisplayName(key);
      if (obMeta.requiresOrderBook) {
        o.className = obMeta.obProfile === "only" ? "calc-logic-opt--ob-only" : "calc-logic-opt--ob";
      }
      sel.appendChild(o);
    }
    bridgeSetFormCatalog({
      logicOptions: state.logicLineKeys.map((key) => {
        const obMeta = logicObMeta(key);
        return {
          id: key,
          name: logicDisplayName(key),
          color: equityLogicColor(key),
          obProfile: obMeta.obProfile,
          requiresOrderBook: obMeta.requiresOrderBook
        };
      })
    });
    const allowed = new Set([...sel.options].map((o) => o.value));
    const pick = prev.filter((id) => allowed.has(id));
    for (const o of sel.options) {
      o.selected = pick.includes(o.value);
    }
    if (state.restoredLogicIds != null) {
      applySavedLogicSelection({ logics: state.restoredLogicIds });
      state.restoredLogicIds = null;
    } else if (state.logicSelectionCleared) {
      for (const o of sel.options) o.selected = false;
    } else if (!pick.length) {
      const fallback = allowed.has("RND") ? "RND" : (allowed.has("UT") ? "UT" : (allowed.has("UCT") ? "UCT" : (allowed.has("L5") ? "L5" : sel.options[0]?.value)));
      for (const o of sel.options) o.selected = o.value === fallback;
    }
    const domLogicIds = Array.from(sel.selectedOptions).map((o) => o.value);
    bridgeApplyLogicSelection(domLogicIds, state.logicSelectionCleared);
    syncLogicSelectedHint();
  }

  /** Подпрограмма `initIndicatorToggles`. */
  function initIndicatorToggles() {
    const box = $("indicator-toggles");
    if (!box) return;
    box.innerHTML = "";
    for (const { key, label } of INDICATOR_OPTIONS) {
      const item = document.createElement("label");
      item.className = "indicator-toggle";
      item.innerHTML = `<input type="checkbox" value="${key}" checked> <span>${label}</span>`;
      box.appendChild(item);
    }
  }

  /** Подсветка блока @@ и кнопки реверса. */
  function reverseToggleLabel(on) {
    return on ? "Выключить" : "Включить";
  }

  /** Включение/выключение @@ReverseSides с подтверждением (кнопка и галочка live). */
  async function setReverseInteractive(targetOn, sourceId) {
    const input = $("param-reverse");
    if (!input) return;
    const on = !!input.checked;
    const want = !!targetOn;
    if (want === on) {
      syncReverseUi(sourceId);
      return;
    }
    const liveActive = typeof isLiveTradingSession === "function" && isLiveTradingSession();
    let msg = want
      ? "Включить реверс сторон (Long ↔ Short)?\n\nОн меняет местами сигналы long/short для Op и Cl: Op(Long)↔Op(Short) и Cl(Long)↔Cl(Short). Также меняется логика выхода по Op противоположной стороны.\n\nЭто влияет и на вход, и на выход."
      : "Отключить реверс сторон (Long ↔ Short)?\n\nOp/Cl снова будут интерпретироваться без свопа сторон.";
    if (liveActive) msg += "\n\nВ live-режиме сначала будут закрыты все открытые позиции по рынку, затем переключится реверс.";
    if (!window.confirm(msg)) {
      syncReverseUi(sourceId);
      return;
    }
    if (liveActive && typeof sellAllMarketLive === "function") {
      try {
        await sellAllMarketLive();
      } catch (err) {
        noteTechError(`reverse-toggle sell-all: ${err?.message || err}`);
        syncReverseUi(sourceId);
        return;
      }
    }
    input.checked = want;
    renderFromParams();
    syncReverseUi(sourceId);
    syncReverseSignalsUi();
  }

  /** Включение/выключение @@ReverseSignals с подтверждением (кнопка и галочка live). */
  async function setReverseSignalsInteractive(targetOn, sourceId) {
    const input = $("param-reverse-signals");
    if (!input) return;
    const on = !!input.checked;
    const want = !!targetOn;
    if (want === on) {
      syncReverseSignalsUi(sourceId);
      return;
    }
    const liveActive = typeof isLiveTradingSession === "function" && isLiveTradingSession();
    let msg = want
      ? "Включить реверс сигналов?\n\nОн инвертирует условия в строках логики: Ab↔Bl, AbUp↔BlLo, AbLinK↔BlLinK, AbRegK↔BlRegK, а также сравнения K/CCI/MOM: >=↔<= и >↔<=.\n\nВлияет и на вход (Op), и на выход (Cl)."
      : "Отключить реверс сигналов?\n\nУсловия в строках логики будут интерпретироваться без инверсии.";
    if (liveActive) msg += "\n\nВ live-режиме сначала будут закрыты все открытые позиции по рынку, затем переключится реверс.";
    if (!window.confirm(msg)) {
      syncReverseSignalsUi(sourceId);
      return;
    }
    if (liveActive && typeof sellAllMarketLive === "function") {
      try {
        await sellAllMarketLive();
      } catch (err) {
        noteTechError(`reverse-signals-toggle sell-all: ${err?.message || err}`);
        syncReverseSignalsUi(sourceId);
        return;
      }
    }
    input.checked = want;
    renderFromParams();
    syncReverseUi();
    syncReverseSignalsUi(sourceId);
    saveConfig();
  }

  /** Переключатель @@ReverseSides в блоке параметров. */
  function toggleReverseInteractive() {
    const on = !!$("param-reverse")?.checked;
    void setReverseInteractive(!on, "param-reverse-toggle");
  }

  function syncReverseUi(skipSource) {
    const on = !!$("param-reverse")?.checked;
    const globalBlock = $("calc-at-global");
    const root = $("calc-at-params");
    const btn = $("param-reverse-toggle");
    const labelEl = btn?.querySelector(".calc-reverse-toggle-label");
    if (globalBlock) globalBlock.classList.toggle("calc-at-global--reverse", on);
    if (root) root.classList.toggle("calc-at-params--reverse", on);
    if (btn) {
      btn.classList.toggle("calc-reverse-toggle-btn--on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      if (labelEl) labelEl.textContent = reverseToggleLabel(on);
    }
    const panel = $("live-reverse-panel");
    if (panel && skipSource !== "live-reverse-panel" && panel.checked !== on) {
      panel.checked = on;
    }
    const panelWrap = $("live-reverse-panel-wrap");
    if (panelWrap) panelWrap.classList.toggle("live-reverse-panel-toggle--on", on);
    const badge = $("calc-reverse-badge");
    if (badge) badge.hidden = true;
  }

  function syncReverseSignalsUi(skipSource) {
    const on = !!$("param-reverse-signals")?.checked;
    const btn = $("param-reverse-signals-toggle");
    const labelEl = btn?.querySelector(".calc-reverse-toggle-label");
    if (btn) {
      btn.classList.toggle("calc-reverse-toggle-btn--on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      if (labelEl) labelEl.textContent = reverseToggleLabel(on);
    }
    const panel = $("live-reverse-signals-panel");
    if (panel && skipSource !== "live-reverse-signals-panel" && panel.checked !== on) {
      panel.checked = on;
    }
    const panelWrap = $("live-reverse-signals-panel-wrap");
    if (panelWrap) panelWrap.classList.toggle("live-reverse-panel-toggle--on", on);
    // Предупреждение: оба реверса одновременно — очень легко «перевернуть» смысл стратегии.
    const both = on && !!$("param-reverse")?.checked;
    if (on) {
      const base = "Реверс сигналов включён: Ab↔Bl, AbUp↔BlLo, AbLinK↔BlLinK, AbRegK↔BlRegK, K/CCI/MOM: >=↔<= и >↔<=.";
      setCalcStatus(
        both
          ? `${base} ВНИМАНИЕ: одновременно включён реверс сторон (Long↔Short) — проверьте смысл стратегии Op/Cl.`
          : base
      );
    }
  }

  function toggleReverseSignals() {
    const input = $("param-reverse-signals");
    if (!input) return;
    void setReverseSignalsInteractive(!input.checked, "param-reverse-signals-toggle");
  }

  function syncAutoReversesUi(skipSource) {
    const on = !!$("param-auto-reverses")?.checked;
    const lookback = $("param-auto-reverses-lookback")?.value ?? "220";
    const step = $("param-auto-reverses-step")?.value ?? "30";
    const panel = $("live-auto-reverses-panel");
    if (panel && skipSource !== "live-auto-reverses-panel" && panel.checked !== on) {
      panel.checked = on;
    }
    const panelWrap = $("live-auto-reverses-panel-wrap");
    if (panelWrap) panelWrap.classList.toggle("live-reverse-panel-toggle--on", on);
    const liveLookback = $("live-auto-reverses-lookback");
    if (liveLookback && skipSource !== "live-auto-reverses-lookback" && liveLookback.value !== lookback) {
      liveLookback.value = lookback;
    }
    const liveStep = $("live-auto-reverses-step");
    if (liveStep && skipSource !== "live-auto-reverses-step" && liveStep.value !== step) {
      liveStep.value = step;
    }
  }

  /** Галочка @@ReverseSides в блоке «Реальная торговля» (= param-reverse). */
  function bindLiveReversePanelUi() {
    const panel = $("live-reverse-panel");
    if (!panel || panel.dataset.reverseBound) return;
    panel.dataset.reverseBound = "1";
    panel.addEventListener("change", () => {
      void setReverseInteractive(panel.checked, "live-reverse-panel");
    });
    syncReverseUi();
  }

  /** Галочка @@ReverseSignals в блоке «Реальная торговля». */
  function bindLiveReverseSignalsPanelUi() {
    const panel = $("live-reverse-signals-panel");
    if (!panel || panel.dataset.reverseBound) return;
    panel.dataset.reverseBound = "1";
    panel.addEventListener("change", () => {
      void setReverseSignalsInteractive(panel.checked, "live-reverse-signals-panel");
    });
    syncReverseSignalsUi();
  }

  /** @@AutoReverses и окно/шаг в блоке «Реальная торговля». */
  function bindLiveAutoReversesPanelUi() {
    const panel = $("live-auto-reverses-panel");
    if (!panel || panel.dataset.autoReversesBound) return;
    panel.dataset.autoReversesBound = "1";
    panel.addEventListener("change", () => {
      const main = $("param-auto-reverses");
      if (main) main.checked = panel.checked;
      syncAutoReversesUi("live-auto-reverses-panel");
      renderFromParams();
      saveConfig();
    });
    const bindNum = (liveId, mainId) => {
      const el = $(liveId);
      if (!el) return;
      const apply = () => {
        const mainEl = $(mainId);
        if (mainEl) mainEl.value = el.value;
        syncAutoReversesUi(liveId);
        renderFromParams();
        saveConfig();
      };
      el.addEventListener("change", apply);
      el.addEventListener("input", apply);
    };
    bindNum("live-auto-reverses-lookback", "param-auto-reverses-lookback");
    bindNum("live-auto-reverses-step", "param-auto-reverses-step");
    $("param-auto-reverses")?.addEventListener("change", () => syncAutoReversesUi());
    $("param-auto-reverses-lookback")?.addEventListener("change", () => syncAutoReversesUi());
    $("param-auto-reverses-step")?.addEventListener("change", () => syncAutoReversesUi());
    syncAutoReversesUi();
  }

  /** Иконка ⚡ и подсказки на кнопках оптимизации. */
  function initOptButtonIcons() {
    for (const { kind, btnId } of OPT_BUTTONS) {
      const btn = $(btnId);
      if (!btn) continue;
      btn.classList.add("calc-opt-btn-icon");
      if (!state.optim.active) {
        const meta = optimMeta(kind);
        btn.textContent = OPT_BTN_ICON;
        btn.title = `Оптимизировать ${meta?.label || kind}`;
        btn.setAttribute("aria-label", btn.title);
      }
    }
  }

  /** Сводка подстановок @ / @@. */
  function updateAtParamsSummary() {
    const globalEl = $("calc-at-summary-global");
    const logicEl = $("calc-at-summary");
    const reverse = $("param-reverse")?.checked ? "вкл" : "выкл";
    const reverseSignals = $("param-reverse-signals")?.checked ? "вкл" : "выкл";
    const autoRev = $("param-auto-reverses")?.checked ? "вкл" : "выкл";
    const autoLookback = $("param-auto-reverses-lookback")?.value ?? "—";
    const autoStep = $("param-auto-reverses-step")?.value ?? "—";
    const maxPos = $("vol-maxpos")?.value ?? "—";
    const lev = calcLeverageAmount();
    const levText = Number.isFinite(lev) && lev > 0 ? fmt(lev, 2) : "—";
    const pSl = $("stopper-sl-mult")?.value ?? "—";
    const pTp = $("stopper-tp-mult")?.value ?? "—";
    const pAtr = $("stopper-atr-len")?.value ?? "—";
    const pRef = $("stopper-ref")?.value ?? "—";
    if (globalEl) {
      globalEl.textContent =
        `@@ReverseSides=${reverse} @@ReverseSignals=${reverseSignals} @@AutoReverses=${autoRev} @@AutoLookback=${autoLookback} @@AutoStep=${autoStep} `
        + `@@MaxPos=${maxPos} плечо=${levText} `
        + `@@SL=${pSl} @@TP=${pTp} @@ATR=${pAtr} база=${pRef} ₽`;
    }
    if (!logicEl) return;
    const sl = $("param-sl")?.value ?? "—";
    const tp = $("param-tp")?.value ?? "—";
    const atr = $("param-atr-sl")?.value ?? "—";
    const sma = $("param-sma-corridor")?.value ?? "—";
    const cmaLen = $("param-cma-len")?.value ?? "—";
    const cmaPow = $("param-cma-pow")?.value ?? "—";
    const lr = $("param-lr")?.value ?? "—";
    const k = $("param-lin-k")?.value ?? "—";
    const strict = $("param-strict")?.value ?? "—";
    logicEl.textContent =
      `@ — если в строке: @SL=${sl} @TP=${tp} ATR=${atr} @SmaCorridor=${sma} @CmaLen=${cmaLen} @CmaPow=${cmaPow} @LR=${lr} @K=${k}×ATR @Strict=${strict}`;
  }

  /** Обновление: `updatePositionSlHint`. */
  function updatePositionSlHint() {
    const el = $("position-sl-hint");
    if (!el) return;
    const ids = selectedLogicIds();
    const line = logicLineText(primaryLogicId());
    let text = "";
    if (ids.length > 1) {
      text = `Выбрано ${ids.length} логик: на вход проверяются по порядку сверху вниз; выход и SL/TP — у логики, открывшей позицию.`;
    } else if (/SMA\s*\([^)]*(?:Spread|Corridor)=/i.test(line)) {
      text = "SMA(…;Spread=…)(Trend|Anti): коридор ±K×ATR вокруг SMA; внутри — без сделок. K в строке (напр. 1ATR) или @SmaCorridor из поля «Коридор SMA».";
    } else if (/CMA\s*\([^)]*Vol/i.test(line)) {
      text = "CMA(…;P=…;Vol)(Ab|Bl): объём ∝ |Close−CMA|; веса (price/Σprice)^@CmaPow, Σвесов=1.";
    } else if (/Op\s*\(\s*Long\s*\(\s*CMA/i.test(line)) {
      text = "CML: long — выше CMA (Ab) и LinReg AbUp; Cl — ниже CMA (Bl) + OnFlip(Close). Нужны CMA и LinReg.";
    } else if (/Op\s*\(\s*Short\s*\(\s*CMA/i.test(line)) {
      text = "CMS: short — ниже CMA (Bl) и LinReg BlLo; Cl — выше CMA (Ab) + OnFlip(Close). Нужны CMA и LinReg.";
    } else if (/SMA\s*\([^)]*Vol/i.test(line)) {
      text = "SMA(…;Vol)(Ab|Bl): объём сделки ∝ |Close−SMA|; Ab — покупка выше SMA, Bl — ниже. SL/TP — @SL / @TP.";
    } else if (line.trim()) {
      text = "Строка Op/Cl: стопы позиции по ATR (@SL / @TP) при открытой позиции.";
    }
    el.textContent = text;
    el.hidden = !text;
  }

  /** Синхронизация UI/state: `syncChartBox`. */
  function syncChartBox(box, html) {
    if (!box) return;
    const content = html ?? "";
    const trimmed = String(content).trim();
    const visible = !!trimmed;
    if (box.id === "calc-chart") {
      bridgeSetCharts({ instrumentVisible: visible });
    } else if (box.id === "calc-chart-equity") {
      bridgeSetCharts({ equityVisible: visible });
    }
    box.innerHTML = content;
    box.hidden = !visible;
  }

  /** Показать контейнер графиков по инструментам (после пошаговой отрисовки в DOM). */
  function showInstrumentChartBox(box) {
    if (!box) return;
    bridgeSetCharts({ instrumentVisible: true });
    box.hidden = false;
  }

  /** Отрисовка элемента live-панели: `renderFromParams`. */
  function renderFromParams() {
    updateAtParamsSummary();
    syncReverseUi();
    syncAutoReversesUi();
    invalidateFormChange({ skipSave: false });
  }

  /** Заполнение select/списка: `fillLogicEditor`. */
  function fillLogicEditor() {
    ensureLogicLineKeys();
    ensureDefaultLogicLines();
    const box = $("logic-lines");
    if (!box) return;
    box.innerHTML = "";
    let cmCatalogHead = false;
    for (const key of state.logicLineKeys) {
      if ((key === "CML" || key === "CMS") && !cmCatalogHead) {
        const sec = document.createElement("p");
        sec.className = "logic-catalog-cm-head";
        sec.textContent = "Стратегия CM (CMA + LinReg) — отдельно лонг и шорт";
        box.appendChild(sec);
        cmCatalogHead = true;
      }
      const wrap = document.createElement("div");
      wrap.className = "logic-line-row"
        + (key === "CML" ? " logic-line-row--cm-long" : "")
        + (key === "CMS" ? " logic-line-row--cm-short" : "");
      const head = document.createElement("div");
      head.className = "logic-line-head";
      const label = document.createElement("label");
      label.htmlFor = `logic-ta-${key}`;
      const title = logicDisplayName(key);
      label.textContent = title === key ? key : `${key} — ${title}`;
      const actions = document.createElement("div");
      actions.className = "logic-line-actions";
      const helpBtn = document.createElement("button");
      helpBtn.type = "button";
      helpBtn.className = "calc-btn calc-btn-secondary logic-line-help-btn";
      helpBtn.dataset.helpLogic = key;
      helpBtn.title = "Расшифровка формул этой логики";
      helpBtn.textContent = "i.";
      helpBtn.setAttribute("aria-label", "Справка по логике");
      actions.appendChild(helpBtn);
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "calc-btn calc-btn-secondary logic-line-copy-btn";
      copyBtn.dataset.copyLogic = key;
      copyBtn.title = "Копировать строку в новую логику";
      copyBtn.textContent = "Копировать в новую";
      actions.appendChild(copyBtn);
      const exportBtn = document.createElement("button");
      exportBtn.type = "button";
      exportBtn.className = "calc-btn calc-btn-secondary logic-line-export-btn";
      exportBtn.dataset.exportLogic = key;
      exportBtn.title = "Сохранить эту логику в JSON-файл";
      exportBtn.textContent = "Экспорт";
      actions.appendChild(exportBtn);
      const importBtn = document.createElement("button");
      importBtn.type = "button";
      importBtn.className = "calc-btn calc-btn-secondary logic-line-import-btn";
      importBtn.dataset.importLogic = key;
      importBtn.title = "Загрузить строку логики из JSON или текстового файла";
      importBtn.textContent = "Импорт";
      actions.appendChild(importBtn);
      const canDelete = state.logicLineKeys.length > 1;
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "calc-btn calc-btn-secondary logic-line-delete-btn";
      delBtn.dataset.deleteLogic = key;
      delBtn.title = canDelete ? "Удалить логику из каталога и equity" : "В каталоге должна остаться хотя бы одна логика";
      delBtn.textContent = "Удалить";
      delBtn.disabled = !canDelete;
      actions.appendChild(delBtn);
      head.appendChild(label);
      head.appendChild(actions);
      const ta = document.createElement("textarea");
      ta.id = `logic-ta-${key}`;
      ta.dataset.key = key;
      ta.value = state.customLines[key] ?? E.DEFAULT_LOGIC_LINES[key] ?? "";
      wrap.appendChild(head);
      wrap.appendChild(ta);
      box.appendChild(wrap);
    }
  }

  /** Чтение из формы/state: `readLogicEditor`. */
  function readLogicEditor() {
    document.querySelectorAll("#logic-lines textarea").forEach((ta) => {
      state.customLines[ta.dataset.key] = ta.value;
    });
    fillLogicSelect();
  }

  /** Применение настроек/результата: `applyEditorParams`. */
  function applyEditorParams() {
    readLogicEditor();
  }

  /** Обновление: `updateCacheHint`. */
  function updateCacheHint(extra) {
    const el = $("cache-hint");
    if (!el) return;
    if (!state.candleCache) {
      el.textContent = extra ? `База цен недоступна · ${extra}` : "База цен недоступна — при расчёте загрузка с MOEX";
      return;
    }
    const s = state.candleCache.stats();
    const storage = s.quota
      ? ` · браузер: ${fmtBytes(s.usage)} / ${fmtBytes(s.quota)}`
      : "";
    const prefix = `IndexedDB ${s.dbName || "MultiLogicFinrespCandlesDB"}`;
    el.textContent = s.entries
      ? `${prefix}: ${s.entries} инстр./ТФ, ${s.bars.toLocaleString("ru-RU")} свечей${storage}${extra ? ` · ${extra}` : ""}`
      : `${prefix}: цен нет${storage}${s.ready ? "" : " · открывается…"}${extra ? ` · ${extra}` : ""}`;
  }

  /** Сохранение: `saveCacheToFile`. */
  async function saveCacheToFile() {
    if (!state.candleCache) return;
    const s = state.candleCache.stats();
    if (!s.entries) {
      setCalcStatus("База цен пуста — нечего сохранять.");
      return;
    }
    setCalcStatus("Подготовка файла базы цен…");
    const json = await state.candleCache.exportJson();
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `multilogic_candles_${formatDay(todayDate())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setCalcStatus(`База цен сохранена в файл (${s.entries} инстр./ТФ, ${s.bars} свечей).`);
  }

  /** Подпрограмма `initCandleCache`. */
  function initCandleCache() {
    state.candleCache = null;
    if (typeof E.createCandleCache !== "function") {
      updateCacheHint("недоступен — загрузка с MOEX");
      return;
    }
    try {
      state.candleCache = E.createCandleCache({
        onStorageError: () => {
          setCalcStatus("База цен: не удалось записать в IndexedDB (квота браузера?). Сохраните в файл или удалите часть цен.");
        }
      });
      updateCacheHint("открывается");
      state.candleCache.load()
        .then(() => {
          updateCacheHint();
          updateTechInfo("candle-db-ready");
        })
        .catch((err) => {
          state.candleCache = null;
          updateCacheHint("ошибка — загрузка с MOEX");
          noteTechError(`candle-db: ${err.message}`);
        });
    } catch (err) {
      state.candleCache = null;
      updateCacheHint("ошибка — загрузка с MOEX");
      console.warn("Candle cache init failed:", err);
    }
  }

  /** Подпрограмма `initDates`. */
  function initDates() {
    initDateInputs();
    const { min, max } = dateBounds();
    let till = addDays(max, -DEFAULT_END_LAG_DAYS);
    if (till < min) till = min;
    let from = addDays(till, -DEFAULT_RANGE_DAYS);
    if (from < min) from = min;
    $("calc-from").value = formatDay(from);
    $("calc-till").value = formatDay(till);
    syncMonthInputFromDates();
    updateDateHint(0);
  }

  /** Подпрограмма `enforceDateRange`. */
  function enforceDateRange(anchor = "till", instrumentCount) {
    const tf = $("calc-tf").value;
    const n = instrumentCount ?? selectedInstrumentCount();
    const { min, max } = dateBounds();
    let from = parseDay($("calc-from").value);
    let till = parseDay($("calc-till").value);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(till.getTime())) {
      initDates();
      return false;
    }
    const beforeFrom = $("calc-from").value;
    const beforeTill = $("calc-till").value;
    if (from > till) { if (anchor === "from") till = from; else from = till; }
    if (till > max) till = max;
    if (from < min) from = min;
    if (from > till) from = till;
    if (n > 0) {
      const maxSpan = maxCalcDays(tf, n);
      let span = Math.round((till - from) / 86400000);
      if (span > maxSpan) {
        if (anchor === "from") till = addDays(from, maxSpan);
        else from = addDays(till, -maxSpan);
      }
      if (till > max) {
        till = max;
        from = addDays(till, -maxSpan);
      }
      if (from < min) {
        from = min;
        till = addDays(from, maxSpan);
        if (till > max) till = max;
      }
      if (from > till) from = till;
    }
    $("calc-from").value = formatDay(from);
    $("calc-till").value = formatDay(till);
    syncMonthInputFromDates();
    updateDateHint(n);
    return $("calc-from").value !== beforeFrom || $("calc-till").value !== beforeTill;
  }

  /** Подпрограмма `relaxDateRangeForInstrumentCount`. */
  function relaxDateRangeForInstrumentCount(n) {
    if (n <= 0) return false;
    const tf = $("calc-tf").value;
    const maxSpan = maxCalcDays(tf, n);
    const { min, max } = dateBounds();
    let from = parseDay($("calc-from").value);
    let till = parseDay($("calc-till").value);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(till.getTime())) return false;
    const span = Math.round((till - from) / 86400000);
    if (span >= maxSpan) return false;
    const beforeFrom = $("calc-from").value;
    const beforeTill = $("calc-till").value;
    if (till > max) till = max;
    from = addDays(till, -maxSpan);
    if (from < min) {
      from = min;
      till = addDays(from, maxSpan);
      if (till > max) till = max;
    }
    if (from > till) from = till;
    $("calc-from").value = formatDay(from);
    $("calc-till").value = formatDay(till);
    syncMonthInputFromDates();
    updateDateHint(n);
    return beforeFrom !== $("calc-from").value || beforeTill !== $("calc-till").value;
  }

  /** Подпрограмма `refPack`. */
  function refPack() {
    if (!state.packs.length) return [];
    return state.packs.reduce(
      (best, p) => ((p?.length || 0) > (best?.length || 0) ? p : best),
      state.packs[0]
    );
  }

  /** Подпрограмма `findIndexByTime`. */
  function findIndexByTime(pack, timeStr) {
    if (!timeStr || timeStr === "—" || !pack?.length) return 0;
    const target = new Date(String(timeStr).replace(" ", "T")).getTime();
    if (!Number.isFinite(target)) return 0;
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < pack.length; i++) {
      if (!pack[i]?.time) continue;
      const diff = Math.abs(new Date(String(pack[i].time).replace(" ", "T")).getTime() - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    return best;
  }

  /** Подпрограмма `findFirstIndexAtOrAfter`. */
  function findFirstIndexAtOrAfter(pack, timeStr) {
    if (!pack?.length || !timeStr) return 0;
    for (let i = 0; i < pack.length; i++) {
      if (pack[i]?.time && pack[i].time >= timeStr) return i;
    }
    return pack.length - 1;
  }

  /** Подпрограмма `findLastIndexAtOrBefore`. */
  function findLastIndexAtOrBefore(pack, timeStr) {
    if (!pack?.length || !timeStr) return 0;
    let idx = 0;
    for (let i = 0; i < pack.length; i++) {
      if (pack[i]?.time && pack[i].time <= timeStr) idx = i;
      else if (pack[i]?.time) break;
    }
    return idx;
  }

  /** Подпрограмма `commonTimeRange`. */
  function commonTimeRange(packs) {
    if (!packs?.length) return null;
    let start = null;
    let end = null;
    for (const pack of packs) {
      if (!pack?.length) continue;
      const s = pack[0].time;
      const e = pack.at(-1).time;
      if (!s || !e) continue;
      if (!start || s > start) start = s;
      if (!end || e < end) end = e;
    }
    if (!start || !end || start > end) return null;
    return { start, end };
  }

  /** MOEX ISS: begin of bar (MSK), not wall clock; calc uses common end (laggiest ticker). */
  function liveMoexBarTimes(packs) {
    const list = packs || [];
    let freshest = null;
    for (const pack of list) {
      const t = pack?.at(-1)?.time;
      if (t && (!freshest || t > freshest)) freshest = t;
    }
    const common = commonTimeRange(list);
    return { calcEnd: common?.end || freshest, freshest };
  }

  /** Форматирование для отображения: `formatMoexBarTime`. */
  function formatMoexBarTime(timeStr) {
    if (!timeStr) return "—";
    return String(timeStr).replace("T", " ").slice(0, 16);
  }

  /** Форматирование для отображения: `formatLiveRefreshClock`. */
  function formatLiveRefreshClock(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return "—";
    }
  }

  /** Сохранение: `saveWindowAnchor`. */
  function saveWindowAnchor() {
    const pack = refPack();
    if (!pack.length) return;
    const a = +$("calc-start").value;
    const b = +$("calc-end").value;
    state.anchorStartTime = pack[a]?.time ?? null;
    state.anchorEndTime = pack[b]?.time ?? null;
    state.hasWindow = state.anchorStartTime != null && state.anchorEndTime != null;
  }

  /** Подпрограмма `clearWindowAnchor`. */
  function clearWindowAnchor() {
    state.anchorStartTime = null;
    state.anchorEndTime = null;
    state.hasWindow = false;
  }

  /** Установка значения: `setSliderBounds`. */
  function setSliderBounds(preserve = false) {
    const pack = refPack();
    const n = pack.length;
    const max = Math.max(0, n - 1);
    const maxBars = currentLimit().maxBars;
    const common = commonTimeRange(state.packs);
    for (const id of ["calc-start", "calc-end"]) {
      $(id).min = 0;
      $(id).max = max;
      $(id).disabled = max < 2;
    }
    if (max < 2) {
      publishWindowBridge();
      return;
    }

    let a;
    let b;
    const preserveWindow = preserve && state.hasWindow;
    if (preserveWindow) {
      a = findIndexByTime(pack, state.anchorStartTime);
      b = findIndexByTime(pack, state.anchorEndTime);
      if (a > b) [a, b] = [b, a];
    } else if (preserve && state.packs.length) {
      a = Math.min(+$("calc-start").value || 0, max);
      b = Math.min(+$("calc-end").value || max, max);
    } else if (common) {
      a = findFirstIndexAtOrAfter(pack, common.start);
      b = findLastIndexAtOrBefore(pack, common.end);
      if (b - a + 1 > maxBars) a = Math.max(a, b - maxBars + 1);
    } else {
      a = Math.max(0, max - maxBars + 1);
      b = max;
    }

    if (common) {
      const minA = findFirstIndexAtOrAfter(pack, common.start);
      const maxB = findLastIndexAtOrBefore(pack, common.end);
      a = Math.max(a, minA);
      b = Math.min(b, maxB);
    }

    if (a > b - 2) a = Math.max(0, b - 2);
    if (b < a + 2) b = Math.min(max, a + 2);
    if (!preserveWindow && b - a + 1 > maxBars) {
      if (state.movedSlider === "start") b = Math.min(max, a + maxBars - 1);
      else a = Math.max(0, b - maxBars + 1);
    }
    if (common) {
      const minA = findFirstIndexAtOrAfter(pack, common.start);
      const maxB = findLastIndexAtOrBefore(pack, common.end);
      a = Math.max(a, minA);
      b = Math.min(b, maxB);
    }
    $("calc-start").value = a;
    $("calc-end").value = b;
    state.anchorStartTime = pack[a]?.time ?? state.anchorStartTime;
    state.anchorEndTime = pack[b]?.time ?? state.anchorEndTime;
    state.hasWindow = true;
    publishWindowBridge();
  }

  /** Нормализация входных данных: `normalizeSliders`. */
  function normalizeSliders() {
    const n = refPack().length;
    let a = +$("calc-start").value;
    let b = +$("calc-end").value;
    if (a > b - 2) a = Math.max(0, b - 2);
    if (b < a + 2) b = Math.min(n - 1, a + 2);
    $("calc-start").value = a;
    $("calc-end").value = b;
    return [a, b];
  }

  /** Подпрограмма `niceTicks`. */
  function niceTicks(lo, hi, count = 5) {
    const range = hi - lo;
    if (!Number.isFinite(range) || range <= 0) return [lo, hi];
    const rough = range / count;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step = mag;
    if (norm <= 1.5) step = mag;
    else if (norm <= 3) step = 2 * mag;
    else if (norm <= 7) step = 5 * mag;
    else step = 10 * mag;
    const start = Math.ceil(lo / step) * step;
    const ticks = [];
    for (let v = start; v <= hi + step * 0.001; v += step) ticks.push(v);
    return ticks.length ? ticks : [lo, hi];
  }

  /** Подпрограмма `axisPrice`. */
  function axisPrice(v) {
    const a = Math.abs(v);
    if (a >= 10000) return v.toFixed(0);
    if (a >= 1000) return v.toFixed(1);
    if (a >= 100) return v.toFixed(2);
    return v.toFixed(3);
  }

  /** Подпрограмма `axisTime`. */
  function axisTime(t) {
    if (!t) return "";
    const s = String(t).replace("T", " ");
    // Equity: показываем год-месяц-день (и время, если есть) чтобы при длинных периодах не терялся год.
    if (s.length >= 16) return s.slice(0, 16);
    return s.slice(0, 10);
  }

  /** Подпрограмма `rowIndexByTime`. */
  function rowIndexByTime(rows, time) {
    if (!rows?.length || !time) return -1;
    const exact = rows.findIndex((r) => r?.time === time);
    if (exact >= 0) return exact;
    let idx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i]?.time) continue;
      if (rows[i].time <= time) idx = i;
      else break;
    }
    return idx;
  }

  /** Подпрограмма `chartStopLines`. */
  function chartStopLines(rows, portfolioEvents) {
    const lines = [];
    rows.forEach((r, idx) => {
      if (r?.posStop === "sl" || r?.posStop === "tp") {
        if (r?.tradeIn || r?.tradeOut) {
          lines.push({ idx, kind: r.posStop, scope: "position" });
        }
      }
    });
    for (const e of portfolioEvents || []) {
      const idx = rowIndexByTime(rows, e.time);
      if (idx >= 0) lines.push({ idx, kind: e.kind, scope: "portfolio" });
    }
    return lines;
  }

  /** Построение структуры данных: `buildStopVLines`. */
  function buildStopVLines(vLines, x, top, bottom) {
    return vLines.map(({ idx, kind, scope, label }) => {
      const xi = x(idx).toFixed(1);
      if (kind === "config") {
        const tip = String(label || "изменение параметров")
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
        return `<g opacity="0.9"><line x1="${xi}" y1="${top}" x2="${xi}" y2="${bottom}" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="6 4"/><title>${tip}</title></g>`;
      }
      if (kind === "order-buy" || kind === "order-sell") {
        const stroke = kind === "order-buy" ? "#2563eb" : "#c2410c";
        const tip = String(label || (kind === "order-buy" ? "Покупка" : "Продажа"))
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
        return `<g opacity="0.92"><line x1="${xi}" y1="${top}" x2="${xi}" y2="${bottom}" stroke="${stroke}" stroke-width="1.8" stroke-dasharray="3 3"/><title>${tip}</title></g>`;
      }
      const stroke = kind === "tp" ? "#16a34a" : "#dc2626";
      const dash = scope === "portfolio" ? "7 4" : "4 3";
      const width = scope === "portfolio" ? 2 : 1.3;
      const op = scope === "portfolio" ? 0.9 : 0.75;
      return `<line x1="${xi}" y1="${top}" x2="${xi}" y2="${bottom}" stroke="${stroke}" stroke-width="${width}" stroke-dasharray="${dash}" opacity="${op}"/>`;
    }).join("");
  }

  /** Свечи инструмента по SEC для обогащения графика. */
  function packForSec(sec) {
    const target = String(sec || "").trim().toUpperCase();
    if (!target) return null;
    const byKey = packsByInstrumentKey(state.packs);
    for (const inst of state.lastInstruments || []) {
      if (String(inst.sec || "").trim().toUpperCase() === target) {
        const pack = byKey.get(instrumentKey(inst));
        if (pack?.length) return pack;
      }
    }
    for (const pack of state.packs || []) {
      if (String(pack[0]?.sec || "").trim().toUpperCase() === target) return pack;
    }
    return null;
  }

  const chartIndicatorCacheByPack = new WeakMap();

  /** Кэш индикаторов по пакету свечей (один раз на инструмент за отрисовку). */
  function indicatorCacheForPack(pack) {
    if (!pack?.length || !E.createIndicatorCache) return null;
    let cache = chartIndicatorCacheByPack.get(pack);
    if (!cache) {
      cache = E.createIndicatorCache(pack);
      chartIndicatorCacheByPack.set(pack, cache);
    }
    return cache;
  }

  /** OHLC + индикаторы всех выбранных логик для строк графика. */
  function enrichChartRowsForDisplay(rows, sec) {
    const pack = packForSec(sec);
    if (!pack?.length || !rows?.length) return rows;
    const cache = indicatorCacheForPack(pack);
    if (!cache) return rows;
    const timeToIdx = new Map(pack.map((c, i) => [c.time, i]));
    const p = params();
    const indicators = indicatorSelection();
    const specs = selectedLogicIds()
      .map((id) => E.resolveLogicSpec(id, state.customLines, p, indicators))
      .filter((s) => s && !s.disabled);
    let prevPos = 0;
    return rows.map((r) => {
      const idx = timeToIdx.get(r.time);
      const posAfter = r?.pos ?? 0;
      const inferred = E.tradeMarkersFromBar
        ? E.tradeMarkersFromBar(prevPos, posAfter, r?.posStop ?? null)
        : {};
      prevPos = posAfter;
      if (idx == null) return { ...r, ...inferred };
      const candle = pack[idx];
      const ind = E.collectChartIndicatorsForSpecs
        ? E.collectChartIndicatorsForSpecs(cache, specs, idx)
        : {};
      return {
        ...r,
        ...inferred,
        open: r.open ?? candle?.open ?? r.close,
        high: r.high ?? candle?.high ?? r.close,
        low: r.low ?? candle?.low ?? r.close,
        ...ind
      };
    });
  }

  /** Диагностика графика по инструменту (raw vs enriched rows). */
  function analyzeChartInstrument(sec, rawRows, enrichedRows) {
    const rows = rawRows || [];
    let rawTradeIn = 0;
    let rawTradeOut = 0;
    for (const r of rows) {
      if (r?.tradeIn) rawTradeIn += 1;
      if (r?.tradeOut) rawTradeOut += 1;
    }
    const enriched = enrichedRows ?? enrichChartRowsForDisplay(rows, sec);
    const sum = (typeof MLInstrumentChart !== "undefined" && MLInstrumentChart.summarizeChartRows)
      ? MLInstrumentChart.summarizeChartRows(enriched)
      : { rows: enriched.length, tradeIn: 0, tradeOut: 0, samples: [] };
    return {
      sec,
      rawTradeIn,
      rawTradeOut,
      ...sum
    };
  }

  /** Построение структуры данных: `buildChartSvg`. */
  function buildChartSvg(rows, finresp, title, compact, vLines, chartDecor) {
    if (!rows?.length) return "";
    const decor = chartDecor || { vLines: vLines || [], modeRegions: [] };
    const stopLines = decor.vLines?.length ? decor.vLines : (vLines || []);
    const w = 820;
    const h = compact ? 210 : 340;
    const left = 68, right = 28, top = compact ? 24 : 28, bottom = 58;
    const plotW = w - left - right;
    const plotH = h - top - bottom;
    const priceKeys = ["close", "sma", "smaUpper", "smaLower", "linregUp", "linregDn", "linregMid", "bollingerUp", "bollingerDn", "bollingerMid", "vwap"];
    let vals = rows.flatMap((r) => priceKeys.map((k) => r?.[k]).filter((v) => v != null));
    if (!vals.length) vals = rows.map((r) => r?.close).filter((v) => v != null);
    if (!vals.length) return "";
    const min = Math.min(...vals), max = Math.max(...vals);
    const pad = Math.max((max - min) * 0.06, 0.01);
    const lo = min - pad, hi = max + pad;
    const x = (i) => left + i * plotW / Math.max(1, rows.length - 1);
    const y = (v) => top + (hi - v) * plotH / (hi - lo);
    const yTicks = niceTicks(lo, hi, 5);
    const xTickCount = Math.min(6, Math.max(2, Math.floor(rows.length / 80)));
    const xTickIdx = Array.from({ length: xTickCount }, (_, k) =>
      Math.round(k * (rows.length - 1) / Math.max(1, xTickCount - 1)));
    const step = Math.max(1, Math.ceil(rows.length / 420));
    const sample = rows.map((_, i) => i).filter((i) => i % step === 0 || i === rows.length - 1);
    const line = (key) => sample.filter((i) => rows[i][key] != null)
      .map((i) => `${x(i).toFixed(1)},${y(rows[i][key]).toFixed(1)}`).join(" ");
    const color = finresp < 0 ? "#b91c1c" : "#047857";
    const closeStroke = compact ? 1.4 : 2;
    const gridH = yTicks.map((v) =>
      `<line x1="${left}" y1="${y(v).toFixed(1)}" x2="${w - right}" y2="${y(v).toFixed(1)}" stroke="#e8edf4" stroke-width="1"/>`).join("");
    const gridV = xTickIdx.map((i) =>
      `<line x1="${x(i).toFixed(1)}" y1="${top}" x2="${x(i).toFixed(1)}" y2="${h - bottom}" stroke="#e8edf4" stroke-width="1"/>`).join("");
    const yLabels = yTicks.map((v) =>
      `<text x="${left - 8}" y="${(y(v) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#64748b" font-family="Consolas,monospace">${axisPrice(v)}</text>`).join("");
    const xLabels = xTickIdx.map((i) =>
      `<text x="${x(i).toFixed(1)}" y="${h - 10}" text-anchor="middle" font-size="9" fill="#64748b" font-family="Consolas,monospace">${axisTime(rows[i]?.time)}</text>`).join("");
    const indLines = [
      rows[0]?.sma != null ? `<polyline fill="none" stroke="#d97706" stroke-width="1" stroke-dasharray="5 4" opacity=".85" points="${line("sma")}"/>` : "",
      rows[0]?.smaUpper != null ? `<polyline fill="none" stroke="#f59e0b" stroke-width=".9" stroke-dasharray="2 4" opacity=".75" points="${line("smaUpper")}"/>` : "",
      rows[0]?.smaLower != null ? `<polyline fill="none" stroke="#f59e0b" stroke-width=".9" stroke-dasharray="2 4" opacity=".75" points="${line("smaLower")}"/>` : "",
      rows[0]?.linregMid != null ? `<polyline fill="none" stroke="#7c3aed" stroke-width="1" opacity=".7" points="${line("linregMid")}"/>` : "",
      rows[0]?.linregUp != null ? `<polyline fill="none" stroke="#a78bfa" stroke-width=".9" stroke-dasharray="3 3" opacity=".65" points="${line("linregUp")}"/>` : "",
      rows[0]?.linregDn != null ? `<polyline fill="none" stroke="#a78bfa" stroke-width=".9" stroke-dasharray="3 3" opacity=".65" points="${line("linregDn")}"/>` : "",
      rows[0]?.bollingerMid != null ? `<polyline fill="none" stroke="#0891b2" stroke-width=".9" opacity=".65" points="${line("bollingerMid")}"/>` : "",
      rows[0]?.bollingerUp != null ? `<polyline fill="none" stroke="#67e8f9" stroke-width=".8" stroke-dasharray="2 3" opacity=".7" points="${line("bollingerUp")}"/>` : "",
      rows[0]?.bollingerDn != null ? `<polyline fill="none" stroke="#67e8f9" stroke-width=".8" stroke-dasharray="2 3" opacity=".7" points="${line("bollingerDn")}"/>` : "",
      rows[0]?.vwap != null ? `<polyline fill="none" stroke="#16a34a" stroke-width="1" stroke-dasharray="7 3" opacity=".7" points="${line("vwap")}"/>` : ""
    ].join("");
    const markers = rows.map((r, i) => {
      if (!r || r.close == null) return "";
      const parts = [];
      if (r.buy > 0) parts.push(`<circle cx="${x(i).toFixed(1)}" cy="${y(r.close).toFixed(1)}" r="3.2" fill="#16a34a" stroke="#fff" stroke-width=".8"/>`);
      if (r.sell > 0) parts.push(`<circle cx="${x(i).toFixed(1)}" cy="${y(r.close).toFixed(1)}" r="3.2" fill="#dc2626" stroke="#fff" stroke-width=".8"/>`);
      return parts.join("");
    }).join("");
    const stopLinesSvg = buildStopVLines(stopLines, x, top, h - bottom);
    const modeBands = buildModeRegionBands(rows, decor.modeRegions, x, top, h - bottom);
    const stopLegend = stopLines.length
      ? " · SL/TP поз. — тонкая · портф. — жирная"
      : "";
    const modeLegend = decor.modeRegions?.length
      ? " · зелёная область — песочница · розовая — реальная торговля"
      : "";
    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}">
<rect width="${w}" height="${h}" fill="#fff"/>
${modeBands}
${gridH}${gridV}
${stopLinesSvg}
<line x1="${left}" y1="${top}" x2="${left}" y2="${h - bottom}" stroke="#94a3b8" stroke-width="1.2"/>
<line x1="${left}" y1="${h - bottom}" x2="${w - right}" y2="${h - bottom}" stroke="#94a3b8" stroke-width="1.2"/>
${yLabels}${xLabels}
<text x="${left - 10}" y="${top - 8}" text-anchor="end" font-size="10" fill="#475569" font-weight="600">Цена, ₽</text>
<text x="${(left + w - right) / 2}" y="${h - 1}" text-anchor="middle" font-size="10" fill="#475569" font-weight="600">Время</text>
${indLines}
<polyline fill="none" stroke="#2563eb" stroke-width="${closeStroke}" points="${line("close")}"/>
${markers}
<text x="${w - right - 4}" y="${top + 12}" text-anchor="end" fill="${color}" font-size="${compact ? 12 : 14}" font-weight="700" font-family="Consolas,monospace">FINRESP ${fmt(finresp)} ₽</text>
<text x="${left + 4}" y="${top + 12}" font-size="9" fill="#64748b">● покупка · ● продажа · синяя — Close${stopLegend}${modeLegend}</text>
</svg>`;
  }

  const LOGIC_EQUITY_COLORS = {
    RND: "#9333ea",
    TBC: "#a16207",
    UT: "#b45309",
    UCT: "#be123c",
    L5: "#047857",
    L1: "#2563eb",
    L2: "#d97706",
    L3: "#7c3aed",
    L4: "#0891b2",
    CML: "#16a34a",
    CMS: "#dc2626",
    sma_below: "#0d9488",
    sma_above: "#ea580c",
    sma_corridor_trend: "#4f46e5",
    sma_corridor_anti: "#db2777",
    OB_SMA: "#0d9488",
    OB_ONLY: "#0369a1"
  };
  const EQUITY_EXTRA_PALETTE = ["#64748b", "#78716c", "#71717a", "#57534e", "#0369a1", "#be123c"];
  const EQUITY_RUN_TYPES = new Set(["logic_line", "sma_spread", "sma_corridor"]);
  const EQUITY_STOPPER_OFF = { useSl: false, useTp: false, slMult: 0, tpMult: 0, atrLen: 14, refEquity: 0 };

  /** Все логики каталога для блока equity, порядок как в «Логика». */
  function equityCatalogLogicKeys() {
    ensureLogicLineKeys();
    return state.logicLineKeys.slice();
  }

  /** Equity-кривые: `equityLogicColor`. */
  function equityLogicColor(key) {
    if (LOGIC_EQUITY_COLORS[key]) return LOGIC_EQUITY_COLORS[key];
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    return EQUITY_EXTRA_PALETTE[Math.abs(h) % EQUITY_EXTRA_PALETTE.length];
  }

  /** Логика FINRESP: `logicEquityLabel`. */
  function logicEquityLabel(key) {
    return logicDisplayName(key);
  }

  /** Ключи логик для симуляции equity — весь каталог (справочные графики ниже). */
  function equitySimLogicKeys() {
    const keys = [];
    const indicators = indicatorSelection();
    const p = params();
    for (const key of equityCatalogLogicKeys()) {
      const spec = E.resolveLogicSpec(key, state.customLines, p, indicators);
      if (!spec || spec.disabled || !EQUITY_RUN_TYPES.has(spec.type)) continue;
      keys.push(key);
    }
    return keys;
  }

  /** Выбранные в «Логика» — справочная сумма @@ и подсветка на графиках. */
  function selectedEquityLogicKeys() {
    const selected = new Set(selectedLogicIds());
    return equitySimLogicKeys().filter((key) => selected.has(key));
  }

  /** Подпрограмма `totalEquityTitle`. */
  function totalEquityTitle(keys) {
    if (!keys.length) return "Общий equity";
    return `Общий equity (${keys.map((key) => key).join(" + ")})`;
  }

  /** Заголовок верхнего equity = FINRESP Σ (стек выбранных логик, портф. Stopper). */
  function finrespEquityTitle() {
    const ids = selectedLogicIds();
    const stack = ids.length ? ids.join(" + ") : "—";
    const sc = stopperConfig();
    const stopperNote = sc.useSl || sc.useTp ? " · с портф. Stopper" : " · портф. Stopper выкл.";
    return `Общий equity = FINRESP Σ (${stack}, стек логик${stopperNote})`;
  }

  /** Заголовок справочной суммы логик без портф. Stopper. */
  function referenceEquityTitle(keys) {
    const stack = keys.length ? keys.join(" + ") : "—";
    return `Справочно: сумма логик по отдельности (${stack}) · без портф. Stopper`;
  }

  /** Строки заголовка на SVG equity (для копирования и отображения). */
  function finrespChartTitleLines() {
    const ids = selectedLogicIds();
    const stack = ids.length ? ids.join(" + ") : "—";
    const sc = stopperConfig();
    const stopper = sc.useSl || sc.useTp ? "портф. Stopper" : "без Stopper";
    return ["FINRESP Σ портфеля", `логики: ${stack} · ${stopper}`];
  }

  function referenceChartTitleLines(keys) {
    const stack = keys.length ? keys.join(" + ") : "—";
    return ["Справочно: сумма логик", `отдельно: ${stack} · без портф. Stopper`];
  }

  function logicChartTitleLines(key, selected) {
    const role = selected ? "в стеке FINRESP" : "справочно, не в стеке";
    return [`${key} · ${logicEquityLabel(key)}`, role];
  }

  /** Экранирование текста для SVG. */
  function escSvgText(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Equity портфеля из lastResult — совпадает с FINRESP Σ после «Рассчитать». */
  function finrespEquityRowsForChart(a, b, times) {
    const lr = state.lastResult;
    if (!lr?.perSec?.length || !times?.length) return null;
    if (!isLiveTradingSession() && (lr.a !== a || lr.b !== b)) return null;
    return E.buildPortfolioEquityRows(lr.perSec, times);
  }

  /** Equity-кривые: `equityConfigFingerprint`. */
  function equityConfigFingerprint() {
    return JSON.stringify({
      logics: selectedLogicIds(),
      indicators: selectedIndicatorKeys().slice().sort(),
      commissionPct: commissionPctValue()
    });
  }

  /** Подпрограмма `describeEquityConfigChange`. */
  function describeEquityConfigChange(prev, next) {
    const parts = [];
    const prevLogics = (prev?.logics || []).join(", ");
    const nextLogics = (next?.logics || []).join(", ");
    if (prevLogics !== nextLogics) {
      parts.push(`логики: ${prevLogics || "—"} → ${nextLogics || "—"}`);
    }
    if (prev?.commissionPct !== next?.commissionPct) {
      parts.push(`комиссия: ${prev?.commissionPct}% → ${next?.commissionPct}%`);
    }
    const prevInd = (prev?.indicators || []).join(",");
    const nextInd = (next?.indicators || []).join(",");
    if (prevInd !== nextInd) parts.push("индикаторы изменены");
    return parts.length ? parts.join("; ") : "изменение параметров";
  }

  /** Подпрограмма `recordEquityConfigMarker`. */
  function recordEquityConfigMarker(time) {
    if (!time) return;
    const fp = equityConfigFingerprint();
    if (fp === state.lastEquityConfigFp) return;
    if (state.lastEquityConfigFp) {
      let label = "изменение параметров";
      try {
        label = describeEquityConfigChange(JSON.parse(state.lastEquityConfigFp), JSON.parse(fp));
      } catch (_) { /* keep default */ }
      const last = state.equityConfigMarkers.at(-1);
      if (!(last?.time === time && last?.label === label)) {
        state.equityConfigMarkers.push({ time, label });
        if (state.equityConfigMarkers.length > 40) state.equityConfigMarkers.shift();
      }
    }
    state.lastEquityConfigFp = fp;
  }

  /** Подпрограмма `configMarkersForRows`. */
  function configMarkersForRows(rows) {
    const byIdx = new Map();
    for (const m of state.equityConfigMarkers || []) {
      const idx = rowIndexByTime(rows, m.time);
      if (idx < 0) continue;
      const prev = byIdx.get(idx);
      byIdx.set(idx, prev ? `${prev}; ${m.label}` : m.label);
    }
    return [...byIdx.entries()].map(([idx, label]) => ({ idx, kind: "config", scope: "config", label }));
  }

  const CALC_TF_LABELS = {
    "1": "1 мин",
    "5": "5 мин",
    "10": "10 мин",
    "15": "15 мин",
    "60": "1 час",
    "24": "1 день"
  };

  const LEGACY_EQUITY_DELTA_TF = {
    "1h": "60",
    "4h": "60",
    "1d": "24",
    "1w": "24",
    "1mo": "24"
  };

  /** Опции таймфрейма — те же, что в #calc-tf. */
  function calcTfSelectOptions() {
    const sel = $("calc-tf");
    if (!sel?.options?.length) {
      return Object.entries(CALC_TF_LABELS).map(([value, label]) => ({ value, label }));
    }
    return Array.from(sel.options).map((o) => ({
      value: o.value,
      label: (o.textContent || "").trim()
    }));
  }

  /** Нормализация сохранённого периода Δ (в т.ч. старые id 1d/1h → минуты calc-tf). */
  function normalizeEquityDeltaTf(v) {
    const s = String(v ?? "").trim();
    if (CALC_TF_LABELS[s]) return s;
    if (LEGACY_EQUITY_DELTA_TF[s]) return LEGACY_EQUITY_DELTA_TF[s];
    const allowed = new Set(calcTfSelectOptions().map((o) => o.value));
    const fallback = $("calc-tf")?.value || "60";
    return allowed.has(fallback) ? fallback : "60";
  }

  /** Выбранный таймфрейм баров Δ под equity (может отличаться от расчётного). */
  function equityDeltaPeriod() {
    const el = $("equity-delta-period");
    if (el?.value) return normalizeEquityDeltaTf(el.value);
    if (state.savedEquityDeltaPeriod != null) {
      return normalizeEquityDeltaTf(state.savedEquityDeltaPeriod);
    }
    const cfg = readSavedConfig();
    if (cfg?.charts?.equityDeltaPeriod) {
      return normalizeEquityDeltaTf(cfg.charts.equityDeltaPeriod);
    }
    return normalizeEquityDeltaTf($("calc-tf")?.value || "60");
  }

  /** Таймфрейм бакетов превращения FINRESP под equity. */
  function equityDeltaTf() {
    return equityDeltaPeriod();
  }

  /** Подпись таймфрейма для превращений FINRESP. */
  function equityDeltaPeriodLabel() {
    const tf = equityDeltaTf();
    return CALC_TF_LABELS[tf] || `${tf} мин`;
  }

  /** Выбор периода Δ над блоком equity (опции = #calc-tf). */
  function equityDeltaPeriodBarHtml() {
    const period = equityDeltaPeriod();
    const opts = calcTfSelectOptions().map((o) =>
      `<option value="${o.value}"${o.value === period ? " selected" : ""}>${o.label}</option>`
    ).join("");
    return `<div class="chart-equity-delta-bar chart-equity-delta-bar--section">
<label for="equity-delta-period">Показывать приращение FINRESP-п ниже графика эквити за</label>
<select id="equity-delta-period" title="Таймфрейм баров Δ (можно отличаться от таймфрейма расчёта)">
${opts}
</select>
</div>`;
  }

  /** Разбор времени свечи equity (МСК, YYYY-MM-DD HH:MM:SS). */
  function parseEquityRowTimeParts(time) {
    const s = String(time || "").trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null;
    return {
      y: +m[1],
      mo: +m[2],
      d: +m[3],
      h: +(m[4] ?? 0),
      mi: +(m[5] ?? 0)
    };
  }

  /** Ключ периода для бакетизации превращения equity (= таймфрейм расчёта). */
  function equityPeriodBucketKey(time, tf) {
    const p = parseEquityRowTimeParts(time);
    if (!p) return String(time || "");
    const pad2 = (n) => String(n).padStart(2, "0");
    const dayKey = `${p.y}-${pad2(p.mo)}-${pad2(p.d)}`;
    if (tf === "24") return dayKey;
    if (tf === "60") return `${dayKey} ${pad2(p.h)}`;
    const tfMin = Math.max(1, +tf || 60);
    const totalMin = p.h * 60 + p.mi;
    const aligned = Math.floor(totalMin / tfMin) * tfMin;
    const ah = Math.floor(aligned / 60);
    const am = aligned % 60;
    return `${dayKey} ${pad2(ah)}:${pad2(am)}`;
  }

  /** Бакеты превращения equity по таймфрейму (абсолютное Δ за период). */
  function buildEquityIncrementBuckets(rows, tf) {
    if (!rows?.length) return [];
    const buckets = [];
    let bucketStart = 0;
    let curKey = equityPeriodBucketKey(rows[0]?.time, tf);
    const flush = (endIdx) => {
      const eqEnd = rows[endIdx]?.eq ?? 0;
      let eqBefore;
      if (bucketStart === endIdx) {
        // Период = один бар (совпадает с ТФ) — Δ к предыдущей свече
        eqBefore = bucketStart > 0 ? (rows[bucketStart - 1]?.eq ?? 0) : 0;
      } else {
        eqBefore = rows[bucketStart]?.eq ?? 0;
      }
      buckets.push({ startIdx: bucketStart, endIdx, value: eqEnd - eqBefore });
    };
    for (let i = 1; i < rows.length; i++) {
      const k = equityPeriodBucketKey(rows[i]?.time, tf);
      if (k !== curKey) {
        flush(i - 1);
        bucketStart = i;
        curKey = k;
      }
    }
    flush(rows.length - 1);
    return buckets;
  }

  /** Низкая полоска баров Δ FINRESP под equity-графиком (шкала от нуля). */
  function buildEquityIncrementBarSvg(rows, tf, compact, inactive) {
    const buckets = buildEquityIncrementBuckets(rows, tf);
    if (!buckets.length) return "";
    const faded = !!inactive;
    const w = 820;
    const h = compact ? 66 : 76;
    const left = 72;
    const right = 28;
    const top = 12;
    const bottom = 18;
    const plotW = w - left - right;
    const plotH = h - top - bottom;
    const x = (i) => left + i * plotW / Math.max(1, rows.length - 1);
    const barStep = plotW / Math.max(1, rows.length);
    let absMax = 0;
    for (const b of buckets) absMax = Math.max(absMax, Math.abs(b.value));
    if (absMax < 1) absMax = 1;
    const pad = absMax * 0.06;
    const incHi = absMax + pad;
    const incLo = -(absMax + pad);
    const yInc = (v) => top + (incHi - v) * plotH / (incHi - incLo);
    const y0 = yInc(0);
    const posFill = faded ? "#bfdbfe" : "#6ee7a0";
    const posStroke = faded ? "#3b82f6" : "#16a34a";
    const negFill = faded ? "#c7d2fe" : "#fca5a5";
    const negStroke = faded ? "#6366f1" : "#dc2626";
    const barOpacity = faded ? 0.72 : 1;
    const rects = buckets.map((b) => {
      const v = b.value;
      if (v === 0) return "";
      const xL = x(b.startIdx);
      const xR = b.endIdx < rows.length - 1 ? x(b.endIdx + 1) : x(b.endIdx) + barStep * 0.5;
      const barW = Math.max(1.2, xR - xL - 0.3);
      const yVal = yInc(v);
      const yTop = Math.min(y0, yVal);
      const barH = Math.max(0.8, Math.abs(yVal - y0));
      const fill = v > 0 ? posFill : negFill;
      const stroke = v > 0 ? posStroke : negStroke;
      return `<rect x="${xL.toFixed(1)}" y="${yTop.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="0.7" rx="0.5" opacity="${barOpacity}"/>`;
    }).join("");
    const periodLabel = equityDeltaPeriodLabel();
    const hintTone = faded ? "синий — не в торговле" : "зелёный — рост, розовый — просадка";
    const zeroLine = `<line x1="${left}" y1="${y0.toFixed(1)}" x2="${w - right}" y2="${y0.toFixed(1)}" stroke="#cbd5e1" stroke-width="1"/>`;
    const yPosLbl = `<text x="${left - 8}" y="${(yInc(incHi) + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#94a3b8" font-family="Consolas,monospace">${axisPrice(incHi)}</text>`;
    const yNegLbl = `<text x="${left - 8}" y="${(yInc(incLo) + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#94a3b8" font-family="Consolas,monospace">${axisPrice(incLo)}</text>`;
    const yZeroLbl = `<text x="${left - 8}" y="${(y0 + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#64748b" font-family="Consolas,monospace">0</text>`;
    return `<div class="chart-equity-delta-panel${faded ? " chart-equity-delta-panel--inactive" : ""}" role="img" aria-label="Приращение FINRESP-п за ${periodLabel}">
<svg viewBox="0 0 ${w} ${h}" class="chart-equity-delta-svg">
<rect width="${w}" height="${h}" fill="${faded ? "#f8fafc" : "#fafafa"}"/>
${zeroLine}
<line x1="${left}" y1="${top}" x2="${left}" y2="${h - bottom}" stroke="#e2e8f0" stroke-width="1"/>
<line x1="${left}" y1="${h - bottom}" x2="${w - right}" y2="${h - bottom}" stroke="#e2e8f0" stroke-width="1"/>
${yPosLbl}${yNegLbl}${yZeroLbl}
${rects}
<text x="${left + 2}" y="${top - 2}" font-size="8" fill="#6b7280">Превращение FINRESP за ${periodLabel}, ₽ · ${hintTone}</text>
</svg>
</div>`;
  }

  /** Добавить полоску Δ под SVG equity. */
  function appendEquityIncrementPanel(chartHtml, rows, tf, compact, inactive) {
    if (!chartHtml || !rows?.length) return chartHtml;
    const panel = buildEquityIncrementBarSvg(rows, tf, compact !== false, !!inactive);
    return panel ? chartHtml + panel : chartHtml;
  }

  /** Заголовок equity-графика с кнопкой копирования (PNG: кривая + полоска Δ). */
  function equityChartCopyHeaderHtml(titleInner) {
    return `<div class="chart-mini-header">${titleInner}<button type="button" class="ml-chart-copy-btn" data-equity-copy-btn title="Скопировать equity и полоску Δ в буфер обмена (PNG)">Копировать график</button></div>`;
  }

  /** SVG → растр для сборки PNG. */
  async function equitySvgToImage(svg) {
    const vb = svg.viewBox.baseVal;
    const w = vb.width || 820;
    const h = vb.height || 240;
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });
      return { img, w, h };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /** Копирование equity + полоски Δ одного блока в буфер как PNG. */
  async function copyEquityChartBlockToClipboard(block) {
    if (!block) return { ok: false, reason: "no-block" };
    const equitySvg = block.querySelector("svg.chart-equity-main-svg");
    const deltaSvg = block.querySelector("svg.chart-equity-delta-svg");
    if (!equitySvg) return { ok: false, reason: "no-svg" };
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      return { ok: false, reason: "clipboard" };
    }
    const parts = [await equitySvgToImage(equitySvg)];
    if (deltaSvg) parts.push(await equitySvgToImage(deltaSvg));
    const totalW = Math.max(...parts.map((p) => p.w));
    const totalH = parts.reduce((s, p) => s + p.h, 0);
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(totalW * scale);
    canvas.height = Math.round(totalH * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, reason: "canvas" };
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    let y = 0;
    for (const { img, w, h } of parts) {
      ctx.drawImage(img, 0, y, w, h);
      y += h;
    }
    const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!pngBlob) return { ok: false, reason: "png" };
    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
    return { ok: true };
  }

  /** Клик по «Копировать график» у equity-блока. */
  async function onEquityChartCopyClick(btn) {
    const defaultLabel = btn.dataset.defaultLabel || "Копировать график";
    if (!btn.dataset.defaultLabel) btn.dataset.defaultLabel = defaultLabel;
    const block = btn.closest("[data-equity-copy-block]");
    btn.disabled = true;
    let result;
    try {
      result = await copyEquityChartBlockToClipboard(block);
    } catch (err) {
      noteTechError(`equity-chart-copy: ${err?.message || err}`);
      result = { ok: false, reason: "error" };
    }
    btn.disabled = false;
    if (result.ok) {
      btn.textContent = "Скопировано";
      btn.classList.add("ml-chart-copy-btn--ok");
      setTimeout(() => {
        btn.textContent = defaultLabel;
        btn.classList.remove("ml-chart-copy-btn--ok");
      }, 1800);
      return;
    }
    btn.textContent = result.reason === "clipboard" ? "Буфер недоступен" : "Ошибка копирования";
    btn.classList.add("ml-chart-copy-btn--err");
    setTimeout(() => {
      btn.textContent = defaultLabel;
      btn.classList.remove("ml-chart-copy-btn--err");
    }, 2200);
  }

  /** Делегирование кликов «Копировать график» в блоке equity. */
  function bindEquityChartCopyUi() {
    const box = $("calc-chart-equity");
    if (!box || box.dataset.equityCopyBound) return;
    box.dataset.equityCopyBound = "1";
    box.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-equity-copy-btn]");
      if (!btn) return;
      ev.stopPropagation();
      void onEquityChartCopyClick(btn);
    });
  }

  /** Делегирование смены таймфрейма Δ под equity (select пересоздаётся при отрисовке). */
  function bindEquityDeltaPeriodUi() {
    if (bindEquityDeltaPeriodUi._done) return;
    bindEquityDeltaPeriodUi._done = true;
    document.addEventListener("change", (ev) => {
      if (ev.target?.id !== "equity-delta-period") return;
      state.savedEquityDeltaPeriod = ev.target.value;
      saveConfig();
      redrawEquityChartsFromCache();
    });
  }

  /** Перерисовка equity из кэша (смена периода приращения без пересчёта). */
  function redrawEquityChartsFromCache() {
    const ctx = state.lastEquityChartCtx;
    if (!ctx) return;
    renderEquityChartsFromData(ctx.a, ctx.b, ctx.data, ctx.drawOpts);
  }

  /** Построение структуры данных: `buildEquityChartSvg`. */
  function buildEquityChartSvg(rows, finresp, title, compact, strokeColor, chartDecor) {
    if (!rows?.length) return "";
    const decor = chartDecor || { vLines: [], modeRegions: [] };
    const w = 820;
    const titleLines = decor.chartTitleLines?.length
      ? decor.chartTitleLines
      : (decor.chartTitle ? [decor.chartTitle] : []);
    const titleRows = titleLines.length;
    const h = (compact ? 190 : 240) + (titleRows > 1 ? 10 : 0);
    const left = 72;
    const right = 28;
    const top = 26 + (titleRows > 1 ? 6 : 0);
    const bottom = 58;
    const plotW = w - left - right;
    const plotH = h - top - bottom;
    const vals = rows.map((r) => r?.eq).filter((v) => v != null);
    if (!vals.length) return "";
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    const priceChart = !!decor.priceChart;
    if (!priceChart) {
      if (min > 0) min = 0;
      if (max < 0) max = 0;
    }
    const pad = Math.max((max - min) * 0.08, priceChart ? (max - min) * 0.02 || 1 : 1);
    const lo = min - pad;
    const hi = max + pad;
    const x = (i) => left + i * plotW / Math.max(1, rows.length - 1);
    const y = (v) => top + (hi - v) * plotH / (hi - lo);
    const yTicks = niceTicks(lo, hi, 5);
    const xTickCount = Math.min(6, Math.max(2, Math.floor(rows.length / 80)));
    const xTickIdx = Array.from({ length: xTickCount }, (_, k) =>
      Math.round(k * (rows.length - 1) / Math.max(1, xTickCount - 1)));
    const step = Math.max(1, Math.ceil(rows.length / 420));
    const sample = rows.map((_, i) => i).filter((i) => i % step === 0 || i === rows.length - 1);
    const eqLine = sample.map((i) => `${x(i).toFixed(1)},${y(rows[i].eq).toFixed(1)}`).join(" ");
    const faded = !!decor.faded;
    const color = faded ? "#9ca3af" : (strokeColor || (priceChart ? "#0d9488" : (finresp < 0 ? "#b91c1c" : "#047857")));
    const lineOpacity = faded ? 0.55 : 1;
    const pointDot = rows.length === 1
      ? `<circle cx="${x(0).toFixed(1)}" cy="${y(rows[0].eq).toFixed(1)}" r="4" fill="${color}" opacity="${lineOpacity}"/>`
      : "";
    const dashLine = (faded || decor.dashed) ? ' stroke-dasharray="6 4"' : "";
    const gridH = yTicks.map((v) =>
      `<line x1="${left}" y1="${y(v).toFixed(1)}" x2="${w - right}" y2="${y(v).toFixed(1)}" stroke="#e8edf4" stroke-width="1"/>`).join("");
    const gridV = xTickIdx.map((i) =>
      `<line x1="${x(i).toFixed(1)}" y1="${top}" x2="${x(i).toFixed(1)}" y2="${h - bottom}" stroke="#e8edf4" stroke-width="1"/>`).join("");
    const yLabels = yTicks.map((v) =>
      `<text x="${left - 8}" y="${(y(v) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#64748b" font-family="Consolas,monospace">${axisPrice(v)}</text>`).join("");
    const xLabels = xTickIdx.map((i) =>
      `<text x="${x(i).toFixed(1)}" y="${h - 10}" text-anchor="middle" font-size="9" fill="#64748b" font-family="Consolas,monospace">${axisTime(rows[i]?.time)}</text>`).join("");
    const zeroY = !priceChart && lo < 0 && hi > 0 ? y(0).toFixed(1) : null;
    const zeroLine = zeroY
      ? `<line x1="${left}" y1="${zeroY}" x2="${w - right}" y2="${zeroY}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 4" opacity=".7"/>`
      : "";
    const strokeW = decor.strokeW ?? (compact ? 1.8 : 2.2);
    const configLines = buildStopVLines(decor.vLines || [], x, top, h - bottom);
    const modeBands = buildModeRegionBands(rows, decor.modeRegions, x, top, h - bottom);
    const configLegend = (decor.vLines || []).some((l) => l.kind === "config")
      ? " · фиолетовая — смена логик/комиссии/индикаторов"
      : "";
    const modeLegend = decor.modeRegions?.length
      ? " · зелёная область — песочница · розовая — реальная торговля"
      : "";
    const caption = decor.caption ?? (faded
      ? "Справочный equity (логика не участвует в торговле / сумме)"
      : `Equity по выбранным логикам${configLegend}${modeLegend}`);
    const titleFont = compact ? 12 : 14;
    const titleColor = faded ? "#6b7280" : "#111827";
    const titleStartY = 16;
    const titleSvg = titleLines.map((line, i) =>
      `<text x="${left + 4}" y="${titleStartY + i * (titleFont + 3)}" font-size="${titleFont}" font-weight="700" fill="${titleColor}" font-family="Consolas,monospace" opacity="${lineOpacity}">${escSvgText(line)}</text>`
    ).join("");
    const finLabel = priceChart ? `Ср. ${axisPrice(finresp)} ₽` : `FINRESP ${fmt(finresp)} ₽`;
    const finFont = decor.prominentFin ? (compact ? 12 : 14) : (compact ? 11 : 12);
    const finBadgeY = compact ? 17 : 18;
    const estW = Math.max(84, finLabel.length * (finFont * 0.58));
    const boxW = estW + 12;
    const boxX = Math.max(left + 8, w - 8 - boxW);
    const finColor = faded ? "#9ca3af" : (priceChart ? (strokeColor || "#0d9488") : (finresp < 0 ? "#b91c1c" : "#047857"));
    const finBadgeSvg = `<rect x="${boxX.toFixed(1)}" y="4" width="${boxW.toFixed(1)}" height="${compact ? 18 : 20}" rx="4" fill="#ffffff" stroke="${finColor}" stroke-width="1.1" opacity="0.98"/>
<text x="${(w - 8).toFixed(1)}" y="${finBadgeY}" text-anchor="end" fill="${finColor}" font-size="${finFont}" font-weight="700" font-family="Consolas,monospace" opacity="${lineOpacity}">${escSvgText(finLabel)}</text>`;
    const captionY = titleRows > 1 ? top + 6 : top + 10;
    const yAxisLabel = priceChart ? "Ср. цена, ₽" : "Equity, ₽";
    return `<svg viewBox="0 0 ${w} ${h}" class="chart-equity-main-svg" role="img" aria-label="${escSvgText(title)}">
<rect width="${w}" height="${h}" fill="#fff"/>
${modeBands}
${gridH}${gridV}${zeroLine}${configLines}
<line x1="${left}" y1="${top}" x2="${left}" y2="${h - bottom}" stroke="#94a3b8" stroke-width="1.2"/>
<line x1="${left}" y1="${h - bottom}" x2="${w - right}" y2="${h - bottom}" stroke="#94a3b8" stroke-width="1.2"/>
${yLabels}${xLabels}
${titleSvg}
${finBadgeSvg}
<text x="${left - 10}" y="${top - 8}" text-anchor="end" font-size="10" fill="#475569" font-weight="600">${yAxisLabel}</text>
<text x="${(left + w - right) / 2}" y="${h - 1}" text-anchor="middle" font-size="10" fill="#475569" font-weight="600">Время</text>
<polyline fill="none" stroke="${color}" stroke-width="${strokeW}" opacity="${lineOpacity}"${dashLine} points="${eqLine}"/>
${pointDot}
<text x="${left + 4}" y="${captionY}" font-size="9" fill="#64748b">${escSvgText(caption)}</text>
</svg>`;
  }

  /** Пакеты свечей только по инструментам, выбранным в «Акции (фьючерсы)». */
  function packsForSelectedInstruments() {
    const instruments = selectedInstruments();
    if (!instruments.length || !state.packs?.length) return [];
    return orderPacksForInstruments(instruments, packsByInstrumentKey(state.packs));
  }

  /** Close на свече с точным временем (пакеты синхронизированы по time). */
  function closeAtPackTime(pack, timeStr) {
    if (!pack?.length || !timeStr) return null;
    for (let i = 0; i < pack.length; i++) {
      if (pack[i]?.time === timeStr) {
        const c = pack[i].close;
        return Number.isFinite(c) ? c : null;
      }
    }
    return null;
  }

  /** Средняя цена close выбранных в списке инструментов по каждой свече окна ползунков. */
  function buildAvgClosePriceRows(a, b) {
    const packs = packsForSelectedInstruments();
    if (!packs.length || a == null || b == null) return [];
    const ref = packs.reduce(
      (best, p) => ((p?.length || 0) > (best?.length || 0) ? p : best),
      packs[0]
    );
    if (!ref.length) return [];
    const rows = [];
    const end = Math.min(b, ref.length - 1);
    for (let i = a; i <= end; i++) {
      const time = ref[i]?.time;
      if (!time) continue;
      let sum = 0;
      let n = 0;
      for (const pack of packs) {
        const c = closeAtPackTime(pack, time);
        if (c != null) {
          sum += c;
          n += 1;
        }
      }
      if (!n) continue;
      rows.push({ time, eq: sum / n, instCount: n });
    }
    return rows;
  }

  /** HTML блока средней цены рынка (закреплён сверху equity). */
  function buildEquityAvgPriceBlockHtml(ctx) {
    const rows = ctx.avgPriceRows || [];
    if (!rows.length) return "";
    const last = rows.at(-1).eq;
    const nInst = packsForSelectedInstruments().length;
    const decor = {
      priceChart: true,
      strokeW: 2.5,
      chartTitleLines: [`${AVG_PRICE_CHART_TITLE} · ${nInst} выбр.`],
      caption: "Σ close выбранных в списке бумаг / N (простое среднее)"
    };
    const svg = buildEquityChartSvg(
      rows, last, AVG_PRICE_CHART_TITLE, false, "#0d9488", decor
    );
    if (!svg) return "";
    const instNote = rows.at(-1).instCount < nInst
      ? ` На последней свече данных: ${rows.at(-1).instCount}/${nInst} инстр.`
      : "";
    return `<div class="chart-equity-avg-price" data-equity-copy-block>
${equityChartCopyHeaderHtml(`<p class="chart-sec-title">${AVG_PRICE_CHART_TITLE}</p>`)}
<p class="chart-equity-avg-price-hint">По бумагам из списка «Акции (фьючерсы)» выше: 1, 2 или все выбранные — среднее арифметическое close на свече.${instNote}</p>
${svg}
</div>`;
  }

  /** Расчёт: `calcLogicEquityRuns`. */
  function calcLogicEquityRuns(a, b) {
    if (!state.packs.length) return null;
    const pack = refPack();
    if (!pack.length) return null;
    const p = params();
    const vol = volConfig();
    const times = pack.slice(a, b + 1).map((c) => c.time).filter(Boolean);
    if (!times.length) return null;
    const runs = {};
    const indicators = indicatorSelection();
    for (const key of equitySimLogicKeys()) {
      const spec = E.resolveLogicSpec(key, state.customLines, p, indicators);
      if (!spec || spec.disabled || !EQUITY_RUN_TYPES.has(spec.type)) continue;
      const { perSec } = E.runMulti(state.packs, spec, a, b, p, vol, EQUITY_STOPPER_OFF, finrespRunOptions());
      const rows = E.buildPortfolioEquityRows(perSec, times);
      runs[key] = { rows, finresp: rows.length ? rows.at(-1).eq : 0 };
    }
    return { runs, times };
  }

  /** Асинхронный расчёт equity по каталогу логик (с yield между логиками). */
  async function calcLogicEquityRunsAsync(a, b, onProgress) {
    if (!state.packs.length) return null;
    const pack = refPack();
    if (!pack.length) return null;
    const p = params();
    const vol = volConfig();
    const times = pack.slice(a, b + 1).map((c) => c.time).filter(Boolean);
    if (!times.length) return null;
    const keys = equitySimLogicKeys();
    const indicators = indicatorSelection();
    const runs = {};
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (onProgress) onProgress(i, keys.length, key);
      await yieldToUi();
      const spec = E.resolveLogicSpec(key, state.customLines, p, indicators);
      const { perSec } = E.runMulti(state.packs, spec, a, b, p, vol, EQUITY_STOPPER_OFF, finrespRunOptions());
      const rows = E.buildPortfolioEquityRows(perSec, times);
      runs[key] = { rows, finresp: rows.length ? rows.at(-1).eq : 0 };
      await yieldToUi();
    }
    return { runs, times };
  }

  /** Построение структуры данных: `buildTotalEquityRows`. */
  function buildTotalEquityRows(runs, times, keys) {
    const active = keys || selectedEquityLogicKeys();
    return times.map((time, i) => ({
      time,
      eq: active.reduce((sum, key) => sum + (runs[key]?.rows[i]?.eq ?? 0), 0)
    }));
  }

  /** Equity-кривые: `equityWindowNote`. */
  function equityWindowNote(a, b) {
    const pack = refPack();
    if (!pack.length || a == null || b == null) return "";
    const n = Math.max(0, b - a + 1);
    const t0 = pack[a]?.time ? axisTime(pack[a].time) : "—";
    const t1 = pack[b]?.time ? axisTime(pack[b].time) : "—";
    return `<p class="note">Окно ползунков: ${t0} — ${t1} · ${n} свечей. Equity и график цены — одно окно; линия на 0, пока L1 не открыла позицию.</p>`;
  }

  /** Подпись параметров управления для equity-блока. */
  function equityControlParamsHtml() {
    const g = $("calc-at-summary-global")?.textContent || "";
    const l = $("calc-at-summary")?.textContent || "";
    const gTrim = g.trim();
    const lTrim = l.trim();
    if (!gTrim && !lTrim) return "";
    const esc = escSvgText; // достаточно для HTML текста
    const parts = [];
    if (gTrim) parts.push(`<span>@@: <code>${esc(gTrim)}</code></span>`);
    if (lTrim) parts.push(`<span>@: <code>${esc(lTrim)}</code></span>`);
    return `<p class="note">Параметры управления: ${parts.join(" · ")}</p>`;
  }

  /** Контекст отрисовки equity или признак раннего выхода. */
  function prepareEquityChartCtx(a, b, data, drawOpts) {
    const opts = drawOpts || {};
    const liveSession = opts.liveSession || isLiveTradingSession();
    const box = $("calc-chart-equity");
    if (!box) return { ok: false };
    if (liveSession && !state.packs.length) {
      return { ok: false, livePlaceholder: true };
    }
    if (!state.packs.length) {
      return { ok: false, box, html: "", clearCtx: true };
    }
    const catalogKeys = equityCatalogLogicKeys();
    const activeKeys = selectedEquityLogicKeys();
    const selectedSet = new Set(activeKeys);
    if (!data) {
      return { ok: false, box, html: "", clearCtx: true };
    }
    const incTf = equityDeltaTf();
    const { runs, times } = data;
    const avgPriceRows = buildAvgClosePriceRows(a, b);
    const hasFinrespSource = !!finrespEquityRowsForChart(a, b, times);
    const hasPerLogicRuns = catalogKeys.some((key) => runs[key]?.rows?.length);
    if (!hasPerLogicRuns && !hasFinrespSource && !avgPriceRows.length) {
      return {
        ok: false,
        box,
        html: !activeKeys.length
          ? `<p class="note">Выберите хотя бы одну логику в списке «Логика» для equity.</p>`
          : "",
        clearCtx: true
      };
    }
    const processEquityRows = (rows, key) => {
      let r = liveSession ? (rows || []) : sliceRowsForLiveSession(rows);
      if (liveSession && r.length) r = zeroBaseEquityRows(r, key);
      if (liveSession && r.length === 1) r = [{ ...r[0] }, { ...r[0] }];
      return r;
    };
    const refKey = catalogKeys.find((key) => runs[key]?.rows?.length);
    const refRows = refKey ? processEquityRows(runs[refKey]?.rows || [], refKey) : [];
    const finrespSource = finrespEquityRowsForChart(a, b, times);
    const finrespRows = finrespSource?.length ? processEquityRows(finrespSource, "__finresp") : [];
    const totalSource = activeKeys.length
      ? (liveSession
        ? buildTotalEquityRows(
          Object.fromEntries(
            activeKeys
              .filter((key) => runs[key]?.rows?.length)
              .map((key) => [key, { rows: processEquityRows(runs[key].rows, key) }])
          ),
          times,
          activeKeys
        )
        : buildTotalEquityRows(runs, times, activeKeys))
      : [];
    const totalRows = liveSession ? totalSource : processEquityRows(totalSource, "__total");
    const finrespDecor = {
      ...chartDecorFromRows(
        finrespRows.length ? finrespRows : refRows,
        configMarkersForRows(finrespRows)
      ),
      prominentFin: true,
      strokeW: 2.8,
      chartTitleLines: finrespChartTitleLines(),
      caption: "Equity портфеля — совпадает с FINRESP Σ в блоке результатов"
    };
    const decorBase = chartDecorFromRows(
      refRows.length ? refRows : totalRows,
      configMarkersForRows(totalRows)
    );
    const markerNoteHtml = state.equityConfigMarkers?.length
      ? `<p class="note">Фиолетовые линии — смена логик, комиссии или индикаторов.</p>`
      : "";
    const liveNoteHtml = liveSession
      ? `<p class="note">${liveChartSessionNote()}</p>`
      : "";
    const sectionTitle = liveSession
      ? "Equity по логикам — live-сессия"
      : "Equity по логикам";
    return {
      ok: true,
      box,
      ctx: {
        a,
        b,
        opts,
        liveSession,
        catalogKeys,
        activeKeys,
        selectedSet,
        runs,
        incTf,
        avgPriceRows,
        processEquityRows,
        finrespRows,
        totalRows,
        finrespDecor,
        decorBase,
        sectionTitle,
        deltaBarHtml: equityDeltaPeriodBarHtml(),
        windowNoteHtml: equityWindowNote(a, b),
        controlParamsHtml: equityControlParamsHtml(),
        liveNoteHtml,
        markerNoteHtml
      }
    };
  }

  /** HTML одного mini-графика equity по логике каталога. */
  function buildEquityLogicBlockHtml(key, ctx) {
    const selected = ctx.selectedSet.has(key);
    const heading = logicChartHeading(key, selected);
    const absentNote = !selected
      ? `<p class="chart-logic-absent-note">${logicAbsentNote(ctx.liveSession)}</p>`
      : "";
    const run = ctx.runs[key];
    if (!run?.rows?.length) {
      const wrapClass = selected ? "chart-mini" : "chart-mini chart-mini--inactive";
      return `<div class="${wrapClass}"><p class="chart-sec-title">${heading}</p>${absentNote}<div class="chart-mini-empty">Нет данных в окне</div></div>`;
    }
    const rows = ctx.processEquityRows(run.rows, key);
    if (!rows.length) {
      const wrapClass = selected ? "chart-mini" : "chart-mini chart-mini--inactive";
      return `<div class="${wrapClass}"><p class="chart-sec-title">${heading}</p>${absentNote}<div class="chart-mini-empty">Нет свечей в live-сессии</div></div>`;
    }
    const decor = {
      ...chartDecorFromRows(rows, configMarkersForRows(rows)),
      faded: !selected,
      chartTitleLines: logicChartTitleLines(key, selected)
    };
    const fin = rows.at(-1).eq;
    const lineColor = selected ? equityLogicColor(key) : undefined;
    const svg = appendEquityIncrementPanel(
      buildEquityChartSvg(rows, fin, `Equity ${key}`, true, lineColor, decor),
      rows, ctx.incTf, true, !selected
    );
    if (!svg) return "";
    const wrapClass = selected ? "chart-mini" : "chart-mini chart-mini--inactive";
    return `<div class="${wrapClass}" data-equity-copy-block>${equityChartCopyHeaderHtml(`<p class="chart-sec-title">${heading}</p>`)}${absentNote}${svg}</div>`;
  }

  /** HTML блока FINRESP Σ (equity портфеля). */
  function buildEquityFinrespBlockHtml(ctx) {
    if (!ctx.finrespRows.length) return "";
    const finrespFin = ctx.finrespRows.at(-1).eq;
    const finrespColor = finrespFin < 0 ? "#b91c1c" : "#047857";
    const finrespSvg = appendEquityIncrementPanel(
      buildEquityChartSvg(
        ctx.finrespRows, finrespFin, "Equity портфеля = FINRESP Σ", false, finrespColor, ctx.finrespDecor
      ),
      ctx.finrespRows, ctx.incTf, false, false
    );
    if (!finrespSvg) return "";
    const finrespHint = ctx.liveSession
      ? "Совпадает с FINRESP Σ live-сессии (с нуля сессии)."
      : "Совпадает с FINRESP Σ в блоке результатов (стек выбранных логик, портф. Stopper).";
    return `<div class="chart-equity-total chart-equity-total--finresp" data-equity-copy-block>
${equityChartCopyHeaderHtml(`<p class="chart-sec-title chart-sec-title--finresp">${finrespEquityTitle()}</p>`)}
<p class="chart-equity-finresp-hint">${finrespHint}</p>
${finrespSvg}
</div>`;
  }

  /** HTML справочного блока суммы логик. */
  function buildEquityReferenceBlockHtml(ctx) {
    if (ctx.activeKeys.length && ctx.totalRows.length) {
      const totalFin = ctx.totalRows.at(-1).eq;
      const referenceDecor = {
        ...ctx.decorBase,
        dashed: true,
        strokeW: 2.6,
        chartTitleLines: referenceChartTitleLines(ctx.activeKeys),
        caption: "Справочно: каждая логика отдельно, кривые складываются · без портф. Stopper"
      };
      const totalSvg = appendEquityIncrementPanel(
        buildEquityChartSvg(
          ctx.totalRows, totalFin, `Equity Σ ${ctx.activeKeys.join("+")} (справочно)`, false, "#c2410c", referenceDecor
        ),
        ctx.totalRows, ctx.incTf, false, false
      );
      if (!totalSvg) return "";
      return `<div class="chart-equity-total chart-equity-total--reference" data-equity-copy-block>
${equityChartCopyHeaderHtml(`<p class="chart-sec-title chart-sec-title--reference">${referenceEquityTitle(ctx.activeKeys)}</p>`)}
<p class="chart-equity-reference-hint">Не совпадает с FINRESP Σ при нескольких логиках: здесь логики не в стеке, а суммируются независимо.</p>
${totalSvg}
</div>`;
    }
    if (!ctx.activeKeys.length) {
      return `<p class="note">Справочная сумма логик: выберите хотя бы одну логику в списке «Логика».</p>`;
    }
    return "";
  }

  /** Отрисовка equity-графиков по готовым рядам (одним блоком). */
  function renderEquityChartsFromData(a, b, data, drawOpts) {
    const prepared = prepareEquityChartCtx(a, b, data, drawOpts);
    if (!prepared.ok) {
      if (prepared.livePlaceholder) {
        state.lastEquityChartCtx = null;
        drawLiveEquityPlaceholders();
        return;
      }
      if (prepared.clearCtx) state.lastEquityChartCtx = null;
      if (prepared.box) syncChartBox(prepared.box, prepared.html ?? "");
      return;
    }
    const { box, ctx } = prepared;
    state.lastEquityChartCtx = { a, b, data, drawOpts: ctx.opts };
    const logicBlocks = ctx.catalogKeys
      .map((key) => buildEquityLogicBlockHtml(key, ctx))
      .filter(Boolean);
    const finrespBlock = buildEquityFinrespBlockHtml(ctx);
    const referenceBlock = buildEquityReferenceBlockHtml(ctx);
    const avgPriceBlock = buildEquityAvgPriceBlockHtml(ctx);
    syncChartBox(box, `<div class="chart-equity-section">
${avgPriceBlock}
<p class="chart-equity-section-title">${ctx.sectionTitle}</p>
${ctx.deltaBarHtml}
${ctx.windowNoteHtml}
${ctx.controlParamsHtml}
${ctx.liveNoteHtml}${ctx.markerNoteHtml}
${finrespBlock}
${referenceBlock}
<div class="chart-equity-logic-scroll"><div class="chart-stack">${logicBlocks.join("")}</div></div>
</div>`);
  }

  /** Пошаговая отрисовка equity с yield между блоками (этап «Рассчитать»). */
  async function renderEquityChartsFromDataAsync(a, b, data, drawOpts, onProgress) {
    const prepared = prepareEquityChartCtx(a, b, data, drawOpts);
    if (!prepared.ok) {
      if (prepared.livePlaceholder) {
        state.lastEquityChartCtx = null;
        drawLiveEquityPlaceholders();
        return;
      }
      if (prepared.clearCtx) state.lastEquityChartCtx = null;
      if (prepared.box) syncChartBox(prepared.box, prepared.html ?? "");
      return;
    }
    const { box, ctx } = prepared;
    state.lastEquityChartCtx = { a, b, data, drawOpts: ctx.opts };

    const section = document.createElement("div");
    section.className = "chart-equity-section";

    const avgPriceBlock = buildEquityAvgPriceBlockHtml(ctx);
    if (avgPriceBlock) {
      section.insertAdjacentHTML("beforeend", avgPriceBlock);
      if (onProgress) await yieldToUi();
    }

    section.insertAdjacentHTML("beforeend", `<p class="chart-equity-section-title">${ctx.sectionTitle}</p>`);
    section.insertAdjacentHTML("beforeend", ctx.deltaBarHtml);
    section.insertAdjacentHTML("beforeend", ctx.windowNoteHtml);
    if (ctx.controlParamsHtml) section.insertAdjacentHTML("beforeend", ctx.controlParamsHtml);
    if (ctx.liveNoteHtml) section.insertAdjacentHTML("beforeend", ctx.liveNoteHtml);
    if (ctx.markerNoteHtml) section.insertAdjacentHTML("beforeend", ctx.markerNoteHtml);

    const finrespBlock = buildEquityFinrespBlockHtml(ctx);
    if (finrespBlock) {
      section.insertAdjacentHTML("beforeend", finrespBlock);
      if (onProgress) await yieldToUi();
    }

    const referenceBlock = buildEquityReferenceBlockHtml(ctx);
    if (referenceBlock) {
      section.insertAdjacentHTML("beforeend", referenceBlock);
      if (onProgress) await yieldToUi();
    }

    const stackWrap = document.createElement("div");
    stackWrap.className = "chart-equity-logic-scroll";
    const stack = document.createElement("div");
    stack.className = "chart-stack";
    stackWrap.appendChild(stack);
    section.appendChild(stackWrap);

    for (let i = 0; i < ctx.catalogKeys.length; i++) {
      const key = ctx.catalogKeys[i];
      if (onProgress) onProgress(i, ctx.catalogKeys.length, key);
      const block = buildEquityLogicBlockHtml(key, ctx);
      if (block) stack.insertAdjacentHTML("beforeend", block);
      if (onProgress) await yieldToUi();
    }

    box.innerHTML = "";
    box.appendChild(section);
    bridgeSetCharts({ equityVisible: true });
    box.hidden = false;
  }

  /** Кривые equity по логикам каталога. */
  function drawEquityCharts(a, b, drawOpts) {
    renderEquityChartsFromData(a, b, calcLogicEquityRuns(a, b), drawOpts);
  }

  /** Асинхронное построение equity-графиков с прогрессом. */
  async function drawEquityChartsAsync(a, b, drawOpts, onProgress) {
    const data = await calcLogicEquityRunsAsync(a, b, (i, n, key) => {
      if (onProgress) onProgress("calc", i, n, key);
    });
    if (!data) return;
    await yieldToUi();
    await renderEquityChartsFromDataAsync(a, b, data, drawOpts, (i, n, key) => {
      if (onProgress) onProgress("render", i, n, key);
    });
  }

  /** Подпрограмма `chartFailuresForDraw`. */
  function chartFailuresForDraw() {
    const out = new Map();
    for (const f of state.failedInstruments || []) {
      out.set(String(f.sec || "").toUpperCase(), f);
    }
    for (const f of state.windowSkipped || []) {
      const key = String(f.sec || "").toUpperCase();
      if (!out.has(key)) out.set(key, f);
    }
    return [...out.values()];
  }

  /** Подпрограмма `chartEntriesForDraw`. */
  function chartEntriesForDraw(perSec, failed) {
    const ok = perSec || [];
    const bad = failed || [];
    const perByUpper = new Map(ok.map((p) => [String(p.sec).toUpperCase(), p]));
    const failByUpper = new Map(bad.map((f) => [String(f.sec).toUpperCase(), f]));
    const seen = new Set();
    const entries = [];

    const pushEntry = (entry) => {
      const key = String(entry.sec || "").toUpperCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      entries.push(entry);
    };

    for (const inst of state.lastInstruments || []) {
      const sec = inst.sec || inst;
      const key = String(sec).toUpperCase();
      const row = perByUpper.get(key);
      if (row) {
        pushEntry({ kind: "ok", sec: row.sec, row });
        continue;
      }
      const fail = failByUpper.get(key);
      if (fail) {
        pushEntry({ kind: "fail", sec: fail.sec, error: fail.error });
        continue;
      }
      pushEntry({ kind: "fail", sec, error: "нет данных для графика в расчёте" });
    }

    for (const f of bad) pushEntry({ kind: "fail", sec: f.sec, error: f.error });
    for (const p of ok) pushEntry({ kind: "ok", sec: p.sec, row: p });

    return entries;
  }

  /** Отрисовка SVG-графиков FINRESP по результату расчёта. */
  async function drawCharts(perSec, stopper, drawOpts, onProgress) {
    const liveSession = drawOpts?.liveSession || isLiveTradingSession();
    const failed = chartFailuresForDraw();
    const entries = chartEntriesForDraw(perSec, failed);
    const chartBox = $("calc-chart");
    if (!entries.length) {
      if (liveSession) {
        drawLiveChartPlaceholders();
        return;
      }
      syncChartBox(chartBox, "<p class=\"note\">Нет данных для графика.</p>");
      return;
    }
    const compact = entries.length > 1;
    const portfolioEvents = liveSession ? [] : (stopper?.events || []);
    let note = "";
    if (liveSession) {
      note = `<p class="note">${liveChartSessionNote()}</p>`;
    }
    const nOk = entries.filter((e) => e.kind === "ok").length;
    const nFail = entries.filter((e) => e.kind === "fail").length;
    if (entries.length > 1) {
      note += `<p class="note">Графики: ${entries.length} инстр. (${nOk} с данными${nFail ? `, ${nFail} с сообщением об ошибке` : ""}). Колёсико — масштаб, перетаскивание — сдвиг, двойной клик — весь период.</p>`;
    }
    if (portfolioEvents.length) {
      note += `<span class="note">Верт. черта: SL красная, TP зелёная; тонкая — позиция, жирная — портфель (на всех графиках).</span>`;
    } else if (liveSession) {
      note += `<span class="note">Верт. линии заявок: покупка — синяя, продажа — оранжевая.</span>`;
    }

    const useInteractive = typeof MLInstrumentChart !== "undefined" && MLInstrumentChart.mount;
    chartBox.innerHTML = note || "";
    const stack = document.createElement("div");
    stack.className = "chart-stack";
    const chartDiags = [];
    const chartFormat = {
      axisPrice,
      axisTime,
      niceTicks,
      fmtFinresp: (v) => fmt(v)
    };

    for (let ei = 0; ei < entries.length; ei++) {
      const entry = entries[ei];
      if (onProgress) {
        const sec = entry.sec || entry.row?.sec || "";
        onProgress(ei, entries.length, sec);
      }
      if (entry.kind === "fail") {
        const failEl = document.createElement("div");
        failEl.className = "chart-mini chart-fail";
        failEl.innerHTML = `<p class="chart-sec-title">${entry.sec}</p><p class="chart-fail-msg">${entry.error}</p>`;
        stack.appendChild(failEl);
        if (onProgress) await yieldToUi();
        continue;
      }
      const p = entry.row;
      const rows = sliceRowsForLiveSession(p.rows);
      if (liveSession && !rows.length) {
        const waitEl = document.createElement("div");
        waitEl.className = "chart-mini";
        waitEl.innerHTML = `<p class="chart-sec-title">${p.sec}</p><div class="chart-mini-empty">Ожидание свечей live-сессии…</div>`;
        stack.appendChild(waitEl);
        if (onProgress) await yieldToUi();
        continue;
      }
      const displayFin = liveSession ? liveDisplayFinresp(p.sec, p.finresp) : p.finresp;
      const chartRows = enrichChartRowsForDisplay(rows.length ? rows : p.rows, p.sec);
      chartDiags.push(analyzeChartInstrument(p.sec, rows.length ? rows : p.rows, chartRows));
      const stopV = chartStopLines(chartRows, portfolioEvents);
      const orderV = liveSession ? orderMarkersForChart(p.sec, chartRows) : [];
      const vLines = [...stopV, ...orderV];
      const decor = chartDecorFromRows(chartRows, vLines);

      const mini = document.createElement("div");
      mini.className = "chart-mini";

      if (!chartRows.length) {
        mini.innerHTML = `<p class="chart-sec-title">${p.sec}</p><p class="chart-fail-msg">Нет данных для графика в выбранном окне.</p>`;
        stack.appendChild(mini);
        if (onProgress) await yieldToUi();
        continue;
      }

      if (useInteractive) {
        const host = document.createElement("div");
        host.className = "ml-instrument-chart-host";
        mini.appendChild(host);
        stack.appendChild(mini);
        MLInstrumentChart.mount(host, {
          rows: chartRows,
          finresp: displayFin,
          title: `График ${p.sec}`,
          secTitle: p.sec,
          compact,
          decor,
          format: chartFormat
        });
      } else {
        const titleEl = document.createElement("p");
        titleEl.className = "chart-sec-title";
        titleEl.textContent = p.sec;
        mini.appendChild(titleEl);
        const svg = buildChartSvg(chartRows, displayFin, `График ${p.sec}`, compact, vLines, decor);
        if (!svg) {
          mini.innerHTML += `<p class="chart-fail-msg">Нет данных для графика в выбранном окне.</p>`;
        } else {
          mini.insertAdjacentHTML("beforeend", svg);
          if (typeof MLInstrumentChart !== "undefined" && MLInstrumentChart.buildIndicatorLegend) {
            mini.insertAdjacentHTML("beforeend", MLInstrumentChart.buildIndicatorLegend(chartRows));
          }
        }
        stack.appendChild(mini);
      }
      if (onProgress) await yieldToUi();
    }

    if (stack.childNodes.length) {
      chartBox.appendChild(stack);
      showInstrumentChartBox(chartBox);
      if (calcState) {
        calcState.lastChartDiag = {
          builtAt: new Date().toISOString(),
          chartsModule: typeof MLInstrumentChart !== "undefined" ? (MLInstrumentChart.version || "legacy") : "missing",
          tradeMarkersFromBar: !!E?.tradeMarkersFromBar,
          instruments: chartDiags
        };
        updateTechInfo("charts-drawn");
      }
    } else if (!note) {
      syncChartBox(chartBox, "<p class=\"note\">Нет данных для графика.</p>");
    }
  }

  /** Подпрограмма `optimDisplayAgg`. */
  function optimDisplayAgg(result, opts) {
    const kind = state.optim.active;
    if (opts?.optimTrial && kind && isPositionOptimKind(kind) && result.preStopperAgg) {
      return result.preStopperAgg;
    }
    return result.agg;
  }

  /** Применение настроек/результата: `applyResult`. */
  function applyResult(result, options) {
    const opts = options || {};
    const { perSec, stopper, a, b } = result;
    let agg = optimDisplayAgg(result, opts);
    /** Только явные live-обновления (опрос свечей), не кнопка «Рассчитать». */
    const liveSession = opts.liveSession === true;
    if (liveSession && state.live.chartSession) {
      const cs = state.live.chartSession;
      if (cs.finrespBaseline == null) cs.finrespBaseline = agg.finresp;
      if (cs.commissionBaseline == null) cs.commissionBaseline = agg.commission || 0;
      agg = {
        ...agg,
        finresp: agg.finresp - cs.finrespBaseline,
        commission: Math.max(0, (agg.commission || 0) - cs.commissionBaseline)
      };
    }
    if (!opts.optimTrial) state.lastResult = result;
    if (!opts.optimTrial && !liveSession) {
      state.lastProtocol = buildCalcTradeProtocol(result);
      syncProtocolUi();
    }
    applyUiLocks();
    const winLen = liveSession
      ? Math.max(0, (b - a) + 1)
      : perSec.reduce((m, p) => Math.max(m, p.rows?.length ?? 0), 0);
    const c0 = liveSession
      ? (liveFinrespPeriodStart() || refPack()[a]?.time || "—")
      : (refPack()[a]?.time || "—");
    const c1 = refPack()[b]?.time || "—";
    const deposit = volConfig().deposit;
    const days = annualPeriodDays(c0, c1, { liveSession });
    const annSimple = annualSimplePct(agg.finresp, deposit, days);
    const annCompound = annualCompoundPct(agg.finresp, deposit, days);
    let annHintText = "";
    if (liveSession) {
      const mode = isLiveSandbox() ? "песочница (фейк)" : "реальная торговля";
      const scope = state.live.active ? "с начала торговли" : "с начала live-сессии";
      const periodPct = deposit > 0 && Number.isFinite(agg.finresp) ? (agg.finresp / deposit) * 100 : null;
      const daysLabel = days == null
        ? "—"
        : (days < 1 ? `${Math.max(1, Math.round(days * 24 * 60))} мин` : `${Math.round(days * 10) / 10} календ. дн.`);
      annHintText = `Live · ${mode} · FINRESP и % годовых ${scope} (${c0} — ${c1}, ${daysLabel})`
        + (Number.isFinite(periodPct) ? ` · доходность за период: ${fmtPct(periodPct)}` : "")
        + " · совпадает с FINRESP Σ в блоке «Реальная торговля».";
    } else if (days && deposit > 0) {
      const periodPct = (agg.finresp / deposit) * 100;
      const windowDays = calendarDaysBetweenTimes(c0, c1);
      const opDays = robotOperatingDays();
      const scope = windowDays && opDays && windowDays !== opDays
        ? `окно ${Math.round(windowDays)} дн., приведение к ${Math.round(opDays)} дн. расчёта`
        : `${Math.round(days)} календ. дн. расчёта`;
      annHintText =
        `База ${fmt(deposit, 0)} ₽ · доходность за ${scope}: ${fmtPct(periodPct)} → % годовых: прибыль/база ÷ (дни/365), как в роботе`;
    } else {
      annHintText = "Для % годовых нужны депозит и период ≥ 1 календарного дня.";
    }
    const grossFin = (agg.finresp || 0) + (agg.commission || 0);
    const annSimpleView = annDisplay(annSimple);
    const annCompoundView = annDisplay(annCompound);
    if (!bridgeSetResults({
      finrespText: `${fmt(agg.finresp)} ₽`,
      finrespColor: agg.finresp < 0 ? "#b91c1c" : "#047857",
      grossText: `${fmt(grossFin)} ₽`,
      grossColor: grossFin < 0 ? "#b91c1c" : grossFin > 0 ? "#047857" : "",
      commissionText: commissionDisplayText(agg.commission || 0),
      commissionColor: "#b91c1c",
      candleCount: String(winLen),
      position: fmt(agg.pos, 4),
      cash: `${fmt(agg.cash)} ₽`,
      bySecText: formatBySec(agg.bySec) || "—",
      annSimpleText: annSimpleView.text,
      annSimpleColor: annSimpleView.color,
      annCompoundText: annCompoundView.text,
      annCompoundColor: annCompoundView.color,
      annHintText
    })) {
      $("calc-finresp").textContent = `${fmt(agg.finresp)} ₽`;
      $("calc-finresp").style.color = agg.finresp < 0 ? "#b91c1c" : "#047857";
      const grossEl = $("calc-finresp-gross");
      if (grossEl) {
        grossEl.textContent = `${fmt(grossFin)} ₽`;
        grossEl.style.color = grossFin < 0 ? "#b91c1c" : grossFin > 0 ? "#047857" : "";
      }
      setCommissionMetric("calc-commission", agg.commission || 0);
      $("calc-count").textContent = String(winLen);
      $("calc-pos").textContent = fmt(agg.pos, 4);
      $("calc-cash").textContent = `${fmt(agg.cash)} ₽`;
      $("calc-bysec").textContent = formatBySec(agg.bySec) || "—";
      setAnnMetric("calc-ann-simple", annSimple);
      setAnnMetric("calc-ann-compound", annCompound);
      const annHint = $("calc-ann-hint");
      if (annHint) annHint.textContent = annHintText;
    }
    state.anchorStartTime = c0 !== "—" ? c0 : state.anchorStartTime;
    state.anchorEndTime = c1 !== "—" ? c1 : state.anchorEndTime;
    state.hasWindow = c0 !== "—" && c1 !== "—";
    $("calc-start-label").textContent = c0;
    $("calc-end-label").textContent = c1;
    publishWindowBridge();
    const mode = state.bulkMode === "futures" ? "фьючерсы" : state.bulkMode === "shares" ? "все акции" : "выбор";
    let status = liveSession
      ? `Live-сессия · FINRESP ${fmt(agg.finresp)} ₽ · ${winLen} св. с ${c0} · ${perSec.length} инстр.`
      : `FINRESP: ${c0} — ${c1} | ${perSec.length} инстр. (${mode}) | ${winLen} свечей в окне`;
    if (state.failedInstruments?.length) {
      status += ` | нет MOEX: ${state.failedInstruments.length}`;
    }
    if (state.windowSkipped?.length) {
      status += ` | без окна: ${state.windowSkipped.length}`;
    }
    if (stopper?.events?.length) status += ` | Stopper: ${stopper.events.length} сраб.`;
    else if (stopperConfig().useSl || stopperConfig().useTp) status += " | Stopper вкл.";
    if (randomPriceShiftEnabled()) status += " | сдвиг индикаторов ±0,1%";
    if (params().ReverseSides) status += " | Реверс сторон вкл.";
    if (opts.optimNote) {
      const bestLabel = optimValueLabel(state.optim.active, state.optim.bestValue);
      status += ` | Опт. ${opts.optimNote}: FINRESP ${fmt(agg.finresp)} ₽ | лучшее ${bestLabel} → ${fmt(state.optim.bestFinresp)} ₽`;
    }
    setCalcStatus(status);
    updateTechInfo("result-applied");
    if (liveSession) {
      state.live.modelFinresp = agg.finresp;
      state.live.modelCommission = agg.commission || 0;
      if (typeof renderLiveFinResultStat === "function") renderLiveFinResultStat();
    } else if (!opts.optimTrial && typeof isLiveMode === "function" && isLiveMode()) {
      const fullAgg = optimDisplayAgg(result, opts);
      state.live.modelFinresp = fullAgg.finresp;
      state.live.modelCommission = fullAgg.commission || 0;
      if (typeof renderLiveFinResultStat === "function") renderLiveFinResultStat();
    }
    if (!opts.optimTrial && !liveSession) {
      const pack = refPack();
      recordEquityConfigMarker(pack[a]?.time);
    }
    if (opts.redrawCharts !== false) {
      const chartOpts = { liveSession };
      if (opts.redrawChartsAsync) {
        void drawCharts(perSec, stopper, chartOpts);
        void drawEquityChartsAsync(a, b, chartOpts);
      } else {
        drawCharts(perSec, stopper, chartOpts);
        drawEquityCharts(a, b, chartOpts);
      }
    }
  }

  /** Отрисовка элемента live-панели: `renderWithStatus`. */
  function renderWithStatus(options) {
    const result = calcResult();
    if (!result) {
      const packsN = state.packs?.length || 0;
      const skipped = state.windowSkipped?.length || 0;
      let msg = "Нет результата для выбранного окна.";
      if (!packsN) msg = "Нет загруженных свечей — нажмите «Рассчитать».";
      else if (skipped >= packsN) {
        const n = selectedInstrumentCount() || packsN;
        msg =
          `Недостаточно истории для расчёта (~${maxCalcDays($("calc-tf").value, n)} дн. при ${n} инстр.) — нажмите «Рассчитать» после смены выбора или уменьшите число бумаг.`;
      } else if (skipped > 0) {
        msg = `Часть инструментов без данных в окне (${skipped}) — сдвиньте ползунки или нажмите «Рассчитать».`;
      }
      $("calc-finresp").textContent = "—";
      $("calc-commission").textContent = "—";
      $("calc-ann-simple").textContent = "—";
      $("calc-ann-compound").textContent = "—";
      $("calc-count").textContent = "—";
      state.lastResult = null;
      applyUiLocks();
      setCalcStatus(msg);
      noteTechError(`render: ${msg}`);
      return false;
    }
    applyResult(result, options);
    return true;
  }

  /** Отрисовка элемента live-панели: `render`. */
  function render(options) {
    return renderWithStatus(options);
  }

  /** Ленивая инициализация/проверка: `ensureInstrumentPacks`. */
  async function ensureInstrumentPacks(instruments, from, till, interval, onProgress, shouldCancel) {
    const periodKey = loadMetaKey(from, till, interval);
    const periodChanged = state.lastLoadMeta?.periodKey !== periodKey;
    const byKey = periodChanged ? new Map() : packsByInstrumentKey(state.packs);
    const failures = periodChanged ? [] : [...(state.failedInstruments || [])];
    const failKeys = new Set(failures.map((f) => instrumentKey({ sec: f.sec, market: f.market })));
    const missing = instruments.filter((i) => !byKey.has(instrumentKey(i)));
    const toLoad = periodChanged ? instruments : missing;

    if (toLoad.length) {
      const loaded = await loadInstrumentPacks(toLoad, from, till, interval, (done, total, sec, groupLabel, meta) => {
        if (onProgress) onProgress(done, total, sec, groupLabel, meta);
      }, shouldCancel);
      for (const f of loaded.failures) {
        const fk = instrumentKey({ sec: f.sec, market: f.market });
        if (!failKeys.has(fk)) {
          failKeys.add(fk);
          failures.push(f);
        }
      }
      for (const pack of loaded.packs) {
        if (!pack?.[0]) continue;
        const key = instrumentKey(pack[0]);
        byKey.set(key, pack);
        for (let i = failures.length - 1; i >= 0; i--) {
          if (instrumentKey({ sec: failures[i].sec, market: failures[i].market }) === key) {
            failures.splice(i, 1);
          }
        }
      }
    }

    const wantKeys = new Set(instruments.map(instrumentKey));
    for (const key of [...byKey.keys()]) {
      if (!wantKeys.has(key)) byKey.delete(key);
    }
    const packs = orderPacksForInstruments(instruments, byKey);
    return {
      packs,
      failures: failures.filter((f) => wantKeys.has(instrumentKey({ sec: f.sec, market: f.market }))),
      periodKey
    };
  }

  /** Загрузка данных: `loadInstrumentPacks`. */
  async function loadInstrumentPacks(instruments, from, till, interval, onProgress, shouldCancel) {
    const shares = instruments.filter((i) => i.market === "shares").map((i) => i.sec);
    const futures = instruments.filter((i) => i.market === "futures").map((i) => i.sec);
    const packs = [];
    const failures = [];
    const loadGroup = async (secs, market, label) => {
      if (!secs.length) return;
      const conc = secs.length > 12 ? 4 : 1;
      const r = await E.loadManyDetailed(secs, from, till, interval, market, conc, (done, total, sec, meta) => {
        if (onProgress) onProgress(done, total, sec, label, meta);
      }, state.candleCache || null, shouldCancel);
      packs.push(...r.packs);
      failures.push(...r.failures);
    };
    await loadGroup(shares, "shares", "акций");
    await loadGroup(futures, "futures", "фьючерсов");
    packs.sort((a, b) => (a[0]?.sec || "").localeCompare(b[0]?.sec || ""));
    return { packs, failures };
  }

  /** Запуск расчёта: `runWithInstruments`. */
  async function runWithInstruments(instruments, bulkMode, runGen) {
    if (!instruments.length) throw new Error("Список инструментов пуст.");
    if (runGen == null) runGen = ++state.runGeneration;
    if (isOptimizing()) stopOptim();
    state.runBusyOwner = runGen;
    setBusy(true);
    state.lastInstruments = instruments.map((i) => ({ sec: i.sec, market: i.market }));
    const periodNarrowed = enforceDateRange("till", instruments.length);
    const from = $("calc-from").value;
    const till = $("calc-till").value;
    const interval = $("calc-tf").value;
    const nShares = instruments.filter((i) => i.market === "shares").length;
    const nFutures = instruments.filter((i) => i.market === "futures").length;
    const label = nShares && nFutures
      ? `${nShares} акц. + ${nFutures} фьюч.`
      : nFutures ? `${nFutures} фьючерсов` : `${nShares} акций`;
    const maxD = maxCalcDays(interval, instruments.length);
    state.runCancelRequested = false;
    state.runCheckpoint = null;
    const shouldCancel = () => isRunCancelled(runGen);
    let partialApplied = false;
    const finishIfCancelled = async (loadedData) => {
      if (partialApplied) return true;
      if (!isRunCancelled(runGen) && !state.runCancelRequested) return false;
      partialApplied = true;
      await finishCancelledRun(runGen, loadedData);
      return true;
    };
    setCalcProgress(periodNarrowed
      ? `Период сужен до ${maxD} дн. · идёт загрузка цен MOEX: ${label}`
      : `Идёт загрузка цен MOEX: ${label}`, 0);
    await yieldToUi();
    let loadedData = null;
    try {
      let cacheHits = 0;
      loadedData = await ensureInstrumentPacks(instruments, from, till, interval, (done, total, sec, groupLabel, meta) => {
        if (shouldCancel()) return;
        if (meta?.fromCache) cacheHits += 1;
        const pct = mapLoadProgressPct(done, total);
        const src = meta?.fromCache ? "кэш" : "MOEX";
        trackRunCheckpoint({ phase: "load", done, total, sec });
        setCalcProgress(`Идёт загрузка цен MOEX (${groupLabel}, ${src}): ${sec}`, pct);
      }, shouldCancel);
      if (await finishIfCancelled(loadedData)) return;
      updateCacheHint(cacheHits ? `MOEX: ${loadedData.packs.length - cacheHits}, кэш: ${cacheHits}` : "");
      if (!loadedData.packs.length) {
        const sample = loadedData.failures.slice(0, 3).map((f) => f.sec).join(", ");
        const tail = loadedData.failures.length > 3 ? "…" : "";
        throw new Error(`MOEX не вернул свечи ни по одному инструменту${sample ? ` (${sample}${tail})` : ""}.`);
      }
      state.packs = loadedData.packs;
      state.failedInstruments = loadedData.failures;
      state.windowSkipped = [];
      resetEquityConfigMarkers();
      state.lastLoadMeta = {
        periodKey: loadedData.periodKey,
        keys: instruments.map(instrumentKey)
      };
      state.bulkMode = bulkMode;
      if (!periodNarrowed && state.hasWindow) {
        setSliderBounds(true);
      } else {
        state.movedSlider = "end";
        setSliderBounds(false);
      }
      saveWindowAnchor();
      setCalcProgress("Загрузка цен завершена · расчёт FINRESP", CALC_PROGRESS.FINRESP_START);
      await yieldToUi();
      let result;
      try {
        result = await calcResultAsync(null, { shouldCancel });
      } catch (err) {
        if (shouldCancel() || err?.message === "cancelled") {
          await finishIfCancelled(loadedData);
          return;
        }
        throw err;
      }
      if (await finishIfCancelled(loadedData)) return;
      if (!result) {
        syncChartBox($("calc-chart"), "");
        syncChartBox($("calc-chart-equity"), "");
        const packsN = state.packs?.length || 0;
        const skipped = state.windowSkipped?.length || 0;
        let msg = "Нет результата для выбранного окна.";
        if (!packsN) msg = "Нет загруженных свечей.";
        else if (skipped >= packsN) {
          msg = `Недостаточно истории для расчёта (~${maxCalcDays($("calc-tf").value, instruments.length)} дн.).`;
        }
        $("calc-finresp").textContent = "—";
        $("calc-commission").textContent = "—";
        $("calc-ann-simple").textContent = "—";
        $("calc-ann-compound").textContent = "—";
        state.lastResult = null;
        setCalcProgress(msg);
        if (instruments.length > 1 && loadedData.failures.length) {
          appendCalcStatus(` Загружено ${state.packs.length}/${instruments.length}; ошибок MOEX: ${loadedData.failures.length}.`);
        }
      } else {
        applyResult(result, { redrawCharts: false, liveSession: false });
        const { a: ra, b: rb, perSec, stopper } = result;
        setCalcProgress("Графики по инструментам…", CALC_PROGRESS.CHARTS_START);
        await yieldToUi();
        await drawCharts(perSec, stopper, {}, (i, n, sec) => {
          setCalcProgress(
            `График ${sec} (${i + 1}/${n})`,
            mapInstrumentChartProgressPct(i + 1, n)
          );
        });
        await drawEquityChartsAsync(ra, rb, {}, (phase, i, n, key) => {
          const label = phase === "render" ? "Equity график" : "Equity расчёт";
          setCalcProgress(
            `${label}: ${key} (${i + 1}/${n})`,
            mapEquityPhaseProgressPct(phase, i + 1, n)
          );
        });
        if (instruments.length > 1 && loadedData.failures.length) {
          appendCalcStatus(
            ` Загружено ${state.packs.length}/${instruments.length}; ошибок MOEX: ${loadedData.failures.length}.`
          );
        }
        if (runGen === state.runGeneration) {
          await finishCalcProgress("Расчёт завершён");
          scrollResultsIntoView();
        }
      }
      if (runGen === state.runGeneration) collapseExtraParamsIfOpen();
    } catch (err) {
      if (shouldCancel() || err?.message === "cancelled") {
        await finishIfCancelled(loadedData);
        return;
      }
      if (runGen !== state.runGeneration) return;
      setCalcStatus(`Ошибка: ${err.message}`);
      noteTechError(`runWithInstruments: ${err.message}`);
      syncChartBox($("calc-chart"), "");
      syncChartBox($("calc-chart-equity"), "");
      throw err;
    } finally {
      if (!partialApplied && (isRunCancelled(runGen) || state.runCancelRequested)) {
        partialApplied = true;
        await finishCancelledRun(runGen, loadedData);
      }
      state.runCancelRequested = false;
      releaseRunBusy(runGen);
      if (runGen === state.runGeneration) updateTechInfo("run-finished");
    }
  }

  /** Запуск расчёта: `run`. */
  async function run() {
    if (state.uiBusy) {
      setCalcProgress("Идёт расчёт — дождитесь завершения…");
      return;
    }
    applyEditorParams();
    let instruments = selectedInstruments();
    if (!instruments.length) {
      setCalcStatus("Выберите хотя бы один инструмент в списке.");
      return;
    }
    if (!requireTbankDepositForRun()) return;
    const runGen = ++state.runGeneration;
    const bulkMode = resolveBulkMode(instruments);
    try {
      if (instruments.some((i) => i.market === "futures")) {
        state.runBusyOwner = runGen;
        setBusy(true);
        setCalcProgress("Подбор фьючерсов MOEX за период расчёта…", 0);
        try {
          instruments = await expandFuturesForCalcPeriod(instruments);
        } finally {
          releaseRunBusy(runGen);
        }
        if (runGen !== state.runGeneration) return;
      }
      await runWithInstruments(instruments, bulkMode, runGen);
    } catch (_) { /* status уже выставлен */ }
    finally {
      releaseRunBusy(runGen);
    }
  }


  /** Привязка обработчиков DOM (клики, change, делегирование). */
  function bindUiEvents() {
  if (bindUiEvents._done) return;
  bindUiEvents._done = true;
  bindTbankPassphraseModalUi();
  window.__mlOnAccountModeUserChange = handleAccountModeUserChange;
  $("calc-run")?.addEventListener("click", run);
  $("calc-progress-stop")?.addEventListener("click", () => { requestStopRun(); });
  $("calc-select-positive")?.addEventListener("click", selectNonNegativeFinrespInstruments);
  const livePanel = $("live-trading-panel");
  if (livePanel && !livePanel.dataset.liveCriticalBound) {
    livePanel.dataset.liveCriticalBound = "1";
    livePanel.addEventListener("click", (e) => {
      const removeLogicBtn = e.target?.closest?.("[data-live-remove-logic]");
      if (removeLogicBtn) {
        e.preventDefault();
        e.stopPropagation();
        removeSelectedLogicId(removeLogicBtn.getAttribute("data-live-remove-logic"));
        return;
      }
      const toggleBtn = e.target?.closest?.("#live-trading-toggle");
      if (toggleBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (state.live.active || !toggleBtn.disabled) {
          toggleLiveTrading().catch((err) => {
            state.live.lastError = err.message;
            syncLiveTradingUi();
            noteLiveTech("toggleLiveTrading", err.message);
          });
        }
        return;
      }
      const sellBtn = e.target?.closest?.("#live-trading-sell-all");
      if (sellBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (isLiveMode()) sellAllMarketLive();
      }
    });
  }
  $("live-sandbox-mode")?.addEventListener("change", () => {
    onLiveSandboxToggle().catch((err) => {
      state.live.lastError = err.message;
      syncLiveTradingUi();
      noteLiveTech("live-sandbox-toggle", err.message);
    });
  });
  $("live-sandbox-match-mode")?.addEventListener("change", () => {
    saveConfig();
  });
  $("live-positions-table")?.addEventListener("click", (ev) => {
    const btn = ev.target?.closest?.("[data-pos-close]");
    if (!btn || btn.disabled) return;
    const idx = +btn.getAttribute("data-pos-close");
    const row = state.live.openPositions?.[idx];
    if (!row) return;
    btn.disabled = true;
    closeLivePositionAtMarket(row).catch(() => {}).finally(() => { btn.disabled = false; });
  });
  $("live-manual-submit").addEventListener("click", () => { placeManualLiveOrder(); });
  $("live-manual-order-type").addEventListener("change", () => {
    syncLiveManualOrderUi();
    refreshLiveManualLimitPrice({ force: true, showStatus: true }).catch(() => {});
    saveConfig();
  });
  $("live-manual-sec")?.addEventListener("change", () => {
    refreshLiveManualLimitPrice({ force: true, showStatus: true }).catch(() => {});
    saveConfig();
  });
  ["live-manual-direction", "live-manual-qty", "live-manual-price"].forEach((id) => {
    $(id)?.addEventListener("change", () => { saveConfig(); });
    $(id)?.addEventListener("input", () => {
      if (id === "live-manual-qty" || id === "live-manual-price") {
        if (id === "live-manual-price") {
          const picked = parseLiveManualInstrumentKey($("live-manual-sec")?.value);
          if (picked?.sec) state.live.manualPriceSec = `${picked.market}:${picked.sec}`;
        }
        saveConfig();
      }
    });
  });
  $("live-order-book-sec")?.addEventListener("change", () => {
    saveConfig();
    if ($("live-order-book-panel")?.open) scheduleRefreshLiveOrderBook(true);
  });
  $("live-order-book-table")?.addEventListener("dblclick", onLiveOrderBookPriceDblClick);
  $("live-positions-table")?.addEventListener("contextmenu", onLivePositionsTableContextMenu);
  $("live-positions-table")?.addEventListener("pointerdown", onLivePositionsPointerDown);
  $("live-positions-table")?.addEventListener("pointerup", onLivePositionsPointerEnd);
  $("live-positions-table")?.addEventListener("pointercancel", onLivePositionsPointerEnd);
  $("live-positions-table")?.addEventListener("pointerleave", onLivePositionsPointerEnd);
  $("live-pos-menu-market")?.addEventListener("click", () => onLivePositionsMenuAction("market"));
  $("live-pos-menu-limit")?.addEventListener("click", () => onLivePositionsMenuAction("limit"));
  document.addEventListener("click", (ev) => {
    if (!$("live-positions-menu")?.classList.contains("open")) return;
    if (ev.target?.closest?.("#live-positions-menu")) return;
    hideLivePositionsMenu();
  });
  document.addEventListener("scroll", () => hideLivePositionsMenu(), true);
  $("tbank-save-token").addEventListener("click", () => { saveConfig(); saveTbankToken(); });
  $("tbank-unlock-token")?.addEventListener("click", () => {
    unlockTbankTokenInteractive().catch((err) => {
      setTbankStatus(`Ошибка подключения: ${err.message}`, true);
      noteTechError(`tbank-unlock: ${err.message}`);
    });
  });
  bindTbankPassphraseModalUi();
  $("cache-save-file").addEventListener("click", saveCacheToFile);
  $("cache-load-file").addEventListener("click", () => $("cache-file-input").click());
  $("cache-file-input").addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file || !state.candleCache) return;
    try {
      const text = await file.text();
      setCalcStatus("Загрузка файла в базу цен…");
      await state.candleCache.importJson(text, true);
      updateCacheHint("загружено из файла");
      const s = state.candleCache.stats();
      setCalcStatus(`База цен загружена из файла: ${s.entries} инстр./ТФ, ${s.bars} свечей.`);
    } catch (err) {
      setCalcStatus(`Ошибка загрузки базы цен: ${err.message}`);
    } finally {
      ev.target.value = "";
    }
  });
  $("cache-clear").addEventListener("click", async () => {
    if (!state.candleCache) return;
    if (!window.confirm("Удалить все сохранённые свечи из браузерной базы цен? Это действие нельзя отменить.")) return;
    await state.candleCache.clear();
    updateCacheHint("цены удалены");
    setCalcStatus("База цен удалена.");
  });
  OPT_BUTTONS.forEach(({ btnId, kind }) => {
    const btn = $(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => { void toggleOptim(kind); });
  });
  if (!bridgeApi()?.setFormCatalog) {
    $("calc-sec-all-shares").addEventListener("change", () => onMarketCheckboxChange("shares", "calc-sec-all-shares"));
    $("calc-sec-all-futures").addEventListener("change", () => onMarketCheckboxChange("futures", "calc-sec-all-futures"));
  }
  $("calc-sec").addEventListener("change", onSecSelectionChanged);
  $("prefix-pick-stocks").addEventListener("click", () => {
    reloadShareList();
    saveConfig();
    setCalcStatus(
      state.packs.length
      ? `Список акций обновлён (${state.shareList.length}). Нажмите «Рассчитать».`
      : `Список акций обновлён (${state.shareList.length}). Выберите инструменты и нажмите «Рассчитать».`
    );
    if (state.packs.length) invalidateFinrespResult(false);
  });
  $("prefix-pick-futures").addEventListener("click", async () => {
    setBusy(true);
    setCalcStatus("Подбор фьючерсов MOEX за период расчёта…");
    try {
      const n = await reloadFuturesListFromMoex();
      if (!n) {
        setCalcStatus("MOEX не вернул активных фьючерсов по указанным префиксам.");
        return;
      }
      setCalcStatus(
        state.packs.length
        ? `Подобрано ${n} контрактов MOEX, выбор обновлён. Нажмите «Рассчитать».`
        : `Подобрано ${n} контрактов MOEX, выбор обновлён. Нажмите «Рассчитать».`
      );
      saveConfig();
      if (state.packs.length) invalidateFinrespResult(false);
    } catch (err) {
      setCalcStatus(`Ошибка подбора фьючерсов: ${err.message}`);
    } finally {
      setBusy(false);
    }
  });
  ["prefix-stocks", "prefix-futures"].forEach((id) => {
    const onPrefixFieldChange = () => {
      const repaired = ensurePrefixFieldsNotEmpty();
      if (id === "prefix-stocks") reloadShareList();
      else reloadFuturesList();
      saveConfig();
      if (repaired) {
        setCalcStatus("Список тикеров был пуст — восстановлены значения по умолчанию. Выберите бумаги и нажмите «Рассчитать».");
      }
    };
    $(id).addEventListener("change", onPrefixFieldChange);
    $(id).addEventListener("input", saveConfig);
  });
  $("logic-apply").addEventListener("click", () => {
    applyEditorParams();
    updatePositionSlHint();
    invalidateFormChange();
  });
  $("logic-line-add")?.addEventListener("click", () => { promptAddLogicLine(); });
  $("logic-catalog-export")?.addEventListener("click", () => { exportLogicCatalog(); });
  $("logic-catalog-import")?.addEventListener("click", () => {
    state.pendingLogicImportKey = null;
    $("logic-catalog-file-input")?.click();
  });
  $("logic-catalog-restore-defaults")?.addEventListener("click", () => { restoreDefaultLogicCatalog(); });
  $("calc-restore-defaults")?.addEventListener("click", () => { restoreCalcDefaultsInteractive(); });
  $("calc-protocol-download")?.addEventListener("click", () => { downloadLastProtocol(); });
  $("calc-protocol-load")?.addEventListener("click", () => { $("calc-protocol-file-input")?.click(); });
  $("logic-catalog-file-input")?.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    try {
      await importLogicFromFile(file, null);
    } catch (err) {
      setCalcStatus(`Ошибка импорта каталога: ${err.message}`);
      noteTechError(`logic-catalog-import: ${err.message}`);
    }
  });
  $("logic-line-file-input")?.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    const key = state.pendingLogicImportKey;
    ev.target.value = "";
    state.pendingLogicImportKey = null;
    if (!file || !key) return;
    try {
      await importLogicFromFile(file, key);
    } catch (err) {
      setCalcStatus(`Ошибка импорта логики: ${err.message}`);
      noteTechError(`logic-line-import: ${err.message}`);
    }
  });
  $("calc-protocol-file-input")?.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    loadProtocolFromFileInput(file);
  });
  $("logic-lines")?.addEventListener("click", (ev) => {
    const helpBtn = ev.target?.closest?.("[data-help-logic]");
    if (helpBtn) {
      showLogicHelp(helpBtn.getAttribute("data-help-logic"));
      return;
    }
    const exportBtn = ev.target?.closest?.("[data-export-logic]");
    if (exportBtn) {
      exportLogicLine(exportBtn.getAttribute("data-export-logic"));
      return;
    }
    const importBtn = ev.target?.closest?.("[data-import-logic]");
    if (importBtn) {
      state.pendingLogicImportKey = importBtn.getAttribute("data-import-logic");
      $("logic-line-file-input")?.click();
      return;
    }
    const copyBtn = ev.target?.closest?.("[data-copy-logic]");
    if (copyBtn) {
      copyLogicLine(copyBtn.getAttribute("data-copy-logic"));
      return;
    }
    const delBtn = ev.target?.closest?.("[data-delete-logic]");
    if (delBtn && !delBtn.disabled) {
      deleteLogicLine(delBtn.getAttribute("data-delete-logic"));
    }
  });
  $("calc-logic").addEventListener("change", () => {
    const sel = $("calc-logic");
    if (sel && [...sel.selectedOptions].length) state.logicSelectionCleared = false;
  });
  $("vol-type").addEventListener("change", () => { syncVolumeFields(); invalidateFormChange(); });
  $("live-order-type").addEventListener("change", () => { saveConfig(); syncLiveTradingUi(); });
  $("live-candle-source").addEventListener("change", () => { saveConfig(); syncLiveTradingUi(); });
  $("param-reverse-toggle")?.addEventListener("click", toggleReverseInteractive);
  $("param-reverse-signals-toggle")?.addEventListener("click", toggleReverseSignals);
  bindEquityChartCopyUi();
  bindEquityDeltaPeriodUi();
  bindLogicPickerUi();
  ["vol-value", "vol-deposit", "vol-maxpos", "commission-pct", "param-sl", "param-tp", "param-atr-sl", "param-lr", "param-lin-k", "param-sma-corridor", "param-cma-len", "param-cma-pow", "param-strict", "stopper-sl-mult", "stopper-tp-mult", "stopper-atr-len", "stopper-ref"].forEach((id) => {
    $(id).addEventListener("change", () => { syncLeverageDisplay(); renderFromParams(); saveConfig(); });
    $(id).addEventListener("input", () => { syncLeverageDisplay(); renderFromParams(); });
  });
  OPT_BUTTONS.forEach(({ inputId }) => {
    if (!inputId) return;
    $(inputId).addEventListener("change", renderFromParams);
    $(inputId).addEventListener("input", renderFromParams);
  });
  document.querySelectorAll("#indicator-toggles input[type=checkbox]").forEach((el) => {
    el.addEventListener("change", renderFromParams);
  });
  $("random-price-shift")?.addEventListener("change", () => { saveConfig(); renderFromParams(); });
  bindObTrendConfirmUi();
  bindLiveReversePanelUi();
  bindLiveReverseSignalsPanelUi();
  bindLiveAutoReversesPanelUi();
  $("calc-tf").addEventListener("change", () => {
    const n = selectedInstrumentCount();
    if (n > 0 && enforceDateRange("till", n)) {
      clearWindowAnchor();
      setCalcStatus(`Таймфрейм изменён — период сужен до ${maxCalcDays($("calc-tf").value, n)} дн.`);
    } else {
      enforceDateRange("till", 0);
      updateDateHint(n);
    }
    if (state.packs.length) setSliderBounds(true);
    saveConfig();
    redrawEquityChartsFromCache();
    if (isLiveMode() && state.live.chartSession) {
      startLiveModePoll();
      if (!state.live.candleRefreshBusy) void refreshLiveCandleStream({ silent: true });
    } else if (state.packs.length) invalidateFinrespResult();
  });
  $("calc-month").addEventListener("change", () => {
    applyMonthSelection();
    saveConfig();
    if (state.packs.length) invalidateFinrespResult();
  });
  $("calc-from").addEventListener("change", () => {
    state.userDateRangeTouched = true;
    enforceDateRange("from");
    clearWindowAnchor();
    syncMonthInputFromDates();
    updateDateHint(selectedInstrumentCount());
    saveConfig();
    if (state.packs.length) invalidateFinrespResult();
  });
  $("calc-till").addEventListener("change", () => {
    state.userDateRangeTouched = true;
    enforceDateRange("till");
    clearWindowAnchor();
    syncMonthInputFromDates();
    updateDateHint(selectedInstrumentCount());
    saveConfig();
    if (state.packs.length) invalidateFinrespResult();
  });
  $("calc-start").addEventListener("input", () => {
    state.movedSlider = "start";
    saveWindowAnchor();
    invalidateFormChange();
  });
  $("calc-end").addEventListener("input", () => {
    state.movedSlider = "end";
    saveWindowAnchor();
    invalidateFormChange();
  });
  bindCoreCollapsibleToggles();
  bindLivePanelCollapsibleToggles();
  }

  /** Восстановить Angular-форму из localStorage после рендера компонентов. */
  function finalizeAngularFormFromConfig() {
    const cfg = readSavedConfig();
    const api = bridgeApi();
    if (cfg && api?.applyFormSnapshot) {
      api.applyFormSnapshot({
        timeframe: cfg.timeframe || "60",
        from: cfg.from || "",
        till: cfg.till || "",
        accountMode: cfg.accountMode || "paper"
      });
      syncMonthInputFromDates();
      api.applyFormSnapshot({ month: $("calc-month")?.value || "" });
      if (Array.isArray(cfg.logics)) {
        api.applyFormSnapshot({ logicIds: cfg.logics.filter(Boolean) });
        state.logicSelectionCleared = cfg.logics.length === 0;
      }
      const savedInst = state.restoredSelectedInstruments || [];
      if (savedInst.length) {
        api.applyFormSnapshot({
          instrumentIds: savedInst.map((i) => String(i.sec || "").trim()).filter(Boolean)
        });
      }
    } else {
      api?.syncFormFromDom?.();
    }
    syncAccountModeUi();
    bootstrapLiveTradingPanelVisibility();
    api?.onBootReady?.();
  }

  try {
    fillLogicSelect();
    fillLogicEditor();
    initIndicatorToggles();
    updatePositionSlHint();
    initPrefixFields();
    initAccountMode();
    initDates();
    applySavedConfig();
    fillLogicSelect();
    updatePositionSlHint();
    updateAtParamsSummary();
    initOptButtonIcons();
    syncReverseUi();
    syncReverseSignalsUi();
    syncAutoReversesUi();
    syncMonthInputFromDates();
    syncVolumeFields();
    syncLeverageDisplay();
    const prefixesRepaired = ensurePrefixFieldsNotEmpty();
    initInstrumentLists();
    applyRestoredInstrumentSelection();
    updateDateHint(selectedInstrumentCount());
    if (prefixesRepaired) saveConfig();
    if (!state.shareList.length && !state.futuresList.length) {
      setCalcStatus("Список инструментов пуст — откройте «Дополнительные параметры» → MOEX, проверьте тикеры и нажмите «Подобрать», либо Ctrl+F5.");
      noteTechError("instrument lists empty after init");
    } else if (prefixesRepaired) {
      setCalcStatus(`Восстановлены тикеры по умолчанию (${state.shareList.length} акций). Выберите бумаги и нажмите «Рассчитать».`);
    }
    bindUiEvents();
    initCandleCache();
    applyUiLocks();
    syncAccountModeUi();
    const runLiveInit = async () => {
      if (isTbankBackedMode()) {
        const stored = !!safeStorageGet(TBANK_TOKEN_STORE_KEY);
        await connectTbankAndLoadDeposit({
          interactive: stored && !state.tbank.token,
          openUi: true
        });
        if (isLiveMode()) await connectTbankForLive();
      }
      if (isLiveMode()) {
        await refreshLiveManualLimitPrice({ force: true }).catch(() => {});
        if ($("live-sandbox-mode")?.checked) {
          await enableLiveSandbox().catch((err) => {
            noteLiveTech("live-sandbox-init", err.message);
          });
          syncLiveTradingUi();
        }
      }
      state._initOk = true;
      syncPageVersionBadge();
      syncProtocolUi();
      updateTechInfo("init-ok");
    };
    runLiveInit().catch((err) => {
      noteTechError(`live-init: ${err?.message || err}`);
      state._initOk = true;
      syncPageVersionBadge();
      syncProtocolUi();
      updateTechInfo("init-ok-partial");
    });
  } catch (err) {
    noteTechError(`init: ${err?.message || err}`);
    setCalcStatus(
      `Ошибка инициализации: ${err.message}. Переключение «Реальная торговля» работает; обновите Ctrl+F5 или запустите run-dev.bat.`
    );
    try { bindUiEvents(); } catch (bindErr) {
      noteTechError(`bindUiEvents: ${bindErr?.message || bindErr}`);
    }
    bootstrapLiveTradingPanelVisibility();
    updateTechInfo("init-fail");
    window.__mlFinresp.bootPhase = "partial";
  }
  window.__mlSyncAccountMode = () => syncAccountModeUi();
  window.__mlOnAccountModeUserChange = handleAccountModeUserChange;
  window.__mlFinrespVersion = CALC_PAGE_VERSION;
  window.__mlFinresp.bootPhase = "ok";
  finalizeAngularFormFromConfig();
  installBridgeWindowHandler();
  bootstrapLiveTradingPanelVisibility();
})();
