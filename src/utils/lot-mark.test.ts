import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { composeMarkCode, lotCodeFromNumber, lotDateStamp } from './lot-mark';

describe('lot mark names', () => {
  it('builds the lot date from the purchase date', () => {
    assert.equal(lotDateStamp('2026-10-26'), '26102026');
    assert.equal(lotDateStamp(''), '');
  });

  it('reads the two-letter code from the dated lot number', () => {
    assert.equal(lotCodeFromNumber('26102026 JK'), 'JK');
    assert.equal(lotCodeFromNumber('27102026 kj'), 'KJ');
    assert.equal(lotCodeFromNumber('LOT NEW'), '');
  });

  it('keeps the same quality letter distinct on each lot', () => {
    assert.equal(composeMarkCode('JK', 'A'), 'JKA');
    assert.equal(composeMarkCode('KJ', 'A'), 'KJA');
    assert.equal(composeMarkCode('JK', 'jka'), 'JKA');
    assert.equal(composeMarkCode('', 'A'), 'A');
  });
});
