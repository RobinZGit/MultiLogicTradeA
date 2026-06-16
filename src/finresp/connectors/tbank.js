/*
 * T-Bank Invest API connector for MultiLogic FINRESP live trading.
 * Registers factory on MultiLogicFinrespConnectors.register("tbank", ...).
 */
(function (root) {
  "use strict";

  const REG = root.MultiLogicFinrespConnectors = root.MultiLogicFinrespConnectors || {};
  const factories = REG._factories = REG._factories || new Map();
  if (typeof REG.register !== "function") {
    REG.register = (id, factory) => {
      factories.set(String(id), factory);
      return factory;
    };
  }
  if (typeof REG.get !== "function") {
    REG.get = (id) => factories.get(String(id));
  }
  if (typeof REG.create !== "function") {
    REG.create = (id, deps) => {
      const factory = REG.get(id);
      if (!factory) throw new Error(`Connector not registered: ${id}`);
      return factory(deps);
    };
  }

  /** @param {object} d */
  function createTbankConnector(d) {
    const state = d.state;
    const live = d.liveState || state.live;
    const TBANK_REST_BASES = d.TBANK_REST_BASES;
    const TBANK_ACCOUNT_STORE_KEY = d.TBANK_ACCOUNT_STORE_KEY;
    const TBANK_HOST_STORE_KEY = d.TBANK_HOST_STORE_KEY;
    const safeStorageGet = d.safeStorageGet;
    const safeStorageSet = d.safeStorageSet;
    const moneyValueRub = d.moneyValueRub;
    const accountLabel = d.accountLabel;
    const noteLiveTech = d.noteLiveTech;
    const fmt = d.fmt;
    const E = d.E;
    const liveOrderTypeUi = d.liveOrderTypeUi || (() => "market");
    const resolveOrderPrice = d.resolveOrderPrice;
    const orderBookDepth = d.orderBookDepth || 20;

    const tbank = () => state.tbank;

    function instField(inst, ...keys) {
      if (!inst) return undefined;
      for (const k of keys) {
        if (inst[k] !== undefined && inst[k] !== null) return inst[k];
      }
      return undefined;
    }

    function instApiTradable(inst) {
      const v = instField(inst, "apiTradeAvailableFlag", "api_trade_available_flag");
      return v === undefined ? null : !!v;
    }

    function quotationToNumber(q) {
      if (q == null) return NaN;
      if (typeof q === "number") return q;
      return (+q.units || 0) + (+q.nano || 0) / 1e9;
    }

    function quotationFromNumber(price) {
      const p = Math.max(0, +price || 0);
      const units = Math.floor(p);
      const nano = Math.round((p - units) * 1e9);
      return { units: String(units), nano };
    }

    function orderPriceType(meta, marketHint) {
      const kind = String(instField(meta, "instrumentType", "instrument_type", "instrumentKind") || "").toLowerCase();
      if (kind.includes("future") || kind.includes("bond") || marketHint === "futures") {
        return "PRICE_TYPE_POINT";
      }
      return "PRICE_TYPE_CURRENCY";
    }

    function postOrderTypeEnum(orderType, market) {
      if (orderType === "limit") return "ORDER_TYPE_LIMIT";
      return market === "futures" ? "ORDER_TYPE_MARKET" : "ORDER_TYPE_BESTPRICE";
    }

    function isPostOrderRetryAsLimitError(err) {
      const msg = String(err?.message || err || "");
      return /frozen price|Zamorozhennaya czena ne sootvetstvuet|only limit order is allowed|30068|price_type is invalid|30104/i.test(msg);
    }

    function roundPriceToIncrement(price, meta) {
      if (!Number.isFinite(price)) return price;
      const mpi = quotationToNumber(meta?.minPriceIncrement ?? meta?.min_price_increment);
      if (!Number.isFinite(mpi) || mpi <= 0) return price;
      return Math.round(price / mpi) * mpi;
    }

    function postOrderRejected(data) {
      const st = String(data?.executionReportStatus || data?.execution_report_status || "").toUpperCase();
      return st.includes("REJECT");
    }

    function selectedHostId() {
      const id = safeStorageGet(TBANK_HOST_STORE_KEY) || "tinkoff";
      return TBANK_REST_BASES[id] ? id : "tinkoff";
    }

    function setHostId(id) {
      const safeId = TBANK_REST_BASES[id] ? id : "tinkoff";
      safeStorageSet(TBANK_HOST_STORE_KEY, safeId);
      return safeId;
    }

    function fetchErrorMessage(err, hostId) {
      const raw = err?.message || String(err || "ошибка сети");
      if (err instanceof TypeError) {
        return `Не удалось подключиться к ${hostId}. Это обычно TLS/сертификат, сеть, VPN/провайдер или блокировка браузера. Калькулятор попробовал оба официальных API-хоста автоматически.`;
      }
      return raw;
    }

    async function request(serviceMethod, body) {
      if (!tbank().token) throw new Error("Токен не расшифрован.");
      const firstHost = selectedHostId();
      const hostIds = [firstHost, ...Object.keys(TBANK_REST_BASES).filter((id) => id !== firstHost)];
      let lastNetworkError = null;
      for (const hostId of hostIds) {
        try {
          const res = await fetch(`${TBANK_REST_BASES[hostId]}${serviceMethod}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${tbank().token}`
            },
            body: JSON.stringify(body || {})
          });
          const text = await res.text();
          let data = {};
          if (text) {
            try { data = JSON.parse(text); }
            catch (_) { data = { raw: text }; }
          }
          if (!res.ok) {
            const msg = data.message || data.error || data.raw || `${res.status} ${res.statusText}`;
            const ru = /frozen price does not match order type|Zamorozhennaya czena ne sootvetstvuet tipu zayavki/i.test(msg)
              ? "Замороженная цена не соответствует типу заявки (priceType/ORDER_TYPE). Робот повторит лимитом по последней цене."
              : /only limit order is allowed/i.test(msg)
                ? "Сейчас доступны только лимитные заявки — робот повторит лимитом по последней цене."
                : msg;
            throw new Error(ru);
          }
          if (hostId !== firstHost) {
            setHostId(hostId);
            if (typeof d.onHostFallback === "function") {
              d.onHostFallback(hostId);
            }
          }
          return data;
        } catch (err) {
          if (err instanceof TypeError) {
            lastNetworkError = new Error(fetchErrorMessage(err, hostId));
            continue;
          }
          throw err;
        }
      }
      throw lastNetworkError || new Error("Не удалось подключиться к API T-Bank.");
    }

    function scoreInstrument(inst, market) {
      let s = 0;
      const cc = String(instField(inst, "classCode", "class_code") || "").toUpperCase();
      const kind = String(instField(inst, "instrumentType", "instrument_type", "instrumentKind") || "").toUpperCase();
      const apiOk = instApiTradable(inst);
      if (apiOk === true) s += 200;
      if (apiOk === false) s -= 100;
      if (market === "shares") {
        if (cc === "TQBR") s += 80;
        else if (cc === "TQTF") s += 40;
        if (kind.includes("SHARE")) s += 30;
      }
      if (market === "futures") {
        if (cc === "SPBFUT" || cc.includes("FUT")) s += 80;
      }
      return s;
    }

    function pickInstrument(list, sec, market) {
      const secU = String(sec || "").trim().toUpperCase();
      let pool = (list || []).filter((i) => String(i.ticker || "").toUpperCase() === secU);
      if (!pool.length && market === "futures") {
        pool = (list || []).filter((i) => String(i.ticker || "").toUpperCase().startsWith(secU));
      }
      if (!pool.length) pool = list || [];
      if (!pool.length) return null;
      return pool.slice().sort((a, b) => scoreInstrument(b, market) - scoreInstrument(a, market))[0];
    }

    async function findInstrument(sec, market) {
      const key = `${market}:${String(sec || "").trim().toUpperCase()}`;
      if (live.instrumentCache.has(key)) return live.instrumentCache.get(key);
      const data = await request("InstrumentsService/FindInstrument", { query: String(sec || "").trim() });
      const inst = pickInstrument(data.instruments || [], sec, market);
      if (inst) live.instrumentCache.set(key, inst);
      return inst || null;
    }

    async function getInstrumentById(instrumentId) {
      if (!instrumentId) return null;
      const cacheKey = `id:${instrumentId}`;
      if (live.instrumentCache.has(cacheKey)) return live.instrumentCache.get(cacheKey);
      const data = await request("InstrumentsService/GetInstrumentBy", {
        idType: "INSTRUMENT_ID_TYPE_UID",
        id: instrumentId
      });
      const inst = data.instrument || null;
      if (inst) live.instrumentCache.set(cacheKey, inst);
      return inst;
    }

    async function getTradingStatus(instrumentId) {
      if (!instrumentId) return null;
      const cacheKey = `ts:${instrumentId}`;
      if (live.tradingStatusCache.has(cacheKey)) return live.tradingStatusCache.get(cacheKey);
      const data = await request("MarketDataService/GetTradingStatus", { instrumentId });
      if (data) live.tradingStatusCache.set(cacheKey, data);
      return data || null;
    }

    function tradingStatusApiOk(ts) {
      return !!(ts?.apiTradeAvailableFlag ?? ts?.api_trade_available_flag);
    }

    function tradingStatusOrderOk(ts, orderTypeOverride) {
      const isLimit = (orderTypeOverride || liveOrderTypeUi()) === "limit";
      const flag = isLimit
        ? (ts?.limitOrderAvailableFlag ?? ts?.limit_order_available_flag)
        : (ts?.marketOrderAvailableFlag ?? ts?.market_order_available_flag);
      return flag !== false;
    }

    async function validateTradable(instrumentId, instMeta, orderTypeOverride) {
      const apiFromInst = instApiTradable(instMeta);
      if (apiFromInst === false) {
        return { ok: false, reason: "торговля через API недоступна для инструмента" };
      }
      const ts = await getTradingStatus(instrumentId);
      if (!ts) return { ok: false, reason: "нет статуса торговли" };
      if (!tradingStatusApiOk(ts)) {
        return { ok: false, reason: "торговля через API недоступна (api_trade_available_flag)" };
      }
      const orderType = orderTypeOverride || liveOrderTypeUi();
      if (!tradingStatusOrderOk(ts, orderType)) {
        const ot = orderType === "limit" ? "лимитные" : "рыночные";
        return { ok: false, reason: `${ot} заявки сейчас недоступны` };
      }
      return { ok: true };
    }

    async function getLastPrice(instrumentId) {
      const data = await request("MarketDataService/GetLastPrices", {
        instrumentId: [instrumentId]
      });
      const lp = (data.lastPrices || [])[0];
      if (!lp?.price) return null;
      return (+lp.price.units || 0) + (+lp.price.nano || 0) / 1e9;
    }

    async function fetchCandlesRange(instrumentId, fromDate, toDate, interval) {
      const chunkDays = E.tbankCandleChunkDays(interval);
      const candleInterval = E.tbankIntervalForCalcTf(interval);
      const out = [];
      let cursor = new Date(fromDate);
      const end = new Date(toDate);
      if (end.getHours() === 0 && end.getMinutes() === 0) end.setHours(23, 59, 59, 999);
      while (cursor <= end) {
        const chunkEnd = new Date(cursor);
        chunkEnd.setDate(chunkEnd.getDate() + chunkDays - 1);
        chunkEnd.setHours(23, 59, 59, 999);
        const toChunk = chunkEnd > end ? end : chunkEnd;
        const data = await request("MarketDataService/GetCandles", {
          instrumentId,
          from: cursor.toISOString(),
          to: toChunk.toISOString(),
          interval: candleInterval
        });
        out.push(...(data.candles || []));
        cursor = new Date(toChunk.getTime() + 1000);
      }
      return out;
    }

    async function getOrderBook(instrumentId, depth) {
      return request("MarketDataService/GetOrderBook", {
        instrumentId,
        depth: depth || orderBookDepth
      });
    }

    async function fetchOrderBookCached(instrumentId) {
      const cacheKey = String(instrumentId || "");
      const prev = live.obTrendCache.get(cacheKey);
      const now = Date.now();
      if (prev?.ob && now - (prev.at || 0) < 2500) return prev.ob;
      const ob = await getOrderBook(instrumentId);
      live.obTrendCache.set(cacheKey, { ob, at: now });
      return ob;
    }

    async function getPortfolio(accountId) {
      return request("OperationsService/GetPortfolio", {
        accountId: accountId || tbank().selectedAccountId,
        currency: "RUB"
      });
    }

    async function getPositions(accountId) {
      return request("OperationsService/GetPositions", {
        accountId: accountId || tbank().selectedAccountId
      });
    }

    async function getOrders(accountId) {
      return request("OrdersService/GetOrders", {
        accountId: accountId || tbank().selectedAccountId
      });
    }

    async function getOperations(from, to, accountId) {
      return request("OperationsService/GetOperations", {
        accountId: accountId || tbank().selectedAccountId,
        from,
        to: to || new Date().toISOString(),
        state: "OPERATION_STATE_EXECUTED"
      });
    }

    async function cancelOrder(orderId, orderRequestId, accountId) {
      return request("OrdersService/CancelOrder", {
        accountId: accountId || tbank().selectedAccountId,
        orderId,
        orderRequestId: orderRequestId || orderId
      });
    }

    async function loadAccounts() {
      const data = await request("UsersService/GetAccounts", { status: "ACCOUNT_STATUS_OPEN" });
      tbank().accounts = (data.accounts || []).filter((a) =>
        !a.status || a.status === "ACCOUNT_STATUS_OPEN" || a.status === 2
      );
      if (!tbank().accounts.length) throw new Error("Открытые счета не найдены.");
      return tbank().accounts;
    }

    function selectAccount(accountId) {
      if (!accountId) {
        tbank().selectedAccountId = "";
        return;
      }
      if (tbank().accounts.some((a) => a.id === accountId)) {
        tbank().selectedAccountId = accountId;
        safeStorageSet(TBANK_ACCOUNT_STORE_KEY, accountId);
      }
    }

    function fillAccountsFromStorage() {
      if (!tbank().accounts.length) {
        tbank().selectedAccountId = "";
        return;
      }
      const saved = tbank().selectedAccountId || safeStorageGet(TBANK_ACCOUNT_STORE_KEY);
      if (saved && tbank().accounts.some((a) => a.id === saved)) {
        tbank().selectedAccountId = saved;
      } else {
        tbank().selectedAccountId = tbank().accounts[0]?.id || "";
      }
      if (tbank().selectedAccountId) safeStorageSet(TBANK_ACCOUNT_STORE_KEY, tbank().selectedAccountId);
    }

    async function loadDepositAmount() {
      const accountId = tbank().selectedAccountId;
      if (!accountId) throw new Error("Счёт T-Bank не загружен.");
      tbank().selectedAccountId = accountId;
      safeStorageSet(TBANK_ACCOUNT_STORE_KEY, accountId);
      const data = await getPortfolio(accountId);
      const total = data.totalAmountPortfolio || data.total_amount_portfolio;
      const amount = moneyValueRub(total);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("API не вернул положительную стоимость портфеля.");
      }
      tbank().depositLoaded = true;
      return amount;
    }

    async function getPortfolioSnapshot() {
      const accountId = tbank().selectedAccountId;
      const [portfolio, positions] = await Promise.all([
        getPortfolio(accountId),
        getPositions(accountId)
      ]);
      return { portfolio, positions, accountId };
    }

    async function positionsByTicker() {
      const data = await getPositions();
      const map = new Map();
      const ingest = async (items) => {
        for (const p of items || []) {
          const instrumentId = p.instrumentUid || p.figi;
          const pieces = +p.balance || 0;
          if (!instrumentId || pieces === 0) continue;
          let meta = await getInstrumentById(instrumentId);
          if (!meta) meta = { ticker: p.ticker || instrumentId, lot: p.lot || 1, uid: instrumentId, figi: p.figi };
          const ticker = String(meta.ticker || p.ticker || "").toUpperCase();
          if (!ticker) continue;
          map.set(ticker, {
            ticker,
            instrumentId: meta.uid || meta.figi || instrumentId,
            lot: Math.max(1, +meta.lot || +p.lot || 1),
            pieces
          });
        }
      };
      await ingest(data.securities);
      await ingest(data.futures);
      return map;
    }

    function notePostOrderFailure(secForPrice, instrumentId, direction, qty, orderType, market, message, reqSummary) {
      live.lastPostOrder = {
        at: new Date().toISOString(),
        sec: secForPrice,
        instrumentId,
        direction,
        lots: qty,
        orderType,
        market,
        status: "HTTP_ERROR",
        message: message || "",
        ok: false
      };
      noteLiveTech("live-tbank-post-reject", secForPrice || instrumentId, `${message || "—"} | ${reqSummary}`);
    }

    async function postOrder(instrumentId, direction, lots, secForPrice, options) {
      const opts = options || {};
      const qty = Math.max(0, Math.floor(+lots || 0));
      if (!instrumentId || qty <= 0) return null;
      const market = opts.market === "futures" ? "futures" : "shares";
      const orderType = opts.orderType === "limit" || opts.orderType === "market"
        ? opts.orderType
        : liveOrderTypeUi();
      let meta = null;
      try { meta = await getInstrumentById(instrumentId); } catch (_) { /* optional */ }
      const priceType = orderPriceType(meta, market);

      async function sendPostOrder(effectiveType, limitPriceOverride) {
        const orderId = (crypto.randomUUID && crypto.randomUUID()) || `ml-${Date.now()}`;
        const body = {
          accountId: tbank().selectedAccountId,
          instrumentId,
          quantity: String(qty),
          direction,
          orderId,
          confirmMarginTrade: true,
          orderType: postOrderTypeEnum(effectiveType, market),
          priceType
        };
        if (effectiveType === "limit") {
          let price = limitPriceOverride != null && limitPriceOverride !== "" ? +limitPriceOverride : NaN;
          if (!Number.isFinite(price) || price <= 0) {
            price = opts.limitPrice != null && opts.limitPrice !== "" ? +opts.limitPrice : NaN;
          }
          if (!Number.isFinite(price) || price <= 0) {
            if (typeof resolveOrderPrice !== "function") {
              throw new Error(`Нет цены для лимитной заявки (${secForPrice || instrumentId}).`);
            }
            price = await resolveOrderPrice(instrumentId, secForPrice, market);
          }
          if (!Number.isFinite(price) || price <= 0) {
            throw new Error(`Нет цены для лимитной заявки (${secForPrice || instrumentId}).`);
          }
          price = roundPriceToIncrement(price, meta);
          body.price = quotationFromNumber(price);
        }
        const reqSummary = `type=${body.orderType} qty=${qty} dir=${direction} priceType=${body.priceType} market=${market}${body.price ? ` price=${quotationToNumber(body.price)}` : ""}`;
        noteLiveTech("live-tbank-post-req", secForPrice || instrumentId, reqSummary);
        let data;
        try {
          data = await request("OrdersService/PostOrder", body);
        } catch (err) {
          notePostOrderFailure(secForPrice, instrumentId, direction, qty, effectiveType, market, err.message, reqSummary);
          throw err;
        }
        const status = data?.executionReportStatus || data?.execution_report_status || "—";
        live.lastPostOrder = {
          at: new Date().toISOString(),
          sec: secForPrice,
          instrumentId,
          direction,
          lots: qty,
          orderType: effectiveType,
          market,
          status,
          message: data?.message || "",
          orderId: data?.orderId || data?.order_id || orderId,
          lotsExecuted: data?.lotsExecuted ?? data?.lots_executed,
          ok: !postOrderRejected(data)
        };
        if (postOrderRejected(data)) {
          const msg = data?.message || status || "Заявка отклонена биржей";
          noteLiveTech("live-tbank-post-reject", secForPrice || instrumentId, `${msg} | ${reqSummary}`);
          throw new Error(msg);
        }
        noteLiveTech("live-tbank-post-ok", secForPrice || instrumentId, `status=${status} exec=${live.lastPostOrder.lotsExecuted ?? "—"} | ${reqSummary}`);
        return data;
      }

      try {
        return await sendPostOrder(orderType);
      } catch (err) {
        if (orderType !== "limit" && isPostOrderRetryAsLimitError(err)) {
          if (typeof resolveOrderPrice !== "function") throw err;
          const fallbackPrice = await resolveOrderPrice(instrumentId, secForPrice, market);
          if (Number.isFinite(fallbackPrice) && fallbackPrice > 0) {
            noteLiveTech("live-tbank-post-retry", secForPrice || instrumentId, `limit @ ${fmt(fallbackPrice, 4)} после: ${err.message}`);
            return await sendPostOrder("limit", fallbackPrice);
          }
        }
        throw err;
      }
    }

    return {
      id: "tbank",
      label: "T-Bank",
      isReady() {
        return !!(tbank().token && tbank().selectedAccountId);
      },
      hasToken() {
        return !!tbank().token;
      },
      request,
      selectedHostId,
      setHostId,
      instField,
      instApiTradable,
      findInstrument,
      getInstrumentById,
      getTradingStatus,
      validateTradable,
      getLastPrice,
      fetchCandlesRange,
      getOrderBook,
      fetchOrderBookCached,
      getPortfolio,
      getPositions,
      getOrders,
      getOperations,
      cancelOrder,
      loadAccounts,
      selectAccount,
      fillAccountsFromStorage,
      loadDepositAmount,
      getPortfolioSnapshot,
      positionsByTicker,
      postOrder,
      postOrderRejected,
      orderPriceType,
      postOrderTypeEnum,
      roundPriceToIncrement,
      quotationFromNumber,
      quotationToNumber,
      isPostOrderRetryAsLimitError,
      pickInstrument,
      scoreInstrument
    };
  }

  REG.register("tbank", createTbankConnector);
})(typeof window !== "undefined" ? window : globalThis);
