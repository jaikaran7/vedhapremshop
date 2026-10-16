'use client';

import { Card } from '@/components/ui/Card';
import { formatMoney } from '@/pages/Reports/format';
import { ReportFrame, SummaryStrip } from '@/pages/Reports/ReportChrome';

export function CustomerStatement() {
  const mockCustomer = { name: 'ABC Traders', code: 'CUST-001', location: 'Pune Central' };
  const mockData = {
    opening: 189581,
    sales: 210419,
    payments: 250000,
    closing: 150000,
    transactions: [
      { date: '2026-09-20', type: 'Opening', ref: 'OPN', debit: 189581, credit: 0, balance: 189581 },
      { date: '2026-10-01', type: 'Sale', ref: 'VPN-INV-1081', debit: 10419, credit: 0, balance: 200000 },
      { date: '2026-10-01', type: 'Payment', ref: 'VPN-REC-501', debit: 0, credit: 50000, balance: 150000 },
      { date: '2026-10-05', type: 'Sale', ref: 'VPN-INV-1082', debit: 85000, credit: 0, balance: 235000 },
      { date: '2026-10-08', type: 'Sale', ref: 'VPN-INV-1083', debit: 115000, credit: 0, balance: 350000 },
      { date: '2026-10-10', type: 'Payment', ref: 'VPN-REC-502', debit: 0, credit: 200000, balance: 150000 },
    ],
  };

  return (
    <ReportFrame
      title="Customer Account Statement"
      description={`Full transaction history for ${mockCustomer.name}`}
      onExport={() => {}}
    >
      <Card variant="lowest" className="mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold font-display">{mockCustomer.name}</h3>
            <p className="text-xs text-on-surface-variant mt-1">{mockCustomer.code} • {mockCustomer.location}</p>
          </div>
          <button className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold">
            Share on WhatsApp
          </button>
        </div>
      </Card>

      <SummaryStrip
        items={[
          { label: 'Opening Balance', value: formatMoney(mockData.opening) },
          { label: 'Total Sales', value: formatMoney(mockData.sales) },
          { label: 'Total Paid', value: formatMoney(mockData.payments), tone: 'text-success' },
          { label: 'Current Balance', value: formatMoney(mockData.closing), tone: 'text-tertiary' },
        ]}
      />
      
      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Transaction</th>
                <th className="py-3 px-3">Reference</th>
                <th className="py-3 px-3 text-right">Debit (Sales)</th>
                <th className="py-3 px-3 text-right">Credit (Paid)</th>
                <th className="py-3 px-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {mockData.transactions.map((txn, i) => (
                <tr key={i} className="hover:bg-surface-container-low/40">
                  <td className="py-3 px-3 whitespace-nowrap">{txn.date}</td>
                  <td className="py-3 px-3 font-semibold">{txn.type}</td>
                  <td className="py-3 px-3 text-primary">{txn.ref}</td>
                  <td className="py-3 px-3 text-right">{txn.debit > 0 ? formatMoney(txn.debit) : '—'}</td>
                  <td className="py-3 px-3 text-right text-success">{txn.credit > 0 ? formatMoney(txn.credit) : '—'}</td>
                  <td className="py-3 px-3 text-right font-bold">{formatMoney(txn.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </ReportFrame>
  );
}
