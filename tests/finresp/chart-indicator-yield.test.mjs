import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEngine } from "./harness/load-engine.mjs";
import { makeCandles, ALL_INDICATORS } from "./helpers/candles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const bootPath = path.join(root, "src", "finresp", "MultiLogic_FinrespCalculator.boot.js");
const chartsPath = path.join(root, "src", "finresp", "MultiLogic_FinrespCalculator.charts.js");
const bootSrc = fs.readFileSync(bootPath, "utf8");
const chartsSrc = fs.readFileSync(chartsPath, "utf8");

const E = loadEngine();

test("boot: tech info includes chart indicator diagnostics", () => {
  assert.match(bootSrc, /chartIndPhase=/);
  assert.match(bootSrc, /chartIndNote=локальный расчёт/);
  assert.match(bootSrc, /chartIndStuck=/);
  assert.match(bootSrc, /applyChartIndicatorsForButton/);
  assert.match(bootSrc, /chartRowsReadyForIndicators/);
  assert.match(bootSrc, /clearAllChartIndicatorsForSec/);
  assert.match(bootSrc, /CHART_IND_LOGIC_BTN/);
  assert.match(bootSrc, /CHART_IND_REMOVE_BTN/);
});

test("charts: logic indicators button renamed and remove button wired", () => {
  assert.match(chartsSrc, /Индикаторы логик/);
  assert.match(chartsSrc, /Удалить индикаторы/);
  assert.match(chartsSrc, /clearIndicatorsHandler/);
  assert.match(chartsSrc, /onChartIndicatorStuck/);
});

test("boot: custom chart indicators use MOEX pack with row mapping", () => {
  const custom = bootSrc.match(/async function applyCustomChartIndicatorsInPlace[\s\S]*?^  \}/m);
  assert.ok(custom, "applyCustomChartIndicatorsInPlace");
  assert.match(bootSrc, /ensureChartIndicatorPackForRows/);
  assert.match(bootSrc, /mapChartRowsToPackIndices/);
  assert.match(bootSrc, /mapIndicatorColumnsToRows/);
  assert.match(bootSrc, /chartTimeKey/);
  assert.match(custom[0], /rowKeysApplied/);
  assert.match(bootSrc, /chartCustomRowKeys/);
  assert.match(bootSrc, /chartCustomPackExt/);
});

test("charts: add indicator uses dialog then apply split", () => {
  assert.match(chartsSrc, /openAddIndicatorDialog/);
  assert.match(chartsSrc, /applyAddIndicatorText/);
  assert.match(chartsSrc, /onChartAddIndicatorMessage/);
});

test("boot: chart indicators use row candles not full MOEX pack", () => {
  assert.match(bootSrc, /rowsToCandlePack/);
  assert.match(bootSrc, /chartIndicatorRowsFingerprint/);
  assert.match(bootSrc, /withChartIndicatorTimeout/);
  const ensure = bootSrc.match(/async function ensureChartIndicatorColumns[\s\S]*?^  \}/m);
  assert.ok(ensure, "ensureChartIndicatorColumns");
  assert.doesNotMatch(ensure[0], /packForSec\(sec\)/);
});

test("engine: chart warm uses listChartOverlayWarmThunks without cache-for-specs sync", () => {
  const engineSrc = fs.readFileSync(
    path.join(root, "src", "finresp", "MultiLogic_FinrespCalculator.engine.js"),
    "utf8"
  );
  assert.match(engineSrc, /listChartOverlayWarmThunks/);
  assert.match(engineSrc, /buildCustomChartIndicatorOverlayAsync/);
  const warmAsync = engineSrc.match(/async function warmChartDisplayIndicatorSeriesAsync[\s\S]*?^  \}/m);
  assert.ok(warmAsync, "warmChartDisplayIndicatorSeriesAsync");
  assert.match(warmAsync[0], /listChartOverlayWarmThunks/);
  assert.doesNotMatch(warmAsync[0], /warmChartIndicatorCacheForSpecs/);
});

test("boot: chart indicator button cancels prewarm and uses cooperative columns", () => {
  assert.match(bootSrc, /cancelChartIndicatorPrewarm/);
  assert.match(bootSrc, /chartIndicatorColumnsPending/);
  assert.match(bootSrc, /buildChartDisplayIndicatorColumnsAsync/);
  assert.match(bootSrc, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
  const wire = bootSrc.match(/function wireChartIndicatorButton[\s\S]*?^  \}/m);
  assert.ok(wire, "wireChartIndicatorButton");
  assert.match(wire[0], /cancelChartIndicatorPrewarm/);
});

test("charts: indicator click notifies boot to stop background prewarm", () => {
  assert.match(chartsSrc, /onChartIndicatorClickStart/);
  const handler = chartsSrc.match(/indBtn\.addEventListener\("click"[\s\S]*?^\s*\}\);/m);
  assert.ok(handler, "indBtn click handler");
  assert.match(handler[0], /onChartIndicatorClickStart/);
  assert.match(handler[0], /requestAnimationFrame/);
});

test("engine: fast chart columns avoid per-bar collect loop", () => {
  assert.match(
    fs.readFileSync(path.join(root, "src", "finresp", "MultiLogic_FinrespCalculator.engine.js"), "utf8"),
    /buildChartDisplayIndicatorColumnsFast/
  );
  assert.match(
    fs.readFileSync(path.join(root, "src", "finresp", "MultiLogic_FinrespCalculator.engine.js"), "utf8"),
    /chartDisplayOverlaySeriesPlan/
  );
  assert.match(
    fs.readFileSync(path.join(root, "src", "finresp", "MultiLogic_FinrespCalculator.engine.js"), "utf8"),
    /warmChartDisplayIndicatorSeriesAsync/
  );
});

test("buildChartDisplayIndicatorColumnsFast matches per-bar columns for L5", () => {
  const candles = makeCandles("TEST", 120);
  const cache = E.createIndicatorCache(candles);
  const p = { ...E.DEFAULT_PARAMS };
  const indicators = { ...ALL_INDICATORS };
  const spec = E.resolveLogicSpec("L5", E.DEFAULT_LOGIC_LINES, p, indicators);
  const specs = [spec].filter(Boolean);
  const fast = E.buildChartDisplayIndicatorColumnsFast(cache, specs, indicators);
  const slow = (() => {
    E.warmChartDisplayIndicatorSeries(cache, specs, indicators);
    const n = cache.candles.length;
    const columns = {};
    for (let idx = 0; idx < n; idx++) {
      const ind = E.collectChartIndicatorsForDisplay(cache, specs, indicators, idx);
      for (const [k, v] of Object.entries(ind)) {
        if (v == null) continue;
        if (!columns[k]) columns[k] = new Array(n);
        columns[k][idx] = v;
      }
    }
    return columns;
  })();
  assert.deepEqual(Object.keys(fast).sort(), Object.keys(slow).sort());
  for (const key of Object.keys(fast)) {
    assert.equal(fast[key].length, slow[key].length);
    for (let i = 0; i < fast[key].length; i++) {
      const a = fast[key][i];
      const b = slow[key][i];
      if (a == null && b == null) continue;
      assert.ok(Math.abs(a - b) < 1e-9, `${key}@${i}: ${a} vs ${b}`);
    }
  }
});
