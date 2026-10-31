import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { billStatusLabel, settleBills, vendorPosition, vendorStatement } from './vendor-ledger';
import { formatClockTime, paymentMethodLabel } from './settlement';

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
    assert.deepEqual(settleBills(50_00, bills, 200_00).map((b) => billStatusLabel(b.status)), ['Paid', 'Partially paid', 'Unpaid']);
  });

  it('adds each payment to the statement and reduces the balance', () => {
    const lines = vendorStatement(0, [
      { id: 'bill', kind: 'bill', date: '2026-10-26', amount: 1130318.3 },
      { id: 'pay-later', kind: 'payment', date: '2026-10-29', createdAt: '2026-10-29T08:00:00Z', amount: 200000 },
      { id: 'pay', kind: 'payment', date: '2026-10-29', createdAt: '2026-10-29T07:56:00Z', amount: 50000 },
    ]);
    assert.deepEqual(lines.map((line) => line.id), ['bill', 'pay', 'pay-later']);
    assert.equal(lines[0].balance, 1130318.3);
    assert.equal(lines[1].balance, 1080318.3);
    assert.equal(lines[2].balance, 880318.3);
  });

  it('lists a bill before a payment made the same day', () => {
    const lines = vendorStatement(100, [
      { id: 'pay', kind: 'payment', date: '2026-10-26', createdAt: '2026-10-26T04:30:00Z', amount: 40 },
      { id: 'bill', kind: 'bill', date: '2026-10-26', amount: 60 },
    ]);
    assert.deepEqual(lines.map((line) => [line.id, line.balance]), [['bill', 160], ['pay', 120]]);
  });
});

describe('payment display', () => {
  it('shows the India time and a readable method', () => {
    assert.equal(formatClockTime('2026-10-29T07:56:00.000Z'), '1:26 pm');
    assert.equal(paymentMethodLabel('BANK_TRANSFER'), 'Bank Transfer');
    assert.equal(paymentMethodLabel('CHEQUE'), 'Cheque');
  });
});
