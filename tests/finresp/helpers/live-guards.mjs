/**
 * Зеркало liveRefreshMayProceed из MultiLogic_FinrespCalculator.live.js (чистая логика для тестов).
 * @param {{ isLiveMode: boolean, chartSession: boolean, active: boolean, tradingActionBusy: boolean, uiBusy: boolean }} state
 * @param {boolean} needsBootstrap
 */
export function liveRefreshMayProceed(state, needsBootstrap) {
  if (!state.isLiveMode || !state.chartSession) return false;
  if (state.sandboxToggleBusy) return false;
  const priority = !!needsBootstrap || !!state.active;
  if (state.tradingActionBusy && !priority) return false;
  if (state.uiBusy && !priority) return false;
  return true;
}

/**
 * Зеркало liveCriticalToggleDisabled: «Начать» блокируется на время расчёта; в песочнице — нет.
 */
export function liveCriticalToggleDisabled(state) {
  if (!state.isLiveMode) return true;
  if (state.active) return false;
  if (state.sandbox) return false;
  return !!state.uiBusy;
}

/**
 * Не запускать второй fetch стакана, пока первый в полёте.
 */
export function shouldScheduleOrderBookRefresh(panelOpen, orderBookBusy) {
  return !!panelOpen && !orderBookBusy;
}

export function simulateLivePollApplyWork(E, packs, specStack, logicIds, params, vol, indicators, tailBars, options) {
  const opts = options || {};
  const tail = tailBars ?? 220;
  const portfolioCap = E.createPortfolioCap(vol);
  const perSec = [];
  const t0 = performance.now();

  for (let pi = 0; pi < packs.length; pi++) {
    const candles = packs[pi];
    if (!candles?.length || candles.length < 3) continue;
    const b = candles.length - 1;
    const a = Math.max(0, b - tail + 1);
    const r = E.runOnCandles(candles, specStack, a, b, params, vol, { sec: candles[0].sec, portfolioCap });
    if (!r.rows?.length) continue;
    const last = r.rows.at(-1);
    const probe = E.probeLogicSignalsAtBar(candles, specStack, params, {
      barIndex: b,
      pos: r.pos,
      entryBarIdx: r.simState?.entryBarIdx,
      entryMid: r.simState?.entryMid,
      entryBeta: r.simState?.entryBeta,
      reverse: params.Reverse,
      lastRow: last
    });
    perSec.push({ sec: candles[0].sec, ...r, signalProbe: probe });
  }

  const finrespMs = performance.now() - t0;
  let equityMs = 0;
  if (opts.includeSyncEquity && perSec.length) {
    const ref = packs.find((p) => p?.length);
    const b = ref.length - 1;
    const a = Math.max(0, b - tail + 1);
    const eqT0 = performance.now();
    for (const id of logicIds) {
      const spec = E.resolveLogicSpec(id, {}, params, indicators);
      if (!spec || spec.disabled) continue;
      const { perSec: eqPerSec } = E.runMulti(packs, spec, a, b, params, vol, {
        useSl: false, useTp: false, slMult: 0, tpMult: 0, atrLen: 14, refEquity: 0
      }, {});
      E.buildPortfolioEquityRows(eqPerSec, ref.slice(a, b + 1).map((c) => c.time).filter(Boolean));
    }
    equityMs = performance.now() - eqT0;
  }

  return {
    perSec,
    finrespMs,
    equityMs,
    totalMs: finrespMs + equityMs
  };
}
