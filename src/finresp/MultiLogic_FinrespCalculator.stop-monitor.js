/*
 * MultiLogic FINRESP — единый ритм проверки стопов (фаза 1).
 *
 * Чистые функции оценки; side effects — в live.js (poll driver).
 * Bar driver в расчёте пока остаётся в engine.js (evaluateBarStopTick — заглушка).
 */
(function (root) {
  "use strict";

  const RHYTHM = Object.freeze({ BAR: "bar", POLL: "poll" });

  const STOP_KIND = Object.freeze({
    POSITION_SL: "position_sl",
    POSITION_TP: "position_tp",
    PORTFOLIO_SL: "portfolio_sl",
    PORTFOLIO_TP: "portfolio_tp",
    RECOVERY_PAUSE: "recovery_pause",
    RECOVERY_RESUME: "recovery_resume"
  });

  const DEFAULT_POLL_MS = 8000;
  const EQUITY_HISTORY_MAX = 400;

  function getEngine() {
    return root.MultiLogicFinrespEngine || null;
  }

  /** Добавить/обновить точку equity в истории (poll-ритм). */
  function appendEquityPoint(history, point, maxLen) {
    const hist = Array.isArray(history) ? history.slice() : [];
    const cap = maxLen ?? EQUITY_HISTORY_MAX;
    const equity = point?.equity;
    const time = point?.time;
    if (!Number.isFinite(equity) || !time) return hist;
    const last = hist[hist.length - 1];
    if (last && last.time === time) {
      hist[hist.length - 1] = { equity, time };
      return hist;
    }
    hist.push({ equity, time });
    if (hist.length > cap) hist.splice(0, hist.length - cap);
    return hist;
  }

  function portfolioReferenceEquity(cfg, watch, history) {
    const refCfg = Math.max(0, +(cfg?.refEquity ?? 0));
    if (refCfg > 0) return refCfg;
    if (watch?.referenceEquity != null && Number.isFinite(watch.referenceEquity)) {
      return watch.referenceEquity;
    }
    const first = history?.[0]?.equity;
    return Number.isFinite(first) ? first : null;
  }

  /** @@PauseOnDrawdown: оценка без закрытия позиций. */
  function evalRecoveryDrawdown(ctx) {
    const {
      enabled,
      paused,
      equity,
      peakEquity,
      drawdownPct,
      tradingActive,
      resumeAt,
      modelEquity
    } = ctx || {};
    if (!enabled) return { action: null };
    if (paused) {
      if (Number.isFinite(resumeAt) && Number.isFinite(modelEquity) && modelEquity >= resumeAt) {
        return {
          action: "resume",
          kind: STOP_KIND.RECOVERY_RESUME,
          meta: { modelEquity, resumeAt }
        };
      }
      return { action: "hold_paused" };
    }
    if (!tradingActive) return { action: null };
    if (!Number.isFinite(equity)) return { action: null };
    let peak = peakEquity;
    if (!Number.isFinite(peak) || equity > peak) peak = equity;
    if (!Number.isFinite(peak) || peak <= 0) return { action: "track_peak", nextPeakEquity: peak };
    const dd = ((peak - equity) / peak) * 100;
    const pct = Math.max(0.01, Math.min(99, +(drawdownPct ?? 1) || 1));
    if (dd >= pct) {
      return {
        action: "pause",
        kind: STOP_KIND.RECOVERY_PAUSE,
        meta: { peak, equity, drawdownPct: dd }
      };
    }
    return { action: "track_peak", nextPeakEquity: peak };
  }

  /** Портфельный @@SL/@@TP на последней точке equityHistory. */
  function evalPortfolioStopper(ctx) {
    const cfg = ctx?.stopperConfig || {};
    if (!cfg.useSl && !cfg.useTp) return { hit: null, watchPatch: null, notifyKey: null };
    const equity = ctx.equity;
    if (!Number.isFinite(equity)) return { hit: null, watchPatch: null, notifyKey: null };

    const time = ctx.time || "";
    const watch = ctx.watch || {};
    const history = appendEquityPoint(watch.equityHistory || [], { equity, time }, EQUITY_HISTORY_MAX);
    let ref = portfolioReferenceEquity(cfg, watch, history);
    if (ref == null && history.length >= 1) ref = history[0].equity;

    const E = getEngine();
    const hit = (E && typeof E.checkPortfolioStopperTrigger === "function")
      ? E.checkPortfolioStopperTrigger(history, cfg, ref)
      : null;

    const watchPatch = {
      equityHistory: history,
      lastBarTime: time,
      referenceEquity: hit ? hit.equity : ref
    };
    const notifyKey = hit ? `${hit.kind}:${hit.time}:${Math.round(hit.equity)}` : null;
    return { hit, watchPatch, notifyKey };
  }

  /** Позиционные @SL/@TP по последнему бару FINRESP (posStop на строке). */
  function scanPositionStops(perSec) {
    const hits = [];
    for (const p of perSec || []) {
      const last = p.rows?.at(-1);
      if (!last) continue;
      const ps = last.posStop;
      if (ps !== "sl" && ps !== "tp") continue;
      const barTime = last.time || "";
      hits.push({
        kind: ps === "sl" ? STOP_KIND.POSITION_SL : STOP_KIND.POSITION_TP,
        sec: p.sec,
        barTime,
        close: last.close,
        notifyKey: `pos-sltp:${p.sec}:${ps}:${barTime}`
      });
    }
    return hits;
  }

  /** Live / sandbox poll-тик: единая оценка всех стопов. */
  function evaluatePollStopTick(ctx) {
    const recoveryLogics = [];
    let recovery = { action: null };

    if (ctx.recoveryPerLogic && Array.isArray(ctx.logicKeys) && ctx.logicKeys.length) {
      for (const logicKey of ctx.logicKeys) {
        const ent = ctx.logicRecovery?.[logicKey] || {};
        const modelEq = ctx.logicModelEquity?.[logicKey];
        const peak = ent.peakEquity;
        const resumeAt = ent.resumeAt;
        const r = evalRecoveryDrawdown({
          enabled: ctx.recoveryEnabled,
          paused: !!ent.disabled,
          tradingActive: ctx.tradingActive,
          equity: modelEq,
          peakEquity: peak,
          drawdownPct: ctx.drawdownPct,
          resumeAt,
          modelEquity: modelEq
        });
        if (r.action && r.action !== "track_peak") {
          recoveryLogics.push({ logicKey, ...r });
        } else if (r.action === "track_peak" && Number.isFinite(r.nextPeakEquity)) {
          recoveryLogics.push({ logicKey, action: "track_peak", nextPeakEquity: r.nextPeakEquity });
        }
      }
    } else {
      recovery = evalRecoveryDrawdown({
        enabled: ctx.recoveryEnabled,
        paused: !!ctx.portfolioDrawdownDisabled,
        tradingActive: ctx.tradingActive,
        equity: ctx.equity,
        peakEquity: ctx.portfolioPeakEquity,
        drawdownPct: ctx.drawdownPct,
        resumeAt: ctx.portfolioResumeAt,
        modelEquity: ctx.modelEquity
      });
    }

    const portfolio = evalPortfolioStopper({
      stopperConfig: ctx.stopperConfig,
      equity: ctx.equity,
      time: ctx.time,
      watch: ctx.portfolioWatch
    });

    const positions = ctx.includePositionStops && ctx.perSec
      ? scanPositionStops(ctx.perSec)
      : [];

    return {
      rhythm: RHYTHM.POLL,
      source: ctx.source || "poll",
      recovery,
      recoveryLogics,
      portfolio,
      positions
    };
  }

  /** Bar driver — расширение для фазы 4 (intrabar / унификация с engine). */
  function evaluateBarStopTick(_ctx) {
    return { rhythm: RHYTHM.BAR, source: "bar", recovery: null, recoveryLogics: [], portfolio: null, positions: [] };
  }

  root.MultiLogicFinrespStopMonitor = {
    RHYTHM,
    STOP_KIND,
    DEFAULT_POLL_MS,
    EQUITY_HISTORY_MAX,
    appendEquityPoint,
    portfolioReferenceEquity,
    evalRecoveryDrawdown,
    evalPortfolioStopper,
    scanPositionStops,
    evaluatePollStopTick,
    evaluateBarStopTick
  };
})(typeof window !== "undefined" ? window : globalThis);
