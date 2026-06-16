/* Total (portfolio-aggregated) Stoch wrapper series. */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};
  reg.totStochSeries = function totStochSeries(totCandles, kLen, kSmooth, dSmooth) {
    const stoch = reg.stochSeries;
    if (typeof stoch !== "function") {
      throw new Error("TotStoch requires stochSeries; load indicators/stoch.js first");
    }
    return stoch(totCandles, kLen, kSmooth, dSmooth);
  };
})(typeof window !== "undefined" ? window : globalThis);

