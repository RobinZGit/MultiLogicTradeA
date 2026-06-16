/* Stochastic oscillator indicator series. */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};
  reg.stochSeries = function stochSeries(candles, kLen, kSmooth, dSmooth) {
    const kRaw = new Array(candles.length).fill(null);
    for (let i = 0; i < candles.length; i++) {
      if (i < kLen - 1) continue;
      let lo = Infinity, hi = -Infinity;
      for (let j = i - kLen + 1; j <= i; j++) {
        lo = Math.min(lo, candles[j].low);
        hi = Math.max(hi, candles[j].high);
      }
      kRaw[i] = hi === lo ? 50 : (candles[i].close - lo) / (hi - lo) * 100;
    }
    const smooth = (src, n) => {
      const o = new Array(src.length).fill(null);
      let sum = 0;
      for (let i = 0; i < src.length; i++) {
        if (src[i] == null) continue;
        sum += src[i];
        if (i >= n) sum -= src[i - n] ?? 0;
        if (i >= n - 1) o[i] = sum / n;
      }
      return o;
    };
    const k = smooth(kRaw, kSmooth);
    const d = smooth(k, dSmooth);
    return { k, d };
  };
})(typeof window !== "undefined" ? window : globalThis);

