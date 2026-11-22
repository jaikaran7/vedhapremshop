import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { balanceBeforeBill, totalBalanceAfterBill } from './customer-balance';

const entry = (customerId: string, type: 'SALE' | 'PAYMENT', referenceNo: string, balance: number) => ({ customerId, type, referenceNo, balance });

describe('balanceBeforeBill', () => {
  const ledger = [
    entry('a', 'SALE', 'INV-1', 1000),
    entry('b', 'SALE', 'INV-2', 500),
    entry('a', 'PAYMENT', 'RC-1', 400),
    entry('a', 'SALE', 'INV-3', 1400),
  ];

  it('is the balance on the customer\'s own row before the bill', () => {
    assert.equal(balanceBeforeBill(ledger, 'a', 'INV-3'), 400);
  });

  it('is zero for the customer\'s first bill', () => {
    assert.equal(balanceBeforeBill(ledger, 'a', 'INV-1'), 0);
    assert.equal(balanceBeforeBill(ledger, 'b', 'INV-2'), 0);
  });

  it('is null when there is no customer or no ledger row for the bill', () => {
    assert.equal(balanceBeforeBill(ledger, undefined, 'INV-1'), null);
    assert.equal(balanceBeforeBill(ledger, 'a', 'INV-9'), null);
    assert.equal(balanceBeforeBill([], 'a', 'INV-1'), null);
  });
});

describe('totalBalanceAfterBill', () => {
  it('adds what is unpaid on the bill to the previous balance', () => {
    assert.equal(totalBalanceAfterBill(400, 1000), 1400);
    assert.equal(totalBalanceAfterBill(400, 0), 400);
  });

  it('keeps an advance as a negative balance without float noise', () => {
    assert.equal(totalBalanceAfterBill(-500.1, 0.2), -499.9);
  });
});
