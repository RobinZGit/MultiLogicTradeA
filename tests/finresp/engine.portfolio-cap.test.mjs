import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./harness/load-engine.mjs";

const E = loadEngine();

describe("portfolioGrossCapRub", () => {
  it("deposit × maxPositions × volume%", () => {
    const rub = E.portfolioGrossCapRub({ deposit: 7000, maxPositions: 10, volume: 10 });
    assert.equal(rub, 7000);
  });

  it("returns 0 for empty deposit", () => {
    assert.equal(E.portfolioGrossCapRub({ deposit: 0, maxPositions: 10, volume: 10 }), 0);
  });
});

describe("createPortfolioCap", () => {
  const vol = { deposit: 10000, maxPositions: 3, volume: 10 };

  it("capRub matches portfolioGrossCapRub", () => {
    const cap = E.createPortfolioCap(vol);
    assert.equal(cap.capRub, E.portfolioGrossCapRub(vol));
  });

  it("limits total gross exposure across tickers", () => {
    const cap = E.createPortfolioCap(vol);
    cap.setPos("A", 10, 100);
    cap.setPos("B", 10, 100);
    assert.ok(cap.grossExposureRub() <= cap.capRub + 1e-6);
    const allowed = cap.canOpenPieces("C", 100, 100);
    const after = cap.grossExposureRub() + allowed * 100;
    assert.ok(after <= cap.capRub + 1e-6);
  });

  it("clampTargetPos trims oversized target", () => {
    const cap = E.createPortfolioCap({ deposit: 1000, maxPositions: 1, volume: 10 });
    cap.setPos("X", 0, 50);
    const clamped = cap.clampTargetPos("X", 50, 500);
    assert.ok(Math.abs(clamped) <= cap.maxAbsPieces("X", 50) + 1e-6);
  });

  it("resolveOpenLot respects shared cap", () => {
    const portfolioCap = E.createPortfolioCap(vol);
    portfolioCap.setPos("GAZP", 50, 100);
    portfolioCap.setPos("SBER", 50, 100);
    const lot = E.calcTradeVolume(100, vol);
    const opened = portfolioCap.canOpenPieces("LKOH", 100, lot);
    assert.ok(opened * 100 <= portfolioCap.remainingRub("LKOH", 100) + 1e-6);
  });
});
