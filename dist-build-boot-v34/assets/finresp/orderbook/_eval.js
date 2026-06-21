/*
 * Order-book atom evaluators for FINRESP OB.* DSL (Imb, Spr, Depth).
 * Loaded before MultiLogic_FinrespCalculator.engine.js.
 */
(function (root) {
  "use strict";

  const OB = root.MultiLogicFinrespOrderBook = root.MultiLogicFinrespOrderBook || {};

  function parsePercentFraction(raw) {
    if (raw == null || raw === "") return 0;
    const t = String(raw).trim();
    const n = parseFloat(t.replace("%", ""));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return t.includes("%") || n > 1 ? n / 100 : n;
  }

  function parseParamsMap(raw) {
    const map = {};
    for (const part of String(raw || "").split(";")) {
      const p = part.trim();
      if (!p) continue;
      if (p.includes("=")) {
        const [k, v] = p.split("=");
        map[k.trim()] = v.trim();
      } else if (/^\d+$/.test(p)) {
        map.L = Number(p);
      }
    }
    return map;
  }

  function isObKind(kind) {
    return /^ob\./i.test(String(kind || ""));
  }

  function obKindSuffix(kind) {
    const k = String(kind || "").toLowerCase();
    return k.startsWith("ob.") ? k.slice(3) : "";
  }

  function orderBookPrice(entry) {
    if (entry == null) return NaN;
    if (typeof entry === "number") return entry;
    const p = entry.price ?? entry.p;
    const nano = +(entry.nano ?? entry.n ?? 0);
    if (Number.isFinite(p)) return p + (Number.isFinite(nano) ? nano / 1e9 : 0);
    return NaN;
  }

  function sumOrderBookLevels(ob, depth) {
    const d = Math.max(1, Math.min(+(depth || 0) || 5, 20));
    let bidVol = 0;
    let askVol = 0;
    for (const b of (ob?.bids || []).slice(0, d)) {
      bidVol += Math.max(0, +(b?.quantity ?? b?.qty ?? 0));
    }
    for (const a of (ob?.asks || []).slice(0, d)) {
      askVol += Math.max(0, +(a?.quantity ?? a?.qty ?? 0));
    }
    return { bidVol, askVol, total: bidVol + askVol };
  }

  function normalizeTradeSide(tradeSide) {
    const s = String(tradeSide || "").toLowerCase();
    if (s === "sell" || s === "short") return "sell";
    return "buy";
  }

  function evaluateImb(ob, pm, sig, tradeSide) {
    const mode = String(pm.Mode || pm.mode || "trend").toLowerCase();
    const depth = parseInt(pm.D || pm.L || pm.Depth || "5", 10);
    const thr = parsePercentFraction(pm.Thr || pm.thr || "12%") || 0.12;
    const { bidVol, askVol, total } = sumOrderBookLevels(ob, depth);
    if (total < 1) return false;
    const imb = (bidVol - askVol) / total;
    const buy = normalizeTradeSide(tradeSide) === "buy";
    let ok = false;
    if (mode === "anti") ok = buy ? imb <= -thr : imb >= thr;
    else if (mode === "notrend" || mode === "flat") ok = Math.abs(imb) < thr;
    else ok = buy ? imb >= thr : imb <= -thr;
    const sigU = String(sig || "").replace(/\s+/g, "").toUpperCase();
    if (sigU === "BUYOK") return buy && ok;
    if (sigU === "SELLOK") return !buy && ok;
    if (sigU === "OK" || sigU === "TRENDOK") return ok;
    return ok;
  }

  function evaluateSpr(ob, pm, sig) {
    const bid = orderBookPrice(ob?.bids?.[0]);
    const ask = orderBookPrice(ob?.asks?.[0]);
    if (!Number.isFinite(bid) || !Number.isFinite(ask) || ask <= bid) return false;
    const mid = (bid + ask) / 2;
    const spr = (ask - bid) / mid;
    const max = parsePercentFraction(pm.Max || pm.max || "0.1%") || 0.001;
    const tight = spr <= max;
    const sigU = String(sig || "").replace(/\s+/g, "").toUpperCase();
    if (sigU === "WIDE") return !tight;
    if (sigU === "TIGHT" || sigU === "OK") return tight;
    return tight;
  }

  function evaluateDepth(ob, pm, sig) {
    const d = parseInt(pm.D || pm.Depth || "5", 10);
    const min = parseFloat(pm.Min || pm.min || "100");
    const { total } = sumOrderBookLevels(ob, d);
    const liquid = Number.isFinite(min) && min > 0 ? total >= min : total >= 100;
    const sigU = String(sig || "").replace(/\s+/g, "").toUpperCase();
    if (sigU === "THIN") return !liquid;
    if (sigU === "LIQUID" || sigU === "OK") return liquid;
    return liquid;
  }

  OB.isObKind = isObKind;
  OB.parseParamsMap = parseParamsMap;
  OB.parsePercentFraction = parsePercentFraction;
  OB.sumOrderBookLevels = sumOrderBookLevels;

  OB.evaluateAtom = function evaluateObAtom(ob, atom, tradeSide) {
    if (!ob || !atom) return false;
    const pm = parseParamsMap(atom.params);
    const suffix = obKindSuffix(atom.kind);
    if (suffix === "imb") return evaluateImb(ob, pm, atom.signal, tradeSide);
    if (suffix === "spr" || suffix === "spread") return evaluateSpr(ob, pm, atom.signal);
    if (suffix === "depth") return evaluateDepth(ob, pm, atom.signal);
    return false;
  };

  OB.analyzeParsed = function analyzeParsed(parsed) {
    const all = [...(parsed?.opAtoms || []), ...(parsed?.clAtoms || [])];
    const obAtoms = all.filter((a) => isObKind(a?.kind));
    const candleAtoms = all.filter((a) => !isObKind(a?.kind));
    return {
      usesOb: obAtoms.length > 0,
      obOnly: obAtoms.length > 0 && candleAtoms.length === 0,
      obMixed: obAtoms.length > 0 && candleAtoms.length > 0,
      obAtomCount: obAtoms.length,
      obAtoms,
      candleAtoms
    };
  };
})(typeof window !== "undefined" ? window : globalThis);
