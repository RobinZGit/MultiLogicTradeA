/* SMA indicator series. */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};
  reg.smaSeries = function smaSeries(closes, len) {
    const out = new Array(closes.length).fill(null);
    let sum = 0;
    for (let i = 0; i < closes.length; i++) {
      sum += closes[i];
      if (i >= len) sum -= closes[i - len];
      if (i >= len - 1) out[i] = sum / len;
    }
    return out;
  };
})(typeof window !== "undefined" ? window : globalThis);

