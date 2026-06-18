/**
 * Зеркало broker/runtime-хелперов из live.js + volConfig deposit из boot.js (без DOM).
 */

export const DEFAULT_PROVISIONAL_DEPOSIT = 1_000_000;

export function createEmptySandbox() {
  return {
    startPortfolio: null,
    cash: null,
    cashDelta: 0,
    commissionTotal: 0,
    open: new Map(),
    openLegs: new Map(),
    nextLegId: 0,
    ledger: [],
    nextFillId: 0,
    closed: [],
    orders: []
  };
}

export function createEmptyRealRuntime() {
  return {
    orders: [],
    openPositions: [],
    portfolioPositions: [],
    portfolioValue: null,
    freeCashRub: null,
    positionsMtmRub: null,
    commissionPaid: null,
    sandboxPositionsValue: null,
    realPortfolioValue: null,
    lastReconcile: null,
    apiForbiddenInstruments: [],
    brokerOperations: [],
    brokerOperationsRaw: null,
    instrumentCache: new Map(),
    tradingStatusCache: new Map(),
    obTrendCache: new Map()
  };
}

export function createBrokerRuntimeState() {
  return {
    tbank: {
      depositRub: null,
      depositProvisional: true,
      depositLoaded: false
    },
    alor: {
      depositRub: null,
      depositProvisional: true,
      depositLoaded: false
    },
    live: {
      runtime: {},
      orders: [],
      openPositions: [],
      portfolioPositions: [],
      portfolioValue: null,
      freeCashRub: null,
      commissionPaid: null,
      sandboxPositionsValue: null,
      realPortfolioValue: null
    }
  };
}

export function mockDepositDom(value = "", provisional = false) {
  const dom = { value: String(value), _prov: provisional };
  Object.defineProperty(dom, 'dataset', {
    get() {
      return dom._prov ? { provisional: '1' } : {};
    },
    configurable: true
  });
  return dom;
}

export function brokerCred(state, brokerId) {
  return brokerId === "alor" ? state.alor : state.tbank;
}

export function ensureLiveRuntime(state, brokerId) {
  const id = brokerId || "tbank";
  if (!state.live.runtime) state.live.runtime = {};
  if (!state.live.runtime[id]) {
    state.live.runtime[id] = {
      sandbox: createEmptySandbox(),
      real: createEmptyRealRuntime()
    };
  }
  return state.live.runtime[id];
}

export function persistBrokerDepositFromDom(state, brokerId, dom) {
  const b = brokerCred(state, brokerId);
  const amount = +(dom?.value || 0);
  if (!(amount > 0)) return;
  b.depositRub = amount;
  b.depositProvisional = dom?.dataset?.provisional === "1";
}

export function syncVolDepositDomFromBroker(state, brokerId, dom, defaultDeposit = DEFAULT_PROVISIONAL_DEPOSIT) {
  const b = brokerCred(state, brokerId);
  const rub = Number.isFinite(b.depositRub) ? b.depositRub : defaultDeposit;
  dom.value = String(Math.round(rub));
  if (b.depositProvisional || !b.depositLoaded) dom._prov = true;
  else dom._prov = false;
}

export function volConfigDeposit(state, brokerId, domDeposit, defaultDeposit = DEFAULT_PROVISIONAL_DEPOSIT) {
  const cred = brokerCred(state, brokerId);
  const domDep = +domDeposit || 0;
  if (cred.depositLoaded && Number.isFinite(cred.depositRub) && !cred.depositProvisional) {
    return cred.depositRub;
  }
  return domDep || cred.depositRub || defaultDeposit;
}

export function persistLiveUiToRuntime(state, brokerId, sandboxMode) {
  if (sandboxMode) return;
  const r = ensureLiveRuntime(state, brokerId).real;
  r.orders = (state.live.orders || []).slice();
  r.openPositions = (state.live.openPositions || []).slice();
  r.portfolioValue = state.live.portfolioValue;
  r.freeCashRub = state.live.freeCashRub;
  r.commissionPaid = state.live.commissionPaid;
}

