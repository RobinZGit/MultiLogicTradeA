/* Contango Stoch: stochastic on futures − spot spread series. */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};
  reg.ctgStochSeries = function ctgStochSeries(ctgCandles, kLen, kSmooth, dSmooth) {
    const stoch = reg.stochSeries;
    if (typeof stoch !== "function") {
      throw new Error("CtgStoch requires stochSeries; load indicators/stoch.js first");
    }
    return stoch(ctgCandles || [], kLen, kSmooth, dSmooth);
  };
})(typeof window !== "undefined" ? window : globalThis);
