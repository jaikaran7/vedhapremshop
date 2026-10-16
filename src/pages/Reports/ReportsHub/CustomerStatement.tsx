'use client';

import { Card } from '@/components/ui/Card';
import { formatMoney } from '@/pages/Reports/format';
import { ReportFrame, SummaryStrip, EmptyNote } from '@/pages/Reports/ReportChrome';
import { useReportData } from '@/pages/Reports/use-report-data';
import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function CustomerStatement() {
  const data = useReportData();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    () => data.customers.find(c => c.outstandingAmount > 0)?.id || data.customers[0]?.id || null
  );
  
  const customer = useMemo(
    () => data.customers.find((c) => c.id === selectedCustomerId),
    [data.customers, selectedCustomerId]
  );

  const transactions = useMemo(() => {
    if (!customer) return [];
    
    const ledgerEntries = (data.ledger || [])
      .filter((entry) => entry.customerId === customer.id)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => ({
        date: entry.date,
        type: entry.type,
        ref: entry.referenceNo,
        debit: entry.debit,
        credit: entry.credit,
        balance: entry.balance,
      }));
    
    return ledgerEntries;
  }, [customer, data.ledger]);

  const summary = useMemo(() => {
    if (transactions.length === 0) {
      return { opening: 0, sales: 0, payments: 0, closing: customer?.outstandingAmount || 0 };
    }
    
    const opening = transactions[0]?.type === 'OPENING' ? transactions[0].balance : 0;
    const sales = transactions
      .filter((t) => t.type === 'SALE')
      .reduce((sum, t) => sum + t.debit, 0);
    const payments = transactions
      .filter((t) => t.type === 'PAYMENT')
      .reduce((sum, t) => sum + t.credit, 0);
    const closing = customer?.outstandingAmount || 0;
    
    return { opening, sales, payments, closing };
  }, [transactions, customer]);

  if (data.error) {
    return (
      <ReportFrame title="Customer Account Statement" description="Full transaction history" onExport={() => {}}>
        <EmptyNote title="Error loading data" message="Could not load customer data. Please refresh and try again." />
      </ReportFrame>
    );
  }

  if (!customer) {
    return (
      <ReportFrame title="Customer Account Statement" description="Full transaction history" onExport={() => {}}>
        <EmptyNote title="No customers" message="Add customers to generate account statements." />
      </ReportFrame>
    );
  }

  return (
    <ReportFrame
      title="Customer Account Statement"
      description="Full transaction history with sales, payments, and running balance"
      onExport={() => {}}
    >
      <Card variant="lowest" className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <select
                value={selectedCustomerId || ''}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full appearance-none bg-surface-container-low rounded-xl px-4 py-3 pr-10 text-sm font-bold cursor-pointer"
              >
                {data.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            </div>
            <p className="text-xs text-on-surface-variant mt-2">{customer.code} • {customer.marketLocation}</p>
          </div>
          <button className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold whitespace-nowrap hover:bg-primary/90 transition-colors">
            Share on WhatsApp
          </button>
        </div>
      </Card>

      <SummaryStrip
        items={[
          { label: 'Opening Balance', value: formatMoney(summary.opening) },
          { label: 'Total Sales', value: formatMoney(summary.sales) },
          { label: 'Total Paid', value: formatMoney(summary.payments), tone: 'text-success' },
          { label: 'Current Balance', value: formatMoney(summary.closing), tone: summary.closing > 0 ? 'text-tertiary' : 'text-success' },
        ]}
      />
      
      {transactions.length === 0 ? (
        <EmptyNote title="No transactions" message="No transaction history for this customer yet." />
      ) : (
        <>
          <Card variant="lowest" padding="none" className="hidden md:block overflow-hidden">
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
                  {transactions.map((txn, i) => (
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

          <div className="md:hidden space-y-3">
            {transactions.map((txn, i) => (
              <Card key={i} variant="lowest" className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-bold text-sm">{txn.type}</div>
                    <div className="text-xs text-on-surface-variant">{txn.date}</div>
                  </div>
                  <div className="text-xs text-primary font-semibold">{txn.ref}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {txn.debit > 0 && (
                    <div>
                      <div className="text-on-surface-variant">Debit (Sales)</div>
                      <div className="font-bold">{formatMoney(txn.debit)}</div>
                    </div>
                  )}
                  {txn.credit > 0 && (
                    <div>
                      <div className="text-on-surface-variant">Credit (Paid)</div>
                      <div className="font-bold text-success">{formatMoney(txn.credit)}</div>
                    </div>
                  )}
                  <div className="col-span-2 pt-2 border-t border-surface-container-low">
                    <div className="text-on-surface-variant">Balance</div>
                    <div className="font-bold text-base">{formatMoney(txn.balance)}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </ReportFrame>
  );
}
