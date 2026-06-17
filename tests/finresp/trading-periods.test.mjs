import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadEngine } from './harness/load-engine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TP_PATH = join(__dirname, '..', '..', 'src', 'finresp', 'trading-periods.js');

function loadTradingPeriods() {
  const ctx = { globalThis: {} };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(TP_PATH, 'utf8'), ctx, { filename: TP_PATH });
  return ctx.MultiLogicFinrespTradingPeriods;
}

test('MOEX defaults: weekday lunch break blocks 09:55 Monday', () => {
  const TP = loadTradingPeriods();
  const cfg = TP.defaultMoexConfig();
  assert.equal(TP.isNonTradingMsk('2026-06-15 09:55:00', cfg), true);
  assert.equal(TP.isNonTradingMsk('2026-06-15 10:05:00', cfg), false);
});

test('MOEX defaults: weekend before DSVД blocks Saturday morning', () => {
  const TP = loadTradingPeriods();
  const cfg = TP.defaultMoexConfig();
  assert.equal(TP.isNonTradingMsk('2026-06-20 08:00:00', cfg), true);
  assert.equal(TP.isNonTradingMsk('2026-06-20 12:00:00', cfg), false);
});

test('disabled day does not block trades', () => {
  const TP = loadTradingPeriods();
  const cfg = TP.normalizeConfig({
    days: {
      mon: { enabled: false, periods: [{ from: '00:00', to: '24:00' }] },
      tue: { enabled: true, periods: [] },
      wed: { enabled: true, periods: [] },
      thu: { enabled: true, periods: [] },
      fri: { enabled: true, periods: [] },
      sat: { enabled: true, periods: [] },
      sun: { enabled: true, periods: [] }
    }
  });
  assert.equal(TP.isNonTradingMsk('2026-06-15 12:00:00', cfg), false);
});

test('daily timeframe skips hour filter', () => {
  const TP = loadTradingPeriods();
  const cfg = TP.defaultMoexConfig();
  assert.equal(TP.isNonTradingMsk('2026-06-15 00:00:00', cfg, { calcTf: '24' }), false);
});

test('engine blocks opening trade during non-trading bar', () => {
  const E = loadEngine();
  const TP = loadTradingPeriods();
  const candles = [];
  for (let i = 0; i < 80; i++) {
    candles.push({
      open: 100,
      high: 101,
      low: 99,
      close: 100 + (i % 3 === 0 ? 0.5 : -0.2),
      volume: 1000,
      time: `2026-06-15 ${String(9 + Math.floor(i / 12)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}:00`
    });
  }
  candles[candles.length - 1].time = '2026-06-15 09:55:00';
  const spec = E.resolveLogicSpec('sma_below', {}, E.DEFAULT_PARAMS, ['sma', 'atr']);
  const vol = { deposit: 100000, volume: 10, maxPositions: 5, commission: { type: 'None', value: 0 } };
  const withFilter = E.runOnCandles(candles, spec, 30, candles.length - 1, E.DEFAULT_PARAMS, vol, {
    tradingPeriods: TP.defaultMoexConfig(),
    calcTf: '60'
  });
  const noFilter = E.runOnCandles(candles, spec, 30, candles.length - 1, E.DEFAULT_PARAMS, vol, {
    tradingPeriods: TP.normalizeConfig({ days: Object.fromEntries(TP.DAY_KEYS.map((k) => [k, { enabled: false, periods: [] }])) }),
    calcTf: '60'
  });
  const lastBlocked = withFilter.rows.at(-1);
  const lastOpen = noFilter.rows.at(-1);
  assert.ok((lastOpen?.buy || 0) + (lastOpen?.sell || 0) >= (lastBlocked?.buy || 0) + (lastBlocked?.sell || 0));
});
