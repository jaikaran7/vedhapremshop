'use client';

import { can } from '@/auth/permissions';
import { TRADING_SESSION_DATE } from '@/constants/session';
import { useCollectionsQuery } from '@/hooks/queries/use-collections-query';
import { useCashBookQuery, useExpensesRangeQuery } from '@/hooks/queries/use-expenses-query';
import { useSession } from '@/store/session/session-provider';
import { usePaymentsRangeQuery } from '@/hooks/queries/use-payments-query';
import { useSalesSummaryQuery } from '@/hooks/queries/use-sales-query';
import { useCustomersQuery } from '@/hooks/queries/use-customers-query';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { COLLECTION_CATEGORIES, buildFinanceSnapshot, isVendorPaymentCategory } from '@/utils/collection-ledger';
import { formatClockTime, formatRupee, paymentMethodLabel } from '@/utils/settlement';
import { dayMonthYear } from '@/components/print/thermal';
import { useCompanyQuery } from '@/hooks/queries/use-directory-query';
import { printAccountsReport, type AccountsPrintRow } from '@/pages/Payments/PaymentHistory/print-accounts';
import type { Expense, Payment } from '@/types';
import { Printer, Search } from 'lucide-react';
import { AccountsOverview } from '@/pages/Payments/PaymentHistory/AccountsOverview';

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

function shiftDays(iso: string, days: number): string {
  const day = new Date(`${iso}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

export const PaymentHistory: React.FC = () => {
  const today = TRADING_SESSION_DATE;
  // Opens on today. "To" is optional: left empty, the page shows the single day in "From".
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState('');
  const lastDate = toDate || fromDate;
  const { data: payments = [] } = usePaymentsRangeQuery(fromDate, lastDate);
  const { data: expenses = [] } = useExpensesRangeQuery(fromDate, lastDate);
  const { data: customers = [] } = useCustomersQuery();
  const { data: salesSummary } = useSalesSummaryQuery({ from: fromDate, to: lastDate }, true);
  const { data: company } = useCompanyQuery();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('ALL');
  const [view, setView] = useState<'overview' | 'transactions'>('overview');
  const [pickDates, setPickDates] = useState(false);
  const router = useRouter();
  const { currentUser } = useSession();
  // Opening and closing balances are the Owner's alone; they come from the server's day-by-day cash book.
  const canSeeBalances = can(currentUser.role, 'viewAccountBalances');
  const { data: cashBook } = useCashBookQuery(lastDate, canSeeBalances);

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

  // The dates were applied by the server; these narrow the loaded days further.
  const filtered = rows.filter((row) => {
    if (ledgerFilter === 'COLLECTIONS' && row.kind !== 'collection') return false;
    if (ledgerFilter === 'VENDOR' && row.kind !== 'vendor') return false;
    if (ledgerFilter === 'EXPENSES' && row.kind === 'collection') return false;
    if (methodFilter !== 'ALL' && row.method !== methodFilter) return false;
    if (search && !row.searchText.includes(search.toLowerCase())) return false;
    return true;
  });

  const customerOutstanding = customers.reduce((sum, customer) => sum + customer.outstandingAmount, 0);
  const periodText = fromDate === lastDate ? dayMonthYear(fromDate) : `${dayMonthYear(fromDate)} to ${dayMonthYear(lastDate)}`;
  // The bar chart draws the chosen days, or the last 7 days when one day is chosen. A long range shows its last 31 days.
  const trendFrom = lastDate > fromDate ? (fromDate < shiftDays(lastDate, -30) ? shiftDays(lastDate, -30) : fromDate) : shiftDays(lastDate, -6);
  const { data: trendPayments = [] } = usePaymentsRangeQuery(trendFrom, lastDate);
  const { data: trendExpenses = [] } = useExpensesRangeQuery(trendFrom, lastDate);

  const changeFrom = (next: string) => {
    if (!next) return;
    setFromDate(next);
    if (toDate && toDate < next) setToDate(next);
  };
  const quickRanges = [
    { label: 'Today', from: today, to: '' },
    { label: 'Yesterday', from: shiftDays(today, -1), to: '' },
    { label: 'Last 7 days', from: shiftDays(today, -6), to: today },
    { label: 'This month', from: `${today.slice(0, 8)}01`, to: today },
  ];
  const activeQuick = quickRanges.find((range) => fromDate === range.from && toDate === range.to);

  /** Prints every entry the filters show, in the order on screen. */
  const printList = () => {
    const printRows: AccountsPrintRow[] = filtered.map((row) => {
      if (row.kind === 'collection') {
        const { payment } = row;
        return {
          date: payment.date,
          reference: payment.receiptNumber,
          particulars: payment.customerName,
          detail: payment.referenceNumber ? `Ref: ${payment.referenceNumber}` : '',
          method: paymentMethodLabel(payment.paymentMethod),
          received: payment.amount,
          paidOut: 0,
        };
      }
      const { expense } = row;
      return {
        date: expense.date,
        reference: expense.receiptNumber ?? '',
        particulars: `${expense.categoryName}${expense.vendorName ? ` · ${expense.vendorName}` : ''}`,
        detail: [expense.accountName ? `Paid from ${expense.accountName}` : '', expense.reference].filter(Boolean).join(' · '),
        method: paymentMethodLabel(expense.paymentMethod),
        received: 0,
        paidOut: expense.amount,
      };
    });
    const notes = [
      ledgerFilter === 'ALL' ? '' : LEDGER_FILTERS.find((filter) => filter.id === ledgerFilter)?.label,
      methodFilter === 'ALL' ? '' : paymentMethodLabel(methodFilter as Payment['paymentMethod']),
      search.trim() ? `search "${search.trim()}"` : '',
    ].filter(Boolean);
    printAccountsReport({ rows: printRows, shopName: company.shopName, filterNote: notes.join(' · '), from: fromDate, to: lastDate, printedAt: new Date() });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Accounts
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">Money received, money paid out, and what you hold in each account.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={<Printer className="w-4 h-4" />} onClick={printList}>
            Print
          </Button>
          <Button variant="secondary" onClick={() => router.push('/payments/expense')}>
            Record Expense
          </Button>
          <Button variant="primary" onClick={() => router.push('/payments/new')}>
            Record Payment
          </Button>
        </div>
      </div>

      {/* Two simple views */}
      <div className="inline-flex rounded-2xl bg-surface-container-low p-1" role="tablist" aria-label="Accounts view">
        {([['overview', 'Overview'], ['transactions', 'All Transactions']] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold font-display transition-colors cursor-pointer ${view === id ? 'bg-surface-container-lowest text-primary shadow-ambient' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dates: opens on today; the server sends only these days */}
      <section aria-label="Dates" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {quickRanges.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => { setFromDate(range.from); setToDate(range.to); setPickDates(false); }}
              className={`min-h-[40px] px-4 rounded-full text-xs font-bold font-display transition-colors cursor-pointer ${
                activeQuick?.label === range.label && !pickDates ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              {range.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPickDates(true)}
            className={`min-h-[40px] px-4 rounded-full text-xs font-bold font-display transition-colors cursor-pointer ${
              pickDates || !activeQuick ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
            }`}
          >
            Pick dates
          </button>
          <span className="text-xs text-on-surface-variant font-medium ml-1">Showing <span className="font-bold text-on-surface">{periodText}</span></span>
        </div>
        {(pickDates || !activeQuick) && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-44">
              <Input type="date" label="From" aria-label="From date" value={fromDate} max={today} onChange={(event) => changeFrom(event.target.value)} />
            </div>
            <div className="w-44">
              <Input type="date" label="To" aria-label="To date" value={toDate} min={fromDate} onChange={(event) => setToDate(event.target.value)} />
            </div>
            <p className="pb-3 text-xs text-on-surface-variant">Leave “To” empty to see just the “From” day.</p>
          </div>
        )}
      </section>

      {view === 'overview' ? (
        <AccountsOverview
          payments={payments}
          expenses={expenses}
          trendPayments={trendPayments}
          trendExpenses={trendExpenses}
          trendFrom={trendFrom}
          lastDate={lastDate}
          today={today}
          periodText={periodText}
          cashBook={cashBook}
          showBalances={canSeeBalances}
          customerOutstanding={customerOutstanding}
          sales={salesSummary}
          onSeeTransactions={() => setView('transactions')}
          onOpenOutstanding={() => router.push('/reports?report=outstanding')}
          breakdown={<CollectionBreakdown from={fromDate} to={lastDate} onOpenCategory={(id) => router.push(`/payments/collections/${id}`)} />}
        />
      ) : (
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
              className="academic-input py-3 px-4 text-xs font-semibold rounded-2xl w-full sm:w-52 cursor-pointer"
              aria-label="Payment method"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <Card variant="lowest" padding="none" className="overflow-hidden">
            <div className="divide-y divide-surface-container-low">
              {filtered.length === 0 && (
                <p className="p-5 text-sm text-on-surface-variant">No transactions for {periodText}{search || methodFilter !== 'ALL' || ledgerFilter !== 'ALL' ? ' match these filters' : ''}.</p>
              )}
              {filtered.map((row) => (
                row.kind === 'collection'
                  ? <ReceiptRow key={row.id} payment={row.payment} onOpen={() => router.push(`/payments/receipt/${row.payment.id}`)} />
                  : <ExpenseRow key={row.id} expense={row.expense} onReceipt={row.expense.vendorId ? () => router.push(`/payments/vendor-receipt/${row.expense.id}`) : undefined} />
              ))}
            </div>
          </Card>
      </section>
      )}
    </div>
  );
}

