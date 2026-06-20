import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { loadEngine } from "./harness/load-engine.mjs";
import { makeCandles } from "./helpers/candles.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const POLY_PATH = join(__dirname, "..", "..", "src", "finresp", "poly", "poly-indicator.js");

function loadPoly() {
  const ctx = { globalThis: {} };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(POLY_PATH, "utf8"), ctx, { filename: POLY_PATH });
  return ctx.MultiLogicFinrespPoly;
}

const P = loadPoly();
const E = loadEngine();

const resolveKind = (label) => {
  const hit = E.INDICATOR_OPTIONS.find((o) => o.label.toLowerCase() === String(label).toLowerCase());
  return hit ? hit.key : String(label || "").toLowerCase();
};

test("parsePolyIndicatorFormula: SMA spread and sum range", () => {
  const r1 = P.parsePolyIndicatorFormula("SMA(20) - SMA(50)", { resolveKind });
  assert.equal(r1.ok, true);
  const r2 = P.parsePolyIndicatorFormula("{ SMA(n); n=5..10 }", { resolveKind });
  assert.equal(r2.ok, true);
  assert.equal(r2.ast.type, "sum");
});

test("parsePolyIndicatorFormula: brace scalar vs poly vs fractions", () => {
  const scalar = P.parsePolyIndicatorFormula("{1000}", { resolveKind });
  assert.equal(scalar.ok, true);
  assert.equal(scalar.ast.type, "scalar");
  assert.equal(scalar.ast.value, 1000);

  const poly = P.parsePolyIndicatorFormula("{1;0;0;0}", { resolveKind });
  assert.equal(poly.ok, true);
  assert.equal(poly.ast.type, "poly");
  assert.equal(poly.ast.coeffs.length, 4);
  assert.equal(poly.ast.coeffs[0], 1);
  assert.equal(poly.ast.coeffs[3], 0);

  const frac = P.parsePolyIndicatorFormula("{1/20;1/20}", { resolveKind });
  assert.equal(frac.ok, true);
  assert.equal(frac.ast.type, "poly");
  assert.ok(Math.abs(frac.ast.coeffs[0] - 0.05) < 1e-9);
});

test("evalPolyIndicatorSeries: SMA spread matches component subtract", () => {
  const candles = makeCandles("TEST", 60);
  const cache = E.createIndicatorCache(candles);
  const ast = P.parsePolyIndicatorFormula("SMA(20) - SMA(50)", { resolveKind }).ast;
  const series = P.evalPolyIndicatorSeries(ast, cache, {
    parseParamsMap: E.parseParamsMap,
    resolveKind
  });
  const sma20 = cache.sma(20);
  const sma50 = cache.sma(50);
  let matched = 0;
  for (let i = 49; i < candles.length; i++) {
    const a = sma20[i];
    const b = sma50[i];
    const v = series[i];
    if (a != null && b != null && v != null) {
      assert.ok(Math.abs(v - (a - b)) < 1e-6);
      matched += 1;
    }
  }
  assert.ok(matched > 10);
});

test("evalPolyIndicatorSeries: shift prefix", () => {
  const candles = makeCandles("TEST", 30);
  const cache = E.createIndicatorCache(candles);
  const ast = P.parsePolyIndicatorFormula("[3] * pp", { resolveKind }).ast;
  const series = P.evalPolyIndicatorSeries(ast, cache, { parseParamsMap: E.parseParamsMap, resolveKind });
  assert.equal(series[3], candles[0].close);
  assert.equal(series[10], candles[7].close);
});

test("buildCustomChartIndicatorOverlay: composite single-pass", () => {
  const candles = makeCandles("TEST", 80);
  const cache = E.createIndicatorCache(candles);
  E.setCompositeIndicatorCatalog([
    { id: "ci_spread", name: "Spread20_50", label: "Spread20_50", formula: "SMA(20) - SMA(50)" }
  ]);
  const atoms = [{ kind: "composite", params: "ci_spread", signal: "Ab", compositeName: "Spread20_50" }];
  const overlay = E.buildCustomChartIndicatorOverlay(cache, atoms);
  const keys = Object.keys(overlay.columns);
  assert.equal(keys.length, 1);
  assert.ok(keys[0].includes("spread"));
  assert.equal(overlay.lineSpecs.length, 1);
  assert.equal(overlay.lineSpecs[0].label, "Spread20_50");
});

test("chartIndicatorEditorCatalogLines includes composite names", () => {
  E.setCompositeIndicatorCatalog([
    { id: "ci_x", name: "MySpread", label: "MySpread", formula: "SMA(10)-SMA(20)" }
  ]);
  const lines = E.chartIndicatorEditorCatalogLines();
  assert.ok(lines.includes("MySpread()"));
  const parsed = E.parseChartIndicatorEditorLine("MySpread()");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.atom.kind, "composite");
});
