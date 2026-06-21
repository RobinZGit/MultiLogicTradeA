/* FINRESP calculation worker — keeps UI responsive during runMultiAsync */
(function () {
  const base = self.location.href.replace(/[^/]+$/, "");
  function imp(path) {
    importScripts(base + path);
  }

  imp("indicators/_registry.js");
  imp("indicators/_utils.js");
  imp("indicators/sma.js");
  imp("indicators/cma.js");
  imp("indicators/atr.js");
  imp("indicators/stoch.js");
  imp("indicators/tot/totstoch.js");
  imp("indicators/ctg/contango-series.js");
  imp("indicators/ctg/ctgstoch.js");
  imp("indicators/linreg.js");
  imp("indicators/bollinger.js");
  imp("indicators/momentum.js");
  imp("indicators/vwap.js");
  imp("indicators/cci.js");
  imp("indicators/macd.js");
  imp("indicators/rand.js");
  imp("logics/parser.js");
  imp("logics/registry.js");
  imp("logics/fragments.js");
  imp("logics/rnd.js");
  imp("logics/tbc.js");
  imp("logics/ut.js");
  imp("logics/uct.js");
  imp("logics/l5.js");
  imp("logics/l1.js");
  imp("logics/l2.js");
  imp("logics/l3.js");
  imp("logics/l4.js");
  imp("logics/sma_below.js");
  imp("logics/sma_above.js");
  imp("logics/sma_corridor_trend.js");
  imp("logics/sma_corridor_anti.js");
  imp("logics/fts.js");
  imp("logics/ftt.js");
  imp("logics/fts_s.js");
  imp("logics/ftt_s.js");
  imp("logics/cml.js");
  imp("logics/cms.js");
  imp("logics/pik.js");
  imp("logics/pikh.js");
  imp("orderbook/_eval.js");
  imp("logics/ob_sma.js");
  imp("logics/ob_only.js");
  imp("logics/_descriptions.js");
  imp("trading-periods.js");
  imp("MultiLogic_FinrespCalculator.engine.js");

  self.onmessage = async (e) => {
    const { id, packs, spec, startIdx, endIdx, params, volConfig, stopperConfig, randomPriceShift, ctgSpotPacks, tradingPeriods, calcTf, recoveryStopConfig, isoLogicSpecs, isoEqByLogic } = e.data || {};
    try {
      const E = self.MultiLogicFinrespEngine;
      if (!E?.runMulti) throw new Error("engine not loaded in worker");
      const runOpts = {
        ...(randomPriceShift ? { signalPacks: E.applyRandomPriceShift(packs) } : {}),
        ...(ctgSpotPacks ? { ctgSpotPacks } : {}),
        ...(tradingPeriods ? { tradingPeriods, calcTf } : {}),
        ...(recoveryStopConfig ? { recoveryStopConfig } : {}),
        ...(isoLogicSpecs ? { isoLogicSpecs } : {}),
        ...(isoEqByLogic ? { isoEqByLogic } : {}),
        onProgress: (pct, text, detail) => {
          self.postMessage({ id, type: "progress", pct, text, detail: detail || null });
        }
      };
      const result = await E.runMultiAsync(packs, spec, startIdx, endIdx, params, volConfig, stopperConfig, runOpts);
      if (result?.perSec) {
        for (const row of result.perSec) delete row.indicatorCache;
      }
      self.postMessage({ id, ok: true, result });
    } catch (err) {
      self.postMessage({ id, ok: false, error: err?.message || String(err) });
    }
  };
})();
