import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";
import { makeCandles, ALL_INDICATORS } from "./helpers/candles.mjs";

const E = loadEngine();

test("CMA: weights from normalized prices sum to 1", () => {
  const closes = [80, 100, 120, 90, 110];
  const len = 3;
  const pow = 2;
  const i = 4;
  let priceSum = 0;
  for (let j = i - len + 1; j <= i; j++) priceSum += closes[j];
  const raw = [];
  for (let j = i - len + 1; j <= i; j++) {
    const norm = closes[j] / priceSum;
    raw.push(Math.pow(norm, pow));
  }
  const sumRaw = raw.reduce((s, r) => s + r, 0);
  const weights = raw.map((r) => r / sumRaw);
  assert.ok(Math.abs(weights.reduce((s, w) => s + w, 0) - 1) < 1e-12);
  const manual = weights.reduce((s, w, k) => s + w * closes[i - len + 1 + k], 0);
  const cma = E.cmaSeries(closes, len, pow)[i];
  assert.ok(Math.abs(manual - cma) < 1e-9);
});

test("CMA: power 0 equals SMA", () => {
  const closes = [100, 101, 102, 103, 104, 105, 106, 107];
  const len = 3;
  const sma = E.smaSeries(closes, len);
  const cma = E.cmaSeries(closes, len, 0);
  for (let i = 0; i < closes.length; i++) {
    if (sma[i] == null) continue;
    assert.ok(Math.abs(sma[i] - cma[i]) < 1e-9, `bar ${i}: ${sma[i]} vs ${cma[i]}`);
  }
});

test("CML: CMA + LinReg on Op, Cl by CMA (long only)", () => {
  const line = E.DEFAULT_LOGIC_LINES.CML;
  assert.doesNotMatch(line, /Regime\(LinReg/i);
  assert.doesNotMatch(line, /Short/i);
  assert.ok(line.includes("Op(Long(CMA(@CmaLen;P=@CmaPow)(Ab) AND LinReg(@LR;Dev=2)(AbUp))"));
  assert.ok(line.includes("Cl(Long(CMA(@CmaLen;P=@CmaPow)(Bl) OnFlip(Close))"));
  const candles = makeCandles("GAZP", 300);
  const spec = E.resolveLogicSpec("CML", {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
  assert.equal(spec.type, "logic_line");
  const p = spec.parsed;
  assert.equal(p.opLongAtoms.length, 2);
  assert.equal(p.opLongAtoms[0]?.kind, "cma");
  assert.match(p.opLongAtoms[0]?.signal || "", /Ab/i);
  assert.equal(p.opLongAtoms[1]?.kind, "linreg");
  assert.match(p.opLongAtoms[1]?.signal || "", /AbUp/i);
  assert.equal(p.clLongAtoms.length, 1);
  assert.equal(p.clLongAtoms[0]?.kind, "cma");
  assert.match(p.clLongAtoms[0]?.signal || "", /Bl/i);
  assert.equal(p.opShortAtoms.length, 0);
  assert.equal(p.clShortAtoms.length, 0);
  const r = E.runOnCandles(candles, spec, 50, 290, E.DEFAULT_PARAMS, E.DEFAULT_VOLUME, { sec: "GAZP" });
  assert.ok(r.rows.length > 0);
  const probe = E.probeLogicSignalsAtBar(candles, spec, E.DEFAULT_PARAMS, { barIndex: 150, pos: 0 });
  assert.equal(probe.ready, true);
  assert.equal(probe.logicId, "CML");
});

test("CMS: CMA + LinReg on Op, Cl by CMA (short only)", () => {
  const line = E.DEFAULT_LOGIC_LINES.CMS;
  assert.doesNotMatch(line, /Regime\(LinReg/i);
  assert.doesNotMatch(line, /Long/i);
  assert.ok(line.includes("Op(Short(CMA(@CmaLen;P=@CmaPow)(Bl) AND LinReg(@LR;Dev=2)(BlLo))"));
  assert.ok(line.includes("Cl(Short(CMA(@CmaLen;P=@CmaPow)(Ab) OnFlip(Close))"));
  const candles = makeCandles("GAZP", 300);
  const spec = E.resolveLogicSpec("CMS", {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
  assert.equal(spec.type, "logic_line");
  const p = spec.parsed;
  assert.equal(p.opShortAtoms.length, 2);
  assert.equal(p.opShortAtoms[0]?.kind, "cma");
  assert.match(p.opShortAtoms[0]?.signal || "", /Bl/i);
  assert.equal(p.opShortAtoms[1]?.kind, "linreg");
  assert.match(p.opShortAtoms[1]?.signal || "", /BlLo/i);
  assert.equal(p.clShortAtoms.length, 1);
  assert.equal(p.clShortAtoms[0]?.kind, "cma");
  assert.match(p.clShortAtoms[0]?.signal || "", /Ab/i);
  assert.equal(p.opLongAtoms.length, 0);
  assert.equal(p.clLongAtoms.length, 0);
  const r = E.runOnCandles(candles, spec, 50, 290, E.DEFAULT_PARAMS, E.DEFAULT_VOLUME, { sec: "GAZP" });
  assert.ok(r.rows.length > 0);
  const probe = E.probeLogicSignalsAtBar(candles, spec, E.DEFAULT_PARAMS, { barIndex: 150, pos: 0 });
  assert.equal(probe.ready, true);
  assert.equal(probe.logicId, "CMS");
});
