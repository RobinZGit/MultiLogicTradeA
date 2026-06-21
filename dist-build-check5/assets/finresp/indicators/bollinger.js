/* Bollinger bands indicator series. */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};
  reg.bollingerSeries = function bollingerSeries(closes, len, devMult) {
    const up = new Array(closes.length).fill(null);
    const center = new Array(closes.length).fill(null);
    const down = new Array(closes.length).fill(null);
    for (let i = len - 1; i < closes.length; i++) {
      let sum = 0;
      for (let j = i - len + 1; j <= i; j++) sum += closes[j];
      const ma = sum / len;
      let varSum = 0;
      for (let j = i - len + 1; j <= i; j++) varSum += (closes[j] - ma) ** 2;
      const std = Math.sqrt(varSum / len);
      center[i] = ma;
      up[i] = ma + devMult * std;
      down[i] = ma - devMult * std;
    }
    return { up, center, down };
  };
})(typeof window !== "undefined" ? window : globalThis);

