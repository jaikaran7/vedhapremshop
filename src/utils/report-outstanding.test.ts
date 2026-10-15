import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildOutstandingReport } from './report-outstanding';
import type { Customer, CustomerLedgerEntry, Payment, Sale } from '../types';

function customer(partial: Partial<Customer> & Pick<Customer, 'id' | 'outstandingAmount'>): Customer {
  return {
    code: partial.id,
    name: 'ABC Traders',
    phone: '',
    address: '',
    marketLocation: 'Pune',
    creditLimit: 100000,
    creditDays: 7,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

describe('outstanding ageing', () => {
  it('ages the unpaid opening and invoice from their due dates', () => {
    const ledger: CustomerLedgerEntry[] = [
      { id: 'led-1', date: '2026-09-20', customerId: 'c-1', type: 'OPENING', referenceNo: 'OPN', description: 'Opening', debit: 189581, credit: 0, balance: 189581 },
      { id: 'led-2', date: '2026-10-01', customerId: 'c-1', type: 'SALE', referenceNo: 'INV-1', description: 'Sale', debit: 10419, credit: 0, balance: 200000 },
      { id: 'led-3', date: '2026-10-01', customerId: 'c-1', type: 'PAYMENT', referenceNo: 'REC-1', description: 'Receipt', debit: 0, credit: 50000, balance: 150000 },
    ];
    const sales = [{
      id: 'sale-1',
      billNumber: 'INV-1',
      customerId: 'c-1',
      customerName: 'ABC Traders',
      customerPhone: '',
      customerAddress: '',
      date: '2026-10-01',
      time: '08:00 AM',
      items: [],
      totalBags: 1,
      totalWeightKg: 50,
      totalAmount: 10419,
      paymentType: 'CREDIT' as const,
      paidAmount: 0,
      balanceDue: 10419,
      status: 'CONFIRMED' as const,
      createdByUserId: 'u',
      createdByName: 'Owner',
      createdByRole: 'OWNER' as const,
      createdAt: '2026-10-01T00:00:00Z',
    }] satisfies Sale[];
    const rows = buildOutstandingReport({
      customers: [customer({ id: 'c-1', outstandingAmount: 150000 })],
      sales,
      payments: [] as Payment[],
      ledger,
      asOf: '2026-10-15',
    });
    const row = rows[0];
    assert.equal(row.ageing?.days16to30, 139581);
    assert.equal(row.ageing?.days0to7, 10419);
    assert.equal(row.oldestOverdueDays, 18);
    assert.equal(row.ageingNote, null);
  });

  it('does not invent buckets when the ledger does not cover the balance', () => {
    const rows = buildOutstandingReport({
      customers: [customer({ id: 'c-2', name: 'Shree Enterprises', outstandingAmount: 85000 })],
      sales: [],
      payments: [],
      ledger: [],
      asOf: '2026-10-15',
    });
    assert.equal(rows[0].totalDue, 85000);
    assert.equal(rows[0].ageing, null);
    assert.match(rows[0].ageingNote ?? '', /not available/i);
  });
});
