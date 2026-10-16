'use client';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { buildOutstandingReport, type CustomerOutstandingRow } from '@/utils/report-outstanding';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatCount, formatMoney } from '@/pages/Reports/format';
import { downloadCsv, useReportQuery } from '@/pages/Reports/report-query';
import { useReportData } from '@/pages/Reports/use-report-data';
import { EmptyNote, FilterBar, ReportFrame, SortableHead, SummaryStrip, TablePager, compareValues, usePagedRows } from '@/pages/Reports/ReportChrome';

function isoToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function OutstandingReport() {
  const data = useReportData();
  const { filters, setFilter, clear } = useReportQuery();
  const [sortKey, setSortKey] = useState<'due' | 'overdue'>('due');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [openId, setOpenId] = useState<string | null>(null);
  const asOf = isoToday();
  const rows = useMemo(
    () => buildOutstandingReport({
      customers: data.customers,
      sales: data.sales,
      payments: data.payments,
      ledger: data.ledger,
      asOf,
    }),
    [asOf, data.customers, data.ledger, data.payments, data.sales],
  );
  const query = filters.q.trim().toLowerCase();
  const filtered = rows.filter((row) => !query || row.name.toLowerCase().includes(query) || row.code.toLowerCase().includes(query));
  const sorted = [...filtered].sort((left, right) => compareValues(
    sortKey === 'due' ? left.totalDue : left.oldestOverdueDays,
    sortKey === 'due' ? right.totalDue : right.oldestOverdueDays,
    direction,
  ));
  const page = usePagedRows(sorted, `${query}|${sortKey}|${direction}`);

  function toggle(key: 'due' | 'overdue') {
    if (key === sortKey) setDirection(direction === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setDirection('desc');
    }
  }

  return (
    <ReportFrame
      title="Outstanding Report"
      description="Customers with a balance due. Ageing uses recorded due dates and credit days, and only when those entries cover the balance."
      onExport={() => downloadCsv('outstanding-report.csv', ['Customer', 'Code', 'Total due', 'Oldest overdue days', 'Ageing'], sorted.map((row) => [
        row.name,
        row.code,
        row.totalDue,
        row.oldestOverdueDays ?? 'Not available',
        row.ageing ? 'Available' : 'Not available',
      ]))}
    >
      <FilterBar
        search={filters.q}
        onSearch={(value) => setFilter('q', value)}
        searchPlaceholder="Customer name or code"
        onClear={() => clear()}
      />
      <SummaryStrip
        items={[
          { label: 'Customers', value: formatCount(filtered.length) },
          { label: 'Total due', value: formatMoney(filtered.reduce((sum, row) => sum + row.totalDue, 0)) },
          { label: 'With ageing', value: formatCount(filtered.filter((row) => row.ageing).length) },
          { label: 'Ageing unavailable', value: formatCount(filtered.filter((row) => !row.ageing).length) },
        ]}
      />
      {sorted.length === 0 ? (
        <EmptyNote title="No outstanding balances" message="No customer with a balance due matches this search." />
      ) : (
        <>
          <Card variant="lowest" padding="none" className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant">
                  <tr>
                    <th className="py-3 px-3 text-[10px] font-bold uppercase">Customer</th>
                    <th className="py-3 px-3 text-[10px] font-bold uppercase">Location</th>
                    <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Credit days</th>
                    <SortableHead label="Total due" active={sortKey === 'due'} direction={direction} onClick={() => toggle('due')} align="right" />
                    <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Current</th>
                    <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">1-7 days</th>
                    <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">8-15 days</th>
                    <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">16-30 days</th>
                    <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">31+ days</th>
                    <SortableHead label="Overdue days" active={sortKey === 'overdue'} direction={direction} onClick={() => toggle('overdue')} align="right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {page.rows.map((row) => (
                    <OutstandingBody key={row.customerId} row={row} open={openId === row.customerId} onToggle={() => setOpenId(openId === row.customerId ? null : row.customerId)} />
                  ))}
                </tbody>
              </table>
            </div>
            <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
          </Card>

          <div className="md:hidden space-y-3">
            {page.rows.map((row) => (
              <Card 
                key={row.customerId} 
                variant="lowest" 
                className={`p-4 ${
                  (row.oldestOverdueDays ?? 0) >= 30 ? 'bg-danger/10' : 
                  row.totalDue > row.creditLimit * 0.8 ? 'bg-tertiary/10' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-bold text-base">{row.name}</div>
                    <div className="text-xs text-on-surface-variant">{row.code} • {row.location}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-on-surface-variant">Total Due</div>
                    <div className="font-extrabold text-lg font-display">{formatMoney(row.totalDue)}</div>
                  </div>
                </div>
                
                {row.ageing && (
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <div className="text-on-surface-variant">Current</div>
                      <div className="font-semibold">{bucket(row.ageing.notYetDue)}</div>
                    </div>
                    <div>
                      <div className="text-on-surface-variant">1-7 days</div>
                      <div className="font-semibold">{bucket(row.ageing.days0to7)}</div>
                    </div>
                    <div>
                      <div className="text-on-surface-variant">8-15 days</div>
                      <div className="font-semibold">{bucket(row.ageing.days8to15)}</div>
                    </div>
                    <div>
                      <div className="text-on-surface-variant">16-30 days</div>
                      <div className="font-semibold">{bucket(row.ageing.days16to30)}</div>
                    </div>
                    <div>
                      <div className="text-on-surface-variant">31+ days</div>
                      <div className="font-semibold text-danger">{bucket(row.ageing.days31plus)}</div>
                    </div>
                    <div>
                      <div className="text-on-surface-variant">Overdue days</div>
                      <div className="font-semibold">{row.oldestOverdueDays ?? 'N/A'}</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs pt-2 border-t border-surface-container-low">
                  <span className="text-on-surface-variant">{row.creditDays} days credit</span>
                  <button 
                    onClick={() => setOpenId(openId === row.customerId ? null : row.customerId)}
                    className="text-primary font-semibold"
                  >
                    {openId === row.customerId ? 'Hide history' : 'View history'}
                  </button>
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

function bucket(value: number | undefined) {
  if (value == null) return 'Not available';
  return formatMoney(value);
}

function OutstandingBody({ row, open, onToggle }: { row: CustomerOutstandingRow; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr 
        className={`hover:bg-primary/5 cursor-pointer ${
          (row.oldestOverdueDays ?? 0) >= 30 ? 'bg-danger/10' : 
          row.totalDue > row.creditLimit * 0.8 ? 'bg-tertiary/10' : ''
        }`} 
        onClick={onToggle}
      >
        <td className="py-3 px-3">
          <div className="font-bold text-on-surface">{row.name}</div>
          <div className="text-[10px] text-on-surface-variant">{row.code} · {open ? 'Hide history' : 'Payment history'}</div>
        </td>
        <td className="py-3 px-3">{row.location}</td>
        <td className="py-3 px-3 text-right">{row.creditDays}</td>
        <td className="py-3 px-3 text-right font-extrabold font-display">{formatMoney(row.totalDue)}</td>
        <td className="py-3 px-3 text-right">{bucket(row.ageing?.notYetDue)}</td>
        <td className="py-3 px-3 text-right">{bucket(row.ageing?.days0to7)}</td>
        <td className="py-3 px-3 text-right">{bucket(row.ageing?.days8to15)}</td>
        <td className="py-3 px-3 text-right">{bucket(row.ageing?.days16to30)}</td>
        <td className="py-3 px-3 text-right">{bucket(row.ageing?.days31plus)}</td>
        <td className="py-3 px-3 text-right font-semibold">{row.oldestOverdueDays == null ? 'Not available' : row.oldestOverdueDays}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={10} className="bg-surface-container-low/40 px-4 py-4">
            {row.ageingNote && <p className="text-xs text-on-surface-variant mb-3">{row.ageingNote}</p>}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Open balances</h4>
                {row.openBalances.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">No dated opening entry or invoice covers this balance.</p>
                ) : row.openBalances.map((item) => (
                  <div key={`${item.reference}-${item.date}`} className="flex items-center justify-between gap-3 py-2 text-xs border-b border-surface-container-low">
                    <div>
                      {item.saleId ? (
                        <Link href={`/sales/${item.saleId}`} className="font-bold text-primary" onClick={(event) => event.stopPropagation()}>{item.reference}</Link>
                      ) : <span className="font-bold">{item.reference}</span>}
                      <div className="text-on-surface-variant">{item.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatMoney(item.amount)}</div>
                      <div className="text-on-surface-variant">{item.dueDate ? `Due ${item.dueDate}` : 'Due date not recorded'}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Payments</h4>
                {row.payments.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">No receipts are recorded for this customer.</p>
                ) : row.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 py-2 text-xs border-b border-surface-container-low">
                    <div>
                      <Link href={`/payments/receipt/${payment.id}`} className="font-bold text-primary" onClick={(event) => event.stopPropagation()}>{payment.receiptNumber}</Link>
                      <div className="text-on-surface-variant">{payment.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-success">{formatMoney(payment.amount)}</div>
                      <Chip label={payment.paymentMethod} size="sm" variant="secondary" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
