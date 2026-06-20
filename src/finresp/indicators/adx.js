/* ADX (+DI / −DI) — Wilder smoothing, период len (обычно 14). */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};

  reg.adxSeries = function adxSeries(candles, len) {
    const period = Math.max(2, Math.trunc(len));
    const n = candles?.length || 0;
    const adx = new Array(n).fill(null);
    const plusDi = new Array(n).fill(null);
    const minusDi = new Array(n).fill(null);
    if (n < period + 2) return { adx, plusDi, minusDi };

    const tr = new Array(n).fill(0);
    const pDm = new Array(n).fill(0);
    const mDm = new Array(n).fill(0);

    for (let i = 1; i < n; i++) {
      const c = candles[i];
      const prev = candles[i - 1];
      const up = c.high - prev.high;
      const down = prev.low - c.low;
      pDm[i] = up > down && up > 0 ? up : 0;
      mDm[i] = down > up && down > 0 ? down : 0;
      tr[i] = Math.max(
        c.high - c.low,
        Math.abs(c.high - prev.close),
        Math.abs(c.low - prev.close)
      );
    }

    let smTr = 0;
    let smP = 0;
    let smM = 0;
    for (let i = 1; i <= period; i++) {
      smTr += tr[i];
      smP += pDm[i];
      smM += mDm[i];
    }

    let smAdx = null;
    let dxCount = 0;

    for (let i = period; i < n; i++) {
      if (i > period) {
        smTr = smTr - smTr / period + tr[i];
        smP = smP - smP / period + pDm[i];
        smM = smM - smM / period + mDm[i];
      }
      const pdi = smTr > 0 ? (100 * smP) / smTr : 0;
      const mdi = smTr > 0 ? (100 * smM) / smTr : 0;
      plusDi[i] = pdi;
      minusDi[i] = mdi;
      const sum = pdi + mdi;
      const dx = sum > 0 ? (100 * Math.abs(pdi - mdi)) / sum : 0;
      if (smAdx == null) {
        dxCount += 1;
        smAdx = ((smAdx ?? 0) * (dxCount - 1) + dx) / dxCount;
        if (dxCount >= period) adx[i] = smAdx;
      } else {
        smAdx = (smAdx * (period - 1) + dx) / period;
        adx[i] = smAdx;
      }
    }

    return { adx, plusDi, minusDi };
  };
})(typeof window !== "undefined" ? window : globalThis);
