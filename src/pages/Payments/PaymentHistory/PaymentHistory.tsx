'use client';

import { can } from '@/auth/permissions';
import { TRADING_SESSION_DATE } from '@/constants/session';
import { useCollectionsQuery } from '@/hooks/queries/use-collections-query';
import { useCashBookQuery } from '@/hooks/queries/use-expenses-query';
import { useSession } from '@/store/session/session-provider';
import { usePaymentsQuery } from '@/hooks/queries/use-payments-query';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { COLLECTION_CATEGORIES, buildFinanceSnapshot, isVendorPaymentCategory } from '@/utils/collection-ledger';
import { formatClockTime, formatRupee, paymentMethodLabel } from '@/utils/settlement';
import type { Expense, Payment } from '@/types';
import { ChevronDown, Printer, Search } from 'lucide-react';

type LedgerFilter = 'ALL' | 'COLLECTIONS' | 'VENDOR' | 'EXPENSES';

const LEDGER_FILTERS: { id: LedgerFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'COLLECTIONS', label: 'Collections' },
  { id: 'EXPENSES', label: 'Expenses' },
  { id: 'VENDOR', label: 'Vendor Payments' },
];

function isVendorPayment(expense: Expense) {
  return isVendorPaymentCategory({ id: expense.categoryId, name: expense.categoryName });
}

function rupee(amount: number) {
  return `₹${formatRupee(amount)}`;
}

