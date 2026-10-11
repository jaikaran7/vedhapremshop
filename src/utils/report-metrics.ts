import type { Customer, Lot, Payment, PaymentStatus, Purchase, Sale, StockMovement, Vendor } from '@/types';
import { buildLotDifferential, type LotDifferentialReport } from '@/utils/lot-differential';
import { chargesForSale } from '@/utils/sale-charges';
import { roundMoney } from '@/utils/settlement';

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  invoiceQuery: string;
  customerId: string;
  vendorId: string;
  lotNumber: string;
  markCode: string;
  paymentStatus: '' | PaymentStatus;
}

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  dateFrom: '',
  dateTo: '',
  invoiceQuery: '',
  customerId: '',
  vendorId: '',
  lotNumber: '',
  markCode: '',
  paymentStatus: '',
};

export interface SaleReportRow {
  id: string;
  billNumber: string;
  date: string;
  customer: string;
  customerId: string;
  lots: string;
  marks: string;
  bags: number;
  netWeight: number;
  productAmount: number;
  amali: number;
  marketFee: number;
  otherCharges: number;
  finalInvoice: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
}

export interface ReportKpis {
  totalSales: number;
  totalCollections: number;
  creditSales: number;
  outstandingReceivables: number;
  totalBagsSold: number;
  netWeightSoldKg: number;
  totalPurchases: number;
  purchaseWeightKg: number;
  currentStockKg: number;
  lotsCompleted: number;
  lotsInProgress: number;
  lotsNotStarted: number;
}

export interface KpiComparison {
  totalSales: number;
  totalCollections: number;
  creditSales: number;
  totalBagsSold: number;
  netWeightSoldKg: number;
  totalPurchases: number;
  purchaseWeightKg: number;
}

export interface ReportSnapshot {
  kpis: ReportKpis;
  comparisons: KpiComparison | null;
  sales: Sale[];
  payments: Payment[];
  purchases: Purchase[];
  customers: Customer[];
  vendors: Vendor[];
  lots: Lot[];
  saleRows: SaleReportRow[];
  lotReport: LotDifferentialReport;
}

interface SnapshotInput {
  sales: Sale[];
  payments: Payment[];
  customers: Customer[];
  vendors?: Vendor[];
  lots: Lot[];
  purchases: Purchase[];
  stockMovements: StockMovement[];
  filters: ReportFilters;
  includeComparison?: boolean;
}

export function salePaymentStatus(sale: Pick<Sale, 'paymentStatus' | 'paymentType' | 'paidAmount' | 'balanceDue' | 'totalAmount'>): PaymentStatus {
  if (sale.paymentStatus) return sale.paymentStatus;
  if (sale.paymentType === 'CREDIT') return 'CREDIT';
  if (sale.paymentType === 'PARTIAL') return 'PARTIAL';
  if ((sale.paidAmount ?? 0) <= 0 && (sale.balanceDue ?? sale.totalAmount) > 0) return 'CREDIT';
  if ((sale.balanceDue ?? 0) > 0.009 && (sale.paidAmount ?? 0) > 0) return 'PARTIAL';
  return 'PAID';
}

export function saleReportRows(sales: Sale[]): SaleReportRow[] {
  return sales.map((sale) => {
    const charges = chargesForSale(sale);
    const paid = roundMoney(sale.paidAmount ?? 0);
    const finalInvoice = charges.finalInvoiceAmount;
    const balanceDue = roundMoney(sale.balanceDue ?? balanceFrom(finalInvoice, paid));
    return {
      id: sale.id,
      billNumber: sale.billNumber,
      date: sale.date,
      customer: sale.customerName,
      customerId: sale.customerId,
      lots: [...new Set(sale.items.map((item) => item.lotNumber))].join(', '),
      marks: [...new Set(sale.items.map((item) => item.markCode))].join(', '),
      bags: sale.totalBags,
      netWeight: sale.totalWeightKg,
      productAmount: charges.productSubtotal,
      amali: charges.amaliAmount,
      marketFee: charges.marketFeeAmount,
      otherCharges: charges.otherCharges,
      finalInvoice,
      amountPaid: paid,
      balanceDue,
      paymentStatus: salePaymentStatus(sale),
    };
  });
}

function balanceFrom(finalInvoice: number, paid: number) {
  return roundMoney(finalInvoice - paid);
}

