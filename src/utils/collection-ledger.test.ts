import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SEED_PAYMENTS, SEED_SALES } from '@/data/seed';
import {
  EMPTY_ALLOCATION,
  accountForMethod,
  allocatePayment,
  allocationTotal,
  buildFinanceSnapshot,
  categoryLines,
  resolveAllocations,
  validateExpense,
} from './collection-ledger';

const chargedSale = {
  id: 'sale-fee',
  billNumber: 'VPN-INV-2001',
  customerId: 'c-1',
  date: '2026-10-01',
  paidAmount: 10509,
  totalAmount: 10509,
  charges: { productSubtotal: 10419, amaliAmount: 60, marketFeeAmount: 30, otherCharges: 0 },
};

describe('collection allocation', () => {
  it('splits a full receipt across onion, amali and market fee once', () => {
    const allocation = allocatePayment(
      { id: 'pay-full', customerId: 'c-1', amount: 10509, date: '2026-10-01', paymentMethod: 'CASH', referenceNumber: 'VPN-INV-2001' },
      [],
      [chargedSale],
    );
    assert.equal(allocation.onionSales, 10419);
    assert.equal(allocation.amali, 60);
    assert.equal(allocation.marketFee, 30);
    assert.equal(allocationTotal(allocation), 10509);
  });

  it('fills onion before fees and does not recount that money on the next receipt', () => {
    const sales = [{ ...chargedSale, paidAmount: 10509 }];
    const resolved = resolveAllocations([
      { id: 'second', customerId: 'c-1', amount: 5509, date: '2026-10-02', createdAt: '2026-10-02T00:00:00Z', paymentMethod: 'CASH', referenceNumber: 'VPN-INV-2001' },
      { id: 'first', customerId: 'c-1', amount: 5000, date: '2026-10-01', createdAt: '2026-10-01T00:00:00Z', paymentMethod: 'CASH', referenceNumber: 'VPN-INV-2001' },
    ], sales);
    const first = resolved.find((payment) => payment.id === 'first');
    const second = resolved.find((payment) => payment.id === 'second');
    assert.equal(first?.allocation.onionSales, 5000);
    assert.equal(second?.allocation.onionSales, 5419);
    assert.equal(second?.allocation.amali, 60);
    assert.equal(second?.allocation.marketFee, 30);
    assert.equal(allocationTotal(first!.allocation) + allocationTotal(second!.allocation), 10509);
  });

  it('does not treat an unpaid credit invoice as cash collected', () => {
    const resolved = resolveAllocations([
      { id: 'pay-credit', customerId: 'c-1', amount: 2000, date: '2026-10-01', paymentMethod: 'UPI' },
    ], [{
      id: 'sale-credit',
      billNumber: 'VPN-INV-1081',
      customerId: 'c-1',
      date: '2026-10-01',
      paidAmount: 0,
      totalAmount: 10419,
    }]);
    assert.equal(resolved[0].allocation.onionSales, 0);
    assert.equal(resolved[0].allocation.other, 2000);
  });

  it('keeps an explicit allocation when it matches the receipt', () => {
    const explicit = { ...EMPTY_ALLOCATION, marketFee: 15000 };
    const allocation = allocatePayment(
      { id: 'pay-explicit', customerId: 'c-1', amount: 15000, date: '2026-10-01', paymentMethod: 'CASH', allocation: explicit },
      [],
      [],
    );
    assert.deepEqual(allocation, explicit);
  });

  it('allocates the seeded receipts without double counting', () => {
    const resolved = resolveAllocations(SEED_PAYMENTS, SEED_SALES);
    const linked = resolved.find((payment) => payment.id === 'pay-3');
    assert.equal(linked?.allocation.onionSales, 30000);
    assert.equal(linked?.allocation.amali, 200);
    assert.equal(linked?.allocation.marketFee, 100);
    assert.equal(allocationTotal(linked!.allocation), linked!.amount);
    const gross = resolved.reduce((sum, payment) => sum + payment.amount, 0);
    const categorized = resolved.reduce((sum, payment) => sum + allocationTotal(payment.allocation), 0);
    assert.equal(categorized, gross);
    assert.equal(resolved.find((payment) => payment.id === 'pay-1')?.allocation.onionSales, 0);
  });
});

describe('expense balances', () => {
  it('keeps market fee collections and reduces net balance, cash and cash flow once', () => {
    const accounts = [
      { id: 'acct-cash', name: 'Cash in Hand', kind: 'CASH' as const, openingBalance: 0 },
      { id: 'acct-bank', name: 'Bank Account', kind: 'BANK' as const, openingBalance: 0 },
    ];
    const payments = resolveAllocations([
      { id: 'pay-mf', customerId: 'c-1', customerName: 'Mandi', amount: 15000, date: '2026-10-01', paymentMethod: 'CASH', allocation: { ...EMPTY_ALLOCATION, marketFee: 15000 } },
    ], []);
    const before = buildFinanceSnapshot({ payments, expenses: [], accounts, customerOutstanding: 80000 });
    const after = buildFinanceSnapshot({
      payments,
      expenses: [{
        id: 'ex-1',
        categoryId: 'exp-market-fee',
        categoryName: 'Market Fee Expense',
        trackingCategory: 'MARKET_FEE',
        amount: 4000,
        date: '2026-10-10',
        paymentMethod: 'CASH',
        accountId: 'acct-cash',
      }],
      accounts,
      customerOutstanding: 80000,
    });
    assert.equal(after.collectionsByCategory.MARKET_FEE, 15000);
    assert.equal(after.expensesByTracking.MARKET_FEE, 4000);
    assert.equal(after.netCategoryBalance.MARKET_FEE, 11000);
    assert.equal(after.totalExpenses, before.totalExpenses + 4000);
    assert.equal(after.netCashFlow, before.netCashFlow - 4000);
    assert.equal(after.accountBalances.find((account) => account.id === 'acct-cash')?.balance, (before.accountBalances.find((account) => account.id === 'acct-cash')?.balance ?? 0) - 4000);
    assert.equal(after.customerOutstanding, before.customerOutstanding);
    assert.equal(categoryLines(payments, 'MARKET_FEE').reduce((sum, line) => sum + line.amount, 0), 15000);
  });

  it('rejects a blank or non-positive expense', () => {
    assert.match(validateExpense({ categoryId: '', amount: 10, date: '2026-10-10', paymentMethod: 'CASH', accountId: 'acct-cash' }) ?? '', /category/);
    assert.match(validateExpense({ categoryId: 'exp-market-fee', amount: -1, date: '2026-10-10', paymentMethod: 'CASH', accountId: 'acct-cash' }) ?? '', /greater than zero/);
  });

  it('maps a cash receipt onto the cash account', () => {
    assert.equal(accountForMethod('CASH', [{ id: 'acct-cash', kind: 'CASH' }, { id: 'acct-bank', kind: 'BANK' }]), 'acct-cash');
  });
});
