/* Momentum indicator series. */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};
  reg.momentumSeries = function momentumSeries(closes, len) {
    const out = new Array(closes.length).fill(null);
    for (let i = len; i < closes.length; i++) {
      out[i] = closes[i] - closes[i - len];
    }
    return out;
  };
})(typeof window !== "undefined" ? window : globalThis);

