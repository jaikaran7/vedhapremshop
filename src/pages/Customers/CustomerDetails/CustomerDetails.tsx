'use client';

import { TRADING_SESSION_DATE } from '@/constants/session';
import { useCustomersQuery } from '@/hooks/queries/use-customers-query';
import { useSalesQuery } from '@/hooks/queries/use-sales-query';
import { usePaymentsQuery } from '@/hooks/queries/use-payments-query';
import { useLedgerQuery } from '@/hooks/queries/use-customers-query';
import { useRouter } from 'next/navigation';
import { useRouteId } from '@/hooks/shared/use-route-id';
import { buildOutstandingReport, type OpenBalance } from '@/utils/report-outstanding';
import { paymentMethodLabel } from '@/utils/settlement';
import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { CustomerFormModal } from '@/pages/Customers/CustomerFormModal/CustomerFormModal';
import { ArrowLeft, PlusCircle, ArrowDownLeft, Phone, Printer, Edit } from 'lucide-react';

export const CustomerDetails: React.FC = () => {
  const id = useRouteId();
  const router = useRouter();
  const { data: customers = [] } = useCustomersQuery();
  const { data: sales = [] } = useSalesQuery();
  const { data: payments = [] } = usePaymentsQuery();
  const { data: ledgerEntries = [] } = useLedgerQuery();

  const [activeTab, setActiveTab] = useState<'ledger' | 'sales' | 'payments'>('ledger');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const asOf = TRADING_SESSION_DATE;
  const outstandingRow = useMemo(
    () => buildOutstandingReport({
      customers,
      sales,
      payments,
      ledger: ledgerEntries,
      asOf,
    }).find((row) => row.customerId === id),
    [asOf, customers, id, ledgerEntries, payments, sales],
  );

  const customer = customers.find(c => c.id === id);

  if (!customer) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Customer Not Found</h3>
        <p className="text-xs text-on-surface-variant mt-2">The customer record might have been removed.</p>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/customers')}>
          Return to Customer Directory
        </Button>
      </div>
    );
  }

  const customerLedger = ledgerEntries
    .filter((entry) => entry.customerId === customer.id)
    .sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id));
  const customerSales = sales.filter(s => s.customerId === customer.id);
  const customerPayments = payments.filter(p => p.customerId === customer.id);
  const openByReference = new Map<string, OpenBalance>(
    (outstandingRow?.openBalances ?? []).map((item) => [item.reference, item]),
  );
  const paymentByReceipt = new Map(customerPayments.map((payment) => [payment.receiptNumber, payment]));
  const isOverLimit = customer.outstandingAmount > customer.creditLimit;

  return (
    <div className="space-y-6">
      {/* Top Back Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/customers')}
            className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary font-display">{customer.code}</span>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
                {customer.name}
              </h1>
              <Chip
                label={customer.status}
                size="sm"
                variant={customer.status === 'ACTIVE' ? 'success' : 'danger'}
              />
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{customer.marketLocation}</span>
              {customer.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {customer.phone}
                </span>
              )}
              {customer.address && <span>{customer.address}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            icon={<Edit className="w-4 h-4" />}
            onClick={() => setIsEditOpen(true)}
          >
            Edit Profile
          </Button>
          <Button
            variant="secondary"
            icon={<ArrowDownLeft className="w-4 h-4 text-success" />}
            onClick={() => router.push(`/payments/new?customerId=${customer.id}`)}
          >
            Record Payment
          </Button>
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => router.push(`/sales/new?customerId=${customer.id}`)}
          >
            New Sale
          </Button>
        </div>
      </div>

      {/* Overview Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="lowest" padding="md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-display">
            Current Outstanding
          </span>
          <div className={`text-2xl sm:text-3xl font-extrabold font-display mt-1 ${isOverLimit ? 'text-danger' : 'text-on-surface'}`}>
            ₹{customer.outstandingAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">
            Credit Limit: ₹{customer.creditLimit.toLocaleString('en-IN')}
          </span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-display">
            Payment Terms
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-on-surface mt-1">
            {customer.creditDays} Days
          </div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">
            Mandi customary credit cycle
          </span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-display">
            Total Invoices Billed
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-on-surface mt-1">
            {customerSales.length} Bills
          </div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">
            ₹{customerSales.reduce((a, s) => a + s.totalAmount, 0).toLocaleString('en-IN')} gross trade
          </span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-display">
            Collections Realized
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-success mt-1">
            ₹{customerPayments.reduce((a, p) => a + p.amount, 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">
            Across {customerPayments.length} receipts
          </span>
        </Card>
      </div>

      <div className="flex items-center gap-2 border-b border-surface-container-low pb-2 overflow-x-auto">
        {([
          { key: 'ledger', label: 'Account Statement' },
          { key: 'sales', label: `Sales Bills (${customerSales.length})` },
          { key: 'payments', label: `Payment History (${customerPayments.length})` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'bg-primary text-white shadow-ambient'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="ml-auto no-print">
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<Printer className="w-3.5 h-3.5" />}
            onClick={() => window.print()}
          >
            Print Statement
          </Button>
        </div>
      </div>

      {/* TAB CONTENT 1: Account Statement */}
      {activeTab === 'ledger' && (
        <Card variant="lowest" padding="none" className="overflow-hidden print-bill-container">
          <div className="p-6 pb-4 bg-surface-container-low/40 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-on-surface">Transaction History</h3>
              <p className="text-xs text-on-surface-variant font-medium">Newest entries first. Older entries stay in this statement.</p>
              {outstandingRow?.allocationNote && (
                <p className="text-xs text-on-surface-variant mt-1">{outstandingRow.allocationNote}</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-on-surface-variant font-medium">Closing Balance:</span>
              <div className="text-base font-extrabold font-display text-tertiary">
                ₹{customer.outstandingAmount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Bill / receipt</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Debit (Sale)</th>
                  <th className="py-2.5 px-3 text-right">Credit (Payment)</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Due</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {customerLedger.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-on-surface-variant">
                      No transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  customerLedger.map((entry) => {
                    const open = openByReference.get(entry.referenceNo);
                    const receipt = entry.type === 'PAYMENT' ? paymentByReceipt.get(entry.referenceNo) : undefined;
                    return (
                      <tr key={entry.id} className="hover:bg-surface-container-low/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-on-surface whitespace-nowrap">{entry.date}</td>
                        <td className="py-2.5 px-3 font-bold text-primary whitespace-nowrap">{entry.referenceNo}</td>
                        <td className="py-2.5 px-3 text-on-surface">{entry.description}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-on-surface">
                          {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-success">
                          {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{receipt ? paymentMethodLabel(receipt.paymentMethod) : '—'}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{open?.dueDate ?? '—'}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {open ? (
                            <span className={open.overdue ? 'font-bold text-danger' : 'font-semibold text-primary'}>
                              {open.overdue ? 'Overdue' : 'Within Credit Period'}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-on-surface">
                          ₹{entry.balance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB CONTENT 2: Sales History */}
      {activeTab === 'sales' && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="divide-y divide-surface-container-low">
            {customerSales.length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant">No sales recorded for this customer yet.</div>
            ) : (
              customerSales.map(s => (
                <div 
                  key={s.id}
                  onClick={() => router.push(`/sales/${s.id}`)}
                  className="p-5 hover:bg-surface-container-low/40 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary font-display">{s.billNumber}</span>
                      <span className="text-xs text-on-surface-variant">• {s.date} at {s.time}</span>
                      <Chip label={s.paymentType} size="sm" variant={s.paymentType === 'CASH' ? 'success' : 'tertiary'} />
                    </div>
                    <div className="text-xs text-on-surface font-medium mt-1">
                      {s.totalBags} bags • {s.totalWeightKg} KG total
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-extrabold font-display text-on-surface">
                      ₹{s.totalAmount.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-primary hover:underline font-semibold">View Digital Bill →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* TAB CONTENT 3: Payment History */}
      {activeTab === 'payments' && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="divide-y divide-surface-container-low">
            {customerPayments.length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant">No collections recorded yet.</div>
            ) : (
              customerPayments.map(p => (
                <div key={p.id} className="p-5 hover:bg-surface-container-low/40 transition-colors flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-success font-display">{p.receiptNumber}</span>
                      <span className="text-xs text-on-surface-variant">• {p.date} ({p.time})</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface">
                        {p.paymentMethod}
                      </span>
                    </div>
                    {p.referenceNumber && (
                      <p className="text-[11px] text-on-surface-variant mt-0.5">Ref: {p.referenceNumber}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-base font-extrabold font-display text-success">
                      +₹{p.amount.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      Bal after: ₹{p.newOutstanding.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      <CustomerFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        customerToEdit={customer}
      />
    </div>
  );
};
