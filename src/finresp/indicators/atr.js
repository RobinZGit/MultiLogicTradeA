/* ATR indicator series. */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};
  reg.atrSeries = function atrSeries(candles, len) {
    const out = new Array(candles.length).fill(null);
    const trs = [];
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const prev = i > 0 ? candles[i - 1].close : c.close;
      trs.push(Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev)));
      if (i >= len - 1) {
        let s = 0;
        for (let j = i - len + 1; j <= i; j++) s += trs[j];
        out[i] = s / len;
      }
    }
    return out;
  };
})(typeof window !== "undefined" ? window : globalThis);

