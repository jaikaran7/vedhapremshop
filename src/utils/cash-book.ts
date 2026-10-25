import type { CashAccount, CashBook, CashBookEntry, Expense, Payment } from '@/types';
import { roundMoney } from '@/utils/settlement';

// Same rules as the backend's cash book (modules/expenses/cash-book.service.ts); mock mode uses this, the API computes it in SQL.

type Kind = CashAccount['kind'];

export function accountKindFor(method: string): Kind {
  if (method === 'UPI' || method === 'QR') return 'UPI';
  if (method === 'BANK_TRANSFER' || method === 'CHEQUE' || method === 'CARD') return 'BANK';
  return 'CASH';
}

/** The first account of the kind, else the first bank, else the first cash account. */
export function routeAccount(kind: Kind, accounts: Pick<CashAccount, 'id' | 'kind'>[]): string | null {
  return accounts.find((a) => a.kind === kind)?.id ?? accounts.find((a) => a.kind === 'BANK')?.id ?? accounts.find((a) => a.kind === 'CASH')?.id ?? null;
}

/**
 * One account on one day: opening + received − paid out = closing, and closing is the next day's opening. Only days from the
 * account's opening date count, so an entry added later for an earlier day moves every later balance by itself.
 */
export function buildCashBook(input: { accounts: CashAccount[]; payments: Payment[]; expenses: Expense[]; date: string; timezoneTime?: (iso: string) => string }): CashBook {
  const { accounts, payments, expenses, date } = input;
  const time = input.timezoneTime ?? ((iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  const flows = new Map<string, Map<string, { in: number; out: number }>>(accounts.map((a) => [a.id, new Map()]));
  const flow = (accountId: string | null, day: string) => {
    const byDay = accountId ? flows.get(accountId) : undefined;
    if (!byDay) return undefined;
    const entry = byDay.get(day) ?? { in: 0, out: 0 };
    byDay.set(day, entry);
    return entry;
  };
  for (const p of payments) {
    if (p.date > date) continue;
    const f = flow(routeAccount(accountKindFor(p.paymentMethod), accounts), p.date);
    if (f) f.in = roundMoney(f.in + p.amount);
  }
  for (const e of expenses) {
    if (e.date > date) continue;
    const f = flow(e.accountId, e.date);
    if (f) f.out = roundMoney(f.out + e.amount);
  }
  const rows = accounts.map((a) => {
    const openingDate = a.openingDate ?? '0000-00-00';
    const byDay = flows.get(a.id)!;
    if (date < openingDate) return { id: a.id, name: a.name, kind: a.kind, openingDate, beforeOpening: true, openingBalance: 0, received: 0, paidOut: 0, closingBalance: 0 };
    let opening = a.openingBalance ?? 0;
    for (const [day, f] of byDay) if (day >= openingDate && day < date) opening = roundMoney(opening + f.in - f.out);
    const today = byDay.get(date) ?? { in: 0, out: 0 };
    return { id: a.id, name: a.name, kind: a.kind, openingDate, beforeOpening: false, openingBalance: opening, received: today.in, paidOut: today.out, closingBalance: roundMoney(opening + today.in - today.out) };
  });
  const sum = (pick: (r: (typeof rows)[number]) => number) => roundMoney(rows.reduce((t, r) => t + pick(r), 0));
  const entries: CashBookEntry[] = [
    ...payments.filter((p) => p.date === date).map((p) => ({
      id: p.id, type: 'Collection' as const, time: time(p.createdAt), party: p.customerName, method: p.paymentMethod, reference: p.receiptNumber, amount: p.amount, createdAt: p.createdAt,
    })),
    ...expenses.filter((e) => e.date === date).map((e) => ({
      id: e.id, type: (e.vendorId ? 'Vendor payment' : 'Expense') as CashBookEntry['type'], time: time(e.createdAt), party: e.vendorName ?? e.categoryName,
      method: e.paymentMethod, reference: e.reference ?? e.accountName, amount: -e.amount, createdAt: e.createdAt,
    })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    date, accounts: rows,
    totals: { openingBalance: sum((r) => r.openingBalance), received: sum((r) => r.received), paidOut: sum((r) => r.paidOut), closingBalance: sum((r) => r.closingBalance) },
    entries,
  };
}

export function buildDailyCollections(payments: Payment[], date: string) {
  const byMethod = new Map<string, { amount: number; receipts: number }>();
  for (const p of payments) {
    if (p.date !== date) continue;
    const row = byMethod.get(p.paymentMethod) ?? { amount: 0, receipts: 0 };
    byMethod.set(p.paymentMethod, { amount: roundMoney(row.amount + p.amount), receipts: row.receipts + 1 });
  }
  const rows = [...byMethod.entries()].map(([method, v]) => ({ method: method as Payment['paymentMethod'], ...v }));
  return { date, collected: roundMoney(rows.reduce((t, r) => t + r.amount, 0)), byMethod: rows };
}
