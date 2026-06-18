import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";
import { makeCandles } from "./helpers/candles.mjs";

const E = loadEngine();
const vol = { deposit: 7000, maxPositions: 10, volume: 10 };

function normLine(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function finrespForLine(line, packs, params = E.DEFAULT_PARAMS) {
  const custom = { __test: line };
  const spec = E.resolveLogicSpec("__test", custom, params, { stoch: true, ctgstoch: true });
  const { agg } = E.runMulti(packs, spec, 0, packs[0].length - 1, params, vol, E.DEFAULT_STOPPER);
  return agg.finresp;
}

describe("bakeConjugateLogicLine / conjugateLogicLineVariants", () => {
  const fts = E.DEFAULT_LOGIC_LINES.FTS;

  it("FTS ⇄↔ отличается от исходной строки", () => {
    const baked = normLine(E.bakeConjugateLogicLine(fts, true, true));
    assert.notEqual(baked, normLine(fts));
    assert.match(baked, /Op\(Short\(/);
  });

  it("FTS ⇄ (только стороны) — Short с теми же порогами K", () => {
    const baked = normLine(E.bakeConjugateLogicLine(fts, true, false));
    assert.match(baked, /Op\(Short\(/);
    assert.match(baked, /K<=20/);
    assert.match(baked, /K>=80/);
  });

  it("conjugateLogicLineVariants: дедуп при совпадении формул", () => {
    const longOnly =
      "Op(Long(Stoch(14-3-3)(K<=20))) Cl(Long(Stoch(14-3-3)(K>=80)))";
    const variants = E.conjugateLogicLineVariants(longOnly);
    for (const v of variants) {
      assert.notEqual(normLine(v.line), normLine(longOnly));
      assert.ok(v.labelSuffix.length >= 1);
    }
    const norms = variants.map((v) => normLine(v.line));
    assert.equal(new Set(norms).size, norms.length);
  });

  it("запечённая логика даёт тот же FINRESP, что runtime ReverseSides+ReverseSignals", () => {
    const packs = [
      makeCandles("GAZP", 320, { startPrice: 180 }),
      makeCandles("SBER", 320, { startPrice: 280 })
    ];
    const baseParams = { ...E.DEFAULT_PARAMS, ReverseSides: false, ReverseSignals: false };
    const revParams = { ...E.DEFAULT_PARAMS, ReverseSides: true, ReverseSignals: true };
    const baseFin = finrespForLine(fts, packs, baseParams);
    const bakedFin = finrespForLine(E.bakeConjugateLogicLine(fts, true, true), packs, baseParams);
    const runtimeFin = (() => {
      const spec = E.resolveLogicSpec("FTS", {}, revParams, { stoch: true, ctgstoch: true });
      const { agg } = E.runMulti(packs, spec, 0, packs[0].length - 1, revParams, vol, E.DEFAULT_STOPPER);
      return agg.finresp;
    })();
    assert.equal(bakedFin, runtimeFin);
    assert.notEqual(bakedFin, baseFin);
  });
});
