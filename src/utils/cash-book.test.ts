import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CashAccount, Expense, Payment } from '@/types';
import { buildCashBook, buildDailyCollections } from './cash-book';

const accounts: CashAccount[] = [
  { id: 'cash', name: 'Cash', kind: 'CASH', openingBalance: 10_000.5, openingDate: '2026-10-20' },
  { id: 'upi', name: 'UPI', kind: 'UPI', openingBalance: 5_000, openingDate: '2026-10-20' },
  { id: 'bank', name: 'Bank', kind: 'BANK', openingBalance: 0, openingDate: '2026-10-20' },
];
const expense = (date: string, amount: number, accountId: string, over: Partial<Expense> = {}): Expense => ({
  id: `${date}-${amount}`, categoryId: 'c', categoryName: 'Transport', trackingCategory: null, amount, date, paymentMethod: 'CASH', accountId, accountName: accountId,
  recordedBy: 'x', createdAt: `${date}T10:00:00Z`, ...over,
});
const payment = (date: string, amount: number, paymentMethod: Payment['paymentMethod']): Payment => ({
  id: `p-${date}-${amount}`, receiptNumber: `R-${amount}`, customerId: 'c1', customerName: 'ABC', date, time: '10:00', amount, paymentMethod, createdAt: `${date}T11:00:00Z`,
} as Payment);
const row = (book: ReturnType<typeof buildCashBook>, kind: string) => book.accounts.find((a) => a.kind === kind)!;

describe('cash book', () => {
  it("each day's closing is the next day's opening, and a late entry for an earlier day readjusts all later days", () => {
    const base = { accounts, payments: [], expenses: [expense('2026-10-22', 500, 'cash')] };
    assert.equal(row(buildCashBook({ ...base, date: '2026-10-22' }), 'CASH').closingBalance, 9_500.5);
    assert.equal(row(buildCashBook({ ...base, date: '2026-10-23' }), 'CASH').openingBalance, 9_500.5);
    const late = { ...base, expenses: [...base.expenses, expense('2026-10-21', 200, 'cash')] };
    assert.equal(row(buildCashBook({ ...late, date: '2026-10-22' }), 'CASH').openingBalance, 9_800.5);
    assert.equal(row(buildCashBook({ ...late, date: '2026-10-23' }), 'CASH').openingBalance, 9_300.5);
  });

  it('routes receipts by method and ignores days before the opening date', () => {
    const book = buildCashBook({ accounts, payments: [payment('2026-10-25', 1_000, 'CASH'), payment('2026-10-25', 2_000.25, 'UPI'), payment('2026-10-25', 700, 'CHEQUE')], expenses: [], date: '2026-10-25' });
    assert.deepEqual([row(book, 'CASH').received, row(book, 'UPI').received, row(book, 'BANK').received], [1_000, 2_000.25, 700]);
    assert.equal(book.totals.closingBalance, 10_000.5 + 5_000 + 3_700.25);
    assert.equal(row(buildCashBook({ accounts, payments: [], expenses: [], date: '2026-10-19' }), 'CASH').beforeOpening, true);
  });

  it('daily collections add up by method', () => {
    const daily = buildDailyCollections([payment('2026-10-25', 1_000, 'CASH'), payment('2026-10-25', 500, 'UPI'), payment('2026-10-24', 99, 'CASH')], '2026-10-25');
    assert.equal(daily.collected, 1_500);
    assert.equal(daily.byMethod.length, 2);
  });
});
