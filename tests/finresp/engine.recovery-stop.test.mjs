import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";

const E = loadEngine();
const vol = { deposit: 100000, volume: 10, commissionPct: 0 };

function row(time, eq, pos = 1, openLogicId = "UT") {
  return { time, eq, cash: eq * 0.1, pos, close: 100, commission: 0, openLogicId };
}

describe("applyPauseOnDrawdown (@@PauseOnDrawdown)", () => {
  it("emits pause and resume when drawdown exceeds threshold then model recovers", () => {
    const times = [1, 2, 3, 4, 5];
    const perSec = [{
      sec: "TST",
      pos: 0,
      rows: [
        row(1, 100, 0, null),
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

describe("applyPauseOnDrawdownPerLogic (@@PauseOnDrawdownPerLogic)", () => {
  it("emits per-logic pause with logicKey when isolated equity drawdown hits", () => {
    const times = [1, 2, 3, 4, 5];
    const perSec = [{
      sec: "TST",
      pos: 0,
      rows: [
        row(1, 100, 0, null),
        row(2, 105, 1, "UT"),
        row(3, 110, 1, "UT"),
        row(4, 98, 1, "UT"),
        row(5, 112, 1, "UT"),
      ],
    }];
    const isoEqByLogic = {
      UT: [100, 105, 110, 98, 112],
    };
    const { recoveryStop, perSec: out } = E.applyPauseOnDrawdownPerLogic(
      perSec,
      times,
      vol,
      { enabled: true, perLogic: true, drawdownPct: 5, logicKeys: ["UT"] },
      { isoEqByLogic },
    );
    assert.equal(recoveryStop.perLogic, true);
    assert.equal(recoveryStop.events.length, 2);
    assert.equal(recoveryStop.events[0].kind, "pause");
    assert.equal(recoveryStop.events[0].logicKey, "UT");
    assert.equal(recoveryStop.events[0].time, 4);
    assert.equal(recoveryStop.events[1].kind, "resume");
    assert.equal(recoveryStop.events[1].logicKey, "UT");
    const flatRow = out[0].rows.find((r) => r.time === 4);
    assert.equal(flatRow?.pos, 0);
  });

  it("routes applyPauseOnDrawdown to per-logic when cfg.perLogic", () => {
    const times = [1, 2, 3];
    const perSec = [{
      sec: "TST",
      rows: [row(1, 100, 0, null), row(2, 90, 1, "L5"), row(3, 95, 1, "L5")],
    }];
    const { recoveryStop } = E.applyPauseOnDrawdown(
      perSec,
      times,
      vol,
      { enabled: true, perLogic: true, drawdownPct: 1, logicKeys: ["L5"] },
      { isoEqByLogic: { L5: [100, 90, 95] } },
    );
    assert.equal(recoveryStop.perLogic, true);
    assert.ok(recoveryStop.events.some((e) => e.logicKey === "L5" && e.kind === "pause"));
  });
});
