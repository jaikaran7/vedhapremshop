'use client';

import { Card } from '@/components/ui/Card';
import { can } from '@/auth/permissions';
import { TRADING_SESSION_DATE } from '@/constants/session';
import { useCashBookQuery, useDailyCollectionsQuery } from '@/hooks/queries/use-expenses-query';
import { formatMoney } from '@/pages/Reports/format';
import { EmptyNote, ReportFrame, SummaryStrip } from '@/pages/Reports/ReportChrome';
import { useSession } from '@/store/session/session-provider';
import { useState } from 'react';

/**
 * One trading day. The Owner sees every account's opening and closing balance and each entry; the closing balance of a day is
 * the next day's opening. Anyone else sees only what was collected that day.
 */
export function DailyCashBook() {
  const { currentUser } = useSession();
  const owner = can(currentUser.role, 'viewAccountBalances');
  const [date, setDate] = useState(TRADING_SESSION_DATE);
  const book = useCashBookQuery(date, owner);
  const daily = useDailyCollectionsQuery(date);

  const picker = (
    <label className="inline-flex items-center gap-2 rounded-2xl bg-surface-container-low px-3 py-2">
      <span className="text-xs font-semibold text-on-surface-variant">Date</span>
      <input type="date" value={date} max={TRADING_SESSION_DATE} onChange={(event) => setDate(event.target.value || TRADING_SESSION_DATE)} className="bg-transparent text-sm font-semibold text-on-surface" />
    </label>
  );

  if (!owner) {
    return (
      <ReportFrame title="Daily Cash Book" description={`Money collected on ${date}`} onExport={() => {}}>
        {picker}
        <SummaryStrip items={[{ label: 'Collected today', value: formatMoney(daily.data?.collected ?? 0), tone: 'text-success' }]} />
        {(daily.data?.byMethod ?? []).length === 0 ? (
          <EmptyNote title="No collections" message="No customer payments were recorded on this day." />
        ) : (
          <Card variant="lowest" padding="none" className="overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                <tr><th className="py-3 px-3">Method</th><th className="py-3 px-3 text-right">Receipts</th><th className="py-3 px-3 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {daily.data!.byMethod.map((m) => (
                  <tr key={m.method}><td className="py-3 px-3 font-semibold">{m.method}</td><td className="py-3 px-3 text-right">{m.receipts}</td><td className="py-3 px-3 text-right font-bold text-success">{formatMoney(m.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </ReportFrame>
    );
  }

  if (book.isError) {
    return (
      <ReportFrame title="Daily Cash Book" description="Opening, collections, expenses and closing balance" onExport={() => {}}>
        <EmptyNote title="Error loading data" message="Could not load the cash book. Please refresh and try again." />
      </ReportFrame>
    );
  }

  const data = book.data;
  return (
    <ReportFrame title="Daily Cash Book" description={`Opening, money in, money out and closing for ${date}`} onExport={() => {}}>
      {picker}
      <SummaryStrip
        items={[
          { label: 'Opening Balance', value: formatMoney(data?.totals.openingBalance ?? 0) },
          { label: 'Money In', value: formatMoney(data?.totals.received ?? 0), tone: 'text-success' },
          { label: 'Money Out', value: formatMoney(data?.totals.paidOut ?? 0), tone: 'text-danger' },
          { label: 'Closing Balance', value: formatMoney(data?.totals.closingBalance ?? 0), tone: 'text-primary' },
        ]}
      />

      <Card variant="lowest" padding="none" className="overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
            <tr>
              <th className="py-3 px-3">Account</th><th className="py-3 px-3 text-right">Opening</th><th className="py-3 px-3 text-right">In</th>
              <th className="py-3 px-3 text-right">Out</th><th className="py-3 px-3 text-right">Closing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-low">
            {(data?.accounts ?? []).map((a) => (
              <tr key={a.id}>
                <td className="py-3 px-3 font-semibold">{a.name}{a.beforeOpening && <span className="ml-2 text-[10px] text-on-surface-variant">not opened until {a.openingDate}</span>}</td>
                <td className="py-3 px-3 text-right">{formatMoney(a.openingBalance)}</td>
                <td className="py-3 px-3 text-right text-success">{formatMoney(a.received)}</td>
                <td className="py-3 px-3 text-right text-danger">{formatMoney(a.paidOut)}</td>
                <td className="py-3 px-3 text-right font-bold">{formatMoney(a.closingBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {(data?.entries ?? []).length === 0 ? (
        <EmptyNote title="No entries" message="No collections or expenses were recorded on this day." />
      ) : (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
              <tr><th className="py-3 px-3">Time</th><th className="py-3 px-3">Type</th><th className="py-3 px-3">Party</th><th className="py-3 px-3">Method</th><th className="py-3 px-3">Reference</th><th className="py-3 px-3 text-right">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {data!.entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-container-low/40">
                  <td className="py-3 px-3 text-on-surface-variant">{entry.time}</td>
                  <td className="py-3 px-3">{entry.type}</td>
                  <td className="py-3 px-3 font-semibold">{entry.party}</td>
                  <td className="py-3 px-3">{entry.method}</td>
                  <td className="py-3 px-3 text-on-surface-variant">{entry.reference}</td>
                  <td className={`py-3 px-3 text-right font-bold ${entry.amount < 0 ? 'text-danger' : 'text-success'}`}>{entry.amount < 0 ? '−' : ''}{formatMoney(Math.abs(entry.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </ReportFrame>
  );
}
