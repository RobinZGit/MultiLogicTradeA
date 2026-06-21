import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";

const E = loadEngine();

describe("stop rhythm (calc-stop-tf)", () => {
  it("buildPerSecEquitySeriesMtm reflects intra-bar price moves", () => {
    const rows = [
      { time: 1000, cash: 1000, pos: 10, eq: 1100, close: 10 },
      { time: 2000, cash: 1000, pos: 10, eq: 1200, close: 20 }
    ];
    const stopCandles = [
      { time: 1000, close: 10 },
      { time: 1500, close: 15 },
      { time: 2000, close: 20 }
    ];
    const times = [1000, 1500, 2000];
    const mtm = E.buildPerSecEquitySeriesMtm(rows, times, stopCandles);
    assert.equal(mtm[0], 1100);
    assert.equal(mtm[1], 1000 + 10 * 15);
    assert.equal(mtm[2], 1200);
  });

  it("resolveStopRhythm uses stop pack grid when slTpTf differs", () => {
    const plan = {
      times: [1000, 2000],
      tStart: 1000,
      tEnd: 2000
    };
    const stopPacks = [[
      { time: 1000, close: 1 },
      { time: 1500, close: 2 },
      { time: 2000, close: 3 }
    ]];
    const rhythm = E.resolveStopRhythm({ calcTf: "60", slTpTf: "5" }, plan, stopPacks);
    assert.equal(rhythm.rhythmTimes.length, 3);
    assert.ok(rhythm.rhythmStopPacks);
  });
});
