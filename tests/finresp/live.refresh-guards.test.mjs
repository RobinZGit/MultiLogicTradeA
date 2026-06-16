import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { liveCriticalToggleDisabled, liveRefreshMayProceed } from './helpers/live-guards.mjs';

const liveOn = { isLiveMode: true, chartSession: true, active: false, tradingActionBusy: false, uiBusy: false };

describe('liveRefreshMayProceed (зеркало live.js)', () => {
  it('блокирует опрос при uiBusy, если торговля не активна и bootstrap не нужен', () => {
    assert.equal(liveRefreshMayProceed({ ...liveOn, uiBusy: true }, false), false);
  });

  it('пропускает опрос при uiBusy, если торговля активна (priority)', () => {
    assert.equal(liveRefreshMayProceed({ ...liveOn, uiBusy: true, active: true }, false), true);
  });

  it('пропускает опрос при uiBusy, если нужен bootstrap свечей', () => {
    assert.equal(liveRefreshMayProceed({ ...liveOn, uiBusy: true }, true), true);
  });

  it('блокирует опрос при tradingActionBusy без priority', () => {
    assert.equal(liveRefreshMayProceed({ ...liveOn, tradingActionBusy: true }, false), false);
  });

  it('пропускает опрос при tradingActionBusy, если торговля активна', () => {
    assert.equal(liveRefreshMayProceed({ ...liveOn, tradingActionBusy: true, active: true }, false), true);
  });

  it('блокирует вне live-режима или без chartSession', () => {
    assert.equal(liveRefreshMayProceed({ ...liveOn, isLiveMode: false }, false), false);
    assert.equal(liveRefreshMayProceed({ ...liveOn, chartSession: false }, false), false);
  });
});

describe('liveCriticalToggleDisabled (песочница: стоп не блокируется)', () => {
  it('«Начать» disabled при uiBusy, если торговля ещё не активна', () => {
    assert.equal(liveCriticalToggleDisabled({ ...liveOn, uiBusy: true }), true);
  });

  it('«Остановить» enabled при активной торговле, даже если uiBusy', () => {
    assert.equal(liveCriticalToggleDisabled({ ...liveOn, active: true, uiBusy: true }), false);
  });
});
