'use client';

import { TRADING_SESSION_DATE } from '@/constants/session';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  buildOutstandingReport,
  filterOutstandingRows,
  INACTIVE_PURCHASE_DAYS,
  matchesOutstandingSearch,
  sortByOutstanding,
  type CustomerOutstandingRow,
  type OutstandingFilter,
} from '@/utils/report-outstanding';
import { useCompanyQuery } from '@/hooks/queries/use-directory-query';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatCount, formatMoney } from '@/pages/Reports/format';
import { downloadCsv, useReportQuery } from '@/pages/Reports/report-query';
import { useReportData } from '@/pages/Reports/use-report-data';
import { EmptyNote, ReportFrame, SortableHead, SummaryStrip, TablePager, usePagedRows } from '@/pages/Reports/ReportChrome';

function viewOptions(inactiveDays: number): { value: OutstandingFilter; label: string }[] {
  return [
    { value: 'all', label: 'All Outstanding' },
    { value: 'highest', label: 'Highest Outstanding' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'inactive', label: `No Recent Purchases (${inactiveDays}+ Days)` },
  ];
}

export function OutstandingReport() {
  const data = useReportData();
  const { data: companySettings } = useCompanyQuery();
  const { filters, setFilter, clear } = useReportQuery();
  const [view, setView] = useState<OutstandingFilter>('all');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const asOf = TRADING_SESSION_DATE;
  const inactivePurchaseDays = companySettings.inactivePurchaseDays || INACTIVE_PURCHASE_DAYS;
  const rows = useMemo(
    () => buildOutstandingReport({
      customers: data.customers,
      sales: data.sales,
      payments: data.payments,
      ledger: data.ledger,
      asOf,
      inactivePurchaseDays,
    }),
    [asOf, data.customers, data.ledger, data.payments, data.sales, inactivePurchaseDays],
  );
  const searched = useMemo(
    () => rows.filter((row) => matchesOutstandingSearch(row, filters.q)),
    [filters.q, rows],
  );
  const viewed = useMemo(
    () => sortByOutstanding(filterOutstandingRows(searched, view), direction),
    [direction, searched, view],
  );
  const page = usePagedRows(viewed, `${filters.q}|${view}|${direction}`);
  const overdueTotal = searched.reduce((sum, row) => sum + (row.overdueAmount ?? 0), 0);
  const unsplit = searched.some((row) => row.allocationNote);
  const inactiveCount = searched.filter((row) => row.noRecentPurchase).length;

  function chooseView(next: OutstandingFilter) {
    setView(next);
    if (next === 'all' || next === 'highest') setDirection('desc');
  }

  return (
    <ReportFrame
      title="Outstanding Report"
      description="Customers with a balance due. A bill is overdue after its due date. Bills without a due date are due 15 days after the sale."
      onExport={() => downloadCsv('outstanding-report.csv', [
        'Customer',
        'Code',
        'Mobile',
        'Last sale',
        'Outstanding',
        'Overdue amount',
        'No recent purchases',
        'Ledger',
      ], viewed.map((row) => [
        row.name,
        row.code,
        row.phone || '',
        row.lastSaleDate ?? 'No sale',
        row.totalDue,
        row.overdueAmount ?? 'Not split by bill',
        row.noRecentPurchase ? 'Yes' : 'No',
        row.ledgerHref,
      ]))}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <Input
            label="Search"
            placeholder="Customer name, code, or mobile"
            icon={<Search className="w-4 h-4" />}
            value={filters.q}
            onChange={(event) => setFilter('q', event.target.value)}
          />
        </div>
        <div className="w-full lg:w-80">
          <Select
            label="Show"
            value={view}
            onChange={(event) => chooseView(event.target.value as OutstandingFilter)}
            options={viewOptions(inactivePurchaseDays)}
          />
        </div>
        <Button
          variant="secondary"
          className="w-full lg:w-auto"
          onClick={() => {
            setView('all');
            setDirection('desc');
            clear();
          }}
        >
          Clear
        </Button>
      </div>
      <SummaryStrip
        columns="quarters"
        items={[
          { label: 'Customers with outstanding', value: formatCount(searched.length) },
          { label: 'Total outstanding', value: formatMoney(searched.reduce((sum, row) => sum + row.totalDue, 0)) },
          {
            label: 'Overdue amount',
            value: formatMoney(overdueTotal),
            tone: overdueTotal > 0 ? 'text-danger' : undefined,
            hint: unsplit ? 'Balances that could not be split by bill are not included.' : undefined,
          },
          { label: 'No recent purchases (45+ days)', value: formatCount(inactiveCount) },
        ]}
      />
      {viewed.length === 0 ? (
        <EmptyNote title="No outstanding balances" message="No customer with a balance due matches this search." />
      ) : (
        <>
          <Card variant="lowest" padding="none" className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant">
                  <tr>
                    <th className="py-2.5 px-3 text-[10px] font-bold uppercase">Customer</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold uppercase">Mobile</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold uppercase">Last sale</th>
                    <SortableHead
                      label="Outstanding"
                      active
                      direction={direction}
                      onClick={() => setDirection(direction === 'desc' ? 'asc' : 'desc')}
                      align="right"
                    />
                    <th className="py-2.5 px-3 text-[10px] font-bold uppercase">Status</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {page.rows.map((row) => (
                    <tr key={row.customerId} className="hover:bg-primary/5">
                      <td className="py-2.5 px-3">
                        <Link href={row.ledgerHref} className="font-bold text-primary hover:underline">{row.name}</Link>
                        <div className="text-[10px] text-on-surface-variant">{row.code}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{row.phone || '—'}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{row.lastSaleDate ?? 'No sale'}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold font-display">{formatMoney(row.totalDue)}</td>
                      <td className="py-2.5 px-3"><StatusMarks row={row} /></td>
                      <td className="py-2.5 px-3">
                        <Link href={row.ledgerHref} className="font-bold text-primary hover:underline">View Ledger</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
          </Card>

          <div className="md:hidden space-y-3">
            {page.rows.map((row) => (
              <Card key={row.customerId} variant="lowest" className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={row.ledgerHref} className="font-bold text-primary hover:underline">{row.name}</Link>
                    <div className="text-[10px] text-on-surface-variant">{row.code}</div>
                    <div className="text-xs mt-1">{row.phone || '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-on-surface-variant">Outstanding</div>
                    <div className="font-extrabold font-display">{formatMoney(row.totalDue)}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                  <span className="text-on-surface-variant">{row.lastSaleDate ? `Last sale ${row.lastSaleDate}` : 'No sale'}</span>
                  <Link href={row.ledgerHref} className="font-bold text-primary">View Ledger</Link>
                </div>
                <div className="mt-2">
                  <StatusMarks row={row} />
                </div>
              </Card>
            ))}
            <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
          </div>
        </>
      )}
    </ReportFrame>
  );
}

function StatusMarks({ row }: { row: CustomerOutstandingRow }) {
  return (
    <div className="flex flex-wrap gap-1" title={row.allocationNote ?? undefined}>
      {row.overdue && <Chip label="Overdue" size="sm" variant="danger" />}
      {row.withinCredit && <Chip label="Within Credit Period" size="sm" variant="primary" />}
      {row.noRecentPurchase && <Chip label="No Recent Purchases" size="sm" variant="tertiary" />}
      {row.allocationNote && !row.overdue && !row.withinCredit && (
        <Chip label="Not split by bill" size="sm" variant="neutral" />
      )}
    </div>
  );
}
