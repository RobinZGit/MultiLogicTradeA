/* Rand indicator helpers (deterministic roll per bar). */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};

  function parsePercentFraction(raw) {
    const s = String(raw ?? "").trim();
    if (!s) return 0;
    const pct = s.endsWith("%");
    const n = parseFloat(pct ? s.slice(0, -1) : s);
    if (!Number.isFinite(n)) return 0;
    const v = pct ? (n / 100) : n;
    return Math.max(0, Math.min(1, v));
  }

  /** Deterministic [0,1) based on bar index and salt. */
  function deterministic01(idx, salt) {
    let x = ((idx + 1) * 374761393 + (salt | 0) * 668265263) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0;
    return (x >>> 0) / 4294967296;
  }

  /** Rand state at bar: entry attempt and side. Uses cache._randRolls map. */
  reg.randBarRoll = function randBarRoll(cache, idx, pm) {
    if (!cache._randRolls) cache._randRolls = new Map();
    const seed = parseInt(pm.Seed || pm.seed || "0", 10) || 0;
    const pRaw = pm.P ?? pm.p ?? "12%";
    const key = `${idx}|${seed}|${pRaw}`;
    if (!cache._randRolls.has(key)) {
      const p = parsePercentFraction(pRaw);
      const h1 = deterministic01(idx, seed);
      const h2 = deterministic01(idx + 9973, seed + 17);
      cache._randRolls.set(key, { open: h1 < p, long: h2 < 0.5 });
    }
    return cache._randRolls.get(key);
  };
})(typeof window !== "undefined" ? window : globalThis);

