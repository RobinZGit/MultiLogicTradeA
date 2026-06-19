import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { loadEngine } from "./harness/load-engine.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FINRESP_ROOT = join(__dirname, "..", "..", "src", "finresp");

function loadBondProc() {
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(readFileSync(join(FINRESP_ROOT, "bond-tbru-data.js"), "utf8"), context);
  vm.runInContext(readFileSync(join(FINRESP_ROOT, "bond-tbru-procedure.js"), "utf8"), context);
  return {
    data: context.MultiLogicFinrespBondTbru,
    proc: context.MultiLogicFinrespBondTbruProc
  };
}

const E = loadEngine();
const { data, proc } = loadBondProc();

describe("bondDeployPct / bondDeployCapRub", () => {
  it("Volume 10% × MaxPos 10 → 100% депозита", () => {
    assert.equal(proc.bondDeployPct({ volume: 10, maxPositions: 10 }), 100);
    assert.equal(proc.bondDeployCapRub({ deposit: 7000, volume: 10, maxPositions: 10 }), 7000);
  });

  it("произведение > 100% ограничивается 100% (без плеча)", () => {
    assert.equal(proc.bondDeployPct({ volume: 15, maxPositions: 10 }), 100);
    assert.equal(proc.bondDeployCapRub({ deposit: 5000, volume: 15, maxPositions: 10 }), 5000);
  });

  it("произведение < 100% — только эта доля", () => {
    assert.equal(proc.bondDeployPct({ volume: 10, maxPositions: 5 }), 50);
    assert.equal(proc.bondDeployCapRub({ deposit: 10000, volume: 10, maxPositions: 5 }), 5000);
  });

  it("engine exports совпадают с процедурой", () => {
    const vol = { deposit: 8000, volume: 10, maxPositions: 10 };
    assert.equal(E.bondDeployPct(vol), proc.bondDeployPct(vol));
    assert.equal(E.bondDeployCapRub(vol), proc.bondDeployCapRub(vol));
  });
});

describe("computeTbruTargets", () => {
  const holdings = data.holdings.slice(0, 5);
  const unit = 980;

  it("при малом депозите жадно покупает хотя бы одну облигацию", () => {
    const state = { cash: 6334, positions: {} };
    const prices = Object.fromEntries(holdings.map((h) => [h.sec, unit]));
    const rows = proc.computeTbruGreedyTargets(holdings, state, prices, 0.04);
    const pieces = rows.reduce((s, r) => s + r.pos, 0);
    assert.ok(pieces > 0);
    const gross = rows.reduce((s, r) => s + r.pos * unit, 0);
    assert.ok(gross <= 6334 + unit);
  });

  it("распределяет investRub по весам в пределах deployCap", () => {
    const rows = proc.computeTbruTargets({
      holdings,
      deployCapRub: 100000,
      wealthRub: 100000,
      pricesBySec: Object.fromEntries(holdings.map((h) => [h.sec, unit])),
      positionsBySec: {},
      minTradeRub: 500
    });
    assert.equal(rows.length, holdings.length);
    const pieces = rows.reduce((s, r) => s + r.pos, 0);
    assert.ok(pieces > 0);
    const gross = rows.reduce((s, r) => s + r.pos * unit, 0);
    assert.ok(gross <= 100000 + unit);
  });

  it("wealth < deployCap — не выходит за wealth", () => {
    const rows = proc.computeTbruTargets({
      holdings,
      deployCapRub: 100000,
      wealthRub: 30000,
      pricesBySec: Object.fromEntries(holdings.map((h) => [h.sec, unit])),
      positionsBySec: {},
      minTradeRub: 500
    });
    const gross = rows.reduce((s, r) => s + r.pos * unit, 0);
    assert.ok(gross <= 30000 + unit);
  });
});

