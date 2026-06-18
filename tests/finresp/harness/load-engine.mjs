import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FINRESP_ROOT = join(__dirname, '..', '..', '..', 'src', 'finresp');
const ENGINE_PATH = join(FINRESP_ROOT, 'MultiLogic_FinrespCalculator.engine.js');
const TRADING_PERIODS_PATH = join(FINRESP_ROOT, 'trading-periods.js');
const INDICATOR_DIR = join(FINRESP_ROOT, 'indicators');
const LOGIC_DIR = join(FINRESP_ROOT, 'logics');
const INDICATOR_SCRIPTS = [
  '_registry.js',
  '_utils.js',
  'sma.js',
  'cma.js',
  'atr.js',
  'stoch.js',
  'linreg.js',
  'bollinger.js',
  'momentum.js',
  'vwap.js',
  'cci.js',
  'macd.js',
  'rand.js',
  join('tot', 'totstoch.js'),
  join('ctg', 'contango-series.js'),
  join('ctg', 'ctgstoch.js')
].map((p) => join(INDICATOR_DIR, p));
const LOGIC_SCRIPTS = [
  'parser.js',
  'registry.js',
  'fragments.js',
  'rnd.js',
  'tbc.js',
  'ut.js',
  'uct.js',
  'l5.js',
  'l1.js',
  'l2.js',
  'l3.js',
  'l4.js',
  'sma_below.js',
  'sma_above.js',
  'sma_corridor_trend.js',
  'sma_corridor_anti.js',
  'fts.js',
  'ftt.js',
  'fts_s.js',
  'ftt_s.js',
  'cml.js',
  'cms.js',
  'pik.js',
  'pikh.js',
  join('..', 'orderbook', '_eval.js'),
  'ob_sma.js',
  'ob_only.js',
  '_descriptions.js'
].map((p) => (p.startsWith('..') ? join(LOGIC_DIR, p) : join(LOGIC_DIR, p)));

/** Загрузка browser-IIFE движка в Node (без DOM). */
export function loadEngine() {
  const code = readFileSync(ENGINE_PATH, 'utf8');
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.createContext(context);
  for (const p of INDICATOR_SCRIPTS) {
    const src = readFileSync(p, 'utf8');
    vm.runInContext(src, context, { filename: p });
  }
  for (const p of LOGIC_SCRIPTS) {
    const src = readFileSync(p, 'utf8');
    vm.runInContext(src, context, { filename: p });
  }
  vm.runInContext(readFileSync(TRADING_PERIODS_PATH, 'utf8'), context, { filename: TRADING_PERIODS_PATH });
  vm.runInContext(code, context, { filename: ENGINE_PATH });
  const E = context.MultiLogicFinrespEngine;
  if (!E) throw new Error('MultiLogicFinrespEngine not exported');
  globalThis.MultiLogicFinrespParser = context.MultiLogicFinrespParser;
  globalThis.MultiLogicFinrespOrderBook = context.MultiLogicFinrespOrderBook;
  return E;
}
