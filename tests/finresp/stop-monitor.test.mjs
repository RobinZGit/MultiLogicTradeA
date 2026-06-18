import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { loadEngine } from "./harness/load-engine.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FINRESP_ROOT = join(__dirname, "..", "..", "src", "finresp");
const STOP_MONITOR_PATH = join(FINRESP_ROOT, "MultiLogic_FinrespCalculator.stop-monitor.js");

function loadStopMonitor() {
  const E = loadEngine();
  const context = { globalThis: { MultiLogicFinrespEngine: E } };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(readFileSync(STOP_MONITOR_PATH, "utf8"), context, { filename: STOP_MONITOR_PATH });
  return context.MultiLogicFinrespStopMonitor;
}

describe("MultiLogicFinrespStopMonitor", () => {
  const SM = loadStopMonitor();

  it("evalRecoveryDrawdown: pause при просадке", () => {
    const r = SM.evalRecoveryDrawdown({
      enabled: true,
      paused: false,
      tradingActive: true,
      equity: 900,
      peakEquity: 1000,
      drawdownPct: 5
    });
    assert.equal(r.action, "pause");
    assert.ok(r.meta.drawdownPct >= 10);
  });

  it("evalRecoveryDrawdown: resume когда модель восстановилась", () => {
    const r = SM.evalRecoveryDrawdown({
      enabled: true,
      paused: true,
      resumeAt: 1000,
      modelEquity: 1005
    });
    assert.equal(r.action, "resume");
  });

  it("evalPortfolioStopper: hit на просадке портфеля", () => {
    const history = [];
    for (let i = 0; i < 20; i++) {
      history.push({ equity: 100000 - i * 10, time: `t${i}` });
    }
    const { hit } = SM.evalPortfolioStopper({
      stopperConfig: { useSl: true, useTp: false, slMult: 2, atrLen: 5, refEquity: 100000 },
      equity: 50000,
      time: "t20",
      watch: { equityHistory: history }
    });
    assert.ok(hit === null || hit.kind === "sl");
  });

  it("scanPositionStops: находит posStop на последнем баре", () => {
    const hits = SM.scanPositionStops([
      { sec: "GAZP", rows: [{ posStop: "sl", time: "2026-01-01", close: 180 }] }
    ]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, SM.STOP_KIND.POSITION_SL);
  });

  it("evaluatePollStopTick: объединяет recovery и portfolio", () => {
    const out = SM.evaluatePollStopTick({
      source: "test",
      recoveryEnabled: false,
      recoveryPaused: false,
      tradingActive: false,
      equity: 1000,
      stopperConfig: { useSl: false, useTp: false },
      time: "t0",
      portfolioWatch: {},
      perSec: [],
      includePositionStops: false
    });
    assert.equal(out.rhythm, SM.RHYTHM.POLL);
    assert.equal(out.source, "test");
  });
});