describe("buildTbruLiveReconcileTargets", () => {
  const holdings = data.holdings.slice(0, 4);
  const unit = 980;

  it("добавляет цель 0 для ISIN вне списка фонда (продать лишнее)", () => {
    const prices = Object.fromEntries(holdings.map((h) => [h.sec, unit]));
    const rows = proc.buildTbruLiveReconcileTargets({
      holdings,
      deployCapRub: 100000,
      wealthRub: 100000,
      cashRub: 50000,
      positionsBySec: { [holdings[0].sec]: 2, ORPHANBOND1: 3 },
      pricesBySec: { ...prices, ORPHANBOND1: unit },
      minTradeRub: 500
    });
    const orphan = rows.find((r) => r.sec === "ORPHANBOND1");
    assert.ok(orphan);
    assert.equal(orphan.pos, 0);
    assert.equal(orphan.orphan, true);
  });

  it("при пустом портфеле жадно покупает", () => {
    const prices = Object.fromEntries(holdings.map((h) => [h.sec, unit]));
    const rows = proc.buildTbruLiveReconcileTargets({
      holdings,
      deployCapRub: 10000,
      wealthRub: 10000,
      cashRub: 10000,
      positionsBySec: {},
      pricesBySec: prices,
      minTradeRub: 500
    });
    const pieces = rows.reduce((s, r) => s + r.pos, 0);
    assert.ok(pieces > 0);
  });

  it("жадная покупка начинается с более доходной бумаги", () => {
    const hi = [
      { sec: "SU26254RMFS1", weight: 50, nominal: 1000, pricePct: 98, couponAnnualPct: 11, couponsPerYear: 2 },
      { sec: "RU000A10ERE6", weight: 50, nominal: 1000, pricePct: 98, couponAnnualPct: 16, couponsPerYear: 2 }
    ];
    const prices = Object.fromEntries(hi.map((h) => [h.sec, 980]));
    const rows = proc.computeTbruGreedyTargets(hi, { cash: 1000, positions: {} }, prices, 0);
    const bought = rows.filter((r) => r.pos > 0);
    assert.equal(bought.length, 1);
    assert.equal(bought[0].sec, "RU000A10ERE6");
  });

  it("депозит 10000 — жадно по доходности, не только 2 ОФЗ по весу", () => {
    const rows = proc.resolveTbruAllocationTargets({
      holdings: data.holdings,
      deployCapRub: 10000,
      wealthRub: 10000,
      cashForGreedy: 10000,
      positionsBySec: {},
      pricesBySec: Object.fromEntries(data.holdings.map((h) => [h.sec, 980])),
      minTradeRub: 500,
      commissionPct: 0.02
    });
    const pieces = rows.reduce((s, r) => s + r.pos, 0);
    const gross = proc.targetGrossRub(rows);
    assert.ok(pieces >= 8, `ожидалось >=8 шт., получено ${pieces}`);
    assert.ok(gross >= 7000, `ожидалось >=7000 ₽ в облигациях, получено ${gross}`);
    const ofz = rows.find((r) => r.sec === "SU26254RMFS1" && r.pos > 0);
    const corp = rows.filter((r) => r.sec.startsWith("RU") && r.pos > 0);
    assert.ok(corp.length > 0, "должны быть корпоративные (выше купон)");
    if (ofz) {
      const maxCorpYield = Math.max(...corp.map((r) => {
        const h = data.holdingBySec(r.sec);
        return proc.bondCurrentYieldPct(h, 980);
      }));
      const ofzYield = proc.bondCurrentYieldPct(data.holdingBySec("SU26254RMFS1"), 980);
      assert.ok(maxCorpYield > ofzYield);
    }
  });

  it("resolveTbruAllocationTargets всегда жадно — и на большом депозите", () => {
    const prices = Object.fromEntries(data.holdings.map((h) => [h.sec, 980]));
    const rows = proc.resolveTbruAllocationTargets({
      holdings: data.holdings,
      deployCapRub: 100000,
      wealthRub: 100000,
      cashForGreedy: 100000,
      positionsBySec: {},
      pricesBySec: prices,
      commissionPct: 0.02
    });
    const bought = rows.filter((r) => r.pos > 0);
    const sorted = proc.sortHoldingsByYield(data.holdings, prices);
    const topSec = sorted[0].sec;
    const topPos = rows.find((r) => r.sec === topSec)?.pos || 0;
    assert.ok(bought.length > 5, `куплено ISIN: ${bought.length}`);
    assert.ok(topPos >= 1, "самая доходная бумага в портфеле");
    const minBoughtPos = Math.min(...bought.map((r) => r.pos));
    assert.ok(topPos >= minBoughtPos, "у лидера по yield не меньше штук, чем у остальных");
    const gross = proc.targetGrossRub(rows);
    assert.ok(gross >= 95000, `вложено ${gross}, ожидалось ~100k`);
  });
});

