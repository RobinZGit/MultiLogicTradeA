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

test("evalPolyIndicatorSeries: .shift(n) and [k] end index", () => {
  const candles = makeCandles("TEST", 30);
  const cache = E.createIndicatorCache(candles);
  const ast = P.parsePolyIndicatorFormula("pp.shift(3)", { resolveKind }).ast;
  const series = P.evalPolyIndicatorSeries(ast, cache, { parseParamsMap: E.parseParamsMap, resolveKind });
  assert.equal(series[3], candles[0].close);
  const ast2 = P.parsePolyIndicatorFormula("SMA(20).shift(5)", { resolveKind }).ast;
  const s2 = P.evalPolyIndicatorSeries(ast2, cache, { parseParamsMap: E.parseParamsMap, resolveKind });
  const sma20 = cache.sma(20);
  assert.equal(s2[25], sma20[20]);
  const ast3 = P.parsePolyIndicatorFormula("pp[5]", { resolveKind }).ast;
  assert.equal(ast3.type, "endIndex");
  const s3 = P.evalPolyIndicatorSeries(ast3, cache, { parseParamsMap: E.parseParamsMap, resolveKind });
  assert.equal(s3[29], candles[25].close);
});

test("parsePolyIndicatorFormula: win20 poly range {1/20; n=1..20}", () => {
  const r = P.parsePolyIndicatorFormula("{1/20; n=1..20}", { resolveKind });
  assert.equal(r.ok, true);
  assert.equal(r.ast.type, "polyRange");
  assert.equal(r.ast.nTo, 20);
  assert.ok(Math.abs(r.ast.value - 0.05) < 1e-9);
});

test("parsePolyIndicatorFormula: harmonic sum {1/n; n=1..10}", () => {
  const r = P.parsePolyIndicatorFormula("{1/n; n=1..10}", { resolveKind });
  assert.equal(r.ok, true);
  assert.equal(r.ast.type, "sum");
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

test("parsePolyIndicatorFormula: multiline variables and // comments", () => {
  const text = [
    "// заголовок",
    "fast = SMA(20)",
    "slow = SMA(50)",
    "fast - slow"
  ].join("\n");
  const r = P.parsePolyIndicatorFormula(text, { resolveKind });
  assert.equal(r.ok, true);
  assert.equal(r.ast.type, "program");
  assert.equal(r.ast.bindings.length, 2);
});

test("evalPolyIndicatorSeries: multiline vars match spread", () => {
  const candles = makeCandles("TEST", 60);
  const cache = E.createIndicatorCache(candles);
  const formula = "fast = SMA(20)\nslow = SMA(50)\nfast - slow";
  const ast = P.parsePolyIndicatorFormula(formula, { resolveKind }).ast;
  const series = P.evalPolyIndicatorSeries(ast, cache, { parseParamsMap: E.parseParamsMap, resolveKind });
  const direct = P.evalPolyIndicatorSeries(
    P.parsePolyIndicatorFormula("SMA(20) - SMA(50)", { resolveKind }).ast,
    cache,
    { parseParamsMap: E.parseParamsMap, resolveKind }
  );
  for (let i = 0; i < candles.length; i++) {
    if (series[i] == null && direct[i] == null) continue;
    assert.ok(Math.abs((series[i] || 0) - (direct[i] || 0)) < 1e-6);
  }
});

test("parsePolyIndicatorFormula: price aliases c-close and pp_close", () => {
  const r1 = P.parsePolyIndicatorFormula("c-close - o-open", { resolveKind });
  assert.equal(r1.ok, true);
  assert.equal(r1.ast.left.key, "pp");
  assert.equal(r1.ast.right.key, "oo");
  const r2 = P.parsePolyIndicatorFormula("pp_close - pp_open", { resolveKind });
  assert.equal(r2.ok, true);
  assert.equal(r2.ast.left.key, "pp");
  assert.equal(r2.ast.right.key, "oo");
});

test("parsePolyIndicatorFormula: RETURN prefix on last line", () => {
  const text = "fast = SMA(20)\nslow = SMA(50)\nRETURN fast - slow";
  const r = P.parsePolyIndicatorFormula(text, { resolveKind });
  assert.equal(r.ok, true);
  assert.equal(r.ast.result.type, "binop");
});

test("parsePolyIndicatorFormula: full example placeholder", () => {
  const r = P.parsePolyIndicatorFormula(P.EXAMPLE_PLACEHOLDER, { resolveKind });
  assert.equal(r.ok, true, (r.errors || []).join("; "));
  assert.equal(r.ast.type, "program");
  assert.equal(r.ast.bindings.length, 6);
});

test("evalPolyIndicatorSeries: example with hash and shift", () => {
  const candles = makeCandles("TEST", 60);
  const cache = E.createIndicatorCache(candles);
  const ast = P.parsePolyIndicatorFormula(P.EXAMPLE_PLACEHOLDER, { resolveKind }).ast;
  const series = P.evalPolyIndicatorSeries(ast, cache, { parseParamsMap: E.parseParamsMap, resolveKind });
  assert.ok(series.length >= candles.length);
  assert.ok(series.some((v) => v != null && Number.isFinite(v)));
});

test("parsePolyIndicatorFormula: convolution chain alpha beta gamma", () => {
  const text = "alpha = pp\nbeta = pp * pp\ngamma = alpha * beta";
  const r = P.parsePolyIndicatorFormula(text, { resolveKind });
  assert.equal(r.ok, true);
  assert.equal(r.ast.type, "program");
  assert.equal(r.ast.bindings.length, 3);
  assert.equal(r.ast.result.type, "binop");
  assert.equal(r.ast.result.op, "*");
});

test("evalPolyIndicatorSeries: convolution chain runs", () => {
  const candles = makeCandles("TEST", 40);
  const cache = E.createIndicatorCache(candles);
  const formula = "alpha = pp\nbeta = pp * pp\ngamma = alpha * beta";
  const ast = P.parsePolyIndicatorFormula(formula, { resolveKind }).ast;
  const series = P.evalPolyIndicatorSeries(ast, cache, { parseParamsMap: E.parseParamsMap, resolveKind });
  assert.ok(series.length >= candles.length);
  assert.ok(series.some((v) => v != null && Number.isFinite(v)));
});

test("parsePolyIndicatorFormula: rejects # comment line", () => {
  const r = P.parsePolyIndicatorFormula("# not a comment\nSMA(20)", { resolveKind });
  assert.equal(r.ok, false);
});
