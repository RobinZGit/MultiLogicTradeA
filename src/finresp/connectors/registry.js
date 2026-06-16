/*
 * Live broker connector registry for MultiLogic FINRESP.
 * Loaded BEFORE connector implementations and MultiLogic_FinrespCalculator.live.js.
 * (Named registry.js — not _registry.js — so GitHub Pages serves the file without Jekyll exclude.)
 */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespConnectors = root.MultiLogicFinrespConnectors || {};
  const factories = reg._factories = reg._factories || new Map();

  if (typeof reg.register !== "function") {
    /** @param {string} id @param {(deps: object) => object} factory */
    reg.register = (id, factory) => {
      factories.set(String(id), factory);
      return factory;
    };
  }

  if (typeof reg.get !== "function") {
    /** @param {string} id @returns {(deps: object) => object|undefined} */
    reg.get = (id) => factories.get(String(id));
  }

  if (typeof reg.create !== "function") {
    /** @param {string} id @param {object} deps */
    reg.create = (id, deps) => {
      const factory = reg.get(id);
      if (!factory) throw new Error(`Connector not registered: ${id}`);
      return factory(deps);
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
