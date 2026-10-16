'use client';

import { Card } from '@/components/ui/Card';
import { formatMoney } from '@/pages/Reports/format';
import { ReportFrame, SummaryStrip, EmptyNote } from '@/pages/Reports/ReportChrome';
import { useReportData } from '@/pages/Reports/use-report-data';
import { useMemo } from 'react';

export function DailyCashBook() {
  const data = useReportData();
  
  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const transactions = useMemo(() => {
    const todayPayments = (data.payments || [])
      .filter((p) => p.date === today)
      .map((p) => {
        const customer = data.customers.find((c) => c.id === p.customerId);
        const time = p.createdAt ? new Date(p.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
        return {
          time,
          type: 'Collection' as const,
          party: customer?.name || 'Unknown Customer',
          method: p.paymentMethod,
          amount: p.amount,
          ref: p.receiptNumber,
          timestamp: p.createdAt || p.date,
        };
      });

    const todayExpenses = (data.expenses || [])
      .filter((e) => e.date === today)
      .map((e) => {
        const category = data.expenseCategories?.find((c) => c.id === e.categoryId);
        const time = e.createdAt ? new Date(e.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
        return {
          time,
          type: 'Expense' as const,
          party: category?.name || 'Expense',
          method: e.paymentMethod,
          amount: -e.amount,
          ref: e.reference || `EXP-${e.id.slice(-3)}`,
          timestamp: e.createdAt || e.date,
        };
      });

    return [...todayPayments, ...todayExpenses].sort((a, b) => {
      if (a.timestamp < b.timestamp) return -1;
      if (a.timestamp > b.timestamp) return 1;
      return 0;
    });
  }, [data.payments, data.customers, data.expenses, data.expenseCategories, today]);

  const collections = useMemo(
    () => transactions.filter((t) => t.type === 'Collection').reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const expensesTotal = useMemo(
    () => transactions.filter((t) => t.type === 'Expense').reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [transactions]
  );

  const opening = useMemo(() => {
    const accounts = data.cashAccounts || [];
    return accounts.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
  }, [data.cashAccounts]);

  const closing = opening + collections - expensesTotal;

  if (data.error) {
    return (
      <ReportFrame title="Daily Cash Book" description="Today's cash collections, expenses, and closing balance" onExport={() => {}}>
        <EmptyNote title="Error loading data" message="Could not load today's transactions. Please refresh and try again." />
      </ReportFrame>
    );
  }

  return (
    <ReportFrame
      title="Daily Cash Book"
      description={`Today's cash collections, expenses, and closing balance (${today})`}
      onExport={() => {}}
    >
      <SummaryStrip
        items={[
          { label: 'Opening Balance', value: formatMoney(opening) },
          { label: 'Collections', value: formatMoney(collections), tone: 'text-success' },
          { label: 'Expenses', value: formatMoney(expensesTotal), tone: 'text-danger' },
          { label: 'Closing Balance', value: formatMoney(closing), tone: 'text-primary' },
        ]}
      />
      
      {transactions.length === 0 ? (
        <EmptyNote title="No transactions today" message="No collections or expenses recorded today." />
      ) : (
        <>
          <Card variant="lowest" padding="none" className="hidden md:block overflow-hidden">
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
                  {transactions.map((txn, i) => (
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

          <div className="md:hidden space-y-3">
            {transactions.map((txn, i) => (
              <Card key={i} variant="lowest" className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${txn.type === 'Collection' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                    {txn.type}
                  </span>
                  <span className="text-xs text-on-surface-variant">{txn.time}</span>
                </div>
                <div className="font-bold text-sm mb-1">{txn.party}</div>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-on-surface-variant">{txn.method} • {txn.ref}</span>
                  </div>
                  <div className={`font-bold text-sm ${txn.amount > 0 ? 'text-success' : 'text-danger'}`}>
                    {formatMoney(Math.abs(txn.amount))}
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
