import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { settleBills, vendorPosition } from './vendor-ledger';

describe('vendor position', () => {
  it('payments clear the old dues before the new bills', () => {
    assert.deepEqual(vendorPosition(250_000_00, 100_000_00, 180_000_00), { previousDuePaise: 70_000_00, newDuePaise: 100_000_00, advancePaise: 0, payablePaise: 170_000_00 });
    assert.equal(vendorPosition(250_000_00, 100_000_00, 300_000_00).newDuePaise, 50_000_00);
  });

  it('paying more than owed is an advance that the next bill uses', () => {
    assert.deepEqual(vendorPosition(0, 100_000_00, 120_000_00), { previousDuePaise: 0, newDuePaise: 0, advancePaise: 20_000_00, payablePaise: 0 });
    assert.equal(vendorPosition(0, 150_000_00, 120_000_00).newDuePaise, 30_000_00);
  });

  it('payable − advance always equals opening + billed − paid', () => {
    for (const opening of [-5_000_00, 0, 7_000_00]) for (const billed of [0, 3_000_00, 12_000_00]) for (const paid of [0, 4_000_00, 30_000_00]) {
      const p = vendorPosition(opening, billed, paid);
      assert.equal(p.payablePaise - p.advancePaise, opening + billed - paid);
    }
  });

  it('settles the oldest bills first after the old dues', () => {
    const bills = [{ id: 'a', netPaise: 100_00 }, { id: 'b', netPaise: 200_00 }, { id: 'c', netPaise: 300_00 }];
    assert.deepEqual(settleBills(50_00, bills, 200_00).map((b) => [b.id, b.paidPaise, b.status]), [['a', 100_00, 'PAID'], ['b', 50_00, 'PARTIAL'], ['c', 0, 'UNPAID']]);
  });
});
