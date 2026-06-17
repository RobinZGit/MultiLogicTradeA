import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from './harness/load-engine.mjs';

const E = loadEngine();
const OB = globalThis.MultiLogicFinrespOrderBook;

test('parseAtom: OB.Imb / OB.Spr / OB.Depth', () => {
  const P = globalThis.MultiLogicFinrespParser;
  const imb = P._parseAtom('OB.Imb(D=5;Thr=12%;Mode=trend)(BuyOk)');
  assert.equal(imb.kind, 'ob.imb');
  assert.match(imb.params, /D=5/);
  const spr = P._parseAtom('OB.Spr(Max=0.1%)(Tight)');
  assert.equal(spr.kind, 'ob.spr');
  const depth = P._parseAtom('OB.Depth(D=10;Min=500)(Liquid)');
  assert.equal(depth.kind, 'ob.depth');
});

test('analyzeLogicObProfile: mixed vs only', () => {
  const mixed = E.analyzeLogicObProfile(
    'Op(Long(SMA(100)(Ab) AND OB.Imb(D=5;Thr=12%;Mode=trend)(BuyOk))) Cl(Long(SMA(100)(Bl)))'
  );
  assert.equal(mixed.obMixed, true);
  assert.equal(mixed.obOnly, false);
  const only = E.analyzeLogicObProfile(
    'Op(Long(OB.Imb(D=5;Thr=12%;Mode=trend)(BuyOk) AND OB.Spr(Max=0.1%)(Tight))) Cl(Long(OB.Imb(D=5;Thr=12%;Mode=anti)(SellOk)))'
  );
  assert.equal(only.obOnly, true);
  assert.equal(only.usesOb, true);
});

test('evaluateObAtom: imbalance trend buy', () => {
  const ob = {
    bids: [{ price: 100, quantity: 200 }, { price: 99.9, quantity: 100 }],
    asks: [{ price: 100.1, quantity: 50 }, { price: 100.2, quantity: 50 }]
  };
  const atom = { kind: 'ob.imb', params: 'D=2;Thr=10%;Mode=trend', signal: 'BuyOk' };
  assert.equal(OB.evaluateAtom(ob, atom, 'buy'), true);
  assert.equal(OB.evaluateAtom(ob, atom, 'sell'), false);
});

test('evaluateObAtom: spr tight', () => {
  const ob = {
    bids: [{ price: 100 }],
    asks: [{ price: 100.05 }]
  };
  const atom = { kind: 'ob.spr', params: 'Max=0.1%', signal: 'Tight' };
  assert.equal(OB.evaluateAtom(ob, atom, 'buy'), true);
});

test('backtest: OB atoms evaluate false without order book', () => {
  const line = E.DEFAULT_LOGIC_LINES.OB_SMA;
  const parsed = E.parseLogicLine(line, E.DEFAULT_PARAMS, { sma: true });
  const obAtom = parsed.opLongAtoms.find((a) => E.isObKind(a.kind));
  assert.ok(obAtom);
  assert.equal(E.evaluateObAtom(obAtom, null, 'buy'), false);
});
