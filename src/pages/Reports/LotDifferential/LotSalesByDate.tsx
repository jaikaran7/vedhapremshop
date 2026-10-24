'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCount, formatMoney, formatWeight } from '@/pages/Reports/format';
import type { Sale } from '@/types';
import type { LotOutgoingLine } from '@/utils/lot-differential';
import {
  filterLotSaleLines,
  lotSalesForDate,
  summarizeLotSalesByDate,
  type LotSaleCreditDebit,
  type LotSaleDetailRow,
} from '@/utils/lot-sales-by-date';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const cell = 'px-3 py-3 border-t border-outline-variant text-sm font-medium';
const detailCell = 'px-3 py-2.5 border-t border-outline-variant text-sm font-medium';

function creditTone(kind: LotSaleCreditDebit) {
  if (kind === 'CREDIT') return 'text-tertiary';
  if (kind === 'PARTIAL') return 'text-primary';
  return 'text-success';
}

function creditLabel(kind: LotSaleCreditDebit) {
  if (kind === 'CREDIT') return 'Credit';
  if (kind === 'PARTIAL') return 'Partial';
  return 'Paid';
}

export function LotSalesByDate({
  lines,
  sales,
  markNote,
  onClearMark,
  initialFrom,
  initialTo,
}: {
  lines: LotOutgoingLine[];
  sales: Sale[];
  markNote?: string;
  onClearMark?: () => void;
  initialFrom?: string;
  initialTo?: string;
}) {
  const [from, setFrom] = useState(initialFrom ?? '');
  const [to, setTo] = useState(initialTo ?? '');
  const [search, setSearch] = useState('');
  const [openDate, setOpenDate] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterLotSaleLines(lines, { from, to, search }),
    [from, lines, search, to],
  );
  const summary = useMemo(() => summarizeLotSalesByDate(filtered), [filtered]);
  const details = useMemo(
    () => (openDate ? lotSalesForDate(filtered, openDate, sales) : []),
    [filtered, openDate, sales],
  );

  function toggleDate(date: string) {
    setOpenDate((current) => (current === date ? null : date));
  }

  function clearLocal() {
    setFrom('');
    setTo('');
    setSearch('');
    setOpenDate(null);
  }

  return (
    <section className="w-full space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold font-display text-on-surface">Day-wise sales</h2>
          {markNote && <p className="text-xs font-medium text-on-surface-variant mt-0.5">{markNote}</p>}
        </div>
        {onClearMark && (
          <Button size="sm" variant="secondary" onClick={onClearMark}>Clear mark filter</Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 no-print">
        <Input label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <Input label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        <Input
          label="Search"
          placeholder="Customer or bill number"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex items-end">
          <Button variant="secondary" className="w-full" onClick={clearLocal}>Clear filters</Button>
        </div>
      </div>

      <div className="overflow-x-auto w-full rounded-2xl bg-surface-container-lowest ambient-shadow">
        <table className="w-full min-w-[44rem] table-fixed text-left border-collapse">
          <colgroup>
            {['22%', '12%', '16%', '22%', '28%'].map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
          <thead className="bg-surface-container-low text-on-surface-variant">
            <tr>
              <th className="px-3 py-3 text-xs font-medium uppercase">Date</th>
              <th className="px-3 py-3 text-xs font-medium uppercase text-right">Bills</th>
              <th className="px-3 py-3 text-xs font-medium uppercase text-right">Bags</th>
              <th className="px-3 py-3 text-xs font-medium uppercase text-right">Quantity</th>
              <th className="px-3 py-3 text-xs font-medium uppercase text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {summary.days.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 px-3 text-center text-sm text-on-surface-variant">
                  No sales are linked to this selection.
                </td>
              </tr>
            )}
            {summary.days.map((day) => {
              const open = openDate === day.date;
              return (
                <DayBlock
                  key={day.date}
                  date={day.date}
                  billCount={day.billCount}
                  bags={day.bags}
                  weightKg={day.weightKg}
                  amount={day.amount}
                  open={open}
                  details={open ? details : []}
                  onToggle={() => toggleDate(day.date)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DayBlock({
  date,
  billCount,
  bags,
  weightKg,
  amount,
  open,
  details,
  onToggle,
}: {
  date: string;
  billCount: number;
  bags: number;
  weightKg: number;
  amount: number;
  open: boolean;
  details: LotSaleDetailRow[];
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer hover:bg-surface-container-low/50"
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        tabIndex={0}
        aria-expanded={open}
      >
        <td className={`${cell} text-on-surface`}>
          <span className="inline-flex items-center gap-1.5">
            <ChevronDown className={`w-3.5 h-3.5 text-on-surface-variant transition-transform ${open ? '' : '-rotate-90'}`} />
            {date}
          </span>
        </td>
        <td className={`${cell} text-right tabular-nums`}>{formatCount(billCount)}</td>
        <td className={`${cell} text-right tabular-nums`}>{formatCount(bags)}</td>
        <td className={`${cell} text-right tabular-nums`}>{formatWeight(weightKg)}</td>
        <td className={`${cell} text-right font-semibold tabular-nums`}>{formatMoney(amount)}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="p-0 bg-surface-container-low/40">
            <div className={details.length > 12 ? 'max-h-80 overflow-y-auto' : undefined}>
              <table className="w-full min-w-[52rem] table-fixed text-left border-collapse">
                <colgroup>
                  {['13%', '10%', '16%', '8%', '8%', '12%', '10%', '13%', '10%'].map((width, index) => (
                    <col key={index} style={{ width }} />
                  ))}
                </colgroup>
                <thead className="bg-surface-container-low text-on-surface-variant">
                  <tr>
                    {['Bill', 'Time', 'Customer', 'Mark', 'Bags', 'Actual KG', 'Rate', 'Amount', 'Payment'].map((label) => (
                      <th
                        key={label}
                        className={`px-3 py-2.5 text-xs font-medium uppercase ${['Bags', 'Actual KG', 'Rate', 'Amount'].includes(label) ? 'text-right' : ''}`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {details.map((row) => (
                    <tr key={`${row.saleId}-${row.markCode}-${row.weightKg}`}>
                      <td className={detailCell}>
                        <Link href={`/sales/${row.saleId}`} className="font-semibold text-primary" onClick={(event) => event.stopPropagation()}>
                          {row.billNumber}
                        </Link>
                      </td>
                      <td className={`${detailCell} text-on-surface`}>{row.time || '—'}</td>
                      <td className={`${detailCell} text-on-surface`}>{row.customerName}</td>
                      <td className={detailCell}>{row.markCode}</td>
                      <td className={`${detailCell} text-right tabular-nums`}>{formatCount(row.bags)}</td>
                      <td className={`${detailCell} text-right tabular-nums`}>{formatWeight(row.weightKg)}</td>
                      <td className={`${detailCell} text-right tabular-nums`}>₹{row.ratePerKg.toLocaleString('en-IN')}</td>
                      <td className={`${detailCell} text-right font-semibold tabular-nums`}>{formatMoney(row.amount)}</td>
                      <td className={`${detailCell} font-semibold ${creditTone(row.creditDebit)}`}>
                        {creditLabel(row.creditDebit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
