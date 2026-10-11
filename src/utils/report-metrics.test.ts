import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildReportSnapshot, saleReportRows } from './report-metrics';
import { calculateSaleCharges, DEFAULT_SALE_CHARGE_SETTINGS } from './sale-charges';
import type { Customer, Lot, Payment, Purchase, Sale } from '../types';

const charges = calculateSaleCharges({
  totalBags: 3,
  productSubtotal: 10419,
  settings: DEFAULT_SALE_CHARGE_SETTINGS,
});

const sale: Sale = {
  id: 'sale-1',
  billNumber: 'VPN-INV-1081',
  customerId: 'c-1',
  customerName: 'ABC Traders',
  customerPhone: '',
  customerAddress: '',
  date: '2026-10-01',
  time: '08:45 AM',
  items: [{
    id: 'si-1',
    markCode: 'AA',
    lotNumber: 'LOT AP',
    bags: 3,
    weightKg: 151,
    ratePerKg: 69,
    amount: 10419,
    bagWeights: [],
  }],
  totalBags: 3,
  totalWeightKg: 151,
  productSubtotal: 10419,
  charges,
  totalAmount: 10509,
  paymentType: 'PARTIAL',
  paymentStatus: 'PARTIAL',
  paidAmount: 5000,
  balanceDue: 5509,
  status: 'CONFIRMED',
  createdByUserId: 'u-3',
  createdByName: 'Rajesh Kumar',
  createdByRole: 'SALESPERSON',
  createdAt: '2026-10-01T08:45:00Z',
};

const customer: Customer = {
  id: 'c-1',
  code: 'CUST-001',
  name: 'ABC Traders',
  phone: '',
  address: '',
  marketLocation: 'Camp',
  creditLimit: 100000,
  creditDays: 15,
  outstandingAmount: 5509,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
};

const payment: Payment = {
  id: 'pay-1',
  receiptNumber: 'VPN-REC-501',
  customerId: 'c-1',
  customerName: 'ABC Traders',
  date: '2026-10-01',
  time: '09:00 AM',
  amount: 5000,
  paymentMethod: 'CASH',
  referenceNumber: 'VPN-INV-1081',
  previousOutstanding: 10509,
  newOutstanding: 5509,
  recordedBy: 'Owner',
  createdAt: '2026-10-01T09:00:00Z',
};

const lot: Lot = {
  id: 'lot-1',
  lotNumber: 'LOT AP',
  vendorId: 'v-1',
  vendorName: 'Murade Traders',
  purchaseBillId: 'pur-1',
  purchaseBillNo: 'PUR-1',
  arrivalDate: '2026-09-28',
  status: 'ACTIVE',
  totalBags: 10,
  totalWeightKg: 500,
  remainingBags: 7,
  remainingWeightKg: 349,
  marks: [],
};

const purchase: Purchase = {
  id: 'pur-1',
  billNumber: 'PUR-1',
  vendorId: 'v-1',
  vendorName: 'Murade Traders',
  date: '2026-09-28',
  lotNumber: 'LOT AP',
  items: [{ id: 'pi', markCode: 'AA', bags: 10, weightKg: 500, ratePerKg: 40, totalAmount: 20000 }],
  expenses: [],
  grossAmount: 20000,
  totalExpenses: 0,
  netAmount: 20000,
  createdAt: '2026-09-28T00:00:00Z',
};

describe('report reconciliation', () => {
  it('keeps invoice totals, collections, outstanding and lot product amounts consistent', () => {
    const rows = saleReportRows([sale]);
    const row = rows[0];
    assert.equal(row.productAmount + row.amali + row.marketFee + row.otherCharges, row.finalInvoice);
    assert.equal(row.amountPaid + row.balanceDue, row.finalInvoice);
    assert.equal(row.productAmount, 10419);
    assert.equal(row.finalInvoice, 10509);
    assert.equal(row.balanceDue, 5509);

    const snapshot = buildReportSnapshot({
      sales: [sale],
      payments: [payment],
      customers: [customer],
      lots: [lot],
      purchases: [purchase],
      stockMovements: [],
      filters: {
        dateFrom: '',
        dateTo: '',
        invoiceQuery: '',
        customerId: '',
        vendorId: '',
        lotNumber: '',
        markCode: '',
        paymentStatus: '',
      },
    });

    assert.equal(snapshot.kpis.totalSales, 10509);
    assert.equal(snapshot.kpis.totalCollections, 5000);
    assert.equal(snapshot.kpis.outstandingReceivables, 5509);
    assert.equal(snapshot.kpis.totalBagsSold, 3);
    assert.equal(snapshot.kpis.netWeightSoldKg, 151);
    assert.equal(snapshot.kpis.totalPurchases, 20000);
    assert.equal(snapshot.kpis.purchaseWeightKg, 500);
    assert.equal(snapshot.kpis.currentStockKg, 349);
    assert.equal(snapshot.lotReport.lots[0].salesRealization, row.productAmount);
    assert.equal(snapshot.comparisons, null);
  });
});
