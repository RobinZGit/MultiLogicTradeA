import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";
import { ALL_INDICATORS, makeCandles } from "./helpers/candles.mjs";

const E = loadEngine();

describe("probeLogicSignalsAtBar", () => {
  it("warmup when bars below indicator window", () => {
    const candles = makeCandles("GAZP", 50);
    const spec = E.resolveLogicSpec("TBC", {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
    const probe = E.probeLogicSignalsAtBar(candles, spec, E.DEFAULT_PARAMS, { barIndex: 49, pos: 0 });
    assert.equal(probe.ready, false);
    assert.equal(probe.reason, "warmup");
  });

  it("ready on last bar with enough history", () => {
    const candles = makeCandles("GAZP", 260);
    const spec = E.resolveLogicSpec("TBC", {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
    const b = candles.length - 1;
    const r = E.runOnCandles(candles, spec, 120, b, E.DEFAULT_PARAMS, E.DEFAULT_VOLUME, { sec: "GAZP" });
    const probe = E.probeLogicSignalsAtBar(candles, spec, E.DEFAULT_PARAMS, {
      barIndex: b,
      pos: r.pos,
      entryBarIdx: r.simState?.entryBarIdx,
      entryMid: r.simState?.entryMid,
      entryBeta: r.simState?.entryBeta,
      lastRow: r.rows?.at(-1)
    });
    assert.equal(probe.ready, true);
    assert.ok("logicId" in probe);
  });

  it("sma_below probe reports sma model", () => {
    const candles = makeCandles("SBER", 260);
    const spec = E.resolveLogicSpec("sma_below", {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
    const b = candles.length - 1;
    const r = E.runOnCandles(candles, spec, 120, b, E.DEFAULT_PARAMS, E.DEFAULT_VOLUME, { sec: "SBER" });
    const probe = E.probeLogicSignalsAtBar(candles, spec, E.DEFAULT_PARAMS, {
      barIndex: b,
      pos: r.pos,
      lastRow: r.rows?.at(-1)
    });
    assert.equal(probe.ready, true);
    assert.equal(probe.smaModel, true);
  });

  it("RND parses positional SL/TP and runs trades", () => {
    const line = E.DEFAULT_LOGIC_LINES.RND;
    assert.ok(line);
    const parsed = E.parseLogicLine(line, E.DEFAULT_PARAMS, ALL_INDICATORS);
    assert.equal(parsed.slPct, 0.01);
    assert.equal(parsed.tpPct, 0.05);
    assert.equal(parsed.slTpMode, "pct");
    const candles = makeCandles("GAZP", 400);
    const spec = E.resolveLogicSpec("RND", {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
    const b = candles.length - 1;
    const r = E.runOnCandles(candles, spec, 0, b, E.DEFAULT_PARAMS, E.DEFAULT_VOLUME, { sec: "GAZP" });
    assert.ok((r.buys + r.sells) > 0);
    const probe = E.probeLogicSignalsAtBar(candles, spec, E.DEFAULT_PARAMS, { barIndex: 50, pos: 0 });
    assert.equal(probe.ready, true);
    assert.equal(probe.logicId, "RND");
  });
});
