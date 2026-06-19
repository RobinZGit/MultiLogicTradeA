/*
 * TBRU bond allocator: жадная покупка по доходности из состава фонда,
 * лимит deploy = min(100%, Volume%×MaxPos%).
 */
(function (root) {
  "use strict";

  const DATA = () => root.MultiLogicFinrespBondTbru;

  /** Доля портфеля к размещению: min(100%, Volume% × MaxPositions%), без плеча. */
  function bondDeployPct(volConfig) {
    const vol = Math.max(0, +volConfig?.volume || 0);
    const maxPos = Math.max(0, +volConfig?.maxPositions || 0);
    return Math.min(100, vol * maxPos);
  }

  function bondDeployCapRub(volConfig) {
    const deposit = Math.max(0, +volConfig?.deposit || 0);
    return deposit * bondDeployPct(volConfig) / 100;
  }

  function bondUnitPriceRub(holding, priceRub) {
    if (Number.isFinite(priceRub) && priceRub > 0) return priceRub;
    const nom = Math.max(1, +holding?.nominal || 1000);
    const pct = Math.max(1, +holding?.pricePct || 100);
    return nom * pct / 100;
  }

  /** Чистая цена (без НКД), ₽ за 1 шт. */
  function bondCleanPriceRub(holding) {
    return bondUnitPriceRub(holding);
  }

  function bondCouponPeriodDays(holding) {
    const n = Math.max(1, Math.trunc(+holding?.couponsPerYear || 2));
    return Math.max(1, Math.round(365 / n));
  }

  function bondDayOfYear(date) {
    const d = date instanceof Date ? date : new Date(date || Date.now());
    const y = d.getUTCFullYear();
    const start = Date.UTC(y, 0, 0);
    const cur = Date.UTC(y, d.getUTCMonth(), d.getUTCDate());
    return Math.floor((cur - start) / 86400000);
  }

  /** Сдвиг даты купона по ISIN — разные бумаги не совпадают все в один день. */
  function bondSecAnchorDay(sec) {
    let h = 0;
    const u = String(sec || "");
    for (let i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) >>> 0;
    return h % 365;
  }

  function bondCouponPaymentRub(holding) {
    const nom = Math.max(1, +holding?.nominal || 1000);
    const cpn = Math.max(0, +holding?.couponAnnualPct || 0) / 100;
    const perYear = Math.max(1, Math.trunc(+holding?.couponsPerYear || 2));
    return nom * cpn / perYear;
  }

  function bondCouponCycleInfo(holding, date) {
    const period = bondCouponPeriodDays(holding);
    const doy = bondDayOfYear(date);
    const anchor = bondSecAnchorDay(holding?.sec) % period;
    let pos = (doy - anchor + 365) % period;
    if (pos < 0) pos += period;
    const isCouponDay = pos === 0;
    return { period, pos, isCouponDay, nkdDays: isCouponDay ? 0 : pos };
  }

  /**
   * Грязная цена: чистая + линейный НКД; в день купона — откупон (зубчик вниз).
   * prevDirtyClose — close предыдущего бара для непрерывности.
   */
  function bondDirtyQuote(holding, date, prevDirtyClose) {
    const clean = bondCleanPriceRub(holding);
    const couponPay = bondCouponPaymentRub(holding);
    const period = bondCouponPeriodDays(holding);
    const nkdPerDay = couponPay / period;
    const cycle = bondCouponCycleInfo(holding, date);
    const nkd = cycle.isCouponDay ? 0 : nkdPerDay * cycle.nkdDays;
    const dirty = clean + nkd;
    let open;
    let high;
    let low;
    let close;
    if (cycle.isCouponDay && prevDirtyClose != null && prevDirtyClose > clean + 1e-6) {
      open = prevDirtyClose;
      close = clean;
      high = Math.max(open, close);
      low = clean;
    } else if (prevDirtyClose != null && Number.isFinite(prevDirtyClose)) {
      open = prevDirtyClose;
      close = dirty;
      high = Math.max(open, close);
      low = Math.min(open, close);
    } else {
      open = high = low = close = dirty;
    }
    return {
      clean,
      nkd,
      dirty,
      open,
      high,
      low,
      close,
      couponDay: cycle.isCouponDay,
      couponPay
    };
  }

  function bondCouponVLineIndices(rows, fmtRub) {
    const fmt = typeof fmtRub === "function" ? fmtRub : (v) => String(v);
    const out = [];
    for (let i = 0; i < (rows || []).length; i++) {
      const r = rows[i];
      if (!r?.couponDay) continue;
      const pay = +r.couponPay || 0;
      out.push({
        idx: i,
        kind: "bond-coupon",
        label: pay > 0 ? `Купон ${fmt(pay)} ₽/шт` : "Купон"
      });
    }
    return out;
  }

  function normalizedWeights(holdings) {
    const sum = (holdings || []).reduce((s, h) => s + Math.max(0, +h.weight || 0), 0);
    if (sum <= 0) return [];
    return holdings.map((h) => ({
      ...h,
      normWeight: Math.max(0, +h.weight || 0) / sum
    }));
  }

  /** Текущая доходность, % годовых: годовой купон / чистая цена. */
  function bondCurrentYieldPct(holding, priceRub) {
    const cpn = Math.max(0, +holding?.couponAnnualPct || 0);
    const clean = bondUnitPriceRub(holding, priceRub);
    const nom = Math.max(1, +holding?.nominal || 1000);
    if (clean <= 0) return cpn;
    return (nom * cpn / 100) / clean * 100;
  }

  function holdingBySecMap(holdings) {
    return new Map((holdings || []).map((h) => [String(h.sec).toUpperCase(), h]));
  }

  /** Продажи первыми, покупки — от более доходных (выше current yield). */
  function sortTbruRebalanceRows(rows, holdings, positionsBySec, pricesBySec) {
    const map = holdingBySecMap(holdings);
    const enriched = (rows || []).map((row) => {
      const sec = String(row.sec || "").toUpperCase();
      const h = map.get(sec) || { sec };
      const cur = Math.max(0, Math.trunc(+(positionsBySec?.[sec] ?? row.currentPieces) || 0));
      const tgt = Math.max(0, Math.trunc(+row.pos || 0));
      const delta = tgt - cur;
      const yieldPct = bondCurrentYieldPct(h, pricesBySec?.[sec] ?? row.unitPrice);
      return { row, delta, yieldPct, orphan: !!row.orphan };
    });
    enriched.sort((a, b) => {
      if (a.orphan && !b.orphan) return -1;
      if (!a.orphan && b.orphan) return 1;
      if (a.delta < 0 && b.delta >= 0) return -1;
      if (a.delta > 0 && b.delta <= 0) return 1;
      if (a.delta > 0 && b.delta > 0) {
        const dy = b.yieldPct - a.yieldPct;
        if (Math.abs(dy) > 1e-9) return dy;
        return (b.row.weight || 0) - (a.row.weight || 0);
      }
      return 0;
    });
    return enriched.map((e) => e.row);
  }

  function sortHoldingsByYield(holdings, pricesBySec) {
    return normalizedWeights(holdings).sort((a, b) => {
      const ya = bondCurrentYieldPct(a, pricesBySec?.[a.sec]);
      const yb = bondCurrentYieldPct(b, pricesBySec?.[b.sec]);
      if (Math.abs(yb - ya) > 1e-9) return yb - ya;
      return b.normWeight - a.normWeight;
    });
  }

  function targetGrossRub(rows) {
    return (rows || []).reduce(
      (s, r) => s + Math.max(0, +r.pos || 0) * Math.max(0, +r.unitPrice || 0),
      0
    );
  }

  function bondMtmRub(holdings, positionsBySec, pricesBySec) {
    let mtm = 0;
    for (const h of holdings || []) {
      const p = Math.max(0, Math.trunc(+positionsBySec[h.sec] || 0));
      mtm += p * bondUnitPriceRub(h, pricesBySec?.[h.sec]);
    }
    return mtm;
  }

  function holdingsHoldRows(holdings, positionsBySec, pricesBySec) {
    return holdings.map((h) => ({
      sec: h.sec,
      market: "bonds",
      pos: Math.max(0, Math.trunc(+positionsBySec[h.sec] || 0)),
      finresp: 0,
      targetRub: 0,
      unitPrice: pricesBySec[h.sec] || bondUnitPriceRub(h),
      currentPieces: Math.max(0, Math.trunc(+positionsBySec[h.sec] || 0)),
      weight: 0
    }));
  }

  /** Целевые позиции: всегда жадно по current yield, в пределах deploy-cap. */
  function resolveTbruAllocationTargets(opts) {
    const o = opts || {};
    const holdings = o.holdings || [];
    const positionsBySec = o.positionsBySec || {};
    const pricesBySec = o.pricesBySec || {};
    const deployCapRub = Math.max(0, +o.deployCapRub || 0);
    const wealthRub = Math.max(0, +o.wealthRub || 0);
    const cashForGreedy = Math.max(0, +o.cashForGreedy || 0);
    const fundHeld = holdings.some((h) => Math.trunc(+positionsBySec[h.sec] || 0) > 0);
    const mtm = bondMtmRub(holdings, positionsBySec, pricesBySec);
    const investRub = Math.min(deployCapRub, wealthRub);
    const roomRub = Math.max(0, investRub - mtm);
    const buyCash = Math.min(cashForGreedy, roomRub);

    if (buyCash > 0 && holdings.length) {
      return computeTbruGreedyTargets(
        holdings,
        { cash: buyCash, positions: positionsBySec },
        pricesBySec,
        o.commissionPct || 0
      );
    }
    if (fundHeld) {
      return holdingsHoldRows(holdings, positionsBySec, pricesBySec);
    }
    return sortHoldingsByYield(holdings, pricesBySec).map((h) => ({
      sec: h.sec,
      market: "bonds",
      pos: 0,
      finresp: 0,
      targetRub: 0,
      unitPrice: pricesBySec[h.sec] || bondUnitPriceRub(h),
      currentPieces: 0,
      weight: h.normWeight
    }));
  }

  /**
   * Целевые позиции (штуки облигаций, pieces).
   * investBase = min(wealthRub, deployCapRub); wealth = cash + MTM позиций.
   */
  function computeTbruTargets(opts) {
    const holdings = normalizedWeights(opts?.holdings || DATA()?.holdings || []);
    if (!holdings.length) return [];

    const deployCap = Math.max(0, +opts?.deployCapRub || 0);
    const wealth = Math.max(0, +opts?.wealthRub || 0);
    const investRub = Math.min(deployCap, wealth);
    const positions = opts?.positionsBySec || {};
    const prices = opts?.pricesBySec || {};
    const minTradeRub = Math.max(0, +opts?.minTradeRub || 500);

    const rows = [];
    for (const h of holdings) {
      const sec = h.sec;
      const unit = bondUnitPriceRub(h, prices[sec]);
      const targetRub = investRub * h.normWeight;
      let targetPieces = unit > 0 ? Math.floor(targetRub / unit) : 0;
      const cur = Math.max(0, Math.trunc(+positions[sec] || 0));
      if (targetPieces < 1 && targetRub >= minTradeRub && unit > 0) {
        targetPieces = 1;
      }
      rows.push({
        sec,
        market: "bonds",
        pos: targetPieces,
        finresp: 0,
        targetRub,
        unitPrice: unit,
        currentPieces: cur,
        weight: h.normWeight
      });
    }
    return rows;
  }

  /**
   * Целевые позиции по доходности: round-robin +1 шт. от более доходных к менее доходным,
   * пока хватает cash (без плеча). Существующие позиции сохраняются.
   */
  function computeTbruGreedyTargets(holdings, state, prices, commissionPct) {
    const sorted = sortHoldingsByYield(holdings, prices);
    const targetPos = {};
    for (const [sec, pieces] of Object.entries(state.positions || {})) {
      targetPos[sec] = Math.max(0, Math.trunc(+pieces || 0));
    }
    let cash = Math.max(0, +state.cash || 0);
    const comm = Math.max(0, +commissionPct || 0) / 100;
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const h of sorted) {
        const unit = prices[h.sec] || bondUnitPriceRub(h);
        const fee = unit * comm;
        if (cash < unit + fee - 1e-6) continue;
        targetPos[h.sec] = Math.max(0, Math.trunc(+targetPos[h.sec] || 0)) + 1;
        cash -= unit + fee;
        progressed = true;
      }
    }
    return sorted.map((h) => ({
      sec: h.sec,
      market: "bonds",
      pos: Math.max(0, Math.trunc(+targetPos[h.sec] || 0)),
      finresp: 0,
      targetRub: 0,
      unitPrice: prices[h.sec] || bondUnitPriceRub(h),
      currentPieces: Math.max(0, Math.trunc(+state.positions[h.sec] || 0)),
      weight: h.normWeight
    }));
  }

  /**
   * Live reconcile: жадные цели по доходности, удержание при нулевом room,
   * продажа ISIN вне списка porti.
   */
  function buildTbruLiveReconcileTargets(opts) {
    const o = opts || {};
    const holdings = o.holdings || [];
    const positionsBySec = o.positionsBySec || {};
    const pricesBySec = o.pricesBySec || {};
    const deployCapRub = Math.max(0, +o.deployCapRub || 0);
    const wealthRub = Math.max(0, +o.wealthRub || 0);
    const cashRub = Math.max(0, +o.cashRub ?? wealthRub);
    const minTradeRub = Math.max(0, +o.minTradeRub ?? 500);
    const inFund = new Set(holdings.map((h) => String(h.sec).toUpperCase()));

    let rows = resolveTbruAllocationTargets({
      holdings,
      deployCapRub,
      wealthRub,
      cashForGreedy: cashRub,
      positionsBySec,
      pricesBySec,
      minTradeRub,
      commissionPct: o.commissionPct || 0
    });

    const rowBySec = new Map(rows.map((r) => [String(r.sec).toUpperCase(), r]));
    for (const [sec, pieces] of Object.entries(positionsBySec)) {
      const u = String(sec).toUpperCase();
      const cur = Math.max(0, Math.trunc(+pieces || 0));
      if (!cur || inFund.has(u)) continue;
      rowBySec.set(u, {
        sec: u,
        market: "bonds",
        pos: 0,
        finresp: 0,
        targetRub: 0,
        unitPrice: pricesBySec[u] || bondUnitPriceRub({ sec: u }),
        currentPieces: cur,
        weight: 0,
        orphan: true
      });
    }
    return finalizeTbruReconcileRows([...rowBySec.values()], holdings, positionsBySec, pricesBySec);
  }

  function finalizeTbruReconcileRows(rows, holdings, positionsBySec, pricesBySec) {
    return sortTbruRebalanceRows(rows, holdings, positionsBySec, pricesBySec);
  }

  /** Купоны: дискретная выплата в «купонные» дни (не ежедневный шум). */
  function accrueBondCouponsForDay(state, holdings, asOfDate) {
    if (!state || !holdings?.length) return 0;
    const day = asOfDate instanceof Date ? asOfDate : new Date(asOfDate || Date.now());
    const dayKey = day.toISOString().slice(0, 10);
    if (!state.bondCouponPaidKeys) state.bondCouponPaidKeys = new Set();

    let paid = 0;
    const positions = state.positions || state.open;
    const payOne = (sec, pieces) => {
      const p = Math.max(0, Math.trunc(+pieces || 0));
      if (!p) return;
      const h = holdings.find((x) => x.sec === String(sec).toUpperCase());
      if (!h) return;
      if (!bondCouponCycleInfo(h, day).isCouponDay) return;
      const key = `${String(sec).toUpperCase()}:${dayKey}`;
      if (state.bondCouponPaidKeys.has(key)) return;
      const cash = bondCouponPaymentRub(h) * p;
      if (cash <= 0) return;
      paid += cash;
      state.bondCouponPaidKeys.add(key);
    };

    if (positions instanceof Map) {
      for (const pos of positions.values()) {
        payOne(pos.sec || pos.ticker, pos.pieces);
      }
    } else if (positions && typeof positions === "object") {
      for (const [sec, pieces] of Object.entries(positions)) payOne(sec, pieces);
    }
    if (paid > 0) {
      state.cash = (+state.cash || 0) + paid;
      if (Number.isFinite(state.cashDelta)) state.cashDelta += paid;
    }
    state.lastCouponDay = dayKey;
    return paid;
  }

  function couponCashForPieces(holding, pieces) {
    return bondCouponPaymentRub(holding) * Math.max(0, Math.trunc(+pieces || 0));
  }

  function accrueSandboxBondCoupons(sb, holdings, asOfDate) {
    if (!sb || !holdings?.length) return 0;
    const day = asOfDate instanceof Date ? asOfDate : new Date(asOfDate || Date.now());
    const dayKey = day.toISOString().slice(0, 10);
    if (!sb.bondCouponDay) sb.bondCouponDay = {};
    if (sb.bondCouponDay.lastDay === dayKey) return 0;
    const positions = {};
    for (const pos of sb.open.values()) {
      if (pos.market !== "bonds" && pos.market !== "shares") continue;
      const sec = String(pos.sec || pos.ticker || "").toUpperCase();
      positions[sec] = (positions[sec] || 0) + Math.max(0, Math.trunc(+pos.pieces || 0));
    }
    const state = { cash: sb.cash, positions, lastCouponDay: sb.bondCouponDay.lastDay };
    const paid = accrueBondCouponsForDay(state, holdings, asOfDate);
    sb.cash = state.cash;
    sb.cashDelta = (+sb.cashDelta || 0) + paid;
    sb.bondCouponDay.lastDay = state.lastCouponDay;
    return paid;
  }

  /** Погашение по номиналу (тест): maturity YYYY-MM-DD в каталоге. */
  function redeemSandboxBondMaturities(sb, holdings, asOfDate) {
    if (!sb || !holdings?.length) return 0;
    const day = asOfDate instanceof Date ? asOfDate : new Date(asOfDate || Date.now());
    const today = day.toISOString().slice(0, 10);
    let redeemed = 0;
    for (const h of holdings) {
      if (!h.maturity || h.maturity > today) continue;
      const key = `bonds:${h.sec}`;
      const pos = sb.open.get(key);
      if (!pos) continue;
      const pieces = Math.max(0, Math.trunc(+pos.pieces || 0));
      if (!pieces) continue;
      const payout = pieces * Math.max(1, +h.nominal || 1000);
      sb.cash = (+sb.cash || 0) + payout;
      sb.cashDelta = (+sb.cashDelta || 0) + payout;
      redeemed += payout;
      sb.open.delete(key);
    }
    return redeemed;
  }

  function redeemPositionsMaturities(state, holdings, asOfDate) {
    if (!state?.positions || !holdings?.length) return 0;
    const day = asOfDate instanceof Date ? asOfDate : new Date(asOfDate || Date.now());
    const today = day.toISOString().slice(0, 10);
    let redeemed = 0;
    for (const h of holdings) {
      if (!h.maturity || h.maturity > today) continue;
      const pieces = Math.max(0, Math.trunc(+state.positions[h.sec] || 0));
      if (!pieces) continue;
      const payout = pieces * Math.max(1, +h.nominal || 1000);
      state.cash = (+state.cash || 0) + payout;
      delete state.positions[h.sec];
      redeemed += payout;
    }
    return redeemed;
  }

  function tfStepMs(calcTf) {
    const map = {
      "1": 60000,
      "5": 300000,
      "10": 600000,
      "15": 900000,
      "60": 3600000,
      "24": 86400000
    };
    return map[String(calcTf)] || 86400000;
  }

  function parseCalcDay(s) {
    const raw = String(s || "").trim();
    if (!raw) return null;
    const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  function rebalanceBondPortfolio(state, holdings, volConfig, opts) {
    const deployCap = bondDeployCapRub(volConfig);
    const prices = {};
    for (const h of holdings) prices[h.sec] = bondUnitPriceRub(h);
    let mtm = 0;
    for (const [sec, pieces] of Object.entries(state.positions)) {
      mtm += (+pieces || 0) * (prices[sec] || bondUnitPriceRub({}));
    }
    const wealth = Math.max(0, (+state.cash || 0) + mtm);
    let targets = resolveTbruAllocationTargets({
      holdings,
      deployCapRub: deployCap,
      wealthRub: wealth,
      cashForGreedy: state.cash,
      positionsBySec: state.positions,
      pricesBySec: prices,
      minTradeRub: opts?.minTradeRub ?? 500,
      commissionPct: opts?.commissionPct || 0
    });
    const commissionPct = Math.max(0, +opts?.commissionPct || 0) / 100;
    let buys = 0;
    let sells = 0;
    let commission = 0;
    targets = sortTbruRebalanceRows(targets, holdings, state.positions, prices);
    for (const row of targets) {
      const cur = Math.max(0, Math.trunc(+state.positions[row.sec] || 0));
      const delta = (+row.pos || 0) - cur;
      if (!delta) continue;
      const px = row.unitPrice;
      const notional = Math.abs(delta) * px;
      const fee = notional * commissionPct;
      commission += fee;
      if (delta > 0) {
        if ((+state.cash || 0) < notional + fee - 1e-6) continue;
        state.cash -= notional + fee;
        state.positions[row.sec] = +row.pos || 0;
        buys += notional;
      } else {
        state.cash += notional - fee;
        if (+row.pos > 0) state.positions[row.sec] = +row.pos;
        else delete state.positions[row.sec];
        sells += notional;
      }
    }
    return { buys, sells, commission, targets };
  }

  /** Маркеры входа/выхода для графика (только long, облигации). */
  function bondTradeMarkers(posBefore, posAfter) {
    const pb = Math.max(0, Math.trunc(+posBefore || 0));
    const pa = Math.max(0, Math.trunc(+posAfter || 0));
    if (pb <= 0 && pa > 0) {
      return { tradeIn: "long", tradeOut: null, tradeOutSide: null };
    }
    if (pb > 0 && pa <= 0) {
      return { tradeIn: null, tradeOut: "logic", tradeOutSide: "long" };
    }
    if (pb > 0 && pa > pb) {
      return { tradeIn: "long", tradeOut: null, tradeOutSide: null };
    }
    if (pb > pa && pa > 0) {
      return { tradeIn: null, tradeOut: "logic", tradeOutSide: "long" };
    }
    return { tradeIn: null, tradeOut: null, tradeOutSide: null };
  }

  function appendBondBar(bondBars, tradedSecs, sec, time, holding, posBefore, posAfter, prevDirty) {
    const pb = Math.max(0, Math.trunc(+posBefore || 0));
    const pa = Math.max(0, Math.trunc(+posAfter || 0));
    const hadHistory = bondBars.has(sec);
    if (pb <= 0 && pa <= 0 && !hadHistory) return prevDirty;
    if (pa > 0 || pb > 0) tradedSecs.add(sec);
    const mk = bondTradeMarkers(pb, pa);
    const timeFull = String(time || "").includes(" ") ? time : `${time} 12:00:00`;
    const h = holding || { sec };
    const q = bondDirtyQuote(h, timeFull, prevDirty);
    const rows = bondBars.get(sec) || [];
    rows.push({
      time: timeFull,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      clean: q.clean,
      nkd: q.nkd,
      couponDay: q.couponDay,
      couponPay: q.couponDay ? q.couponPay : 0,
      pos: pa,
      finresp: 0,
      buy: pa > pb ? pa - pb : 0,
      sell: pb > pa ? pb - pa : 0,
      ...mk,
      tradeInLogic: mk.tradeIn ? "TBRU" : null,
      tradeInSignal: mk.tradeIn ? "tbru_buy" : null,
      tradeInExpr: mk.tradeIn ? "TBRU buy" : null,
      tradeOutLogic: mk.tradeOut ? "TBRU" : null,
      tradeOutSignal: mk.tradeOut ? "tbru_sell" : null,
      tradeOutExpr: mk.tradeOut ? "TBRU sell" : null
    });
    bondBars.set(sec, rows);
    return q.close;
  }

  function buildBondChartsFromBars(bondBars, tradedSecs, holdings, state) {
    const weightOf = new Map((holdings || []).map((h) => [h.sec, +h.weight || 0]));
    const holdingOf = new Map((holdings || []).map((h) => [h.sec, h]));
    return [...tradedSecs]
      .sort((a, b) => (weightOf.get(b) || 0) - (weightOf.get(a) || 0))
      .map((sec) => ({
        sec,
        market: "bonds",
        holding: holdingOf.get(sec) || null,
        finresp: 0,
        pos: Math.max(0, Math.trunc(+state.positions[sec] || 0)),
        rows: bondBars.get(sec) || []
      }))
      .filter((p) => p.rows.length > 0);
  }

  /**
   * Бэктест TBRU в режиме «Рассчитать»: rebalance на каждом баре TF, купоны и погашения.
   */
  async function simulateBondTbruBacktestAsync(opts) {
    const o = opts || {};
    const volConfig = o.volConfig || {};
    const deployCap = bondDeployCapRub(volConfig);
    const start = parseCalcDay(o.from);
    const end = parseCalcDay(o.till);
    if (!start || !end || end < start) {
      return {
        perSec: [],
        skipped: [{ sec: "TBRU", error: "некорректный период расчёта" }],
        agg: { finresp: 0, cash: 0, pos: 0, commission: 0, buys: 0, sells: 0 },
        preStopperAgg: { finresp: 0, cash: 0, pos: 0, commission: 0, buys: 0, sells: 0 },
        stopper: { events: [] },
        a: 0,
        b: 0
      };
    }
    const step = tfStepMs(o.calcTf || "24");
    let holdings = (o.holdings || DATA()?.holdings || []).slice();
    const state = { cash: deployCap, positions: {}, lastCouponDay: "" };
    let totalCommission = 0;
    let totalBuys = 0;
    let totalSells = 0;
    const equityRows = [];
    const bondBars = new Map();
    const tradedSecs = new Set();
    const bondDirtyClose = new Map();
    const bars = Math.max(1, Math.floor((end.getTime() - start.getTime()) / step) + 1);

    for (let i = 0, t = start.getTime(); t <= end.getTime(); i++, t += step) {
      if (o.shouldCancel?.()) break;
      const barDate = new Date(t);
      if (o.refreshHoldings) {
        try {
          const fresh = await o.refreshHoldings(barDate, i);
          if (fresh?.length) holdings = fresh;
        } catch (_) { /* keep previous */ }
      }
      const posBefore = { ...state.positions };
      accrueBondCouponsForDay(state, holdings, barDate);
      redeemPositionsMaturities(state, holdings, barDate);
      const rb = rebalanceBondPortfolio(state, holdings, volConfig, {
        commissionPct: o.commissionPct,
        minTradeRub: o.minTradeRub
      });
      totalCommission += rb.commission;
      totalBuys += rb.buys;
      totalSells += rb.sells;

      const timeKey = barDate.toISOString().slice(0, 10);
      const secsToPaint = new Set([
        ...Object.keys(posBefore),
        ...Object.keys(state.positions),
        ...tradedSecs
      ]);
      for (const sec of secsToPaint) {
        const h = holdings.find((x) => x.sec === sec) || { sec };
        const prevD = bondDirtyClose.get(sec);
        const nextD = appendBondBar(
          bondBars,
          tradedSecs,
          sec,
          timeKey,
          h,
          posBefore[sec] || 0,
          state.positions[sec] || 0,
          prevD
        );
        if (nextD != null) bondDirtyClose.set(sec, nextD);
      }
      let mtm = 0;
      for (const [sec, pieces] of Object.entries(state.positions)) {
        const h = holdings.find((x) => x.sec === sec) || {};
        const q = bondDirtyQuote(h, barDate, bondDirtyClose.get(sec));
        mtm += (+pieces || 0) * q.dirty;
      }
      const equity = (+state.cash || 0) + mtm;
      equityRows.push({
        time: barDate.toISOString().slice(0, 10),
        equity,
        cash: state.cash,
        mtm,
        holdings: holdings.length
      });
      if (o.onProgress) o.onProgress(i + 1, bars, barDate.toISOString().slice(0, 10));
      if (o.yieldUi) await o.yieldUi();
    }

    const finalEquity = equityRows.length ? equityRows.at(-1).equity : deployCap;
    const finresp = finalEquity - deployCap;
    const totalPieces = Object.values(state.positions).reduce((s, p) => s + (+p || 0), 0);
    const agg = {
      finresp,
      cash: state.cash,
      pos: totalPieces,
      commission: totalCommission,
      buys: totalBuys,
      sells: totalSells,
      bySec: { TBRU: finresp }
    };
    const bondCharts = buildBondChartsFromBars(bondBars, tradedSecs, holdings, state);
    return {
      perSec: [{
        sec: "TBRU",
        market: "bonds",
        finresp,
        cash: state.cash,
        pos: totalPieces,
        commission: totalCommission,
        buys: totalBuys,
        sells: totalSells,
        rows: equityRows
      }],
      bondCharts,
      skipped: [],
      agg,
      preStopperAgg: { ...agg },
      stopper: { events: [] },
      a: 0,
      b: Math.max(0, equityRows.length - 1)
    };
  }

  root.MultiLogicFinrespBondTbruProc = {
    bondDeployPct,
    bondDeployCapRub,
    bondUnitPriceRub,
    bondCleanPriceRub,
    bondCurrentYieldPct,
    sortHoldingsByYield,
    targetGrossRub,
    bondMtmRub,
    resolveTbruAllocationTargets,
    sortTbruRebalanceRows,
    finalizeTbruReconcileRows,
    bondCouponPeriodDays,
    bondCouponCycleInfo,
    bondCouponPaymentRub,
    bondDirtyQuote,
    bondCouponVLineIndices,
    computeTbruTargets,
    computeTbruGreedyTargets,
    buildTbruLiveReconcileTargets,
    bondTradeMarkers,
    appendBondBar,
    buildBondChartsFromBars,
    accrueBondCouponsForDay,
    accrueSandboxBondCoupons,
    redeemPositionsMaturities,
    redeemSandboxBondMaturities,
    simulateBondTbruBacktestAsync
  };
})(typeof window !== "undefined" ? window : globalThis);
