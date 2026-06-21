/* Linear regression channel indicator series (and ATR-banded channel). */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};

  reg.linRegSeries = function linRegSeries(closes, len, devMult) {
    const up = new Array(closes.length).fill(null);
    const center = new Array(closes.length).fill(null);
    const down = new Array(closes.length).fill(null);
    for (let i = len - 1; i < closes.length; i++) {
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      for (let j = 0; j < len; j++) {
        const x = j;
        const y = closes[i - len + 1 + j];
        sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
      }
      const slope = (len * sumXY - sumX * sumY) / (len * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / len;
      const c1 = intercept + slope * (len - 1);
      let varSum = 0;
      for (let j = 0; j < len; j++) {
        const y = closes[i - len + 1 + j];
        const fit = intercept + slope * j;
        varSum += (y - fit) ** 2;
      }
      const std = Math.sqrt(varSum / len);
      center[i] = c1;
      up[i] = c1 + devMult * std;
      down[i] = c1 - devMult * std;
    }
    return { up, center, down };
  };

  /** LinReg center ± K×ATR (Parsa/UCT style band). */
  reg.linRegAtrSeries = function linRegAtrSeries(closes, candles, len, kMult, atrLen) {
    const lr = reg.linRegSeries;
    const atrSeries = reg.atrSeries;
    if (typeof lr !== "function") throw new Error("linRegAtrSeries requires linRegSeries");
    if (typeof atrSeries !== "function") throw new Error("linRegAtrSeries requires atrSeries; load indicators/atr.js first");
    const center = lr(closes, len, 2).center;
    const atr = atrSeries(candles, atrLen);
    const up = new Array(closes.length).fill(null);
    const down = new Array(closes.length).fill(null);
    const k = Math.max(0, Number(kMult) || 0);
    for (let i = 0; i < closes.length; i++) {
      const mid = center[i];
      const a = atr[i];
      if (mid == null || a == null || k <= 0) continue;
      up[i] = mid + k * a;
      down[i] = mid - k * a;
    }
    return { up, down, center };
  };
})(typeof window !== "undefined" ? window : globalThis);

