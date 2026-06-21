/* CMA indicator series. */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};

  /**
   * CMA: weighted close average.
   * In window: norm price n_i = p_i / Σp; weight w_i = n_i^P / Σn_j^P (Σw_i = 1); CMA = Σ w_i·p_i.
   * P = 0 → equal weights → SMA.
   */
  reg.cmaSeries = function cmaSeries(closes, len, power) {
    const out = new Array(closes.length).fill(null);
    const pow = Number.isFinite(+power) ? +power : 0;
    for (let i = len - 1; i < closes.length; i++) {
      let priceSum = 0;
      for (let j = i - len + 1; j <= i; j++) {
        priceSum += Math.max(closes[j], 1e-12);
      }
      if (priceSum <= 0) continue;
      let sumW = 0;
      let sumWP = 0;
      for (let j = i - len + 1; j <= i; j++) {
        const price = Math.max(closes[j], 1e-12);
        const normPrice = price / priceSum;
        const rawW = Math.pow(normPrice, pow);
        sumW += rawW;
        sumWP += rawW * price;
      }
      out[i] = sumW > 0 ? sumWP / sumW : null;
    }
    return out;
  };
})(typeof window !== "undefined" ? window : globalThis);

