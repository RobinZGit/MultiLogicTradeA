import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";
import { ALL_INDICATORS, makeCandles } from "./helpers/candles.mjs";
import { simulateLiveTailFinresp } from "./helpers/live-tail.mjs";

const E = loadEngine();

const SHARE_TICKERS = [
  "AFLT", "ALRS", "AFKS", "BSPB", "CHMF", "FEES", "GAZP", "GMKN", "HYDR", "IRAO",
  "LKOH", "MAGN", "MOEX", "MTSS", "MTLRP", "NVTK", "NLMK", "PLZL", "PIKK", "PHOR",
  "ROSN", "RUAL", "RTKMP", "SBER", "SBERP", "SNGSP", "SNGS", "TATN", "TATNP", "UPRO", "VTBR"
];

describe("simulateLiveTailFinresp (live.js path)", () => {
  it("31 тикеров — perSec не пустой, probe.ready на последнем баре", () => {
    const packs = SHARE_TICKERS.map((sec, i) => makeCandles(sec, 300, { startPrice: 15 + (i % 11) * 4 }));
    const spec = E.resolveLogicSpecStack(
      ["TBC", "UT", "sma_below"],
      {},
      E.DEFAULT_PARAMS,
      ALL_INDICATORS
    );
    const vol = { deposit: 7000, maxPositions: 10, volume: 10 };
    const result = simulateLiveTailFinresp(E, packs, spec, E.DEFAULT_PARAMS, vol, 220);

    assert.equal(result.perSec.length, 31);
    assert.ok(result.totalMs >= 0);
    for (const row of result.perSec) {
      assert.ok(row.rows?.length > 0, `${row.sec} has rows`);
      assert.equal(row.signalProbe?.ready, true, `${row.sec} probe ready`);
    }
  });

  it("портфельный cap: суммарный gross не превышает лимит", () => {
    const packs = SHARE_TICKERS.slice(0, 10).map((sec, i) => makeCandles(sec, 300, { startPrice: 30 + i * 5 }));
    const spec = E.resolveLogicSpec("sma_below", {}, E.DEFAULT_PARAMS, ALL_INDICATORS);
    const vol = { deposit: 5000, maxPositions: 3, volume: 10 };
    const capRub = E.portfolioGrossCapRub(vol);
    const result = simulateLiveTailFinresp(E, packs, spec, E.DEFAULT_PARAMS, vol, 220);

    let gross = 0;
    for (const row of result.perSec) {
      const px = packs.find((p) => p[0]?.sec === row.sec)?.at(-1)?.close || 0;
      gross += Math.abs(+row.pos || 0) * px;
    }
    assert.ok(gross <= capRub * 1.02 + 1, `gross ${gross} > cap ${capRub}`);
  });
});