/**
 * Where the collected money came from. The split of a receipt is worked out from every earlier bill and receipt,
 * so this loads the full history, and only when the section is opened.
 */
function CollectionBreakdown({ from, to, onOpenCategory }: { from: string; to: string; onOpenCategory: (id: string) => void }) {
  const { finance: allFinance, payments, expenses, accounts } = useCollectionsQuery();
  const finance = useMemo(() => buildFinanceSnapshot({
    payments: payments.filter((payment) => payment.date >= from && payment.date <= to),
    expenses: expenses.filter((expense) => expense.date >= from && expense.date <= to),
    accounts,
    customerOutstanding: allFinance.customerOutstanding,
  }), [accounts, allFinance.customerOutstanding, expenses, from, payments, to]);
  return (
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
            <TableCell className="px-3 py-2 text-right text-sm tabular-nums text-on-surface">{rupee(finance.collectionsByCategory[category.id])}</TableCell>
            <TableCell className="px-3 py-2 text-right text-sm tabular-nums text-on-surface-variant">{rupee(finance.expensesByTracking[category.id] ?? 0)}</TableCell>
            <TableCell className="px-3 py-2 text-right text-sm font-semibold tabular-nums text-on-surface">{rupee(finance.netCategoryBalance[category.id])}</TableCell>
            <TableCell className="px-3 py-1.5 text-right">
              <Button variant="ghost" size="sm" onClick={() => onOpenCategory(category.id)}>
                View Details
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
