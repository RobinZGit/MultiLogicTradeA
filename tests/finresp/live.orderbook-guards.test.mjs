import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldScheduleOrderBookRefresh } from './helpers/live-guards.mjs';

describe('order book refresh guards', () => {
  it('не планирует повторный fetch при orderBookBusy', () => {
    assert.equal(shouldScheduleOrderBookRefresh(true, true), false);
  });

  it('планирует fetch при открытой панели и свободном busy', () => {
    assert.equal(shouldScheduleOrderBookRefresh(true, false), true);
  });

  it('не планирует при закрытой панели', () => {
    assert.equal(shouldScheduleOrderBookRefresh(false, false), false);
  });
});
