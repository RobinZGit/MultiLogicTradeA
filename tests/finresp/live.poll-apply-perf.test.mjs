/**
 * Бюджет CPU одного live-тика: FINRESP-хвост + (справочно) sync equity.
 * Async redrawChartsAsync в live.js должен убирать sync equity из критического пути UI.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from './harness/load-engine.mjs';
import { ALL_INDICATORS, makeCandles } from './helpers/candles.mjs';
import { EQUITY_CATALOG_LOGIC_IDS } from './helpers/equity-path.mjs';
import { simulateLivePollApplyWork } from './helpers/live-guards.mjs';
import { assertBaseline } from './helpers/perf.mjs';

const E = loadEngine();
const vol = { deposit: 7000, maxPositions: 10, volume: 10 };
const BAR_COUNT = 400;
const TAIL_BARS = 220;
const packs2 = [
  makeCandles('GAZP', BAR_COUNT, { barMinutes: 15, startPrice: 180 }),
  makeCandles('SBER', BAR_COUNT, { barMinutes: 15, startPrice: 260 })
];
const specStack = E.resolveLogicSpecStack(EQUITY_CATALOG_LOGIC_IDS, {}, E.DEFAULT_PARAMS, ALL_INDICATORS);

describe('live poll apply perf (2 инстр., 400 свечей)', () => {
  it('FINRESP-хвост на тике опроса — в бюджете smoke', () => {
    const { perSec, finrespMs } = simulateLivePollApplyWork(
      E, packs2, specStack, EQUITY_CATALOG_LOGIC_IDS, E.DEFAULT_PARAMS, vol, ALL_INDICATORS, TAIL_BARS,
      { includeSyncEquity: false }
    );
    assert.equal(perSec.length, 2);
    assertBaseline(finrespMs, 'smoke_livePoll_finresp_2x400');
  });

  it('sync equity (старый путь) — отдельный тяжёлый этап, не на критическом пути live', () => {
    const { equityMs, totalMs } = simulateLivePollApplyWork(
      E, packs2, specStack, EQUITY_CATALOG_LOGIC_IDS, E.DEFAULT_PARAMS, vol, ALL_INDICATORS, TAIL_BARS,
      { includeSyncEquity: true }
    );
    assertBaseline(equityMs, 'smoke_equity_2x400_allLogics');
    assert.ok(totalMs >= equityMs, 'total includes equity when enabled');
  });
});
