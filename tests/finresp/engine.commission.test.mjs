import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";

const E = loadEngine();

function synthCandles(n, base = 100) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = base + Math.sin(i / 5) * 3 + i * 0.01;
    out.push({ open: c, high: c + 1, low: c - 1, close: c, time: `2024-06-01T${String(i).padStart(2, "0")}:00:00` });
  }
  return out;
}

const vol = {
  volumeType: "Deposit percent",
  volume: 10,
  deposit: 1_000_000,
  maxPositions: 10,
  commission: { type: "Percent", value: 0.02 }
};

test("commission: finresp + commission is gross P&L before fees when flat", () => {
  const candles = synthCandles(120, 200);
  const spec = E.resolveLogicSpec("L1", E.DEFAULT_PARAMS);
  const r = E.runOnCandles(candles, spec, 50, 119, E.DEFAULT_PARAMS, { ...vol, commission: { type: "None", value: 0 } }, {});
  assert.equal(r.pos, 0);
  const withFee = E.runOnCandles(candles, spec, 50, 119, E.DEFAULT_PARAMS, vol, {});
  assert.equal(withFee.pos, 0);
  assert.ok(withFee.commission >= 0);
  const gross = withFee.finresp + withFee.commission;
  const noFee = r.finresp;
  assert.ok(Math.abs(gross - noFee) < 1, `gross ${gross} vs no-fee ${noFee}`);
});

test("commission: aggregateFinresp sums per-instrument finresp", () => {
  const packs = ["AAA", "BBB", "CCC"].map((sec, k) =>
    synthCandles(300, 100 + k * 10).map((c) => ({ ...c, sec }))
  );
  const spec = E.resolveLogicSpec("RND", E.DEFAULT_PARAMS);
  const { agg } = E.runMulti(packs, spec, 0, 299, E.DEFAULT_PARAMS, vol, E.DEFAULT_STOPPER, {});
  const sumFin = Object.values(agg.bySec).reduce((s, v) => s + v, 0);
  assert.ok(agg.commission > 0);
  assert.ok(Math.abs(sumFin - agg.finresp) < 1e-6);
  assert.ok(agg.finresp + agg.commission > agg.finresp, "gross before fees above net");
});

test("commission: row buy/sell volumes match commissionPaid", () => {
  const candles = synthCandles(200, 150);
  const spec = E.resolveLogicSpec("RND", E.DEFAULT_PARAMS);
  const r = E.runOnCandles(candles, spec, 30, 190, E.DEFAULT_PARAMS, vol, {});
  const pct = 0.02 / 100;
  let expected = 0;
  for (const row of r.rows) {
    const buy = row.buy || 0;
    const sell = row.sell || 0;
    const px = row.close || 0;
    if (buy > 0) expected += buy * px * pct;
    if (sell > 0) expected += sell * px * pct;
  }
  assert.ok(Math.abs(expected - r.commission) < 0.02, `row fees ${expected} vs total ${r.commission}`);
});
