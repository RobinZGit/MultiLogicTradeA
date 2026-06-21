/*
 * Shared broker operation normalization (Alor → unified trade-history shape).
 */
(function (root) {
  "use strict";

  /** @param {string} board */
  function alorBoardIsFutures(board) {
    const b = String(board || "").toUpperCase();
    return b.includes("FUT") || b === "SPBFUT" || b === "RFUD";
  }

  /**
   * @param {object} trade — Alor trade (Simple)
   * @param {(symbol: string, market: string, board?: string) => string} makeInstrumentId
   * @param {string} [exchangeCode]
   */
  function normalizeAlorTradeToBrokerOp(trade, makeInstrumentId, exchangeCode) {
    if (!trade) return null;
    const symbol = String(trade.symbol || trade.ticker || "").toUpperCase();
    if (!symbol) return null;
    const board = String(trade.board || trade.instrumentGroup || "").trim();
    const market = alorBoardIsFutures(board) ? "futures" : "shares";
    const lot = Math.max(1, +(trade.lotSize || trade.lotsize || trade.lot || 1));
    const qtyLots = Math.abs(Math.trunc(+(trade.qty ?? trade.qtyBatch ?? 0)));
    let pieces = Math.abs(Math.trunc(+(trade.qtyUnits ?? trade.filledQtyUnits ?? 0)));
    if (!pieces && qtyLots) pieces = qtyLots * lot;
    if (!pieces) return null;
    const sideRaw = String(trade.side || "").toLowerCase();
    const side = sideRaw.includes("sell") ? "sell" : (sideRaw.includes("buy") ? "buy" : null);
    if (!side) return null;
    const price = +(trade.price ?? trade.px ?? 0);
    const commission = Math.abs(+(trade.commission ?? 0));
    const value = Math.abs(+(trade.value ?? trade.volume ?? 0));
    const notional = Number.isFinite(value) && value > 0 ? value : (Number.isFinite(price) ? pieces * price : 0);
    const payment = side === "buy" ? -notional : notional;
    const uidFn = typeof makeInstrumentId === "function"
      ? makeInstrumentId
      : (sym, mkt, brd) => `alor:${exchangeCode || "MOEX"}:${brd || "TQBR"}:${sym}`;
    const instrumentUid = uidFn(symbol, market, board);
    const id = String(trade.id ?? trade.orderno ?? trade.orderNo ?? "");
    if (!id) return null;
    let date = trade.date || trade.tradeDate || trade.time;
    if (typeof date === "number") date = new Date(date * 1000).toISOString();
    return {
      id,
      date: date || new Date().toISOString(),
      _broker: "alor",
      side,
      operationType: side === "buy" ? "OPERATION_TYPE_BUY" : "OPERATION_TYPE_SELL",
      quantity: pieces,
      price: Number.isFinite(price) ? price : null,
      commission: Number.isFinite(commission) ? commission : 0,
      payment: Number.isFinite(payment) ? payment : null,
      instrumentUid,
      figi: instrumentUid,
      ticker: symbol,
      instrumentType: market === "futures" ? "futures" : "share",
      _alor: trade,
      _alorLots: qtyLots || Math.max(1, Math.round(pieces / lot))
    };
  }

  /** @param {string} status */
  function alorOrderStatusToTbank(status) {
    const s = String(status || "").toLowerCase();
    if (s === "filled") return "EXECUTION_REPORT_STATUS_FILL";
    if (s === "working") return "EXECUTION_REPORT_STATUS_NEW";
    if (s === "canceled" || s === "cancelled") return "EXECUTION_REPORT_STATUS_CANCELLED";
    if (s === "rejected") return "EXECUTION_REPORT_STATUS_REJECTED";
    return "EXECUTION_REPORT_STATUS_NEW";
  }

  /**
   * @param {object} data — Alor POST order response
   * @param {number} lotsRequested
   */
  function mapAlorPostOrderResponse(data, lotsRequested) {
    const orderId = String(data?.orderNumber ?? data?.orderId ?? data?.id ?? "");
    const msg = String(data?.message || "");
    let lotsExecuted = 0;
    const satisfied = msg.match(/(\d+)\s+удовлетвор/i) || msg.match(/(\d+)\s+satisfied/i);
    if (satisfied) lotsExecuted = Math.max(0, Math.floor(+satisfied[1] || 0));
    const qty = Math.max(0, Math.floor(+lotsRequested || 0));
    let executionReportStatus = "EXECUTION_REPORT_STATUS_NEW";
    if (/reject|отклон/i.test(msg)) executionReportStatus = "EXECUTION_REPORT_STATUS_REJECTED";
    else if (qty > 0 && lotsExecuted >= qty) executionReportStatus = "EXECUTION_REPORT_STATUS_FILL";
    else if (lotsExecuted > 0) executionReportStatus = "EXECUTION_REPORT_STATUS_PARTIALLYFILL";
    else if (/success/i.test(msg)) executionReportStatus = "EXECUTION_REPORT_STATUS_NEW";
    return {
      orderId,
      order_id: orderId,
      lotsExecuted: String(lotsExecuted),
      lots_executed: String(lotsExecuted),
      lotsRequested: String(qty),
      executionReportStatus,
      message: msg,
      orderDate: new Date().toISOString()
    };
  }

  /** @param {object} data */
  function alorPostOrderRejected(data) {
    const st = String(data?.executionReportStatus || "").toUpperCase();
    if (st.includes("REJECT")) return true;
    const msg = String(data?.message || "").toLowerCase();
    if (!msg) return false;
    if (msg.includes("success")) return false;
    return /reject|отклон|error|ошиб|denied|failed/.test(msg);
  }

  /** Numeric or MoneyValue → ₽. */
  function brokerMoneyRub(value) {
    if (value == null || value === "") return NaN;
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    const cur = String(value.currency || "rub").toLowerCase();
    if (cur !== "rub" && cur !== "rur") return NaN;
    const units = Number(value.units ?? 0);
    const nano = Number(value.nano ?? 0);
    return units + nano / 1e9;
  }

  root.MultiLogicFinrespBrokerOps = {
    alorBoardIsFutures,
    normalizeAlorTradeToBrokerOp,
    alorOrderStatusToTbank,
    mapAlorPostOrderResponse,
    alorPostOrderRejected,
    brokerMoneyRub
  };
})(typeof window !== "undefined" ? window : globalThis);
