'use client';

import { Card } from '@/components/ui/Card';
import { formatMoney } from '@/pages/Reports/format';
import { ReportFrame, SummaryStrip } from '@/pages/Reports/ReportChrome';

export function DailyCashBook() {
  const mockData = {
    date: '2026-10-16',
    opening: 45000,
    collections: 125000,
    expenses: 8500,
    closing: 161500,
    transactions: [
      { time: '09:15', type: 'Collection', party: 'ABC Traders', method: 'Cash', amount: 50000, ref: 'VPN-REC-501' },
      { time: '10:30', type: 'Collection', party: 'Patel & Co', method: 'UPI', amount: 45000, ref: 'VPN-REC-502' },
      { time: '11:45', type: 'Expense', party: 'Scale Fee', method: 'Cash', amount: -500, ref: 'EXP-001' },
      { time: '14:20', type: 'Collection', party: 'Om Traders', method: 'Cash', amount: 30000, ref: 'VPN-REC-503' },
      { time: '16:00', type: 'Expense', party: 'Loading Charges', method: 'Cash', amount: -8000, ref: 'EXP-002' },
    ],
  };

  return (
    <ReportFrame
      title="Daily Cash Book"
      description="Today's cash collections, expenses, and closing balance"
      onExport={() => {}}
    >
      <SummaryStrip
        items={[
          { label: 'Opening Balance', value: formatMoney(mockData.opening) },
          { label: 'Collections', value: formatMoney(mockData.collections), tone: 'text-success' },
          { label: 'Expenses', value: formatMoney(mockData.expenses), tone: 'text-danger' },
          { label: 'Closing Balance', value: formatMoney(mockData.closing), tone: 'text-primary' },
        ]}
      />
      
      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
              <tr>
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Customer / Description</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Reference</th>
                <th className="py-3 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {mockData.transactions.map((txn, i) => (
                <tr key={i} className="hover:bg-surface-container-low/40">
                  <td className="py-3 px-3 text-on-surface-variant">{txn.time}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${txn.type === 'Collection' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                      {txn.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold">{txn.party}</td>
                  <td className="py-3 px-3">{txn.method}</td>
                  <td className="py-3 px-3 text-on-surface-variant">{txn.ref}</td>
                  <td className={`py-3 px-3 text-right font-bold ${txn.amount > 0 ? 'text-success' : 'text-danger'}`}>
                    {formatMoney(Math.abs(txn.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </ReportFrame>
  );
}