export const PaymentHistory: React.FC = () => {
  const { data: payments = [] } = usePaymentsQuery();
  const { finance, expenses, payments: allocatedPayments, accounts } = useCollectionsQuery();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('ALL');
  const [summaryDate, setSummaryDate] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const router = useRouter();
  const { currentUser } = useSession();
  // Opening and closing balances are the Owner's alone; they come from the server's day-by-day cash book.
  const canSeeBalances = can(currentUser.role, 'viewAccountBalances');
  const { data: cashBook } = useCashBookQuery(summaryDate || TRADING_SESSION_DATE, canSeeBalances);

  const rows = useMemo(() => {
    const collections = payments.map((payment) => ({
      id: `pay-${payment.id}`,
      kind: 'collection' as const,
      date: payment.date,
      createdAt: payment.createdAt,
      method: payment.paymentMethod,
      searchText: [payment.receiptNumber, payment.customerName, payment.referenceNumber, payment.recordedBy].filter(Boolean).join(' ').toLowerCase(),
      payment,
    }));
    const paidOut = expenses.map((expense) => ({
      id: `ex-${expense.id}`,
      kind: isVendorPayment(expense) ? 'vendor' as const : 'expense' as const,
      date: expense.date,
      createdAt: expense.createdAt,
      method: expense.paymentMethod,
      searchText: [expense.categoryName, expense.vendorName, expense.accountName, expense.reference, expense.recordedBy].filter(Boolean).join(' ').toLowerCase(),
      expense,
    }));
    return [...collections, ...paidOut].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [payments, expenses]);

  const filtered = rows.filter((row) => {
    if (ledgerFilter === 'COLLECTIONS' && row.kind !== 'collection') return false;
    if (ledgerFilter === 'VENDOR' && row.kind !== 'vendor') return false;
    if (ledgerFilter === 'EXPENSES' && row.kind === 'collection') return false;
    if (methodFilter !== 'ALL' && row.method !== methodFilter) return false;
    if (fromDate && row.date < fromDate) return false;
    if (toDate && row.date > toDate) return false;
    if (search && !row.searchText.includes(search.toLowerCase())) return false;
    return true;
  });

  const dayFinance = useMemo(() => {
    if (!summaryDate) return finance;
    return buildFinanceSnapshot({
      payments: allocatedPayments.filter((payment) => payment.date === summaryDate),
      expenses: expenses.filter((expense) => expense.date === summaryDate),
      accounts,
      customerOutstanding: finance.customerOutstanding,
    });
  }, [summaryDate, finance, allocatedPayments, expenses, accounts]);

  const applySummaryDate = (next: string) => {
    setSummaryDate(next);
    setFromDate(next);
    setToDate(next);
  };

  const summary = [
    { label: 'Collections', value: dayFinance.grossCollections },
    { label: 'Expenses', value: dayFinance.totalExpenses },
    { label: 'Net Cash Flow', value: dayFinance.netCashFlow },
    { label: 'Customer Outstanding', value: finance.customerOutstanding },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Payment Receipts & Collections
          </h1>
          {canSeeBalances && (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="mt-1 text-sm font-medium text-primary hover:underline">
                  Account Balances
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-96 p-3">
                <p className="px-2 pb-2 text-xs font-medium text-on-surface-variant">
                  Account balances for {cashBook?.date ?? (summaryDate || TRADING_SESSION_DATE)} · opening + in − out = closing
                </p>
                <div className="space-y-1">
                  {(cashBook?.accounts ?? []).map((account) => (
                    <div key={account.id} className="rounded-xl px-2 py-1.5 hover:bg-surface-container-low">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-on-surface">{account.name}</span>
                        <span className="text-sm font-semibold font-display tabular-nums text-on-surface">{rupee(account.closingBalance)}</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant tabular-nums">
                        {account.beforeOpening
                          ? `Not opened yet (opens ${account.openingDate})`
                          : `Opening ${rupee(account.openingBalance)} · In ${rupee(account.received)} · Out ${rupee(account.paidOut)}`}
                      </p>
                    </div>
                  ))}
                  {cashBook && (
                    <div className="flex items-center justify-between gap-4 border-t border-surface-container px-2 pt-2 mt-1">
                      <span className="text-sm font-bold text-on-surface">All accounts</span>
                      <span className="text-sm font-extrabold font-display tabular-nums text-on-surface">{rupee(cashBook.totals.closingBalance)}</span>
                    </div>
                  )}
                  {!cashBook && <p className="px-2 py-1 text-xs text-on-surface-variant">Loading balances…</p>}
                </div>
                <p className="px-2 pt-2 text-[11px] text-on-surface-variant">Pick a date above to see any other day. Each day&apos;s closing carries to the next day.</p>
              </PopoverContent>
            </Popover>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-2xl bg-surface-container-low px-3 py-2.5">
            <span className="text-xs font-semibold text-on-surface-variant">Date</span>
            <input
              type="date"
              aria-label="Balance date"
              value={summaryDate}
              onChange={(event) => applySummaryDate(event.target.value)}
              className="bg-transparent text-sm font-semibold text-on-surface cursor-pointer"
            />
          </label>
          <Button variant="secondary" onClick={() => router.push('/payments/expense')}>
            Record Expense
          </Button>
          <Button variant="primary" onClick={() => router.push('/payments/new')}>
            Record Payment
          </Button>
        </div>
      </div>

      <section aria-label="Financial summary" className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {summary.map((item) => (
          <div key={item.label} className="rounded-2xl bg-surface-container-lowest px-3 py-2.5">
            <p className="text-xs text-on-surface-variant">{item.label}</p>
            <p className="mt-0.5 text-base font-bold font-display text-on-surface tabular-nums">{rupee(item.value)}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl bg-surface-container-low">
        <button
          type="button"
          onClick={() => setBreakdownOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          aria-expanded={breakdownOpen}
        >
          <span className="text-sm font-bold font-display text-on-surface">Collection Breakdown</span>
          <ChevronDown className={`h-4 w-4 text-on-surface-variant transition-transform ${breakdownOpen ? 'rotate-180' : ''}`} />
        </button>
        {breakdownOpen && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 px-4 normal-case tracking-normal">Collection Source</TableHead>
                <TableHead className="h-8 px-3 text-right normal-case tracking-normal">Collected</TableHead>
                <TableHead className="h-8 px-3 text-right normal-case tracking-normal">Expenses</TableHead>
                <TableHead className="h-8 px-3 text-right normal-case tracking-normal">Net</TableHead>
                <TableHead className="h-8 w-28 px-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {COLLECTION_CATEGORIES.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="px-4 py-2 text-sm text-on-surface">{category.shortLabel}</TableCell>
                  <TableCell className="px-3 py-2 text-right text-sm tabular-nums text-on-surface">{rupee(dayFinance.collectionsByCategory[category.id])}</TableCell>
                  <TableCell className="px-3 py-2 text-right text-sm tabular-nums text-on-surface-variant">{rupee(dayFinance.expensesByTracking[category.id] ?? 0)}</TableCell>
                  <TableCell className="px-3 py-2 text-right text-sm font-semibold tabular-nums text-on-surface">{rupee(dayFinance.netCategoryBalance[category.id])}</TableCell>
                  <TableCell className="px-3 py-1.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/payments/collections/${category.id}`)}>
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
          <div className="flex gap-1 overflow-x-auto">
            {LEDGER_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setLedgerFilter(filter.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-medium whitespace-nowrap transition-colors ${
                  ledgerFilter === filter.id
                    ? 'bg-primary text-white'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search receipt, party, or expense..."
                icon={<Search className="w-4 h-4" />}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value)}
              className="academic-input py-3 px-4 text-xs font-semibold rounded-2xl w-full sm:w-44 cursor-pointer"
              aria-label="Payment method"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
              <option value="CHEQUE">Cheque</option>
            </select>
            <div className="w-full sm:w-36">
              <Input
                type="date"
                label="From"
                aria-label="From date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>
            <div className="w-full sm:w-36">
              <Input
                type="date"
                label="To"
                aria-label="To date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
          </div>

          <Card variant="lowest" padding="none" className="overflow-hidden">
            <div className="divide-y divide-surface-container-low">
              {filtered.length === 0 && (
                <p className="p-5 text-sm text-on-surface-variant">No transactions match these filters.</p>
              )}
              {filtered.map((row) => (
                row.kind === 'collection'
                  ? <ReceiptRow key={row.id} payment={row.payment} onOpen={() => router.push(`/payments/receipt/${row.payment.id}`)} />
                  : <ExpenseRow key={row.id} expense={row.expense} onReceipt={row.expense.vendorId ? () => router.push(`/payments/vendor-receipt/${row.expense.id}`) : undefined} />
              ))}
            </div>
          </Card>
      </section>
    </div>
  );
}

function ReceiptRow({ payment, onOpen }: { payment: Payment; onOpen: () => void }) {
  return (
    <div className="p-5 sm:px-6 hover:bg-surface-container-low/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div onClick={onOpen} className="flex-1 cursor-pointer">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-success font-display">{payment.receiptNumber}</span>
          <span className="text-xs text-on-surface-variant">{payment.date} at {payment.time}</span>
          <Chip label={payment.paymentMethod} size="sm" variant="secondary" />
        </div>
        <h3 className="text-base font-bold font-display text-on-surface mt-1">{payment.customerName}</h3>
        <div className="text-xs text-on-surface-variant font-medium mt-0.5">
          {payment.referenceNumber && <span>Ref: {payment.referenceNumber} · </span>}
          <span>Recorded by {payment.recordedBy}</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <span className="text-[10px] text-on-surface-variant uppercase font-bold">Collected</span>
          <div className="text-base font-extrabold font-display text-success tabular-nums">+{rupee(payment.amount)}</div>
          <span className="text-[10px] text-on-surface-variant">New Bal: {rupee(payment.newOutstanding)}</span>
        </div>
        <Button variant="secondary" size="sm" icon={<Printer className="w-3.5 h-3.5" />} onClick={onOpen}>
          Receipt
        </Button>
      </div>
    </div>
  );
}

function ExpenseRow({ expense, onReceipt }: { expense: Expense; onReceipt?: () => void }) {
  return (
    <div className="p-5 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          {expense.receiptNumber && <span className="text-xs font-bold text-tertiary font-display">{expense.receiptNumber}</span>}
          <span className="text-xs font-bold font-display text-on-surface">{expense.categoryName}{expense.vendorName ? ` · ${expense.vendorName}` : ''}</span>
          <span className="text-xs text-on-surface-variant">{expense.date}{expense.createdAt ? ` at ${formatClockTime(expense.createdAt)}` : ''}</span>
          <Chip label={paymentMethodLabel(expense.paymentMethod)} size="sm" variant="secondary" />
        </div>
        <p className="text-xs text-on-surface-variant font-medium mt-1">
          Paid from {expense.accountName}
          {expense.reference ? ` · ${expense.reference}` : ''}
          {expense.nextPaymentDate ? ` · Next due ${expense.nextPaymentDate}` : ''}
          {expense.recordedBy ? ` · ${expense.recordedBy}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-base font-extrabold font-display text-danger tabular-nums">−{rupee(expense.amount)}</div>
        {onReceipt && (
          <Button variant="secondary" size="sm" icon={<Printer className="w-3.5 h-3.5" />} onClick={onReceipt}>
            Receipt
          </Button>
        )}
      </div>
    </div>
  );
}
