import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mockRepository } from '@/data/mock-repository';
import type { Customer, CustomerLedgerEntry, Payment, Sale } from '../types';
import {
  buildOutstandingReport,
  customerLedgerPath,
  dueDateForBill,
  filterOutstandingRows,
  hasNoRecentPurchase,
  isPastDue,
  matchesOutstandingSearch,
  sortByOutstanding,
  STANDARD_CREDIT_DAYS,
} from './report-outstanding';

function customer(partial: Partial<Customer> & Pick<Customer, 'id' | 'outstandingAmount'>): Customer {
  return {
    code: partial.id.toUpperCase(),
    name: 'ABC Traders',
    phone: '+91 98220 12345',
    address: '',
    marketLocation: 'Pune',
    creditLimit: 100000,
    creditDays: 7,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

function sale(partial: Partial<Sale> & Pick<Sale, 'id' | 'billNumber' | 'date' | 'totalAmount' | 'balanceDue'>): Sale {
  return {
    customerId: 'c-1',
    customerName: 'ABC Traders',
    customerPhone: '',
    customerAddress: '',
    time: '08:00 AM',
    items: [],
    totalBags: 1,
    totalWeightKg: 50,
    paymentType: 'CREDIT',
    paidAmount: 0,
    status: 'CONFIRMED',
    createdByUserId: 'u',
    createdByName: 'Owner',
    createdByRole: 'OWNER',
    createdAt: `${partial.date}T00:00:00Z`,
    ...partial,
  };
}

describe('outstanding credit period', () => {
  it('uses 15 days when a bill has no due date and keeps a saved due date', () => {
    assert.equal(STANDARD_CREDIT_DAYS, 15);
    assert.equal(dueDateForBill({ date: '2026-10-01' }), '2026-10-16');
    assert.equal(dueDateForBill({ date: '2026-10-01', dueDate: '2026-10-08' }), '2026-10-08');
    assert.equal(isPastDue('2026-10-16', '2026-10-16'), false);
    assert.equal(isPastDue('2026-10-16', '2026-10-17'), true);
  });

  it('splits overdue and within-credit amounts after a partial payment', () => {
    const ledger: CustomerLedgerEntry[] = [
      { id: 'led-1', date: '2026-09-20', customerId: 'c-1', type: 'OPENING', referenceNo: 'OPN', description: 'Opening', debit: 189581, credit: 0, balance: 189581 },
      { id: 'led-2', date: '2026-10-01', customerId: 'c-1', type: 'SALE', referenceNo: 'INV-1', description: 'Sale', debit: 10419, credit: 0, balance: 200000 },
      { id: 'led-3', date: '2026-10-01', customerId: 'c-1', type: 'PAYMENT', referenceNo: 'REC-1', description: 'Receipt', debit: 0, credit: 50000, balance: 150000 },
    ];
    const rows = buildOutstandingReport({
      customers: [customer({ id: 'c-1', outstandingAmount: 150000, creditDays: 7 })],
      sales: [sale({ id: 'sale-1', billNumber: 'INV-1', date: '2026-10-01', totalAmount: 10419, balanceDue: 10419 })],
      payments: [] as Payment[],
      ledger,
      asOf: '2026-10-15',
    });
    const row = rows[0];
    assert.equal(row.totalDue, 150000);
    assert.equal(row.overdueAmount, 139581);
    assert.equal(row.withinCreditAmount, 10419);
    assert.equal(row.overdue, true);
    assert.equal(row.withinCredit, true);
    assert.equal(row.allocationNote, null);
    assert.equal(row.openBalances.find((item) => item.reference === 'OPN')?.dueDate, '2026-10-05');
    assert.equal(row.openBalances.find((item) => item.reference === 'INV-1')?.dueDate, '2026-10-16');
    assert.notEqual(row.overdueAmount, row.totalDue);
  });

  it('does not treat the whole balance as overdue when only the older bill is unpaid past its due date', () => {
    const ledger: CustomerLedgerEntry[] = [
      { id: 'a', date: '2026-08-01', customerId: 'c-1', type: 'SALE', referenceNo: 'OLD', description: 'Old', debit: 10000, credit: 0, balance: 10000 },
      { id: 'b', date: '2026-09-20', customerId: 'c-1', type: 'SALE', referenceNo: 'NEW', description: 'New', debit: 5000, credit: 0, balance: 15000 },
      { id: 'c', date: '2026-09-25', customerId: 'c-1', type: 'PAYMENT', referenceNo: 'REC', description: 'Part', debit: 0, credit: 4000, balance: 11000 },
    ];
    const rows = buildOutstandingReport({
      customers: [customer({ id: 'c-1', outstandingAmount: 11000 })],
      sales: [
        sale({ id: 's-old', billNumber: 'OLD', date: '2026-08-01', totalAmount: 10000, balanceDue: 10000, dueDate: '2026-08-16' }),
        sale({ id: 's-new', billNumber: 'NEW', date: '2026-09-20', totalAmount: 5000, balanceDue: 5000, dueDate: '2026-10-05' }),
      ],
      payments: [],
      ledger,
      asOf: '2026-10-01',
    });
    assert.equal(rows[0].overdueAmount, 6000);
    assert.equal(rows[0].withinCreditAmount, 5000);
    assert.equal(rows[0].totalDue, 11000);
  });

  it('keeps the customer total and withholds overdue amounts when the ledger does not cover the balance', () => {
    const rows = buildOutstandingReport({
      customers: [customer({ id: 'c-2', name: 'Shree Enterprises', code: 'CUST-002', outstandingAmount: 85000 })],
      sales: [],
      payments: [],
      ledger: [],
      asOf: '2026-10-15',
    });
    assert.equal(rows[0].totalDue, 85000);
    assert.equal(rows[0].overdueAmount, null);
    assert.equal(rows[0].overdue, false);
    assert.equal(rows[0].openBalances.length, 0);
    assert.match(rows[0].allocationNote ?? '', /does not add up/i);
    assert.equal(rows[0].lastSaleDate, null);
    assert.equal(rows[0].noRecentPurchase, true);
  });

  it('marks 45 days without a sale from the latest sale date, not the latest payment', () => {
    assert.equal(hasNoRecentPurchase(null, '2026-10-01'), true);
    assert.equal(hasNoRecentPurchase('2026-08-17', '2026-10-01'), true);
    assert.equal(hasNoRecentPurchase('2026-08-18', '2026-10-01'), false);
    const ledger: CustomerLedgerEntry[] = [
      { id: 's', date: '2026-08-01', customerId: 'c-1', type: 'SALE', referenceNo: 'OLD', description: 'Sale', debit: 1000, credit: 0, balance: 1000 },
      { id: 'p', date: '2026-10-01', customerId: 'c-1', type: 'PAYMENT', referenceNo: 'REC', description: 'Receipt', debit: 0, credit: 100, balance: 900 },
    ];
    const rows = buildOutstandingReport({
      customers: [customer({ id: 'c-1', outstandingAmount: 900 })],
      sales: [sale({ id: 's-old', billNumber: 'OLD', date: '2026-08-01', totalAmount: 1000, balanceDue: 1000 })],
      payments: [],
      ledger,
      asOf: '2026-10-01',
    });
    assert.equal(rows[0].lastSaleDate, '2026-08-01');
    assert.equal(rows[0].noRecentPurchase, true);
    assert.equal(rows[0].overdue, true);
  });

  it('excludes a zero balance, searches name code and mobile, and sorts the highest outstanding first', () => {
    const rows = buildOutstandingReport({
      customers: [
        customer({ id: 'c-low', name: 'Low Stores', code: 'CUST-LOW', phone: '9000000001', outstandingAmount: 100 }),
        customer({ id: 'c-high', name: 'High Traders', code: 'CUST-HIGH', phone: '+91 98220 12345', outstandingAmount: 500 }),
        customer({ id: 'c-zero', name: 'Settled', code: 'CUST-ZERO', outstandingAmount: 0 }),
      ],
      sales: [],
      payments: [],
      ledger: [
        { id: 'l1', date: '2026-10-01', customerId: 'c-low', type: 'SALE', referenceNo: 'L', description: 'Sale', debit: 100, credit: 0, balance: 100 },
        { id: 'h1', date: '2026-10-01', customerId: 'c-high', type: 'SALE', referenceNo: 'H', description: 'Sale', debit: 500, credit: 0, balance: 500 },
      ],
      asOf: '2026-10-01',
    });
    assert.equal(rows.some((row) => row.customerId === 'c-zero'), false);
    const sorted = sortByOutstanding(rows);
    assert.deepEqual(sorted.map((row) => row.customerId), ['c-high', 'c-low']);
    assert.equal(matchesOutstandingSearch(sorted[0], 'high'), true);
    assert.equal(matchesOutstandingSearch(sorted[0], 'CUST-HIGH'), true);
    assert.equal(matchesOutstandingSearch(sorted[0], '98220'), true);
    assert.equal(matchesOutstandingSearch(sorted[0], 'missing'), false);
    assert.equal(filterOutstandingRows(rows, 'all').length, 2);
    assert.equal(filterOutstandingRows(rows, 'highest').length, 2);
    assert.equal(filterOutstandingRows(rows, 'overdue').length, 0);
    assert.equal(customerLedgerPath('c-high'), '/customers/c-high/ledger');
  });

  it('does not let an earlier payment reduce a later bill', () => {
    const ledger: CustomerLedgerEntry[] = [
      { id: 'a', date: '2026-08-01', customerId: 'c-1', type: 'SALE', referenceNo: 'OLD', description: 'Old', debit: 10000, credit: 0, balance: 10000 },
      { id: 'b', date: '2026-08-02', customerId: 'c-1', type: 'PAYMENT', referenceNo: 'REC', description: 'Paid', debit: 0, credit: 12000, balance: 0 },
      { id: 'c', date: '2026-09-20', customerId: 'c-1', type: 'SALE', referenceNo: 'NEW', description: 'New', debit: 5000, credit: 0, balance: 5000 },
    ];
    const rows = buildOutstandingReport({
      customers: [customer({ id: 'c-1', outstandingAmount: 5000 })],
      sales: [
        sale({ id: 's-old', billNumber: 'OLD', date: '2026-08-01', totalAmount: 10000, balanceDue: 0, paymentType: 'CASH', paidAmount: 10000 }),
        sale({ id: 's-new', billNumber: 'NEW', date: '2026-09-20', totalAmount: 5000, balanceDue: 5000 }),
      ],
      payments: [],
      ledger,
      asOf: '2026-10-01',
    });
    assert.equal(rows[0].openBalances.find((item) => item.reference === 'OLD'), undefined);
    assert.equal(rows[0].openBalances.find((item) => item.reference === 'NEW')?.amount, 5000);
  });

  it('follows a posted payment into the customer balance and the outstanding report', () => {
    const before = mockRepository.getCustomer('c-1');
    assert.ok(before);
    const start = before.outstandingAmount;
    const payment = mockRepository.recordPayment({
      customerId: 'c-1',
      amount: 1000,
      paymentMethod: 'CASH',
      notes: 'Outstanding report check',
    });
    try {
      const after = mockRepository.getCustomer('c-1');
      assert.equal(after?.outstandingAmount, start - 1000);
      const rows = buildOutstandingReport({
        customers: mockRepository.listCustomers(),
        sales: mockRepository.listSales(),
        payments: mockRepository.listPayments(),
        ledger: mockRepository.listLedger(),
        asOf: '2026-10-01',
      });
      const row = rows.find((item) => item.customerId === 'c-1');
      assert.equal(row?.totalDue, start - 1000);
      assert.equal(row?.payments.some((item) => item.id === payment.id), true);
      assert.equal(row?.ledgerHref, '/customers/c-1/ledger');
    } finally {
      mockRepository.resetToDefault();
    }
  });
});