export function hydrateLiveUiFromRuntime(state, brokerId, sandboxMode) {
  if (sandboxMode) return;
  const r = ensureLiveRuntime(state, brokerId).real;
  state.live.orders = r.orders || [];
  state.live.openPositions = r.openPositions || [];
  state.live.portfolioValue = r.portfolioValue;
  state.live.freeCashRub = r.freeCashRub;
  state.live.commissionPaid = r.commissionPaid;
}

export function clearLiveRuntimeBroker(state, brokerId, activeBrokerId) {
  const id = brokerId || activeBrokerId;
  state.live.runtime[id] = {
    sandbox: createEmptySandbox(),
    real: createEmptyRealRuntime()
  };
  if (id === activeBrokerId) {
    state.live.orders = [];
    state.live.openPositions = [];
    state.live.portfolioValue = null;
    state.live.freeCashRub = null;
    state.live.commissionPaid = null;
    state.live.sandboxPositionsValue = null;
  }
}

export function activeView(state, activeBrokerId, sandboxMode) {
  const rt = ensureLiveRuntime(state, activeBrokerId);
  if (sandboxMode) {
    const sb = rt.sandbox;
    const mtm = state.live.sandboxPositionsValue;
    const cash = Number.isFinite(sb.cash) ? sb.cash : sb.startPortfolio;
    const pv = state.live.portfolioValue ?? (Number.isFinite(cash) && Number.isFinite(mtm) ? cash + mtm : cash);
    return {
      brokerId: activeBrokerId,
      sandbox: true,
      portfolioValue: pv,
      freeCashRub: cash,
      commissionPaid: Number.isFinite(sb.commissionTotal) ? sb.commissionTotal : (state.live.commissionPaid ?? 0),
      positionsMtmRub: mtm,
      orders: sb.orders,
      openPositions: state.live.openPositions
    };
  }
  const r = rt.real;
  const comm = Number.isFinite(state.live.commissionPaid) ? state.live.commissionPaid : r.commissionPaid;
  return {
    brokerId: activeBrokerId,
    sandbox: false,
    portfolioValue: r.portfolioValue ?? state.live.portfolioValue,
    freeCashRub: r.freeCashRub ?? state.live.freeCashRub,
    commissionPaid: comm,
    positionsMtmRub: r.positionsMtmRub ?? state.live.positionsMtmRub,
    orders: r.orders?.length ? r.orders : state.live.orders,
    openPositions: r.openPositions?.length ? r.openPositions : state.live.openPositions
  };
}

export function validateLastResultMeta(meta, { brokerId, sandbox, deposit }) {
  const errors = [];
  if (meta?.brokerId && meta.brokerId !== brokerId) errors.push("broker");
  if (meta?.sandbox != null && meta.sandbox !== sandbox) errors.push("sandbox");
  if (
    meta?.deposit != null &&
    deposit > 0 &&
    Math.abs(meta.deposit - deposit) > Math.max(1, deposit * 0.01)
  ) {
    errors.push("deposit");
  }
  return errors;
}

/** Упрощённый сценарий onBrokerProviderChange (депозит + runtime, без lock/session). */
export function simulateBrokerSwitch(state, { from, to, dom, sandboxMode = false }) {
  persistBrokerDepositFromDom(state, from, dom);
  persistLiveUiToRuntime(state, from, sandboxMode);
  clearLiveRuntimeBroker(state, from, to);
  const target = brokerCred(state, to);
  if (target.depositLoaded && Number.isFinite(target.depositRub)) {
    syncVolDepositDomFromBroker(state, to, dom);
  } else {
    target.depositRub = DEFAULT_PROVISIONAL_DEPOSIT;
    target.depositProvisional = true;
    target.depositLoaded = false;
    syncVolDepositDomFromBroker(state, to, dom);
  }
  hydrateLiveUiFromRuntime(state, to, sandboxMode);
  return to;
}
