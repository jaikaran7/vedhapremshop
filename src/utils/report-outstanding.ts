import type { Customer, CustomerLedgerEntry, Payment, Sale } from '@/types';
import { salePaymentStatus } from '@/utils/report-metrics';
import { addCalendarDays, roundMoney } from '@/utils/settlement';

/** Every customer uses this credit period when a bill has no saved due date. */
export const STANDARD_CREDIT_DAYS = 15;

/** A customer with a balance and no sale in this many days has no recent purchases. */
export const INACTIVE_PURCHASE_DAYS = 45;

export type OutstandingFilter = 'all' | 'highest' | 'overdue' | 'inactive';

export interface OpenBalance {
  reference: string;
  date: string;
  dueDate: string | null;
  description: string;
  amount: number;
  overdue: boolean;
  saleId: string | null;
}

export interface CustomerOutstandingRow {
  customerId: string;
  code: string;
  name: string;
  phone: string;
  location: string;
  totalDue: number;
  lastSaleDate: string | null;
  noRecentPurchase: boolean;
  /** Unpaid amount past its due date. Null when bills cannot be split reliably. */
  overdueAmount: number | null;
  /** Unpaid amount that is not past its due date. Null when bills cannot be split reliably. */
  withinCreditAmount: number | null;
  overdue: boolean;
  withinCredit: boolean;
  allocationNote: string | null;
  openBalances: OpenBalance[];
  payments: Payment[];
  ledgerHref: string;
}

interface Input {
  customers: Customer[];
  sales: Sale[];
  payments: Payment[];
  ledger: CustomerLedgerEntry[];
  asOf: string;
  inactivePurchaseDays?: number;
}

function daysAfter(from: string, asOf: string) {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = asOf.split('-').map(Number);
  const start = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const end = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((end - start) / 86400000);
}

function isIsoDate(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Saved due dates stay as recorded. Otherwise the due date is the bill date plus 15 days. */
export function dueDateForBill(bill: { date: string; dueDate?: string | null }): string | null {
  if (isIsoDate(bill.dueDate)) return bill.dueDate;
  if (!isIsoDate(bill.date)) return null;
  return addCalendarDays(bill.date, STANDARD_CREDIT_DAYS);
}

/** Overdue starts the day after the due date. The due date itself is still inside the credit period. */
export function isPastDue(dueDate: string | null, asOf: string): boolean {
  if (!isIsoDate(dueDate) || !isIsoDate(asOf)) return false;
  return daysAfter(dueDate, asOf) > 0;
}

/**
 * No recent purchases when there is no posted sale, or the latest sale is at least `inactiveDays` old.
 * A missing sale date is not treated as a calendar date.
 */
export function hasNoRecentPurchase(
  lastSaleDate: string | null,
  asOf: string,
  inactiveDays: number = INACTIVE_PURCHASE_DAYS,
): boolean {
  if (!isIsoDate(lastSaleDate)) return true;
  if (!isIsoDate(asOf)) return false;
  return daysAfter(lastSaleDate, asOf) >= inactiveDays;
}

export function customerLedgerPath(customerId: string) {
  return `/customers/${customerId}/ledger`;
}

export function matchesOutstandingSearch(
  row: Pick<CustomerOutstandingRow, 'name' | 'code' | 'phone'>,
  query: string,
) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  const compact = (value: string) => value.toLowerCase().replace(/[\s-]/g, '');
  return row.name.toLowerCase().includes(text)
    || row.code.toLowerCase().includes(text)
    || (row.phone.length > 0 && compact(row.phone).includes(compact(text)));
}

export function filterOutstandingRows(rows: CustomerOutstandingRow[], filter: OutstandingFilter) {
  if (filter === 'overdue') return rows.filter((row) => row.overdue);
  if (filter === 'inactive') return rows.filter((row) => row.noRecentPurchase);
  return rows;
}

export function sortByOutstanding(rows: CustomerOutstandingRow[], direction: 'asc' | 'desc' = 'desc') {
  return [...rows].sort((left, right) => (
    direction === 'desc' ? right.totalDue - left.totalDue : left.totalDue - right.totalDue
  ));
}

