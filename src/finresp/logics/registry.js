/*
 * Built-in Op/Cl logic registry for MultiLogic FINRESP.
 * Loaded BEFORE logics/*.js and MultiLogic_FinrespCalculator.engine.js.
 */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespLogics = root.MultiLogicFinrespLogics || {};
  const byId = reg._byId = reg._byId || new Map();
  const order = reg._order = reg._order || [];

  if (typeof reg.register !== "function") {
    reg.register = (def) => {
      const id = String(def.id || def.key || "");
      if (!id) throw new Error("MultiLogicFinrespLogics.register: missing id");
      const entry = {
        id,
        name: def.name || id,
        type: def.type || "logic_line",
        defaultLine: def.defaultLine
      };
      if (!byId.has(id)) order.push(id);
      byId.set(id, entry);
      return entry;
    };
  }

  if (typeof reg.get !== "function") {
    reg.get = (id) => byId.get(String(id));
  }

  if (typeof reg.defaultLines !== "function") {
    reg.defaultLines = () => {
      const out = {};
      for (const id of order) {
        const e = byId.get(id);
        if (e && e.defaultLine != null) out[id] = e.defaultLine;
      }
      return out;
    };
  }

  if (typeof reg.builtinMeta !== "function") {
    reg.builtinMeta = () => order.map((id) => {
      const e = byId.get(id);
      return {
        id: e.id,
        name: e.name || e.id,
        type: e.type || "logic_line",
        key: e.id
      };
    });
  }

  if (typeof reg.resolveLine !== "function") {
    reg.resolveLine = (id, customLines) => {
      const key = String(id || "");
      const lines = customLines || {};
      if (Object.prototype.hasOwnProperty.call(lines, key)) {
        return String(lines[key] ?? "");
      }
      const e = byId.get(key);
      return e?.defaultLine != null ? e.defaultLine : "";
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