function inDateRange(date: string, filters: ReportFilters) {
  if (filters.dateFrom && date < filters.dateFrom) return false;
  if (filters.dateTo && date > filters.dateTo) return false;
  return true;
}

function invoiceMatches(value: string, filters: ReportFilters) {
  const query = filters.invoiceQuery.trim().toLowerCase();
  if (!query) return true;
  return value.toLowerCase().includes(query);
}

function shiftIsoDate(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function previousFilters(filters: ReportFilters): ReportFilters | null {
  if (!filters.dateFrom || !filters.dateTo || filters.dateFrom > filters.dateTo) return null;
  const [fromYear, fromMonth, fromDay] = filters.dateFrom.split('-').map(Number);
  const [toYear, toMonth, toDay] = filters.dateTo.split('-').map(Number);
  const fromUtc = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toUtc = Date.UTC(toYear, toMonth - 1, toDay);
  const length = Math.round((toUtc - fromUtc) / 86400000) + 1;
  if (!Number.isFinite(length) || length <= 0) return null;
  return {
    ...filters,
    dateTo: shiftIsoDate(filters.dateFrom, -1),
    dateFrom: shiftIsoDate(filters.dateFrom, -length),
  };
}

function saleMatches(sale: Sale, filters: ReportFilters, lots: Lot[]) {
  if (sale.status === 'CANCELLED') return false;
  if (!inDateRange(sale.date, filters)) return false;
  if (!invoiceMatches(sale.billNumber, filters)) return false;
  if (filters.customerId && sale.customerId !== filters.customerId) return false;
  if (filters.paymentStatus && salePaymentStatus(sale) !== filters.paymentStatus) return false;
  if (filters.lotNumber && !sale.items.some((item) => item.lotNumber.toUpperCase() === filters.lotNumber.toUpperCase())) return false;
  if (filters.markCode && !sale.items.some((item) => item.markCode.toUpperCase() === filters.markCode.toUpperCase())) return false;
  if (filters.vendorId) {
    const vendorLots = new Set(
      lots.filter((lot) => lot.vendorId === filters.vendorId).map((lot) => lot.lotNumber.toUpperCase()),
    );
    if (!sale.items.some((item) => vendorLots.has(item.lotNumber.toUpperCase()))) return false;
  }
  return true;
}

function saleScoped(filters: ReportFilters) {
  return Boolean(filters.invoiceQuery.trim() || filters.lotNumber || filters.markCode || filters.paymentStatus);
}

export function buildReportSnapshot(input: SnapshotInput): ReportSnapshot {
  const vendors = input.vendors ?? [];
  const sales = input.sales.filter((sale) => saleMatches(sale, input.filters, input.lots));
  const saleBills = new Set(sales.map((sale) => sale.billNumber));
  const payments = input.payments.filter((payment) => {
    if (!inDateRange(payment.date, input.filters)) return false;
    if (input.filters.customerId && payment.customerId !== input.filters.customerId) return false;
    if (saleScoped(input.filters)) {
      return Boolean(payment.referenceNumber && saleBills.has(payment.referenceNumber));
    }
    return true;
  });
  const purchases = input.purchases.filter((purchase) => {
    if (!inDateRange(purchase.date, input.filters)) return false;
    if (input.filters.vendorId && purchase.vendorId !== input.filters.vendorId) return false;
    if (input.filters.lotNumber && purchase.lotNumber.toUpperCase() !== input.filters.lotNumber.toUpperCase()) return false;
    if (input.filters.markCode && !purchase.items.some((item) => item.markCode.toUpperCase() === input.filters.markCode.toUpperCase())) return false;
    if (input.filters.invoiceQuery.trim() && !invoiceMatches(purchase.billNumber, input.filters)) return false;
    return true;
  });
  const lots = input.lots.filter((lot) => {
    if (input.filters.vendorId && lot.vendorId !== input.filters.vendorId) return false;
    if (input.filters.lotNumber && lot.lotNumber.toUpperCase() !== input.filters.lotNumber.toUpperCase()) return false;
    if (input.filters.markCode && !lot.marks.some((mark) => mark.markCode.toUpperCase() === input.filters.markCode.toUpperCase())) {
      const soldMark = sales.some((sale) => sale.items.some((item) => item.lotNumber.toUpperCase() === lot.lotNumber.toUpperCase() && item.markCode.toUpperCase() === input.filters.markCode.toUpperCase()));
      if (!soldMark) return false;
    }
    if ((input.filters.dateFrom || input.filters.dateTo) && !inDateRange(lot.arrivalDate, input.filters)) return false;
    if (input.filters.invoiceQuery.trim()) {
      const mentioned = sales.some((sale) => sale.items.some((item) => item.lotNumber.toUpperCase() === lot.lotNumber.toUpperCase()));
      if (!mentioned && !invoiceMatches(lot.lotNumber, input.filters) && !invoiceMatches(lot.purchaseBillNo, input.filters)) return false;
    }
    return true;
  });
  const customers = input.customers.filter((customer) => {
    if (input.filters.customerId && customer.id !== input.filters.customerId) return false;
    if (input.filters.invoiceQuery.trim()) {
      const hasBill = sales.some((sale) => sale.customerId === customer.id);
      if (!hasBill && !customer.name.toLowerCase().includes(input.filters.invoiceQuery.trim().toLowerCase())) return false;
    }
    return true;
  });

  const saleRows = saleReportRows(sales);
  const lotReport = buildLotDifferential({
    lots,
    purchases: input.purchases.filter((purchase) => lots.some((lot) => lot.lotNumber.toUpperCase() === purchase.lotNumber.toUpperCase())),
    sales: input.sales.filter((sale) => sale.status !== 'CANCELLED' && sale.items.some((item) => lots.some((lot) => lot.lotNumber.toUpperCase() === item.lotNumber.toUpperCase()))),
    stockMovements: input.stockMovements,
  });

  const hasSaleFilter = Boolean(
    input.filters.dateFrom || input.filters.dateTo || input.filters.invoiceQuery.trim() ||
    input.filters.customerId || input.filters.lotNumber || input.filters.markCode ||
    input.filters.paymentStatus || input.filters.vendorId,
  );
  const outstandingReceivables = hasSaleFilter
    ? roundMoney(saleRows.reduce((sum, row) => sum + row.balanceDue, 0))
    : roundMoney(customers.reduce((sum, customer) => sum + customer.outstandingAmount, 0));

  const kpis: ReportKpis = {
    totalSales: roundMoney(saleRows.reduce((sum, row) => sum + row.finalInvoice, 0)),
    totalCollections: roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0)),
    creditSales: roundMoney(saleRows.filter((row) => row.paymentStatus === 'CREDIT').reduce((sum, row) => sum + row.finalInvoice, 0)),
    outstandingReceivables,
    totalBagsSold: saleRows.reduce((sum, row) => sum + row.bags, 0),
    netWeightSoldKg: saleRows.reduce((sum, row) => sum + row.netWeight, 0),
    totalPurchases: roundMoney(purchases.reduce((sum, purchase) => sum + purchase.netAmount, 0)),
    purchaseWeightKg: purchases.reduce((sum, purchase) => sum + purchase.items.reduce((itemSum, item) => itemSum + item.weightKg, 0), 0),
    currentStockKg: lots.reduce((sum, lot) => sum + lot.remainingWeightKg, 0),
    lotsCompleted: lotReport.lotsCompleted,
    lotsInProgress: lotReport.lotsInProgress,
    lotsNotStarted: lotReport.lotsNotStarted,
  };

  let comparisons: KpiComparison | null = null;
  if (input.includeComparison !== false) {
    const priorFilters = previousFilters(input.filters);
    if (priorFilters) {
      const prior = buildReportSnapshot({ ...input, filters: priorFilters, includeComparison: false });
      comparisons = {
        totalSales: prior.kpis.totalSales,
        totalCollections: prior.kpis.totalCollections,
        creditSales: prior.kpis.creditSales,
        totalBagsSold: prior.kpis.totalBagsSold,
        netWeightSoldKg: prior.kpis.netWeightSoldKg,
        totalPurchases: prior.kpis.totalPurchases,
        purchaseWeightKg: prior.kpis.purchaseWeightKg,
      };
    }
  }

  return {
    kpis,
    comparisons,
    sales,
    payments,
    purchases,
    customers,
    vendors,
    lots,
    saleRows,
    lotReport,
  };
}
