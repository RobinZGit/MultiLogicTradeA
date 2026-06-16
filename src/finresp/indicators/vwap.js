/* VWAP indicator series (session reset by day). */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};
  reg.vwapSeries = function vwapSeries(candles) {
    const out = new Array(candles.length).fill(null);
    let pvSum = 0;
    let volSum = 0;
    let currentDay = null;
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const day = String(c.time || "").slice(0, 10);
      if (day && day !== currentDay) {
        currentDay = day;
        pvSum = 0;
        volSum = 0;
      }
      const price = (c.high + c.low + c.close) / 3;
      const vol = Number.isFinite(c.volume) && c.volume > 0 ? c.volume : 1;
      pvSum += price * vol;
      volSum += vol;
      if (volSum > 0) out[i] = pvSum / volSum;
    }
    return out;
  };
})(typeof window !== "undefined" ? window : globalThis);

