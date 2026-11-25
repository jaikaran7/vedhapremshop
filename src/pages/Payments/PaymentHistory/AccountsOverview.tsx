'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Banknote, ChevronDown, Landmark, ReceiptText, Scale, Smartphone, Users, Wallet } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { dayMonthYear } from '@/components/print/thermal';
import { useTheme } from '@/store/preferences/theme';
import { formatRupee, paymentMethodLabel } from '@/utils/settlement';
import type { CashBook, Expense, Payment } from '@/types';
import type { SalesSummary } from '@/api/sales.api';

const rupee = (amount: number) => `₹${formatRupee(Math.abs(amount))}`;

function shiftDays(iso: string, days: number): string {
  const day = new Date(`${iso}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

const ACCOUNT_ICONS = { CASH: Banknote, UPI: Smartphone, BANK: Landmark } as const;

interface Props {
  /** What was received and paid out in the chosen dates. */
  payments: Payment[];
  expenses: Expense[];
  /** The same for the days drawn in the bar chart. */
  trendPayments: Payment[];
  trendExpenses: Expense[];
  trendFrom: string;
  lastDate: string;
  today: string;
  periodText: string;
  /** Owner only: each account's balance at the end of the last chosen day. */
  cashBook?: CashBook;
  showBalances: boolean;
  customerOutstanding: number;
  /** Bills made in the chosen dates, with how much of them is still unpaid. */
  sales?: SalesSummary;
  onSeeTransactions: () => void;
  onOpenOutstanding: () => void;
  breakdown: React.ReactNode;
}

/**
 * The Accounts overview, kept to four plain questions: what came in, what went out, what is in each account now,
 * and how the days compare. Each answer is one card with big numbers.
 */
export const AccountsOverview: React.FC<Props> = ({
  payments, expenses, trendPayments, trendExpenses, trendFrom, lastDate, today, periodText,
  cashBook, showBalances, customerOutstanding, sales, onSeeTransactions, onOpenOutstanding, breakdown,
}) => {
  const { theme } = useTheme();
  const colors = theme === 'dark'
    ? { in: '#6fd08a', out: '#f08a84', axis: '#9a9ea0', tooltipBg: '#2a2826', tooltipText: '#e8e3df' }
    : { in: '#1e7e34', out: '#c62828', axis: '#747779', tooltipBg: '#ffffff', tooltipText: '#1b1c1c' };
  const [showBreakdown, setShowBreakdown] = useState(false);

  const received = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paidOut = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const net = received - paidOut;

  const days = useMemo(() => {
    const list: { day: string; received: number; paidOut: number }[] = [];
    for (let date = trendFrom; date <= lastDate && list.length < 62; date = shiftDays(date, 1)) {
      list.push({
        day: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
        received: trendPayments.filter((payment) => payment.date === date).reduce((sum, payment) => sum + payment.amount, 0),
        paidOut: trendExpenses.filter((expense) => expense.date === date).reduce((sum, expense) => sum + expense.amount, 0),
      });
    }
    return list;
  }, [lastDate, trendExpenses, trendFrom, trendPayments]);

  /** The few biggest amounts under a total, e.g. Cash ₹2,000 · UPI ₹798. */
  const received_by = useMemo(() => {
    const totals = new Map<string, number>();
    for (const payment of payments) totals.set(payment.paymentMethod, (totals.get(payment.paymentMethod) ?? 0) + payment.amount);
    return [...totals.entries()].filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).map(([method, value]) => ({ name: paymentMethodLabel(method), value }));
  }, [payments]);
  const paid_for = useMemo(() => {
    const totals = new Map<string, number>();
    for (const expense of expenses) totals.set(expense.categoryName, (totals.get(expense.categoryName) ?? 0) + expense.amount);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const recent = [
    ...payments.map((payment) => ({ id: `p-${payment.id}`, date: payment.date, createdAt: payment.createdAt, title: payment.customerName, note: payment.receiptNumber, amount: payment.amount })),
    ...expenses.map((expense) => ({ id: `e-${expense.id}`, date: expense.date, createdAt: expense.createdAt, title: `${expense.categoryName}${expense.vendorName ? ` · ${expense.vendorName}` : ''}`, note: expense.receiptNumber ?? '', amount: -expense.amount })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const tooltip = { backgroundColor: colors.tooltipBg, color: colors.tooltipText, borderRadius: '1rem', border: 'none', boxShadow: '0px 12px 32px rgba(27,28,28,0.1)' };
  const isToday = lastDate === today;
  const sold = sales?.amount ?? 0;
  const credit = Math.min(sold, sales?.creditAmount ?? 0);
  const paidAtSale = sold - credit;
  const creditShare = sold > 0 ? Math.round((credit / sold) * 100) : 0;
  const chartTitle = periodText.includes(' to ') ? 'Day by day' : 'The last 7 days';

  return (
    <div className="space-y-6">
      {/* 1. Sales: how much was paid when sold and how much went on credit, and what customers owe in all */}
      <section aria-label="Sales and credit" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card variant="lowest" className="lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold font-display text-on-surface flex items-center gap-2"><ReceiptText className="w-5 h-5 text-primary" />Sales · {periodText}</h2>
            <p className="text-xs text-on-surface-variant">{sales ? `${sales.bills} ${sales.bills === 1 ? 'bill' : 'bills'}` : 'Loading…'}</p>
          </div>
          <p className="mt-2 text-4xl font-extrabold font-display text-on-surface tabular-nums">{rupee(sold)}</p>
          <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-surface-container-high" role="img" aria-label={`${rupee(paidAtSale)} paid when sold, ${rupee(credit)} on credit`}>
            <div className="h-full bg-success" style={{ width: `${sold > 0 ? (paidAtSale / sold) * 100 : 0}%` }} />
            <div className="h-full bg-tertiary" style={{ width: `${sold > 0 ? (credit / sold) * 100 : 0}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-on-surface"><span className="w-2.5 h-2.5 rounded-full bg-success" />Paid when sold</p>
              <p className="text-2xl font-extrabold font-display text-success tabular-nums">{rupee(paidAtSale)}</p>
              <p className="text-xs text-on-surface-variant">Cash, UPI and bank at the time of the sale</p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-on-surface"><span className="w-2.5 h-2.5 rounded-full bg-tertiary" />On credit</p>
              <p className="text-2xl font-extrabold font-display text-tertiary tabular-nums">{rupee(credit)}</p>
              <p className="text-xs text-on-surface-variant">
                {sales?.creditBills ? `${sales.creditBills} ${sales.creditBills === 1 ? 'bill' : 'bills'} · ${creditShare}% of sales, still to collect` : 'Nothing on credit'}
              </p>
            </div>
          </div>
        </Card>

        <button type="button" onClick={onOpenOutstanding} className="text-left rounded-3xl bg-surface-container-lowest ambient-shadow px-5 py-5 hover:bg-surface-container-low transition-colors cursor-pointer flex flex-col justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-on-surface"><Users className="w-4 h-4 text-tertiary" />Customers owe you</p>
            <p className="mt-1 text-3xl font-extrabold font-display text-tertiary tabular-nums">{rupee(customerOutstanding)}</p>
          </div>
          <p className="mt-3 text-xs text-on-surface-variant">All credit pending today, from every date. Tap to see who owes.</p>
        </button>
      </section>

      {/* 2. In, out and what is left, for the chosen dates */}
      <section aria-label="Money in and out" className="space-y-3">
        <h2 className="text-lg font-bold font-display text-on-surface">{periodText}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-success/10 px-5 py-4">
            <p className="flex items-center gap-2 text-sm font-bold text-success"><ArrowDownLeft className="w-4 h-4" />Received</p>
            <p className="mt-1 text-3xl font-extrabold font-display text-success tabular-nums">{rupee(received)}</p>
            <p className="mt-2 text-xs text-on-surface-variant">
              {received_by.length === 0 ? 'Nothing received' : received_by.map((row) => `${row.name} ${rupee(row.value)}`).join(' · ')}
            </p>
          </div>
          <div className="rounded-2xl bg-danger/10 px-5 py-4">
            <p className="flex items-center gap-2 text-sm font-bold text-danger"><ArrowUpRight className="w-4 h-4" />Paid out</p>
            <p className="mt-1 text-3xl font-extrabold font-display text-danger tabular-nums">{rupee(paidOut)}</p>
            <p className="mt-2 text-xs text-on-surface-variant">
              {paid_for.length === 0 ? 'Nothing paid out' : paid_for.map((row) => `${row.name} ${rupee(row.value)}`).join(' · ')}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-container-lowest ambient-shadow px-5 py-4">
            <p className="flex items-center gap-2 text-sm font-bold text-on-surface"><Scale className="w-4 h-4 text-primary" />{net >= 0 ? 'Left' : 'Short by'}</p>
            <p className={`mt-1 text-3xl font-extrabold font-display tabular-nums ${net >= 0 ? 'text-on-surface' : 'text-danger'}`}>{rupee(net)}</p>
            <p className="mt-2 text-xs text-on-surface-variant">Received − Paid out</p>
          </div>
        </div>
      </section>

      {/* 3. What each account holds, beside the graph */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {showBalances && (
        <section aria-label="Money in your accounts">
          <Card variant="lowest" className="h-full">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold font-display text-on-surface flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" />Money in your accounts</h2>
              <p className="text-xs text-on-surface-variant">{isToday ? 'Now' : `At the end of ${dayMonthYear(lastDate)}`}</p>
            </div>
            {!cashBook ? (
              <p className="mt-3 text-sm text-on-surface-variant">Loading…</p>
            ) : (
              <ul className="mt-3 divide-y divide-surface-container-low">
                {cashBook.accounts.map((account) => {
                  const Icon = ACCOUNT_ICONS[account.kind] ?? Wallet;
                  return (
                    <li key={account.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="flex items-center gap-3 text-base font-semibold text-on-surface"><Icon className="w-5 h-5 text-primary" />{account.name}</span>
                      <span className="text-xl font-extrabold font-display text-on-surface tabular-nums">{rupee(account.closingBalance)}</span>
                    </li>
                  );
                })}
                <li className="flex items-center justify-between gap-3 pt-3">
                  <span className="text-base font-bold text-primary">Total</span>
                  <span className="text-2xl font-extrabold font-display text-primary tabular-nums">{rupee(cashBook.totals.closingBalance)}</span>
                </li>
              </ul>
            )}
          </Card>
        </section>
      )}

      <Card variant="lowest" aria-label="Graph" className={showBalances ? 'lg:col-span-2' : 'lg:col-span-3'}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold font-display text-on-surface">{chartTitle}</h2>
          <p className="text-xs text-on-surface-variant">
            <span className="inline-block w-2.5 h-2.5 rounded-full align-middle mr-1" style={{ background: colors.in }} />Received
            <span className="inline-block w-2.5 h-2.5 rounded-full align-middle ml-3 mr-1" style={{ background: colors.out }} />Paid out
          </p>
        </div>
        <div className="h-64 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <XAxis dataKey="day" stroke={colors.axis} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={colors.axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => (value >= 1000 ? `₹${Math.round(value / 1000)}k` : `₹${value}`)} />
              <Tooltip cursor={{ fill: 'rgba(120,120,120,0.08)' }} contentStyle={tooltip} formatter={(value: number, name: string) => [rupee(value), name === 'received' ? 'Received' : 'Paid out']} />
              <Bar dataKey="received" fill={colors.in} radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="paidOut" fill={colors.out} radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      </div>

      {/* 4. The latest entries */}
      <Card variant="lowest">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold font-display text-on-surface">Latest entries</h2>
          <Button variant="ghost" size="sm" onClick={onSeeTransactions}>See all</Button>
        </div>
        {recent.length === 0 ? (
          <p className="py-4 text-center text-sm text-on-surface-variant">Nothing recorded in these dates.</p>
        ) : (
          <ul className="divide-y divide-surface-container-low">
            {recent.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{entry.title}</p>
                  <p className="text-[11px] text-on-surface-variant">{dayMonthYear(entry.date)}{entry.note ? ` · ${entry.note}` : ''}</p>
                </div>
                <span className={`text-sm font-extrabold tabular-nums ${entry.amount >= 0 ? 'text-success' : 'text-danger'}`}>{entry.amount >= 0 ? '+' : '−'}{rupee(entry.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 5. Detail for those who want it */}
      <section className="rounded-2xl bg-surface-container-low">
        <button type="button" onClick={() => setShowBreakdown((open) => !open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" aria-expanded={showBreakdown}>
          <span className="text-sm font-bold font-display text-on-surface">More detail: collections by bill part</span>
          <ChevronDown className={`h-4 w-4 text-on-surface-variant transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
        </button>
        {showBreakdown && breakdown}
      </section>
    </div>
  );
};
