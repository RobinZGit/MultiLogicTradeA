/* FINRESP calculation worker — keeps UI responsive during runMultiAsync */
importScripts("MultiLogic_FinrespCalculator.engine.js");

self.onmessage = async (e) => {
  const { id, packs, spec, startIdx, endIdx, params, volConfig, stopperConfig, randomPriceShift } = e.data || {};
  try {
    const E = self.MultiLogicFinrespEngine;
    if (!E?.runMulti) throw new Error("engine not loaded in worker");
    const runOpts = {
      ...(randomPriceShift ? { signalPacks: E.applyRandomPriceShift(packs) } : {}),
      onProgress: (pct, text, detail) => {
        self.postMessage({ id, type: "progress", pct, text, detail: detail || null });
      }
    };
    // Синхронный runMulti: без yieldUi/delay на каждом баре сетки (runMultiAsync в worker был в разы медленнее).
    const result = E.runMulti(packs, spec, startIdx, endIdx, params, volConfig, stopperConfig, runOpts);
    if (result?.perSec) {
      for (const row of result.perSec) delete row.indicatorCache;
    }
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err?.message || String(err) });
  }
};
