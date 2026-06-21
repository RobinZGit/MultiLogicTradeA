/* Linear regression channel indicator series with slopePct (and ATR-banded channel). */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};

  reg.linRegPlusStohSeries = function linRegPlusStohSeries(closes, len, devMult) {
    const up = new Array(closes.length).fill(null);
    const center = new Array(closes.length).fill(null);
    const down = new Array(closes.length).fill(null);
    const slopePct = new Array(closes.length).fill(null); // наклонный стохастик 0-100
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

      // === НАКЛОННЫЕ ОГРАНИЧИТЕЛИ (параллельные линии через экстремумы) ===
      let maxOffset = -Infinity;
      let minOffset = Infinity;
      for (let j = 0; j < len; j++) {
        const y = closes[i - len + 1 + j];
        const fit = intercept + slope * j;
        const offset = y - fit;
        if (offset > maxOffset) maxOffset = offset;
        if (offset < minOffset) minOffset = offset;
      }
      const upperEnvelope = c1 + maxOffset; // верхний наклонный ограничитель
      const lowerEnvelope = c1 + minOffset; // нижний наклонный ограничитель

      // Процент недохода до верхнего наклонного ограничителя (0-100)
      const range = upperEnvelope - lowerEnvelope;
      if (range > 0) {
        const currentPrice = closes[i];
        slopePct[i] = Math.max(0, Math.min(100, ((currentPrice - lowerEnvelope) / range) * 100));
      } else {
        slopePct[i] = 50; // на случай вырожденного канала (все цены одинаковы)
      }
    }
    return { up, center, down, slopePct };
  };

  /** LinReg center ± K×ATR (Parsa/UCT style band) with slopePct. */
  reg.linRegPlusStohAtrSeries = function linRegPlusStohAtrSeries(closes, candles, len, kMult, atrLen) {
    const lr = reg.linRegPlusStohSeries;
    const atrSeries = reg.atrSeries;
    if (typeof lr !== "function") throw new Error("linRegPlusStohAtrSeries requires linRegPlusStohSeries");
    if (typeof atrSeries !== "function") throw new Error("linRegPlusStohAtrSeries requires atrSeries; load indicators/atr.js first");
    const lrResult = lr(closes, len, 2);
    const center = lrResult.center;
    const slopePct = lrResult.slopePct;
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
    return { up, down, center, slopePct };
  };
})(typeof window !== "undefined" ? window : globalThis);
