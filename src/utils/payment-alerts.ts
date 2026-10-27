import type { Expense, Sale, Vendor } from '@/types';

export interface DueAlert {
  id: string;
  name: string;
  date: string;
  daysUntil: number;
  amount: number;
  href: string;
}

function isIsoDate(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function daysUntilDate(date: string, asOf: string): number | null {
  if (!isIsoDate(date) || !isIsoDate(asOf)) return null;
  const start = Date.UTC(Number(asOf.slice(0, 4)), Number(asOf.slice(5, 7)) - 1, Number(asOf.slice(8, 10)));
  const end = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
  return Math.round((end - start) / 86400000);
}

/** Due today, within the alert window, or already overdue. */
export function isDueSoon(date: string | null | undefined, asOf: string, alertDays: number): boolean {
  const days = date ? daysUntilDate(date, asOf) : null;
  return days !== null && days <= alertDays;
}

/** Latest vendor payment that named a next payment date, per vendor. */
export function vendorPaymentAlerts(vendors: Vendor[], expenses: Expense[], asOf: string, alertDays: number): DueAlert[] {
  const latest = new Map<string, Expense>();
  expenses
    .filter((expense) => expense.vendorId && isIsoDate(expense.nextPaymentDate))
    .sort((left, right) => right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt))
    .forEach((expense) => {
      if (expense.vendorId && !latest.has(expense.vendorId)) latest.set(expense.vendorId, expense);
    });

  return vendors.flatMap((vendor) => {
    const expense = latest.get(vendor.id);
    const date = expense?.nextPaymentDate;
    if (!expense || !isDueSoon(date, asOf, alertDays)) return [];
    return [{
      id: vendor.id,
      name: vendor.name,
      date: date!,
      daysUntil: daysUntilDate(date!, asOf) ?? 0,
      amount: vendor.payableAmount,
      href: `/vendors/${vendor.id}`,
    }];
  }).sort((left, right) => left.daysUntil - right.daysUntil || right.amount - left.amount);
}

/** Customers with an unpaid bill whose credit due date is close or overdue. */
export function customerCreditAlerts(sales: Sale[], asOf: string, alertDays: number): DueAlert[] {
  const byCustomer = new Map<string, DueAlert>();
  sales
    .filter((sale) => sale.status !== 'CANCELLED' && (sale.balanceDue ?? 0) > 0.009 && isDueSoon(sale.dueDate, asOf, alertDays))
    .forEach((sale) => {
      const daysUntil = daysUntilDate(sale.dueDate!, asOf) ?? 0;
      const existing = byCustomer.get(sale.customerId);
      if (existing && existing.daysUntil <= daysUntil) {
        existing.amount += sale.balanceDue ?? 0;
        return;
      }
      byCustomer.set(sale.customerId, {
        id: sale.customerId,
        name: sale.customerName,
        date: sale.dueDate!,
        daysUntil,
        amount: (existing?.amount ?? 0) + (sale.balanceDue ?? 0),
        href: `/customers/${sale.customerId}`,
      });
    });
  return [...byCustomer.values()].sort((left, right) => left.daysUntil - right.daysUntil || right.amount - left.amount);
}
