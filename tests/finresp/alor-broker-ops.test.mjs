import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const brokerOpsPath = path.join(root, "src/finresp/connectors/broker-ops.js");

function loadBrokerOps() {
  const code = fs.readFileSync(brokerOpsPath, "utf8");
  const ctx = { globalThis: {} };
  ctx.globalThis = ctx;
  vm.runInNewContext(code, ctx);
  return ctx.MultiLogicFinrespBrokerOps;
}

const B = loadBrokerOps();
const uid = (sym, market, board) => `alor:MOEX:${board || "TQBR"}:${sym}`;

test("alor: normalize buy trade with qtyUnits and commission", () => {
  const op = B.normalizeAlorTradeToBrokerOp({
    id: "t-1001",
    symbol: "SBER",
    board: "TQBR",
    side: "buy",
    qty: 10,
    qtyUnits: 100,
    price: 280.5,
    commission: 5.54,
    value: 28050,
    date: "2026-06-17T10:15:00Z"
  }, uid);
  assert.equal(op._broker, "alor");
  assert.equal(op.side, "buy");
  assert.equal(op.quantity, 100);
  assert.equal(op.commission, 5.54);
  assert.equal(op.price, 280.5);
  assert.equal(op.payment, -28050);
  assert.equal(op._alorLots, 10);
  assert.match(op.instrumentUid, /SBER/);
});

test("alor: normalize sell trade uses positive payment", () => {
  const op = B.normalizeAlorTradeToBrokerOp({
    id: "t-1002",
    symbol: "GAZP",
    board: "TQBR",
    side: "sell",
    qty: 5,
    qtyUnits: 50,
    price: 150,
    commission: 2.1,
    volume: 7500,
    date: "2026-06-17T11:00:00Z"
  }, uid);
  assert.equal(op.side, "sell");
  assert.equal(op.payment, 7500);
  assert.equal(op.operationType, "OPERATION_TYPE_SELL");
});

test("alor: futures board maps instrument type", () => {
  const op = B.normalizeAlorTradeToBrokerOp({
    id: "f-1",
    symbol: "SiU6",
    board: "SPBFUT",
    side: "buy",
    qty: 2,
    qtyUnits: 2,
    price: 90000,
    commission: 12,
    date: "2026-06-17T12:00:00Z"
  }, uid);
  assert.equal(op.instrumentType, "futures");
});

test("alor: order status and post-order response mapping", () => {
  assert.equal(B.alorOrderStatusToTbank("working"), "EXECUTION_REPORT_STATUS_NEW");
  assert.equal(B.alorOrderStatusToTbank("filled"), "EXECUTION_REPORT_STATUS_FILL");
  assert.equal(B.alorOrderStatusToTbank("canceled"), "EXECUTION_REPORT_STATUS_CANCELLED");
  const mapped = B.mapAlorPostOrderResponse({ message: "success", orderNumber: "409153" }, 10);
  assert.equal(mapped.orderId, "409153");
  assert.equal(mapped.executionReportStatus, "EXECUTION_REPORT_STATUS_NEW");
  const partial = B.mapAlorPostOrderResponse({
    message: "(162) Заявка на покупку N 9763124 зарегистрирована (3 удовлетворено).",
    orderNumber: "9763124"
  }, 10);
  assert.equal(partial.lotsExecuted, "3");
  assert.equal(partial.executionReportStatus, "EXECUTION_REPORT_STATUS_PARTIALLYFILL");
  assert.equal(B.alorPostOrderRejected({ message: "success" }), false);
  assert.equal(B.alorPostOrderRejected({ message: "Order rejected by exchange" }), true);
});

test("alor connector wires broker-ops and getOperations", () => {
  const alor = fs.readFileSync(path.join(root, "src/finresp/connectors/alor.js"), "utf8");
  const live = fs.readFileSync(path.join(root, "src/finresp/MultiLogic_FinrespCalculator.live.js"), "utf8");
  const scripts = fs.readFileSync(path.join(root, "src/app/finresp/finresp-engine-scripts.ts"), "utf8");
  assert.match(alor, /normalizeTrade/);
  assert.match(alor, /history\/trades/);
  assert.match(alor, /allowMargin:\s*true/);
  assert.match(alor, /stop:\s*false/);
  assert.match(alor, /mapAlorPostOrderResponse/);
  assert.match(live, /broker\.getOperations/);
  assert.match(live, /_broker === "alor"/);
  assert.match(scripts, /connectors\/broker-ops\.js/);
});
