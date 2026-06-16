import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";
import { ALL_INDICATORS, makeCandles } from "./helpers/candles.mjs";
import { simulateLiveTailFinresp } from "./helpers/live-tail.mjs";
import {
  AUTO_REVERSE_VARIANTS,
  simulateAutoReversesPick
} from "./helpers/auto-reverses.mjs";

const E = loadEngine();
const vol = { deposit: 7000, maxPositions: 10, volume: 10 };
const LOOKBACK = 220;

const SHARE_TICKERS = [
  "AFLT", "ALRS", "AFKS", "BSPB", "CHMF", "FEES", "GAZP", "GMKN", "HYDR", "IRAO",
  "LKOH", "MAGN", "MOEX", "MTSS", "MTLRP", "NVTK", "NLMK", "PLZL", "PIKK", "PHOR",
  "ROSN", "RUAL", "RTKMP", "SBER", "SBERP", "SNGSP", "SNGS", "TATN", "TATNP", "UPRO", "VTBR"
];

function packsN(n, barCount) {
  return SHARE_TICKERS.slice(0, n).map((sec, i) =>
    makeCandles(sec, barCount, { startPrice: 20 + (i % 17) * 3 })
  );
}

function ftsSpec() {
  return E.resolveLogicSpec("FTS", {}, E.DEFAULT_PARAMS, { stoch: true, totstoch: true });
}

describe("simulateAutoReversesPick (@@AutoReverses)", () => {
  it("выбирает вариант с максимальным agg.finresp", () => {
    const packs = packsN(4, 300);
    const spec = ftsSpec();
    const { best, variants } = simulateAutoReversesPick(
      E,
      packs,
      spec,
      E.DEFAULT_PARAMS,
      vol,
      E.DEFAULT_STOPPER,
      LOOKBACK
    );
    assert.equal(variants.length, 4);
    assert.ok(best, "best variant exists");
    const maxFin = Math.max(...variants.map((v) => v.finresp).filter(Number.isFinite));
    assert.equal(best.finresp, maxFin);
    assert.ok(AUTO_REVERSE_VARIANTS.some((v) => v.key === best.key));
  });

  it("FTS на портфеле: варианты дают разные FINRESP (XOR + стороны)", () => {
    const packs = packsN(8, 400);
    const spec = ftsSpec();
    const { variants } = simulateAutoReversesPick(
      E,
      packs,
      spec,
      E.DEFAULT_PARAMS,
      vol,
      E.DEFAULT_STOPPER,
      LOOKBACK
    );
    const fins = variants.map((v) => v.finresp);
    assert.ok(
      new Set(fins).size >= 3,
      `expected ≥3 unique finresp among 4 variants, got ${[...new Set(fins)].join(", ")}`
    );
  });

  it("портфельный cap: gross exposure не превышает лимит у каждого варианта", () => {
    const packs = packsN(10, 300);
    const spec = E.resolveLogicSpec("sma_below", {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
    const tightVol = { deposit: 5000, maxPositions: 3, volume: 10 };
    const capRub = E.portfolioGrossCapRub(tightVol);
    const { variants } = simulateAutoReversesPick(
      E,
      packs,
      spec,
      E.DEFAULT_PARAMS,
      tightVol,
      E.DEFAULT_STOPPER,
      LOOKBACK
    );

    for (const v of variants) {
      const pv = { ...E.DEFAULT_PARAMS, ReverseSides: v.sides, ReverseSignals: v.signals };
      const tail = simulateLiveTailFinresp(E, packs, spec, pv, tightVol, LOOKBACK);
      let gross = 0;
      for (const row of tail.perSec) {
        const px = packs.find((p) => p[0]?.sec === row.sec)?.at(-1)?.close || 0;
        gross += Math.abs(+row.pos || 0) * px;
      }
      assert.ok(
        gross <= capRub * 1.02 + 1,
        `variant ${v.key}: gross ${gross} > cap ${capRub}`
      );
    }
  });

  it("ключи вариантов соответствуют ReverseSides/ReverseSignals", () => {
    const packs = packsN(2, 300);
    const spec = ftsSpec();
    const { variants } = simulateAutoReversesPick(
      E,
      packs,
      spec,
      E.DEFAULT_PARAMS,
      vol,
      E.DEFAULT_STOPPER,
      LOOKBACK
    );
    for (const v of variants) {
      const expectedKey = `${v.sides ? "1" : "0"}${v.signals ? "1" : "0"}`;
      assert.equal(v.key, expectedKey);
      assert.ok(Number.isFinite(v.finresp));
      assert.ok(v.perSecCount > 0);
    }
  });
});
