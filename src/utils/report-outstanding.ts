import type { Customer, CustomerLedgerEntry, Payment, Sale } from '@/types';
import { salePaymentStatus } from '@/utils/report-metrics';
import { roundMoney } from '@/utils/settlement';

export interface AgeingBuckets {
  notYetDue: number;
  days0to7: number;
  days8to15: number;
  days16to30: number;
  days31plus: number;
  undated: number;
}

export interface OpenBalance {
  reference: string;
  date: string;
  dueDate: string | null;
  description: string;
  amount: number;
  daysOverdue: number | null;
  saleId: string | null;
}

export interface CustomerOutstandingRow {
  customerId: string;
  code: string;
  name: string;
  location: string;
  creditDays: number;
  creditLimit: number;
  totalDue: number;
  status: Customer['status'];
  ageing: AgeingBuckets | null;
  ageingNote: string | null;
  oldestOverdueDays: number | null;
  openBalances: OpenBalance[];
  payments: Payment[];
}

interface Input {
  customers: Customer[];
  sales: Sale[];
  payments: Payment[];
  ledger: CustomerLedgerEntry[];
  asOf: string;
}

function shiftIsoDate(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysAfter(due: string, asOf: string) {
  const [fromYear, fromMonth, fromDay] = due.split('-').map(Number);
  const [toYear, toMonth, toDay] = asOf.split('-').map(Number);
  const from = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const to = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((to - from) / 86400000);
}

function emptyBuckets(): AgeingBuckets {
  return { notYetDue: 0, days0to7: 0, days8to15: 0, days16to30: 0, days31plus: 0, undated: 0 };
}

function place(buckets: AgeingBuckets, amount: number, daysOverdue: number | null) {
  const money = roundMoney(amount);
  if (daysOverdue == null) buckets.undated = roundMoney(buckets.undated + money);
  else if (daysOverdue < 0) buckets.notYetDue = roundMoney(buckets.notYetDue + money);
  else if (daysOverdue <= 7) buckets.days0to7 = roundMoney(buckets.days0to7 + money);
  else if (daysOverdue <= 15) buckets.days8to15 = roundMoney(buckets.days8to15 + money);
  else if (daysOverdue <= 30) buckets.days16to30 = roundMoney(buckets.days16to30 + money);
  else buckets.days31plus = roundMoney(buckets.days31plus + money);
}

function saleDueDate(sale: Sale, customer: Customer) {
  if (sale.dueDate) return sale.dueDate;
  const days = sale.creditDays ?? customer.creditDays;
  if (days == null || !Number.isFinite(days)) return null;
  return shiftIsoDate(sale.date, days);
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
        ? ageLedger(customer, ledger, sales, input.asOf)
        : ageOpenSales(customer, sales, input.asOf);
      const agedTotal = roundMoney(openBalances.reduce((sum, row) => sum + row.amount, 0));
      const coversBalance = openBalances.length > 0 && Math.abs(agedTotal - customer.outstandingAmount) <= 0.05;
      const buckets = coversBalance ? emptyBuckets() : null;
      if (buckets) openBalances.forEach((row) => place(buckets, row.amount, row.daysOverdue));
      const overdue = openBalances
        .map((row) => row.daysOverdue)
        .filter((days): days is number => days != null && days >= 0);
      return {
        customerId: customer.id,
        code: customer.code,
        name: customer.name,
        location: customer.marketLocation,
        creditDays: customer.creditDays,
        creditLimit: customer.creditLimit,
        totalDue: roundMoney(customer.outstandingAmount),
        status: customer.status,
        ageing: buckets,
        ageingNote: coversBalance
          ? null
          : 'Ageing is not available because recorded invoices and opening entries do not add up to the outstanding balance.',
        oldestOverdueDays: coversBalance && overdue.length ? Math.max(...overdue) : null,
        openBalances: coversBalance ? openBalances : [],
        payments,
      };
    });
}

function ageLedger(customer: Customer, ledger: CustomerLedgerEntry[], sales: Sale[], asOf: string): OpenBalance[] {
  const open: Array<OpenBalance & { remaining: number }> = [];
  ledger.forEach((entry) => {
    if (entry.debit > 0.009) {
      const sale = sales.find((item) => item.billNumber === entry.referenceNo);
      const dueDate = entry.type === 'OPENING'
        ? (customer.creditDays == null ? null : shiftIsoDate(entry.date, customer.creditDays))
        : sale
          ? saleDueDate(sale, customer)
          : null;
      open.push({
        reference: entry.referenceNo,
        date: entry.date,
        dueDate,
        description: entry.description,
        amount: 0,
        daysOverdue: null,
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
      daysOverdue: row.dueDate ? daysAfter(row.dueDate, asOf) : null,
      saleId: row.saleId,
    }));
}

function ageOpenSales(customer: Customer, sales: Sale[], asOf: string): OpenBalance[] {
  return sales
    .filter((sale) => (sale.balanceDue ?? 0) > 0.009 && salePaymentStatus(sale) !== 'PAID')
    .map((sale) => {
      const dueDate = saleDueDate(sale, customer);
      return {
        reference: sale.billNumber,
        date: sale.date,
        dueDate,
        description: sale.customerName,
        amount: roundMoney(sale.balanceDue),
        daysOverdue: dueDate ? daysAfter(dueDate, asOf) : null,
        saleId: sale.id,
      };
    });
}
