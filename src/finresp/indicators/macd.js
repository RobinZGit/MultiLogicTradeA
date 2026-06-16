/* MACD indicator series (includes EMA helper). */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};

  reg.emaSeries = function emaSeries(values, len) {
    const out = new Array(values.length).fill(null);
    const k = 2 / (len + 1);
    let prev = null;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v == null) continue;
      if (prev == null) {
        prev = v;
        out[i] = v;
        continue;
      }
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
    return out;
  };

  reg.macdSeries = function macdSeries(closes, fast, slow, signal) {
    const ema = reg.emaSeries;
    if (typeof ema !== "function") throw new Error("macdSeries requires emaSeries");
    const ef = ema(closes, fast);
    const es = ema(closes, slow);
    const macd = closes.map((_, i) => (ef[i] != null && es[i] != null ? ef[i] - es[i] : null));
    const sig = ema(macd.map((v) => v ?? 0), signal);
    return { macd, signal: sig };
  };
})(typeof window !== "undefined" ? window : globalThis);

