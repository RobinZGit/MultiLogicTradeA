import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { loadEngine } from "./harness/load-engine.mjs";
import { makeCandles } from "./helpers/candles.mjs";

const E = loadEngine();
const FINRESP_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "finresp");
const indCtx = { globalThis: {} };
indCtx.globalThis = indCtx;
vm.createContext(indCtx);
for (const p of ["indicators/stoch.js", "indicators/ctg/contango-series.js"]) {
  vm.runInContext(readFileSync(join(FINRESP_ROOT, p), "utf8"), indCtx, { filename: p });
}
const IND = indCtx.MultiLogicFinrespIndicators;

describe("buildContangoCandles", () => {
  it("строит spread OHLC futures − spot", () => {
    const fut = makeCandles("GZH5", 5, { startPrice: 150, market: "futures" });
    const spot = makeCandles("GAZP", 5, { startPrice: 140, market: "shares" });
    const ctg = IND.buildContangoCandles(fut, spot);
    assert.equal(ctg.length, fut.length);
    for (let i = 0; i < fut.length; i++) {
      assert.ok(Math.abs(ctg[i].close - (fut[i].close - spot[i].close)) < 1e-6);
    }
  });
});

describe("CtgStoch in FTS", () => {
  it("runOnCandles с spot даёт конечный finresp", () => {
    const fut = makeCandles("GZH5", 260, { startPrice: 200, drift: 0.05, market: "futures" });
    const spot = makeCandles("GAZP", 260, { startPrice: 190, drift: 0.02, market: "shares" });
    const spec = E.resolveLogicSpec("FTS", {}, E.DEFAULT_PARAMS, { stoch: true, ctgstoch: true });
    const a = 120;
    const b = fut.length - 1;
    const vol = { deposit: 100000, maxPositions: 5, volume: 10 };
    const r = E.runOnCandles(fut, spec, a, b, E.DEFAULT_PARAMS, vol, {
      sec: "GZH5",
      ctgSpotPacks: { GZH5: spot }
    });
    assert.ok(Number.isFinite(r.finresp));
    assert.ok(r.rows?.length > 0);
  });
});
