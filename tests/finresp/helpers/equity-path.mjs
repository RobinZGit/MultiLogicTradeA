/**
 * Упрощённый путь drawEquityChartsAsync / calcLogicEquityRunsAsync (без DOM).
 */
export const EQUITY_CATALOG_LOGIC_IDS = [
  "TBC", "UT", "UCT", "L5", "L1", "L2", "L3", "L4",
  "sma_below", "sma_above", "sma_corridor_trend", "sma_corridor_anti"
];

const EQUITY_STOPPER_OFF = {
  useSl: false,
  useTp: false,
  slMult: 0,
  tpMult: 0,
  atrLen: 14,
  refEquity: 0
};

/**
 * @param {object} E — MultiLogicFinrespEngine
 * @param {object[]} packs
 * @param {string[]} logicIds
 */
export function simulateEquityCatalogRuns(E, packs, logicIds, a, b, params, vol, indicators) {
  const ref = packs.find((p) => p?.length);
  if (!ref?.length) return { ms: 0, logicCount: 0 };
  const times = ref.slice(a, b + 1).map((c) => c.time).filter(Boolean);
  const t0 = performance.now();
  let logicCount = 0;
  for (const id of logicIds) {
    const spec = E.resolveLogicSpec(id, {}, params, indicators);
    if (!spec || spec.disabled) continue;
    const { perSec } = E.runMulti(packs, spec, a, b, params, vol, EQUITY_STOPPER_OFF, {});
    E.buildPortfolioEquityRows(perSec, times);
    logicCount += 1;
  }
  return { ms: performance.now() - t0, logicCount };
}
