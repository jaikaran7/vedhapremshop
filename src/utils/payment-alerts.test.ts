import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Expense, Sale, Vendor } from '@/types';
import { customerCreditAlerts, isDueSoon, vendorPaymentAlerts } from './payment-alerts';

const vendor = (over: Partial<Vendor> = {}): Vendor => ({
  id: 'v1', code: 'VEN-001', name: 'Murade', phone: '', address: '', mandiCity: '',
  totalPurchases: 10000, payableAmount: 4000, status: 'ACTIVE', createdAt: '2026-10-01T00:00:00Z', ...over,
});

const expense = (over: Partial<Expense> = {}): Expense => ({
  id: 'e1', categoryId: 'c', categoryName: 'Purchase Payments', trackingCategory: null, amount: 1000,
  date: '2026-10-20', paymentMethod: 'CASH', accountId: 'a', accountName: 'Cash', vendorId: 'v1',
  vendorName: 'Murade', recordedBy: 'Owner', createdAt: '2026-10-20T10:00:00Z', ...over,
});

const sale = (over: Partial<Sale> = {}): Sale => ({
  id: 's1', billNumber: 'INV-1', customerId: 'c1', customerName: 'ABC Stores',
  customerPhone: '', customerAddress: '', date: '2026-10-18', time: '10:00',
  totalBags: 1, totalWeightKg: 50, productSubtotal: 2000, totalAmount: 2000,
  paidAmount: 0, balanceDue: 2000, paymentType: 'CREDIT', dueDate: '2026-10-26',
  status: 'CONFIRMED', createdByUserId: 'u1', createdByName: 'Owner', createdByRole: 'OWNER',
  createdAt: '2026-10-18T10:00:00Z', items: [],
  ...over,
});

describe('payment alerts', () => {
  it('treats today and overdue dates as due soon', () => {
    assert.equal(isDueSoon('2026-10-26', '2026-10-26', 2), true);
    assert.equal(isDueSoon('2026-10-28', '2026-10-26', 2), true);
    assert.equal(isDueSoon('2026-10-29', '2026-10-26', 2), false);
    assert.equal(isDueSoon('2026-10-24', '2026-10-26', 2), true);
  });

  it('alerts on the latest vendor next-payment date when we still owe them', () => {
    const alerts = vendorPaymentAlerts(
      [vendor()],
      [
        expense({ id: 'old', nextPaymentDate: '2026-10-21', date: '2026-10-10', createdAt: '2026-10-10T10:00:00Z' }),
        expense({ id: 'new', nextPaymentDate: '2026-10-27', date: '2026-10-20', createdAt: '2026-10-20T10:00:00Z' }),
      ],
      '2026-10-26',
      2,
    );
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].date, '2026-10-27');
    assert.equal(alerts[0].daysUntil, 1);
    assert.equal(alerts[0].amount, 4000);
  });

  it('groups unpaid customer bills that are close to the credit due date', () => {
    const alerts = customerCreditAlerts(
      [
        sale(),
        sale({ id: 's2', dueDate: '2026-10-25', balanceDue: 500 }),
        sale({ id: 'paid', balanceDue: 0, dueDate: '2026-10-26' }),
        sale({ id: 'later', customerId: 'c2', customerName: 'Far', dueDate: '2026-11-10', balanceDue: 900 }),
      ],
      '2026-10-26',
      2,
    );
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].name, 'ABC Stores');
    assert.equal(alerts[0].amount, 2500);
    assert.equal(alerts[0].daysUntil, -1);
  });
});