export function buildOutstandingReport(input: Input): CustomerOutstandingRow[] {
  return input.customers
    .filter((customer) => customer.outstandingAmount > 0.009)
    .map((customer) => {
      const payments = input.payments
        .filter((payment) => payment.customerId === customer.id)
        .sort((left, right) => right.date.localeCompare(left.date) || right.receiptNumber.localeCompare(left.receiptNumber));
      const ledger = input.ledger
        .filter((entry) => entry.customerId === customer.id)
        .sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
      const sales = input.sales.filter((sale) => sale.customerId === customer.id && sale.status !== 'CANCELLED');
      const openBalances = ledger.length
        ? allocateLedger(ledger, sales, input.asOf)
        : allocateOpenSales(sales, input.asOf);
      const allocated = roundMoney(openBalances.reduce((sum, row) => sum + row.amount, 0));
      const reliable = openBalances.length > 0 && Math.abs(allocated - customer.outstandingAmount) <= 0.05;
      const overdueAmount = reliable
        ? roundMoney(openBalances.filter((row) => row.overdue).reduce((sum, row) => sum + row.amount, 0))
        : null;
      const withinCreditAmount = reliable
        ? roundMoney(openBalances.filter((row) => !row.overdue).reduce((sum, row) => sum + row.amount, 0))
        : null;
      const lastSaleDate = latestSaleDate(sales);
      return {
        customerId: customer.id,
        code: customer.code,
        name: customer.name,
        phone: customer.phone ?? '',
        location: customer.marketLocation,
        totalDue: roundMoney(customer.outstandingAmount),
        lastSaleDate,
        noRecentPurchase: hasNoRecentPurchase(lastSaleDate, input.asOf, input.inactivePurchaseDays ?? INACTIVE_PURCHASE_DAYS),
        overdueAmount,
        withinCreditAmount,
        overdue: (overdueAmount ?? 0) > 0.009,
        withinCredit: (withinCreditAmount ?? 0) > 0.009,
        allocationNote: reliable
          ? null
          : 'Outstanding is the customer balance. Overdue amounts are not split because the ledger does not add up to that balance.',
        openBalances: reliable ? openBalances : [],
        payments,
        ledgerHref: customerLedgerPath(customer.id),
      };
    });
}

function latestSaleDate(sales: Sale[]): string | null {
  const dates = sales
    .filter((sale) => sale.status === 'CONFIRMED' && isIsoDate(sale.date))
    .map((sale) => sale.date);
  if (dates.length === 0) return null;
  return dates.reduce((latest, date) => (date > latest ? date : latest));
}

function allocateLedger(
  ledger: CustomerLedgerEntry[],
  sales: Sale[],
  asOf: string,
): OpenBalance[] {
  const open: Array<OpenBalance & { remaining: number }> = [];
  ledger.forEach((entry) => {
    if (entry.debit > 0.009) {
      const sale = sales.find((item) => item.billNumber === entry.referenceNo);
      const dueDate = sale
        ? dueDateForBill(sale)
        : entry.type === 'OPENING' || entry.type === 'SALE'
          ? dueDateForBill({ date: entry.date })
          : null;
      open.push({
        reference: entry.referenceNo,
        date: entry.date,
        dueDate,
        description: entry.description,
        amount: 0,
        overdue: false,
        saleId: sale?.id ?? null,
        remaining: entry.debit,
      });
    }
    let credit = entry.credit;
    open.forEach((row) => {
      if (credit <= 0.009 || row.remaining <= 0.009) return;
      const used = Math.min(credit, row.remaining);
      row.remaining = roundMoney(row.remaining - used);
      credit = roundMoney(credit - used);
    });
  });
  return open
    .filter((row) => row.remaining > 0.009)
    .map((row) => ({
      reference: row.reference,
      date: row.date,
      dueDate: row.dueDate,
      description: row.description,
      amount: roundMoney(row.remaining),
      overdue: isPastDue(row.dueDate, asOf),
      saleId: row.saleId,
    }));
}

function allocateOpenSales(sales: Sale[], asOf: string): OpenBalance[] {
  return sales
    .filter((sale) => (sale.balanceDue ?? 0) > 0.009 && salePaymentStatus(sale) !== 'PAID')
    .map((sale) => {
      const dueDate = dueDateForBill(sale);
      return {
        reference: sale.billNumber,
        date: sale.date,
        dueDate,
        description: sale.customerName,
        amount: roundMoney(sale.balanceDue),
        overdue: isPastDue(dueDate, asOf),
        saleId: sale.id,
      };
    });
}
