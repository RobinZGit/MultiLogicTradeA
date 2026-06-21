/*
 * Alor OpenAPI connector for MultiLogic FINRESP.
 * Auth: refresh token → JWT (https://alor.dev/docs/api/access/authorization/jwt)
 */
(function (root) {
  "use strict";

  const REG = root.MultiLogicFinrespConnectors = root.MultiLogicFinrespConnectors || {};
  const BOPS = root.MultiLogicFinrespBrokerOps || {};
  const factories = REG._factories = REG._factories || new Map();
  if (typeof REG.register !== "function") {
    REG.register = (id, factory) => {
      factories.set(String(id), factory);
      return factory;
    };
  }

  const DEFAULT_EXCHANGE = "MOEX";

  function alorTfSec(tf) {
    const m = { "1": 60, "5": 300, "10": 600, "15": 900, "60": 3600, "24": 86400 };
    return m[String(tf)] || 3600;
  }

  function quotationFromNumber(price) {
    const p = Math.max(0, +price || 0);
    const units = Math.floor(p);
    const nano = Math.round((p - units) * 1e9);
    return { units: String(units), nano };
  }

  function quotationToNumber(q) {
    if (q == null) return NaN;
    if (typeof q === "number") return q;
    return (+q.units || 0) + (+q.nano || 0) / 1e9;
  }

  function instrumentGroupForMarket(market) {
    return market === "futures" ? "SPBFUT" : "TQBR";
  }

  /** @param {object} d */
  function createAlorConnector(d) {
    const state = d.state;
    const live = d.liveState || state.live;
    const OAUTH_BASE = d.ALOR_OAUTH_BASE || "https://oauth.alor.ru";
    const API_BASE = d.ALOR_API_BASE || "https://api.alor.ru";
    const ACCOUNT_STORE_KEY = d.ALOR_ACCOUNT_STORE_KEY;
    const PORTFOLIO_STORE_KEY = d.ALOR_PORTFOLIO_STORE_KEY;
    const EXCHANGE_STORE_KEY = d.ALOR_EXCHANGE_STORE_KEY;
    const safeStorageGet = d.safeStorageGet;
    const safeStorageSet = d.safeStorageSet;
    const noteLiveTech = d.noteLiveTech;
    const fmt = d.fmt;
    const E = d.E;
    const liveOrderTypeUi = d.liveOrderTypeUi || (() => "market");
    const resolveOrderPrice = d.resolveOrderPrice;
    const orderBookDepth = d.orderBookDepth || 20;

    const alor = () => state.alor;

    function exchange() {
      const ex = String(alor().exchange || safeStorageGet(EXCHANGE_STORE_KEY) || DEFAULT_EXCHANGE).trim().toUpperCase();
      return ex || DEFAULT_EXCHANGE;
    }

    function portfolioId() {
      const p = String(alor().portfolioId || alor().selectedAccountId || safeStorageGet(PORTFOLIO_STORE_KEY) || "").trim();
      return p;
    }

    function instField(inst, ...keys) {
      if (!inst) return undefined;
      for (const k of keys) {
        if (inst[k] !== undefined && inst[k] !== null) return inst[k];
      }
      return undefined;
    }

    function instApiTradable(inst) {
      const v = instField(inst, "apiTradeAvailableFlag", "api_trade_available_flag");
      return v === undefined ? true : !!v;
    }

    function makeInstrumentId(symbol, market, group) {
      const sym = String(symbol || "").toUpperCase();
      const g = group || instrumentGroupForMarket(market);
      return `alor:${exchange()}:${g}:${sym}`;
    }

    function normalizeSecurity(sec, market) {
      if (!sec) return null;
      const symbol = String(sec.symbol || sec.ticker || "").toUpperCase();
      if (!symbol) return null;
      const m = market === "futures" ? "futures" : "shares";
      const group = sec.board || sec.instrumentGroup || instrumentGroupForMarket(m);
      const lot = Math.max(1, +(sec.lotsize || sec.lot || sec.lotSize || 1));
      const uid = makeInstrumentId(symbol, m, group);
      return {
        ticker: symbol,
        symbol,
        lot,
        lots: lot,
        uid,
        figi: uid,
        instrumentId: uid,
        classCode: group,
        instrumentGroup: group,
        exchange: exchange(),
        instrumentType: m === "futures" ? "future" : "share",
        apiTradeAvailableFlag: true,
        minPriceIncrement: sec.minstep != null ? quotationFromNumber(+sec.minstep || 0.01) : quotationFromNumber(0.01)
      };
    }

    const ALOR_FETCH_TIMEOUT_MS = 45000;

    async function fetchWithTimeout(url, init, label) {
      const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), ALOR_FETCH_TIMEOUT_MS) : null;
      try {
        const res = await fetch(url, ctrl ? { ...init, signal: ctrl.signal } : init);
        return res;
      } catch (err) {
        if (ctrl?.signal?.aborted) {
          throw new Error(`${label || "Алор API"}: таймаут ${ALOR_FETCH_TIMEOUT_MS / 1000} с`);
        }
        throw err;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    async function ensureAccessToken() {
      const now = Date.now();
      if (alor().accessToken && (alor().accessTokenExpiresAt || 0) > now + 60_000) {
        return alor().accessToken;
      }
      const refresh = alor().token;
      if (!refresh) throw new Error("Refresh token Алор не задан.");
      const res = await fetchWithTimeout(`${OAUTH_BASE}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: refresh })
      }, "Алор OAuth");
      const text = await res.text();
      let data = {};
      if (text) {
        try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }
      }
      if (!res.ok) {
        const msg = data.message || data.error || data.error_description || data.raw || `${res.status}`;
        throw new Error(`Алор OAuth: ${msg}`);
      }
      const access = data.AccessToken || data.accessToken || data.access_token;
      if (!access) throw new Error("Алор OAuth не вернул AccessToken.");
      alor().accessToken = access;
      alor().accessTokenExpiresAt = now + 25 * 60 * 1000;
      return access;
    }

    function alorReqId() {
      const pf = portfolioId() || "pf";
      const uid = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : `ml-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      return `${pf};${uid}`;
    }

    async function apiRequest(method, path, { query, body, auth = true, reqId } = {}) {
      const url = new URL(`${API_BASE}${path}`);
      const q = { ...(query || {}), format: query?.format || "Simple" };
      for (const [k, v] of Object.entries(q)) {
        if (v != null && v !== "") url.searchParams.set(k, String(v));
      }
      const headers = { Accept: "application/json" };
      if (body != null) headers["Content-Type"] = "application/json";
      if (reqId) headers["X-ALOR-REQID"] = reqId;
      if (auth) {
        const token = await ensureAccessToken();
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetchWithTimeout(url.toString(), {
        method: method || "GET",
        headers,
        body: body != null ? JSON.stringify(body) : undefined
      }, `Алор ${path}`);
      const text = await res.text();
      let data = null;
      if (text) {
        try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }
      }
      if (!res.ok) {
        const msg = data?.message || data?.error || data?.raw || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }
      return data;
    }

    async function request(_serviceMethod, body) {
      throw new Error(`Алор: прямой T-Bank REST (${_serviceMethod}) не поддерживается.`);
    }

    function selectedHostId() { return "alor"; }
    function setHostId() { return "alor"; }

    async function findInstrument(sec, market) {
      const key = `${market}:${String(sec || "").trim().toUpperCase()}`;
      if (live.instrumentCache.has(key)) return live.instrumentCache.get(key);
      const data = await apiRequest("GET", "/md/v2/Securities", {
        query: { exchange: exchange(), query: String(sec || "").trim(), limit: 20 },
        auth: false
      });
      const list = Array.isArray(data) ? data : (data?.securities || data?.items || []);
      const secU = String(sec || "").trim().toUpperCase();
      const wantGroup = instrumentGroupForMarket(market);
      let pool = list.filter((i) => String(i.symbol || i.ticker || "").toUpperCase() === secU);
      if (!pool.length) return null;
      pool = pool.filter((i) => !i.board || i.board === wantGroup || market === "futures");
      const pick = pool[0] || list[0];
      const inst = normalizeSecurity(pick, market);
      if (inst) live.instrumentCache.set(key, inst);
      return inst || null;
    }

    async function getInstrumentById(instrumentId) {
      if (!instrumentId) return null;
      const cacheKey = `id:${instrumentId}`;
      if (live.instrumentCache.has(cacheKey)) return live.instrumentCache.get(cacheKey);
      const m = String(instrumentId).match(/^alor:([^:]+):([^:]+):(.+)$/i);
      if (m) {
        const inst = {
          ticker: m[3],
          symbol: m[3],
          uid: instrumentId,
          figi: instrumentId,
          instrumentId,
          classCode: m[2],
          instrumentGroup: m[2],
          exchange: m[1],
          lot: 1,
          apiTradeAvailableFlag: true
        };
        live.instrumentCache.set(cacheKey, inst);
        return inst;
      }
      return null;
    }

    async function getTradingStatus() {
      return { apiTradeAvailableFlag: true, marketOrderAvailableFlag: true, limitOrderAvailableFlag: true };
    }

    async function validateTradable(instrumentId, instMeta) {
      if (instApiTradable(instMeta) === false) {
        return { ok: false, reason: "торговля через API недоступна для инструмента" };
      }
      if (!portfolioId()) return { ok: false, reason: "не указан портфель Алор" };
      return { ok: true };
    }

    async function getLastPrice(instrumentId) {
      const meta = await getInstrumentById(instrumentId);
      if (!meta?.symbol) return null;
      const data = await apiRequest("GET", `/md/v2/Securities/${exchange()}/${meta.symbol}`, {
        query: { instrumentGroup: meta.instrumentGroup || meta.classCode },
        auth: false
      });
      const px = +(data?.lastPrice ?? data?.last ?? data?.close ?? NaN);
      return Number.isFinite(px) ? px : null;
    }

    function normalizeCandle(c) {
      const ts = typeof c.time === "number"
        ? new Date(c.time * 1000).toISOString()
        : (c.time || c.datetime || c.date);
      return {
        time: ts,
        open: quotationFromNumber(c.open),
        high: quotationFromNumber(c.high),
        low: quotationFromNumber(c.low),
        close: quotationFromNumber(c.close),
        volume: String(c.volume ?? 0)
      };
    }

    async function fetchCandlesRange(instrumentId, fromDate, toDate, interval) {
      const meta = await getInstrumentById(instrumentId);
      if (!meta?.symbol) return [];
      const tf = alorTfSec(interval);
      const fromSec = Math.floor(new Date(fromDate).getTime() / 1000);
      const toSec = Math.floor(new Date(toDate).getTime() / 1000);
      const data = await apiRequest("GET", "/md/v2/history", {
        query: {
          symbol: meta.symbol,
          exchange: exchange(),
          instrumentGroup: meta.instrumentGroup || meta.classCode,
          tf,
          from: fromSec,
          to: toSec
        },
        auth: false
      });
      const list = Array.isArray(data) ? data : (data?.history || data?.candles || []);
      return list.map(normalizeCandle);
    }

    async function getOrderBook(instrumentId, depth) {
      const meta = await getInstrumentById(instrumentId);
      if (!meta?.symbol) throw new Error("Нет символа для стакана Алор.");
      const raw = await apiRequest("GET", `/md/v2/orderbooks/${exchange()}/${meta.symbol}`, {
        query: {
          instrumentGroup: meta.instrumentGroup || meta.classCode,
          depth: depth || orderBookDepth
        },
        auth: false
      });
      const bids = (raw?.bids || []).map((r) => ({
        price: quotationFromNumber(r.price),
        quantity: String(Math.max(0, Math.floor(+(r.volume ?? r.qty ?? 0))))
      }));
      const asks = (raw?.asks || []).map((r) => ({
        price: quotationFromNumber(r.price),
        quantity: String(Math.max(0, Math.floor(+(r.volume ?? r.qty ?? 0))))
      }));
      return { bids, asks, instrumentId, figi: instrumentId };
    }

    async function fetchOrderBookCached(instrumentId, opts) {
      const cacheKey = String(instrumentId || "");
      const prev = live.obTrendCache.get(cacheKey);
      const now = Date.now();
      const ttl = Math.max(0, +(live.orderBookCacheTtlMs ?? 2500) || 2500);
      const force = !!opts?.force;
      if (!force && prev?.ob && now - (prev.at || 0) < ttl) return prev.ob;
      const ob = await getOrderBook(instrumentId);
      live.obTrendCache.set(cacheKey, { ob, at: now });
      return ob;
    }

    async function getPortfolioSummary() {
      const pf = portfolioId();
      if (!pf) throw new Error("Укажите портфель Алор (например D12345).");
      return apiRequest("GET", `/md/v2/Clients/${exchange()}/${encodeURIComponent(pf)}/summary`);
    }

    async function getPortfolio(accountId) {
      const summary = await getPortfolioSummary();
      const val = +(summary.portfolioEvaluation ?? summary.equity ?? summary.balance ?? 0);
      return {
        totalAmountPortfolio: quotationFromNumber(val),
        _alorSummary: summary,
        accountId: accountId || portfolioId()
      };
    }

    async function getPositions() {
      const pf = portfolioId();
      const data = await apiRequest("GET", `/md/v2/Clients/${exchange()}/${encodeURIComponent(pf)}/positions`);
      const list = Array.isArray(data) ? data : (data?.positions || []);
      const securities = [];
      const money = [];
      for (const p of list) {
        const qty = +(p.qty ?? p.quantity ?? p.balance ?? 0);
        const sym = String(p.symbol || p.ticker || "").toUpperCase();
        if (!sym) continue;
        if (sym === "RUB" || p.type === "money" || p.isCurrency) {
          money.push({ currency: "RUB", units: String(Math.floor(qty)), nano: Math.round((qty % 1) * 1e9) });
          continue;
        }
        const market = String(p.market || p.board || "").includes("FUT") ? "futures" : "shares";
        securities.push({
          ticker: sym,
          balance: String(qty),
          lots: String(qty),
          instrumentUid: makeInstrumentId(sym, market, p.board || p.instrumentGroup),
          lot: Math.max(1, +(p.lotsize || p.lot || 1)),
          averagePositionPrice: quotationFromNumber(+(p.avgPrice ?? p.averagePrice ?? 0)),
          currentPrice: quotationFromNumber(+(p.currentPrice ?? p.lastPrice ?? 0))
        });
      }
      return { securities, futures: [], money };
    }

    function normalizeTrade(trade) {
      const fn = BOPS.normalizeAlorTradeToBrokerOp || ((t) => t);
      return fn(trade, (sym, market, board) => makeInstrumentId(sym, market, board), exchange());
    }

    async function getOrders() {
      const pf = portfolioId();
      const data = await apiRequest("GET", `/md/v2/Clients/${exchange()}/${encodeURIComponent(pf)}/orders`);
      const list = Array.isArray(data) ? data : (data?.orders || []);
      const statusMap = BOPS.alorOrderStatusToTbank || ((s) => String(s || "working"));
      return {
        orders: list.map((o) => {
          const symbol = String(o.symbol || "").toUpperCase();
          const board = o.board || "";
          const market = (BOPS.alorBoardIsFutures && BOPS.alorBoardIsFutures(board)) ? "futures" : "shares";
          const lotsReq = Math.max(0, Math.floor(+(o.qty ?? o.quantity ?? 0)));
          const lotsExec = Math.max(0, Math.floor(+(o.filled ?? o.filledQtyBatch ?? o.filledQty ?? 0)));
          const orderTypeRaw = String(o.type || o.orderType || "").toLowerCase();
          return {
            orderId: String(o.id ?? o.orderId ?? o.orderno ?? ""),
            figi: makeInstrumentId(symbol, market, board),
            direction: String(o.side || "").toLowerCase().includes("sell") ? "ORDER_DIRECTION_SELL" : "ORDER_DIRECTION_BUY",
            lotsRequested: String(lotsReq),
            lotsExecuted: String(lotsExec),
            orderType: orderTypeRaw.includes("limit") ? "ORDER_TYPE_LIMIT" : "ORDER_TYPE_MARKET",
            orderState: statusMap(o.status),
            executionReportStatus: statusMap(o.status),
            initialSecurityPrice: quotationFromNumber(+(o.price ?? 0)),
            _alor: o
          };
        })
      };
    }

    async function getOperations(from, to) {
      const pf = portfolioId();
      if (!pf) return { operations: [] };
      const fromIso = from || new Date(Date.now() - 30 * 86400000).toISOString();
      const toIso = to || new Date().toISOString();
      const fromMs = Date.parse(fromIso) || 0;
      const toMs = Date.parse(toIso) || Date.now();
      const dateFrom = String(fromIso).slice(0, 10);
      const ex = exchange();
      const encPf = encodeURIComponent(pf);
      const [sessionRaw, historyRaw] = await Promise.all([
        apiRequest("GET", `/md/v2/Clients/${ex}/${encPf}/trades`).catch(() => []),
        apiRequest("GET", `/md/v2/Stats/${ex}/${encPf}/history/trades`, {
          query: { dateFrom, limit: 1000, orderByTradeDate: true }
        }).catch(() => [])
      ]);
      const sessionList = Array.isArray(sessionRaw) ? sessionRaw : (sessionRaw?.trades || []);
      const historyList = Array.isArray(historyRaw) ? historyRaw : (historyRaw?.trades || []);
      const byId = new Map();
      for (const t of historyList) {
        const id = String(t?.id ?? "");
        if (id) byId.set(id, t);
      }
      for (const t of sessionList) {
        const id = String(t?.id ?? "");
        if (id) byId.set(id, t);
      }
      const operations = [];
      for (const trade of byId.values()) {
        const op = normalizeTrade(trade);
        if (!op) continue;
        const tms = Date.parse(op.date || 0) || 0;
        if (tms && (tms < fromMs - 60000 || tms > toMs + 60000)) continue;
        operations.push(op);
      }
      operations.sort((a, b) => (Date.parse(a.date || 0) || 0) - (Date.parse(b.date || 0) || 0));
      return { operations };
    }

    async function cancelOrder(orderId) {
      const pf = portfolioId();
      await apiRequest("DELETE", `/commandapi/warptrans/TRADE/v2/client/orders/${encodeURIComponent(orderId)}`, {
        query: { portfolio: pf, exchange: exchange(), stop: false },
        reqId: alorReqId()
      });
      return { ok: true };
    }

    async function loadAccounts() {
      const pf = String($portfolioFromUi() || portfolioId()).trim();
      if (!pf) throw new Error("Укажите код портфеля Алор в блоке «Реальный счёт Алор».");
      alor().portfolioId = pf;
      safeStorageSet(PORTFOLIO_STORE_KEY, pf);
      alor().exchange = exchange();
      safeStorageSet(EXCHANGE_STORE_KEY, exchange());
      alor().accounts = [{ id: pf, name: `Алор ${pf}`, type: "alor", exchange: exchange() }];
      alor().selectedAccountId = pf;
      safeStorageSet(ACCOUNT_STORE_KEY, pf);
      return alor().accounts;
    }

    function $portfolioFromUi() {
      try {
        const el = typeof document !== "undefined" ? document.getElementById("alor-portfolio-id") : null;
        return el?.value?.trim() || "";
      } catch (_) {
        return "";
      }
    }

    function selectAccount(accountId) {
      if (!accountId) {
        alor().selectedAccountId = "";
        return;
      }
      alor().selectedAccountId = accountId;
      alor().portfolioId = accountId;
      safeStorageSet(ACCOUNT_STORE_KEY, accountId);
      safeStorageSet(PORTFOLIO_STORE_KEY, accountId);
    }

    function fillAccountsFromStorage() {
      const savedPf = safeStorageGet(PORTFOLIO_STORE_KEY);
      if (savedPf) alor().portfolioId = savedPf;
      const savedEx = safeStorageGet(EXCHANGE_STORE_KEY);
      if (savedEx) alor().exchange = savedEx;
      if (!alor().accounts.length && alor().portfolioId) {
        alor().accounts = [{ id: alor().portfolioId, name: `Алор ${alor().portfolioId}`, type: "alor" }];
      }
      if (!alor().accounts.length) {
        alor().selectedAccountId = "";
        return;
      }
      const saved = alor().selectedAccountId || safeStorageGet(ACCOUNT_STORE_KEY);
      if (saved && alor().accounts.some((a) => a.id === saved)) {
        alor().selectedAccountId = saved;
      } else {
        alor().selectedAccountId = alor().accounts[0]?.id || "";
      }
      if (alor().selectedAccountId) {
        safeStorageSet(ACCOUNT_STORE_KEY, alor().selectedAccountId);
        safeStorageSet(PORTFOLIO_STORE_KEY, alor().selectedAccountId);
      }
    }

    async function loadDepositAmount() {
      const pf = portfolioId() || $portfolioFromUi();
      if (!pf) throw new Error("Укажите портфель Алор.");
      await loadAccounts();
      const summary = await getPortfolioSummary();
      const amount = +(summary.portfolioEvaluation ?? summary.equity ?? summary.balance ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("API Алор не вернул положительную оценку портфеля.");
      }
      alor().depositLoaded = true;
      return amount;
    }

    async function getPortfolioSnapshot() {
      const accountId = alor().selectedAccountId || portfolioId();
      const [portfolio, positions] = await Promise.all([
        getPortfolio(accountId),
        getPositions()
      ]);
      return { portfolio, positions, accountId };
    }

    function portfolioValueRub(portfolio) {
      const q = portfolio?.totalAmountPortfolio;
      if (q) return quotationToNumber(q);
      const s = portfolio?._alorSummary;
      return +(s?.portfolioEvaluation ?? s?.equity ?? NaN);
    }

    function freeCashRub(positions) {
      let rub = 0;
      for (const m of positions?.money || []) {
        if (String(m.currency || "RUB").toUpperCase() === "RUB") {
          rub += quotationToNumber(m);
        }
      }
      if (rub > 0) return rub;
      const summary = alor().lastSummary;
      if (summary && Number.isFinite(+summary.buyingPower)) return +summary.buyingPower;
      return NaN;
    }

    async function buildPositionRows(portData, posData, options) {
      const rows = [];
      const ingest = async (items, market) => {
        for (const p of items || []) {
          const pieces = Math.abs(+(p.balance ?? p.lots ?? 0));
          if (!pieces) continue;
          const ticker = String(p.ticker || "").toUpperCase();
          const instrumentId = p.instrumentUid || makeInstrumentId(ticker, market, p.board);
          const lot = Math.max(1, +(p.lot || 1));
          const avg = quotationToNumber(p.averagePositionPrice);
          const cur = quotationToNumber(p.currentPrice);
          const side = +(p.balance ?? p.lots ?? 0) < 0 ? "short" : "long";
          rows.push({
            sec: ticker,
            ticker,
            instrumentId,
            market: market === "futures" ? "futures" : "shares",
            side,
            lots: Math.round(pieces / lot) || pieces,
            pieces,
            lot,
            avgPrice: avg,
            curPrice: Number.isFinite(cur) ? cur : avg,
            sessionOnly: !!options?.sessionOnly
          });
        }
      };
      await ingest(posData?.securities, "shares");
      await ingest(posData?.futures, "futures");
      return rows;
    }

    async function positionsByTicker() {
      const data = await getPositions();
      const map = new Map();
      const ingest = async (items, market) => {
        for (const p of items || []) {
          const pieces = +(p.balance || 0);
          if (!pieces) continue;
          const ticker = String(p.ticker || "").toUpperCase();
          const instrumentId = p.instrumentUid || makeInstrumentId(ticker, market);
          const lot = Math.max(1, +(p.lot || 1));
          map.set(ticker, { ticker, instrumentId, lot, pieces });
        }
      };
      await ingest(data.securities, "shares");
      await ingest(data.futures, "futures");
      return map;
    }

    function orderPriceType() { return "PRICE_TYPE_CURRENCY"; }
    function postOrderTypeEnum(orderType) {
      return orderType === "limit" ? "ORDER_TYPE_LIMIT" : "ORDER_TYPE_MARKET";
    }
    function isPostOrderRetryAsLimitError(err) {
      return /limit|price/i.test(String(err?.message || err || ""));
    }
    function roundPriceToIncrement(price, meta) {
      const mpi = quotationToNumber(meta?.minPriceIncrement);
      if (!Number.isFinite(mpi) || mpi <= 0) return price;
      return Math.round(price / mpi) * mpi;
    }
    function postOrderRejected(data) {
      if (typeof BOPS.alorPostOrderRejected === "function") return BOPS.alorPostOrderRejected(data);
      return false;
    }

    async function postOrder(instrumentId, direction, lots, secForPrice, options) {
      const opts = options || {};
      const qty = Math.max(0, Math.floor(+lots || 0));
      if (!instrumentId || qty <= 0) return null;
      const meta = await getInstrumentById(instrumentId);
      if (!meta?.symbol) throw new Error(`Инструмент не найден (${secForPrice || instrumentId}).`);
      const pf = portfolioId();
      const orderType = opts.orderType === "limit" || opts.orderType === "market"
        ? opts.orderType
        : liveOrderTypeUi();
      const side = String(direction).includes("SELL") ? "sell" : "buy";
      let price = opts.limitPrice != null ? +opts.limitPrice : NaN;
      if (orderType === "limit") {
        if (!Number.isFinite(price) || price <= 0) {
          if (typeof resolveOrderPrice !== "function") throw new Error("Нет цены для лимитной заявки.");
          price = await resolveOrderPrice(instrumentId, secForPrice, opts.market);
        }
        price = roundPriceToIncrement(price, meta);
      }
      const path = orderType === "limit"
        ? "/commandapi/warptrans/TRADE/v2/client/orders/actions/limit"
        : "/commandapi/warptrans/TRADE/v2/client/orders/actions/market";
      const body = {
        side,
        quantity: qty,
        allowMargin: true,
        instrument: {
          symbol: meta.symbol,
          exchange: exchange(),
          instrumentGroup: meta.instrumentGroup || meta.classCode
        },
        user: { portfolio: pf },
        comment: "MultiLogic FINRESP"
      };
      if (orderType === "limit") body.price = price;
      const reqSummary = `alor ${orderType} ${side} qty=${qty} ${meta.symbol}@${exchange()}`;
      noteLiveTech("live-alor-post-req", secForPrice || meta.symbol, reqSummary);
      const raw = await apiRequest("POST", path, { body, reqId: alorReqId() });
      const data = typeof BOPS.mapAlorPostOrderResponse === "function"
        ? BOPS.mapAlorPostOrderResponse(raw, qty)
        : raw;
      live.lastPostOrder = {
        at: new Date().toISOString(),
        sec: secForPrice || meta.symbol,
        instrumentId,
        direction,
        lots: qty,
        orderType,
        market: opts.market,
        status: data?.executionReportStatus || raw?.message || "OK",
        message: data?.message || raw?.message || "",
        orderId: data?.orderId || String(raw?.orderNumber ?? raw?.orderId ?? ""),
        lotsExecuted: data?.lotsExecuted,
        ok: !postOrderRejected(data)
      };
      if (postOrderRejected(data)) {
        const msg = data?.message || data?.executionReportStatus || "Заявка отклонена";
        noteLiveTech("live-alor-post-reject", secForPrice || meta.symbol, `${msg} | ${reqSummary}`);
        throw new Error(msg);
      }
      noteLiveTech("live-alor-post-ok", secForPrice || meta.symbol,
        `status=${data?.executionReportStatus || "—"} exec=${data?.lotsExecuted ?? "—"} | ${reqSummary}`);
      return data;
    }

    return {
      id: "alor",
      label: "Алор",
      isReady() {
        return !!(alor().token && alor().selectedAccountId);
      },
      hasToken() {
        return !!alor().token;
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
      portfolioValueRub,
      freeCashRub,
      buildPositionRows,
      positionsByTicker,
      postOrder,
      postOrderRejected,
      orderPriceType,
      postOrderTypeEnum,
      roundPriceToIncrement,
      quotationFromNumber,
      quotationToNumber,
      isPostOrderRetryAsLimitError
    };
  }

  REG.register("alor", createAlorConnector);
})(typeof window !== "undefined" ? window : globalThis);
