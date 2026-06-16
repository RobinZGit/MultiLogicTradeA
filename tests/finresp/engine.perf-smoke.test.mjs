/**
 * Быстрые smoke-тесты производительности (2 инструмента, ~400 свечей).
 * Входят в npm test; сравнивают с perf-baseline.json.
 *
 * Обновить эталон после осознанного ускорения/замедления:
 *   PERF_UPDATE_BASELINE=1 npm run test:perf:smoke
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";
import { ALL_INDICATORS, makeCandles } from "./helpers/candles.mjs";
import { EQUITY_CATALOG_LOGIC_IDS, simulateEquityCatalogRuns } from "./helpers/equity-path.mjs";
import { simulateLiveTailFinresp } from "./helpers/live-tail.mjs";
import { simulateAutoReversesPick } from "./helpers/auto-reverses.mjs";
import { assertBaseline, benchSync } from "./helpers/perf.mjs";

const E = loadEngine();
const vol = { deposit: 7000, maxPositions: 10, volume: 10 };
const BAR_MINUTES = 15;
const BAR_COUNT = 400;
const TAIL_BARS = 220;
const a = 0;
const b = BAR_COUNT - 1;

const packs2 = [
  makeCandles("GAZP", BAR_COUNT, { barMinutes: BAR_MINUTES, startPrice: 180 }),
  makeCandles("SBER", BAR_COUNT, { barMinutes: BAR_MINUTES, startPrice: 260 })
];

const specSma = E.resolveLogicSpec("sma_below", {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
const specStack = E.resolveLogicSpecStack(EQUITY_CATALOG_LOGIC_IDS, {}, E.DEFAULT_PARAMS, ALL_INDICATORS);

describe("perf smoke: основные этапы (2 инстр., 400 свечей 15m)", () => {
  it("runMulti — один проход FINRESP по пакетам", () => {
    const ms = benchSync(() => {
      const out = E.runMulti(packs2, specSma, a, b, E.DEFAULT_PARAMS, vol, E.DEFAULT_STOPPER, {});
      assert.equal(out.perSec.length, 2);
    });
    assertBaseline(ms, "smoke_runMulti_2x400_sma");
  });

  it("runPacksOnTimeGrid — синхронизация по времени (как «Рассчитать»)", () => {
    const ms = benchSync(() => {
      const plan = E.runMultiPlan(packs2, a, b);
      const synced = E.runPacksOnTimeGrid(
        packs2,
        plan.workUnits,
        plan.times,
        specSma,
        E.DEFAULT_PARAMS,
        vol,
        { portfolioCap: E.createPortfolioCap(vol) }
      );
      assert.equal(synced.perSec.length, 2);
    });
    assertBaseline(ms, "smoke_runPacksOnTimeGrid_2x400_sma");
  });

  it("live-tail — хвост для реальной торговли", () => {
    const result = simulateLiveTailFinresp(E, packs2, specStack, E.DEFAULT_PARAMS, vol, TAIL_BARS);
    assert.equal(result.perSec.length, 2);
    assertBaseline(result.totalMs, "smoke_liveTail_2x400_stack");
  });

  it("equity-каталог — все логики (узкое место UI при длинной истории)", () => {
    const { ms, logicCount } = simulateEquityCatalogRuns(
      E,
      packs2,
      EQUITY_CATALOG_LOGIC_IDS,
      a,
      b,
      E.DEFAULT_PARAMS,
      vol,
      ALL_INDICATORS
    );
    assert.equal(logicCount, EQUITY_CATALOG_LOGIC_IDS.length);
    assertBaseline(ms, "smoke_equity_2x400_allLogics");
  });

  it("@@AutoReverses — 4× runMulti на окне 220 свечей (2 инстр.)", () => {
    const spec = E.resolveLogicSpecStack(EQUITY_CATALOG_LOGIC_IDS, {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
    const { best, variants, totalMs } = simulateAutoReversesPick(
      E,
      packs2,
      spec,
      E.DEFAULT_PARAMS,
      vol,
      E.DEFAULT_STOPPER,
      TAIL_BARS
    );
    assert.equal(variants.length, 4);
    assert.ok(best);
    assertBaseline(totalMs, "smoke_autoReverses_2x400_stack");
  });
});
