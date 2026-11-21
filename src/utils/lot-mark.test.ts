import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { composeMarkCode, lotCodeFromNumber, lotDateStamp, qualityOnLot } from './lot-mark';

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

  it('shows the typed quality instead of the stored lot prefix', () => {
    const hh = ['HHKAOK', 'HHKAK', 'HHKAN', 'HHKAKK', 'HHKA27', 'HHKAH', 'HHKAPB', 'HHKA26', 'HHKAP'];
    assert.equal(qualityOnLot('HHKAOK', '26102026 HH', hh), 'OK');
    assert.equal(qualityOnLot('HHKAK', '26102026 HH', hh), 'K');
    assert.equal(qualityOnLot('HHKAN', '26102026 HH', hh), 'N');
    assert.equal(qualityOnLot('HHKAKK', '26102026 HH', hh), 'KK');
    assert.equal(qualityOnLot('HHKA27', '26102026 HH', hh), '27');
    assert.equal(qualityOnLot('HHKAH', '26102026 HH', hh), 'H');
    assert.equal(qualityOnLot('HHKAPB', '26102026 HH', hh), 'PB');
    assert.equal(qualityOnLot('HHKA26', '26102026 HH', hh), '26');
    assert.equal(qualityOnLot('HHKAP', '26102026 HH', hh), 'P');
    assert.equal(qualityOnLot('GINNO1', '03112026 GIN', ['GINNO1']), 'NO1');
    assert.equal(qualityOnLot('MMAK', '03112026 MM', ['MMAK', 'MMML']), 'AK');
    assert.equal(qualityOnLot('MMML', '03112026 MM', ['MMAK', 'MMML']), 'ML');
    assert.equal(qualityOnLot('HHOK', '26102026 HH', ['HHOK', 'HHK']), 'OK');
    assert.equal(qualityOnLot('HHK', '26102026 HH', ['HHOK', 'HHK']), 'K');
    assert.equal(qualityOnLot('HHHB', '26102026 HH', ['HHHB', 'HHHB2']), 'HB');
    assert.equal(qualityOnLot('JKA', '14102026 JK', ['JKA']), 'A');
    assert.equal(qualityOnLot('OK', '26102026 HH', ['OK']), 'OK');
  });
});
