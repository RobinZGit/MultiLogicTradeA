import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";

const E = loadEngine();
const auto = { enabled: true, mode: "tp_up_sl_down", leverageMin: 0.5, leverageMax: 8 };

test("computeAutoLeverageTarget: TP increases, SL decreases", () => {
  const cfg = { slMult: 2, tpMult: 10, autoLeverage: auto };
  assert.equal(E.computeAutoLeverageTarget(1, "tp", cfg), 1.1);
  assert.equal(E.computeAutoLeverageTarget(1, "sl", cfg), 0.98);
});

test("computeAutoLeverageTarget: inverse mode", () => {
  const cfg = { slMult: 2, tpMult: 10, autoLeverage: { ...auto, mode: "tp_down_sl_up" } };
  assert.equal(E.computeAutoLeverageTarget(1, "tp", cfg), 0.9);
  assert.equal(E.computeAutoLeverageTarget(1, "sl", cfg), 1.02);
});

test("computeAutoLeverageTarget clamps to min/max", () => {
  const cfg = { slMult: 50, tpMult: 50, autoLeverage: auto };
  assert.equal(E.computeAutoLeverageTarget(1, "sl", cfg), 0.5);
  assert.equal(E.computeAutoLeverageTarget(5, "tp", cfg), 7.5);
});

test("splitLeverageToMaxPosVolume: product equals leverage", () => {
  const split = E.splitLeverageToMaxPosVolume(2, 100000, auto);
  const lev = E.leverageFromVolConfig({ maxPositions: split.maxPositions, volume: split.volume });
  assert.ok(Math.abs(lev - 2) < 0.0001);
  assert.ok(split.maxPositions >= 2);
  assert.ok(split.volume >= 10);
});

test("splitLeverageToMaxPosVolume: small deposit allows one position", () => {
  const split = E.splitLeverageToMaxPosVolume(0.5, 3000, auto);
  const lev = E.leverageFromVolConfig({ maxPositions: split.maxPositions, volume: split.volume });
  assert.ok(Math.abs(lev - 0.5) < 0.0001);
  assert.ok(split.volume >= 10);
});

test("adjustVolConfigLeverage mutates volConfig", () => {
  const vol = { maxPositions: 10, volume: 10, deposit: 100000 };
  const cfg = { slMult: 2, tpMult: 10, autoLeverage: auto };
  const adj = E.adjustVolConfigLeverage(vol, "tp", cfg);
  assert.ok(adj);
  assert.equal(adj.before, 1);
  assert.ok(adj.after > adj.before);
  assert.equal(E.leverageFromVolConfig(vol), adj.after);
});
