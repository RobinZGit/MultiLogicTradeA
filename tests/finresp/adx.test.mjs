import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { loadEngine } from "./harness/load-engine.mjs";
import { makeCandles, ALL_INDICATORS } from "./helpers/candles.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADX_PATH = join(__dirname, "..", "..", "src", "finresp", "indicators", "adx.js");

test("adxSeries returns adx and di lines", () => {
  const ctx = { globalThis: {} };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(ADX_PATH, "utf8"), ctx, { filename: ADX_PATH });
  const candles = makeCandles("TEST", 80);
  const { adx, plusDi, minusDi } = ctx.MultiLogicFinrespIndicators.adxSeries(candles, 14);
  assert.equal(adx.length, candles.length);
  const vals = adx.filter((v) => v != null && Number.isFinite(v));
  assert.ok(vals.length > 10);
  assert.ok(vals.every((v) => v >= 0 && v <= 100));
  assert.ok(plusDi.some((v) => v != null));
  assert.ok(minusDi.some((v) => v != null));
});

test("L1 and UCT default lines include ADX next to ATR context", () => {
  const E = loadEngine();
  const l1 = E.DEFAULT_LOGIC_LINES.L1;
  const uct = E.DEFAULT_LOGIC_LINES.UCT;
  assert.match(l1, /ATR\(14;Gr=3%;Lb=5\)\(GrOk\).*ADX\(14;Min=25\)\(TrOk\)/);
  assert.match(uct, /ADX\(14;Max=25\)\(WkOk\)/);
  const parsed = E.parseLogicLine(l1, E.DEFAULT_PARAMS, ALL_INDICATORS);
  const kinds = (parsed.opLongAtoms || []).map((a) => a.kind);
  assert.ok(kinds.includes("adx"));
  assert.ok(kinds.includes("atr"));
});

test("L2 bokovik uses ADX WkOk after ATR", () => {
  const E = loadEngine();
  const line = E.DEFAULT_LOGIC_LINES.L2;
  assert.match(line, /ATR\(14;Gr=3%;Lb=5\)\(GrOk\).*ADX\(14;Max=25\)\(WkOk\)/);
  const parsed = E.parseLogicLine(line, E.DEFAULT_PARAMS, ALL_INDICATORS);
  const adx = (parsed.opLongAtoms || []).find((a) => a.kind === "adx");
  assert.equal(adx?.signal, "WkOk");
});

test("ensureAdxInLogicLineString injects TrOk after ATR", () => {
  const E = loadEngine();
  const raw = "Op(Long(SMA(100)(Ab) AND ATR(14;Gr=3%;Lb=5)(GrOk) AND MACD(12,26,9)(Macd>Sig)))";
  const out = E.ensureAdxInLogicLineString(raw);
  assert.match(out, /ATR\(14;Gr=3%;Lb=5\)\(GrOk\) AND ADX\(14;Min=25\)\(TrOk\)/);
});

test("INDICATOR_OPTIONS includes ADX after ATR", () => {
  const E = loadEngine();
  const keys = E.INDICATOR_OPTIONS.map((o) => o.key);
  const ai = keys.indexOf("atr");
  const di = keys.indexOf("adx");
  assert.ok(ai >= 0 && di === ai + 1);
});
