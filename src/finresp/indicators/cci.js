/* CCI indicator series. */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};
  reg.cciSeries = function cciSeries(candles, len) {
    const out = new Array(candles.length).fill(null);
    const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
    for (let i = len - 1; i < candles.length; i++) {
      let s = 0;
      for (let j = i - len + 1; j <= i; j++) s += tp[j];
      const ma = s / len;
      let md = 0;
      for (let j = i - len + 1; j <= i; j++) md += Math.abs(tp[j] - ma);
      md /= len;
      out[i] = md === 0 ? 0 : (tp[i] - ma) / (0.015 * md);
    }
    return out;
  };
})(typeof window !== "undefined" ? window : globalThis);

