'use client';

import { TRADING_SESSION_DATE } from '@/constants/session';
import { useSalesPageQuery, useSalesSummaryQuery } from '@/hooks/queries/use-sales-query';
import { useCompanyQuery, useProductsQuery } from '@/hooks/queries/use-directory-query';
import { useToast } from '@/components/ui/Toast';
import { listSalesPage } from '@/api/sales.api';
import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { gradeOnLots, gradesWithBags } from '@/utils/lot-mark';
import { paymentMethodLabel } from '@/utils/settlement';
import { printSalesReport } from '@/pages/Sales/SalesList/print-sales';
import type { SalePaymentType } from '@/types';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import {
  PlusCircle, Search, Printer,
  ChevronRight, Scale, X
} from 'lucide-react';

const PAGE_SIZE = 25;
/** The most bills one printout holds; the server's largest page. */
const PRINT_LIMIT = 5000;

type Range = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const RANGES: { id: Range; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
  { id: 'custom', label: 'Pick dates' },
];

const PAYMENT_OPTIONS: { value: SalePaymentType | ''; label: string }[] = [
  { value: '', label: 'All payment types' },
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CREDIT', label: 'Credit (nothing paid)' },
  { value: 'PARTIAL', label: 'Part paid' },
  { value: 'SPLIT', label: 'Paid in more than one way' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'QR', label: 'QR' },
  { value: 'CARD', label: 'Card' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

function shiftDays(iso: string, days: number): string {
  const day = new Date(`${iso}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

/** The first and last bill date a quick choice stands for. */
function rangeDates(range: Exclude<Range, 'custom'>, today: string): { from: string; to: string } {
  if (range === 'yesterday') return { from: shiftDays(today, -1), to: shiftDays(today, -1) };
  if (range === 'week') return { from: shiftDays(today, -6), to: today };
  if (range === 'month') return { from: `${today.slice(0, 8)}01`, to: today };
  return { from: today, to: today };
}

function bagsLabel(count: number): string {
  return `${count} ${count === 1 ? 'bag' : 'bags'}`;
}

export const SalesList: React.FC = () => {
  const today = TRADING_SESSION_DATE;
  const router = useRouter();
  const { data: products } = useProductsQuery();
  const { data: company } = useCompanyQuery();
  const { data: lots = [] } = useLotsQuery();
  const { toast } = useToast();
  const [printing, setPrinting] = useState(false);
  // Opens on today's bills only; the owner widens it when needed.
  const [range, setRange] = useState<Range>('today');
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paymentType, setPaymentType] = useState<SalePaymentType | ''>('');
  const [productId, setProductId] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const dates = range === 'custom' ? { from: customFrom, to: customTo } : rangeDates(range, today);
  const filters = useMemo(
    () => ({
      from: dates.from || undefined,
      to: dates.to || undefined,
      paymentType: paymentType || undefined,
      productId: productId || undefined,
      q: debouncedSearch.trim() || undefined,
    }),
    [dates.from, dates.to, paymentType, productId, debouncedSearch],
  );
  // A new filter starts again from the first page.
  useEffect(() => setLimit(PAGE_SIZE), [filters]);

  const { data: page, isLoading, isError, isFetching } = useSalesPageQuery(filters, limit);
  const { data: summary } = useSalesSummaryQuery(filters);
  const sales = page?.rows ?? [];
  const total = page?.total ?? 0;
  const changed = range !== 'today' || paymentType !== '' || productId !== '' || search !== '';

  const resetFilters = () => {
    setRange('today');
    setCustomFrom(today);
    setCustomTo(today);
    setSearch('');
    setPaymentType('');
    setProductId('');
  };
  const printList = async () => {
    setPrinting(true);
    try {
      // Every bill that matches, not just the ones on screen. Cancelled and unapproved bills are not printed.
      const { rows, total: matching } = await listSalesPage(filters, PRINT_LIMIT);
      const bills = rows.filter((sale) => sale.status === 'CONFIRMED');
      const notes = [
        PAYMENT_OPTIONS.find((option) => option.value === paymentType && option.value)?.label,
        products.find((product) => product.id === productId)?.name,
        debouncedSearch.trim() ? `search "${debouncedSearch.trim()}"` : '',
        matching > PRINT_LIMIT ? `first ${PRINT_LIMIT} of ${matching} bills` : '',
      ].filter(Boolean);
      // What actually came in, by how it was paid, and what is still owed on these bills.
      const received = new Map<string, number>();
      for (const sale of bills) for (const tender of sale.tenders ?? []) received.set(tender.method, (received.get(tender.method) ?? 0) + tender.amount);
      const onCredit = bills.reduce((sum, sale) => sum + sale.balanceDue, 0);
      printSalesReport({
        paymentSummary: [
          ...[...received.entries()].map(([method, amount]) => ({ label: `${paymentMethodLabel(method as never)} received`, amount })),
          { label: 'On credit (still to collect)', amount: onCredit },
        ],
        // One line per bill, however many qualities or products it holds.
        rows: bills.map((sale) => ({
          date: sale.date,
          billNumber: sale.billNumber,
          customerName: sale.customerName,
          product: [...new Set(sale.items.map((item) => item.productName).filter(Boolean))].join(', ') || sale.productName || '',
          marks: gradesWithBags(sale.items, lots).map((entry) => entry.grade),
          bagsByMark: gradesWithBags(sale.items, lots).map((entry) => entry.bags),
          totalBags: sale.totalBags,
          totalWeightKg: sale.totalWeightKg,
          totalAmount: sale.totalAmount,
        })),
        shopName: company.shopName,
        title: 'Sales & Weighment Report',
        amountNote: 'Amount is the full bill, including Amali and market fee.',
        filterNote: notes.join(' · '),
        from: dates.from,
        to: dates.to,
        printedAt: new Date(),
      });
    } catch {
      toast({ type: 'error', title: 'Could not print', message: 'The bills could not be loaded. Check the connection and try again.' });
    } finally {
      setPrinting(false);
    }
  };
  const rangeText = dates.from === dates.to ? dates.from : `${dates.from} to ${dates.to}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Sales & Weighment Invoices
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {summary
              ? <>{summary.bills} bills • <span className="text-tertiary font-semibold">{bagsLabel(summary.bags)}</span> ({summary.weightKg.toLocaleString('en-IN')} KG) • <span className="text-success font-bold">₹{summary.amount.toLocaleString('en-IN')}</span> • {rangeText}</>
              : 'Loading totals…'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<Printer className="w-4 h-4" />}
            isLoading={printing}
            onClick={printList}
          >
            Print
          </Button>
          <Button
            variant="secondary"
            icon={<Scale className="w-4 h-4" />}
            onClick={() => router.push('/sales/todays')}
          >
            Today's Dispatch
          </Button>
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => router.push('/sales/new')}
          >
            New Sale
          </Button>
        </div>
      </div>

      {/* Filters: the server applies all of them, so only matching bills are loaded */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRange(item.id)}
              className={`min-h-[40px] px-4 rounded-full text-xs font-bold font-display transition-colors cursor-pointer ${
                range === item.id ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              {item.label}
            </button>
          ))}
          {changed && (
            <button type="button" onClick={resetFilters} className="min-h-[40px] px-3 rounded-full text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer">
              <X className="w-3.5 h-3.5" /> Back to today
            </button>
          )}
        </div>

        {range === 'custom' && (
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <Input
              label="From"
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <Input
              label="To"
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_14rem_14rem] gap-3">
          <Input
            placeholder="Search bill number (e.g. VPN-INV-1081) or customer name..."
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as SalePaymentType | '')}
            className="academic-input py-3 px-4 text-xs font-semibold rounded-2xl w-full cursor-pointer"
            aria-label="Payment type"
          >
            {PAYMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="academic-input py-3 px-4 text-xs font-semibold rounded-2xl w-full cursor-pointer"
            aria-label="Product"
          >
            <option value="">All products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sales List Table */}
      <Card variant="lowest" padding="none" className="overflow-hidden">
        {isLoading && <p className="p-8 text-sm text-on-surface-variant text-center">Loading bills…</p>}
        {isError && <p className="p-8 text-sm text-danger text-center">Could not load the bills. Check the connection and try again.</p>}
        {!isLoading && !isError && sales.length === 0 && (
          <div className="p-10 text-center space-y-1">
            <p className="text-sm font-bold text-on-surface">No bills found</p>
            <p className="text-xs text-on-surface-variant">
              {changed ? 'Nothing matches these filters. Try other dates or clear a filter.' : 'No bills have been made today yet.'}
            </p>
          </div>
        )}
        <div className="divide-y divide-surface-container-low">
          {sales.map(sale => (
            <div
              key={sale.id}
              className="p-5 sm:px-6 hover:bg-surface-container-low/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Info */}
              <div 
                onClick={() => router.push(`/sales/${sale.id}`)}
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary font-display">{sale.billNumber}</span>
                  <span className="text-xs text-on-surface-variant">• {sale.date} at {sale.time}</span>
                  <Chip
                    label={sale.paymentType}
                    size="sm"
                    variant={sale.paymentType === 'CASH' ? 'success' : 'tertiary'}
                  />
                  <Chip
                    label={sale.status}
                    size="sm"
                    variant={sale.status === 'CONFIRMED' ? 'neutral' : 'tertiary'}
                  />
                </div>
                <h3 className="text-base font-bold font-display text-on-surface mt-1">{sale.customerName}</h3>
                <div className="text-xs text-on-surface-variant font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="text-tertiary font-semibold">{bagsLabel(sale.totalBags)}</span>
                  <span>•</span>
                  <span><span className="font-semibold">{sale.totalWeightKg.toLocaleString('en-IN')}</span> <span className="text-xs">KG</span></span>
                  <span>•</span>
                  <span>{sale.items.map(i => `${gradeOnLots(i.markCode, i.lotNumber, lots)}: ${i.bags}b`).join(', ')}</span>
                  <span>•</span>
                  <span>Billed by {sale.createdByName}</span>
                </div>
              </div>

              {/* Right Amounts & CTAs */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold">Revenue</span>
                  <div className="text-base font-extrabold font-display text-success">
                    ₹{sale.totalAmount.toLocaleString('en-IN')}
                  </div>
                  {sale.balanceDue > 0 && (
                    <span className="text-[10px] text-tertiary font-semibold">Due: ₹{sale.balanceDue.toLocaleString('en-IN')}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Printer className="w-3.5 h-3.5" />}
                    onClick={() => router.push(`/sales/${sale.id}/bill`)}
                    title="Print Bill"
                  >
                    Bill
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/sales/${sale.id}`)}
                  >
                    <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {total > 0 && (
        <div className="flex flex-col items-center gap-2 pb-2">
          <p className="text-xs text-on-surface-variant font-medium">Showing {sales.length} of {total} bills</p>
          {sales.length < total && (
            <Button variant="secondary" isLoading={isFetching} onClick={() => setLimit((current) => current + PAGE_SIZE)}>
              Show {Math.min(PAGE_SIZE, total - sales.length)} more
            </Button>
          )}
        </div>
      )}

    </div>
  );
};