describe("sandbox bond coupons and maturity", () => {
  it("accrueSandboxBondCoupons платит в купонный день, не каждый день", () => {
    const sb = {
      cash: 10000,
      cashDelta: 0,
      open: new Map([
        ["bonds:SU26254RMFS1", {
          market: "bonds",
          sec: "SU26254RMFS1",
          ticker: "SU26254RMFS1",
          pieces: 10
        }]
      ])
    };
    const holdings = [{ sec: "SU26254RMFS1", nominal: 1000, couponAnnualPct: 11, couponsPerYear: 2 }];
    let couponDate = null;
    for (let d = 1; d <= 365; d++) {
      const dt = new Date(Date.UTC(2026, 0, d, 12, 0, 0));
      if (proc.bondCouponCycleInfo(holdings[0], dt).isCouponDay) {
        couponDate = dt;
        break;
      }
    }
    assert.ok(couponDate, "найден купонный день");
    const paid = proc.accrueSandboxBondCoupons(sb, holdings, couponDate);
    assert.ok(paid > 0);
    assert.ok(sb.cash > 10000);
    const again = proc.accrueSandboxBondCoupons(sb, holdings, couponDate);
    assert.equal(again, 0);
    const nextDay = proc.accrueSandboxBondCoupons(sb, holdings, new Date(couponDate.getTime() + 86400000));
    assert.equal(nextDay, 0);
  });

  it("bondDirtyQuote даёт зубчик откупона в день купона", () => {
    const h = { sec: "SU26254RMFS1", nominal: 1000, pricePct: 98, couponAnnualPct: 11, couponsPerYear: 2 };
    let couponDate = null;
    let prev = null;
    for (let d = 1; d <= 365; d++) {
      const dt = new Date(Date.UTC(2026, 0, d, 12, 0, 0));
      const q = proc.bondDirtyQuote(h, dt, prev);
      if (proc.bondCouponCycleInfo(h, dt).isCouponDay) {
        couponDate = dt;
        assert.ok(q.close < (prev ?? q.close + 1), "откупон: close ниже предыдущего dirty");
        break;
      }
      prev = q.close;
    }
    assert.ok(couponDate);
  });

  it("redeemSandboxBondMaturities возвращает номинал и закрывает позицию", () => {
    const sb = {
      cash: 0,
      cashDelta: 0,
      open: new Map([
        ["bonds:TESTBOND01", { market: "bonds", sec: "TESTBOND01", ticker: "TESTBOND01", pieces: 3 }]
      ])
    };
    const holdings = [{ sec: "TESTBOND01", nominal: 1000, maturity: "2026-06-17" }];
    const redeemed = proc.redeemSandboxBondMaturities(sb, holdings, new Date("2026-06-18"));
    assert.equal(redeemed, 3000);
    assert.equal(sb.cash, 3000);
    assert.equal(sb.open.size, 0);
  });
});

describe("resolveLogicSpec TBRU", () => {
  it("возвращает bond_tbru без FINRESP-строки", () => {
    const spec = E.resolveLogicSpec("TBRU", {}, {}, {});
    assert.equal(spec.type, "bond_tbru");
    assert.equal(spec.logicId, "TBRU");
    assert.equal(spec.disabled, false);
  });
});

describe("parsePortiHoldingsHtml", () => {
  it("извлекает ISIN и доли из HTML porti", () => {
    const html = `
      SU26254RMFS1
      SU26252RMFS5
      | #1 | 7.63 |
      | #2 | 5.76 |
    `;
    const fetchCode = readFileSync(join(FINRESP_ROOT, "bond-tbru-fetch.js"), "utf8");
    const ctx = { globalThis: {} };
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(readFileSync(join(FINRESP_ROOT, "bond-tbru-data.js"), "utf8"), ctx);
    vm.runInContext(fetchCode, ctx);
    const pairs = ctx.MultiLogicFinrespBondTbruFetch.parsePortiHoldingsHtml(html);
    assert.equal(pairs.length, 2);
    assert.equal(pairs[0].sec, "SU26254RMFS1");
    assert.equal(pairs[0].weight, 7.63);
  });
});

