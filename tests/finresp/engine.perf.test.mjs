/**
 * Регрессионные тесты производительности движка (Node).
 *
 * Ловят: внезапное замедление runOnCandles / runMulti / live-tail / equity-каталог.
 * Не ловят: T-Bank API, IndexedDB, отрисовку SVG в браузере.
 *
 * Эталоны: tests/fixtures/perf-baseline.json (допуск PERF_REGRESS_FACTOR, по умолчанию 2.5).
 * Обновить эталоны: PERF_UPDATE_BASELINE=1 npm run test:perf
 * Ужесточить локально: PERF_FACTOR=1 npm run test:perf
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";
import { ALL_INDICATORS, makeCandles } from "./helpers/candles.mjs";
import { EQUITY_CATALOG_LOGIC_IDS, simulateEquityCatalogRuns } from "./helpers/equity-path.mjs";
import { benchSync, assertBaseline } from "./helpers/perf.mjs";
import { simulateLiveTailFinresp } from "./helpers/live-tail.mjs";
import { simulateAutoReversesPick } from "./helpers/auto-reverses.mjs";

const E = loadEngine();

const SHARE_TICKERS = [
  "AFLT", "ALRS", "AFKS", "BSPB", "CHMF", "FEES", "GAZP", "GMKN", "HYDR", "IRAO",
  "LKOH", "MAGN", "MOEX", "MTSS", "MTLRP", "NVTK", "NLMK", "PLZL", "PIKK", "PHOR",
  "ROSN", "RUAL", "RTKMP", "SBER", "SBERP", "SNGSP", "SNGS", "TATN", "TATNP", "UPRO", "VTBR"
];

const LIVE_LOGIC_IDS = EQUITY_CATALOG_LOGIC_IDS;

const TAIL_BARS = 220;
const vol = { deposit: 7000, maxPositions: 10, volume: 10 };

function packs31(barCount) {
  return SHARE_TICKERS.map((sec, i) => makeCandles(sec, barCount, { startPrice: 20 + (i % 17) * 3 }));
}

describe("perf: live-tail path (31 instruments)", () => {
  it("sma_below tail — типичный лёгкий расчёт", () => {
    const packs = packs31(300);
    const spec = E.resolveLogicSpec("sma_below", {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
    const ms = benchSync(() => {
      simulateLiveTailFinresp(E, packs, spec, E.DEFAULT_PARAMS, vol, TAIL_BARS);
    });
    assertBaseline(ms, "heavy_liveTail_31x300_sma", "live-tail sma_below x31 x300 bars");
  });

  it("полный стек логик — как в UI по умолчанию", () => {
    const packs = packs31(300);
    const spec = E.resolveLogicSpecStack(LIVE_LOGIC_IDS, {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
    const result = simulateLiveTailFinresp(E, packs, spec, E.DEFAULT_PARAMS, vol, TAIL_BARS);
    assertBaseline(result.totalMs, "heavy_liveTail_31x300_stack", "live-tail full stack x31 x300 bars");
    assert.equal(result.perSec.length, 31);
  });

  it("длинная история (2500 баров) — как в кэше браузера", () => {
    const packs = packs31(2500);
    const spec = E.resolveLogicSpecStack(LIVE_LOGIC_IDS, {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
    const result = simulateLiveTailFinresp(E, packs, spec, E.DEFAULT_PARAMS, vol, TAIL_BARS);
    assertBaseline(result.totalMs, "heavy_liveTail_31x2500_stack", "live-tail full stack x31 x2500 bars");
    assert.ok(result.perSec.length === 31, "all instruments produce perSec");
  });
});

describe("perf: runMulti / time grid (31 instruments)", () => {
  const packs = packs31(300);
  const a = 300 - TAIL_BARS;
  const b = 299;
  const spec = E.resolveLogicSpec("sma_below", {}, E.DEFAULT_PARAMS, ALL_INDICATORS);

  it("runMulti не пустой и укладывается в эталон", () => {
    let out;
    const ms = benchSync(() => {
      out = E.runMulti(packs, spec, a, b, E.DEFAULT_PARAMS, vol, E.DEFAULT_STOPPER, {});
    });
    assert.equal(out.perSec.length, 31);
    assertBaseline(ms, "heavy_runMulti_31x300_sma", "runMulti sma_below x31");
  });

  it("runPacksOnTimeGrid с портфельным cap", () => {
    const plan = E.runMultiPlan(packs, a, b);
    let synced;
    const ms = benchSync(() => {
      synced = E.runPacksOnTimeGrid(
        packs,
        plan.workUnits,
        plan.times,
        spec,
        E.DEFAULT_PARAMS,
        vol,
        { portfolioCap: E.createPortfolioCap(vol) }
      );
    });
    assert.equal(synced.perSec.length, 31);
    assertBaseline(ms, "heavy_runPacksOnTimeGrid_31x300_sma", "runPacksOnTimeGrid sma_below x31");
  });
});

describe("perf: single-instrument sanity", () => {
  it("TBC на 5000 баров — нет квадратичного взрыва на одном тикере", () => {
    const candles = makeCandles("GAZP", 5000);
    const spec = E.resolveLogicSpec("TBC", {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
    const a = 5000 - TAIL_BARS;
    const b = 4999;
    const ms = benchSync(() => {
      E.runOnCandles(candles, spec, a, b, E.DEFAULT_PARAMS, vol, { sec: "GAZP" });
    });
    assertBaseline(ms, "heavy_runOnCandles_TBC_5000", "runOnCandles TBC single x5000 tail window");
  });
});

describe("perf: equity-каталог (как drawEquityChartsAsync)", () => {
  it("3 инстр. × 2000 свечей 15m — срез длинного окна", () => {
    const packs = [
      makeCandles("GAZP", 2000, { barMinutes: 15, startPrice: 180 }),
      makeCandles("SBER", 2000, { barMinutes: 15, startPrice: 260 }),
      makeCandles("LKOH", 2000, { barMinutes: 15, startPrice: 7200 })
    ];
    const { ms, logicCount } = simulateEquityCatalogRuns(
      E,
      packs,
      EQUITY_CATALOG_LOGIC_IDS,
      0,
      1999,
      E.DEFAULT_PARAMS,
      vol,
      ALL_INDICATORS
    );
    assert.equal(logicCount, EQUITY_CATALOG_LOGIC_IDS.length);
    assertBaseline(ms, "slice_equity_3x2000_allLogics", "equity catalog x3 x2000 bars");
  });
});

describe("perf: @@AutoReverses (4 варианта портфеля)", () => {
  it("2 инстр. × 400 свечей — как smoke, полный стек логик", () => {
    const packs = [
      makeCandles("GAZP", 400, { barMinutes: 15, startPrice: 180 }),
      makeCandles("SBER", 400, { barMinutes: 15, startPrice: 260 })
    ];
    const spec = E.resolveLogicSpecStack(LIVE_LOGIC_IDS, {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
    const { best, variants, totalMs } = simulateAutoReversesPick(
      E,
      packs,
      spec,
      E.DEFAULT_PARAMS,
      vol,
      E.DEFAULT_STOPPER,
      TAIL_BARS
    );
    assert.equal(variants.length, 4);
    assert.ok(best);
    assertBaseline(totalMs, "heavy_autoReverses_2x400_stack", "autoReverses 4× runMulti x2 x400");
  });

  it("31 инстр. × 300 свечей — типичный live-портфель", () => {
    const packs = packs31(300);
    const spec = E.resolveLogicSpecStack(LIVE_LOGIC_IDS, {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
    const { best, variants, totalMs } = simulateAutoReversesPick(
      E,
      packs,
      spec,
      E.DEFAULT_PARAMS,
      vol,
      E.DEFAULT_STOPPER,
      TAIL_BARS
    );
    assert.equal(variants.length, 4);
    assert.ok(best);
    assert.equal(best.perSecCount, 31);
    assertBaseline(totalMs, "heavy_autoReverses_31x300_stack", "autoReverses 4× runMulti x31 x300");
  });
});
