import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";

const E = loadEngine();
const vol = { deposit: 100000, volume: 10, commissionPct: 0 };

function row(time, eq, pos = 1) {
  return { time, eq, cash: eq * 0.1, pos, close: 100, commission: 0 };
}

describe("applyPauseOnDrawdown (@@PauseOnDrawdown)", () => {
  it("emits pause and resume when drawdown exceeds threshold then model recovers", () => {
    const times = [1, 2, 3, 4, 5];
    const perSec = [{
      sec: "TST",
      pos: 0,
      rows: [
        row(1, 100),
        row(2, 105),
        row(3, 110),
        row(4, 98),
        row(5, 112),
      ],
    }];
    const { recoveryStop } = E.applyPauseOnDrawdown(
      perSec,
      times,
      vol,
      { enabled: true, drawdownPct: 5 },
    );
    assert.equal(recoveryStop.events.length, 2);
    assert.equal(recoveryStop.events[0].kind, "pause");
    assert.equal(recoveryStop.events[0].time, 4);
    assert.ok(recoveryStop.events[0].drawdownPct >= 5);
    assert.equal(recoveryStop.events[1].kind, "resume");
    assert.equal(recoveryStop.events[1].time, 5);
  });

  it("returns no events when disabled", () => {
    const times = [1, 2];
    const perSec = [{ sec: "TST", rows: [row(1, 100), row(2, 80)] }];
    const { recoveryStop } = E.applyPauseOnDrawdown(
      perSec,
      times,
      vol,
      { enabled: false, drawdownPct: 1 },
    );
    assert.equal(recoveryStop.events.length, 0);
  });
});
