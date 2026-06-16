import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";
import { ALL_INDICATORS, makeCandles } from "./helpers/candles.mjs";

const E = loadEngine();
const BAR_COUNT = 260;
const vol = { deposit: 100000, maxPositions: 5, volume: 10, commissionPct: 0 };

function smaBelowSpec() {
  return E.resolveLogicSpec("sma_below", {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
}

describe("runOnCandles", () => {
  it("returns rows and finite pos on synthetic pack", () => {
    const candles = makeCandles("GAZP", BAR_COUNT);
    const spec = smaBelowSpec();
    const a = 120;
    const b = candles.length - 1;
    const r = E.runOnCandles(candles, spec, a, b, E.DEFAULT_PARAMS, vol, { sec: "GAZP" });
    assert.ok(r.rows?.length > 0, "rows not empty");
    assert.ok(Number.isFinite(r.pos));
    assert.ok(Number.isFinite(r.cash));
  });
});

describe("runMulti", () => {
  it("perSec is not empty for multi-instrument packs", () => {
    const packs = ["GAZP", "SBER", "FEES"].map((sec) => makeCandles(sec, BAR_COUNT, { startPrice: 50 + sec.length * 10 }));
    const spec = smaBelowSpec();
    const b = packs[0].length - 1;
    const a = 120;
    const out = E.runMulti(packs, spec, a, b, E.DEFAULT_PARAMS, vol, E.DEFAULT_STOPPER, {});
    assert.equal(out.perSec.length, 3);
    assert.ok(out.agg);
    assert.ok(Number.isFinite(out.agg.finresp));
    for (const p of out.perSec) {
      assert.ok(p.rows?.length > 0, `${p.sec} has rows`);
    }
  });

  it("shared portfolio cap: gross exposure within limit", () => {
    const packs = ["A", "B", "C", "D"].map((sec, i) => makeCandles(sec, BAR_COUNT, { startPrice: 80 + i * 5 }));
    const spec = smaBelowSpec();
    const tightVol = { deposit: 5000, maxPositions: 2, volume: 10 };
    const capRub = E.portfolioGrossCapRub(tightVol);
    const b = packs[0].length - 1;
    const out = E.runMulti(packs, spec, 120, b, E.DEFAULT_PARAMS, tightVol, E.DEFAULT_STOPPER, {});
    assert.ok(out.perSec.length >= 1);
    let gross = 0;
    for (const p of out.perSec) {
      const last = p.rows?.at(-1);
      const px = last?.close || packs.find((c) => c[0]?.sec === p.sec)?.at(-1)?.close || 0;
      gross += Math.abs(+p.pos || 0) * px;
    }
    assert.ok(gross <= capRub * 1.02 + 1, `gross ${gross} > cap ${capRub}`);
  });
});

describe("runPacksOnTimeGrid", () => {
  it("syncs multiple instruments on time grid", () => {
    const packs = ["GAZP", "SBER"].map((sec) => makeCandles(sec, BAR_COUNT));
    const spec = smaBelowSpec();
    const plan = E.runMultiPlan(packs, 120, packs[0].length - 1);
    assert.ok(!plan.empty);
    const portfolioCap = E.createPortfolioCap(vol);
    const synced = E.runPacksOnTimeGrid(
      packs,
      plan.workUnits,
      plan.times,
      spec,
      E.DEFAULT_PARAMS,
      vol,
      { portfolioCap }
    );
    assert.equal(synced.perSec.length, 2);
    let gross = 0;
    for (const p of synced.perSec) {
      const px = packs.find((c) => c[0]?.sec === p.sec)?.at(-1)?.close || 0;
      gross += Math.abs(+p.pos || 0) * px;
    }
    assert.ok(gross <= portfolioCap.capRub * 1.02 + 1);
  });
});

describe("tradeMarkersFromBar", () => {
  it("marks flip long to short on one bar", () => {
    const m = E.tradeMarkersFromBar(10, -8, null);
    assert.equal(m.tradeOut, "logic");
    assert.equal(m.tradeOutSide, "long");
    assert.equal(m.tradeIn, "short");
  });

  it("marks SL exit and same-bar re-entry", () => {
    const m = E.tradeMarkersFromBar(5, 8, "sl");
    assert.equal(m.tradeOut, "sl");
    assert.equal(m.tradeIn, "long");
  });

  it("swapLogicExecHits swaps Op and Cl sides", () => {
    const sig = { longOpHit: true, shortOpHit: false, longClHit: true, shortClHit: false };
    const swapped = E.swapLogicExecHits(sig);
    assert.equal(swapped.longOpHit, false);
    assert.equal(swapped.shortOpHit, true);
    assert.equal(swapped.longClHit, false);
    assert.equal(swapped.shortClHit, true);
  });

  it("FTS reverses form four unique corners (XOR signals, sides swap)", () => {
    const candles = makeCandles("GAZP", BAR_COUNT);
    const a = 120;
    const b = candles.length - 1;
    const ind = { stoch: true, totstoch: true };
    const base = { sec: "GAZP" };
    const spec = (key) => E.resolveLogicSpec(key, {}, E.DEFAULT_PARAMS, ind);
    const runFts = (p, o) => E.runOnCandles(candles, spec("FTS"), a, b, p, vol, { ...base, ...o });

    const none = runFts(E.DEFAULT_PARAMS, {});
    const signalsOnly = runFts({ ...E.DEFAULT_PARAMS, ReverseSignals: true }, { reverseSignals: true });
    const sidesOnly = runFts({ ...E.DEFAULT_PARAMS, ReverseSides: true }, { reverseSides: true });
    const both = runFts(
      { ...E.DEFAULT_PARAMS, ReverseSides: true, ReverseSignals: true },
      { reverseSides: true, reverseSignals: true }
    );
    const nativeFtt = E.runOnCandles(candles, spec("FTT"), a, b, E.DEFAULT_PARAMS, vol, base);
    const nativeFtsS = E.runOnCandles(candles, spec("FTS_S"), a, b, E.DEFAULT_PARAMS, vol, base);
    const nativeFttS = E.runOnCandles(candles, spec("FTT_S"), a, b, E.DEFAULT_PARAMS, vol, base);

    assert.equal(none.finresp, E.runOnCandles(candles, spec("FTS"), a, b, E.DEFAULT_PARAMS, vol, base).finresp);
    assert.equal(signalsOnly.finresp, nativeFtt.finresp);
    assert.equal(sidesOnly.finresp, nativeFtsS.finresp);
    assert.equal(both.finresp, nativeFttS.finresp);
    assert.notEqual(none.finresp, signalsOnly.finresp);
    assert.notEqual(none.finresp, sidesOnly.finresp);
    assert.notEqual(none.finresp, both.finresp);
    assert.notEqual(signalsOnly.finresp, sidesOnly.finresp);
    assert.notEqual(signalsOnly.finresp, both.finresp);
    assert.notEqual(sidesOnly.finresp, both.finresp);
  });
});
