/*
 * Indicator registry for MultiLogic FINRESP engine.
 * Loaded BEFORE MultiLogic_FinrespCalculator.engine.js (browser) and before loadEngine() (Node tests).
 */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};
  if (typeof reg.register !== "function") {
    reg.register = (key, value) => {
      reg[key] = value;
      return value;
    };
  }
})(typeof window !== "undefined" ? window : globalThis);