describe("fetchPortiHoldings attempt limit", () => {
  it("после 3 неудач на barKey больше не дергает сеть до нового barKey", async () => {
    const fetchCode = readFileSync(join(FINRESP_ROOT, "bond-tbru-fetch.js"), "utf8");
    const ctx = { globalThis: {} };
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(readFileSync(join(FINRESP_ROOT, "bond-tbru-data.js"), "utf8"), ctx);
    const originalFetch = globalThis.fetch;
    let calls = 0;
    const mockFetch = async () => {
      calls += 1;
      return { ok: false, status: 503, headers: { get: () => "" } };
    };
    globalThis.fetch = mockFetch;
    ctx.fetch = mockFetch;
    try {
      vm.runInContext(fetchCode, ctx);
      const F = ctx.MultiLogicFinrespBondTbruFetch;
      F.resetBarAttempts();
      const barKey = "test-bar-1";
      await F.fetchPortiHoldings({ barKey, maxAttemptsPerBar: 3, proxy: false });
      await F.fetchPortiHoldings({ barKey, maxAttemptsPerBar: 3, proxy: false });
      await F.fetchPortiHoldings({ barKey, maxAttemptsPerBar: 3, proxy: false });
      const callsAfter3 = calls;
      await F.fetchPortiHoldings({ barKey, maxAttemptsPerBar: 3, proxy: false });
      assert.equal(callsAfter3, 3);
      assert.equal(calls, 3);
      assert.equal(F.getBarAttemptState(barKey).exhausted, true);
      F.resetBarAttempts(barKey);
      await F.fetchPortiHoldings({ barKey: "test-bar-2", maxAttemptsPerBar: 3, proxy: false });
      assert.equal(calls, 4);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("simulateBondTbruBacktestAsync", () => {
  it("даёт FINRESP и equity-ряды за период", async () => {
    const holdings = data.holdings.slice(0, 3);
    const out = await proc.simulateBondTbruBacktestAsync({
      volConfig: { deposit: 100000, volume: 10, maxPositions: 10 },
      from: "2026-01-01",
      till: "2026-01-10",
      calcTf: "24",
      commissionPct: 0.04,
      holdings,
      yieldUi: async () => {}
    });
    assert.equal(out.perSec.length, 1);
    assert.equal(out.perSec[0].sec, "TBRU");
    assert.ok(out.perSec[0].rows.length >= 5);
    assert.ok(Number.isFinite(out.agg.finresp));
    assert.equal(out.agg.bySec?.TBRU, out.agg.finresp);
    assert.ok(Array.isArray(out.bondCharts));
  });

  it("bondCharts содержат tradeIn на покупке", async () => {
    const out = await proc.simulateBondTbruBacktestAsync({
      volConfig: { deposit: 100000, volume: 10, maxPositions: 10 },
      from: "2026-05-01",
      till: "2026-05-05",
      calcTf: "24",
      commissionPct: 0.04,
      holdings: data.holdings.slice(0, 8),
      yieldUi: async () => {}
    });
    assert.ok(out.bondCharts.length > 0, "ожидаются графики облигаций");
    const withBuy = out.bondCharts.some((b) => (b.rows || []).some((r) => r.tradeIn === "long"));
    assert.ok(withBuy, "ожидается маркер входа");
    const sample = out.bondCharts[0];
    assert.ok(sample.rows[0].close > 0);
    assert.ok(Number.isFinite(sample.rows[0].nkd));
  });

  it("при депозите ~6334 ₽ покупает облигации и даёт ненулевой FINRESP за май", async () => {
    const out = await proc.simulateBondTbruBacktestAsync({
      volConfig: { deposit: 6334, volume: 10, maxPositions: 10 },
      from: "2026-05-01",
      till: "2026-05-10",
      calcTf: "24",
      commissionPct: 0.04,
      holdings: data.holdings,
      yieldUi: async () => {}
    });
    assert.ok(out.agg.pos > 0, "должны быть купленные облигации");
    assert.ok(out.agg.buys > 0, "сумма покупок > 0");
    assert.ok(out.agg.finresp !== 0 || out.agg.cash !== 6334, "ожидается движение equity");
  });

  it("при депозите 10000 ₽ жадно покупает ~10 облигаций и выше FINRESP чем 2 ОФЗ", async () => {
    const out = await proc.simulateBondTbruBacktestAsync({
      volConfig: { deposit: 10000, volume: 10, maxPositions: 10 },
      from: "2026-02-11",
      till: "2026-05-31",
      calcTf: "24",
      commissionPct: 0.02,
      holdings: data.holdings,
      yieldUi: async () => {}
    });
    assert.ok(out.agg.pos >= 8, `pos=${out.agg.pos}`);
    assert.ok(out.agg.buys >= 7000, `buys=${out.agg.buys}`);
    assert.ok(out.agg.finresp > 200, `finresp=${out.agg.finresp}`);
  });
});
