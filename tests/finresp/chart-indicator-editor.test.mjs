import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";
import { makeCandles } from "./helpers/candles.mjs";

const E = loadEngine();

test("chartIndicatorEditorCatalogLines lists all INDICATOR_OPTIONS", () => {
  const lines = E.chartIndicatorEditorCatalogLines();
  assert.equal(lines.length, E.INDICATOR_OPTIONS.length);
  assert.ok(lines.every((l) => /^\w+\(.*\)$/.test(l)));
});

test("parseChartIndicatorEditorLines: valid, skip, and error without abort", () => {
  const text = [
    "SMA(50)",
    "",
    "# comment",
    "Stoch(14-3-3)",
    "BAD LINE",
    "LinReg(20;Dev=2)"
  ].join("\n");
  const r = E.parseChartIndicatorEditorLines(text);
  assert.equal(r.atoms.length, 3);
  assert.equal(r.errors.length, 1);
  assert.ok(r.errors[0].includes("BAD LINE"));
  assert.equal(r.atoms[0].kind, "sma");
  assert.equal(r.atoms[0].params, "50");
});

test("buildCustomChartIndicatorOverlay: price overlays and oscillator warning", () => {
  const candles = makeCandles("TEST", 80);
  const cache = E.createIndicatorCache(candles);
  const atoms = [
    { kind: "sma", params: "20", signal: "Ab" },
    { kind: "sma", params: "50", signal: "Ab" },
    { kind: "macd", params: "12,26,9", signal: "Ab" }
  ];
  const overlay = E.buildCustomChartIndicatorOverlay(cache, atoms);
  assert.ok(Object.keys(overlay.columns).some((k) => k.startsWith("xind_sma_20")));
  assert.ok(Object.keys(overlay.columns).some((k) => k.startsWith("xind_sma_50")));
  assert.equal(overlay.lineSpecs.length, 2);
  assert.equal(overlay.warnings.length, 1);
  assert.ok(overlay.warnings[0].includes("MACD"));
});
