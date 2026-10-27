'use client';

import { useCompanyQuery } from '@/hooks/queries/use-directory-query';
import { useExpenseQuery } from '@/hooks/queries/use-expenses-query';
import { useVendorsQuery } from '@/hooks/queries/use-vendors-query';
import { useRouteId } from '@/hooks/shared/use-route-id';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, MessageCircle, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const VendorPaymentReceipt: React.FC = () => {
  const id = useRouteId();
  const router = useRouter();
  const { data: expense, isLoading } = useExpenseQuery(id);
  const { data: companySettings } = useCompanyQuery();
  const { data: vendors = [] } = useVendorsQuery();

  if (isLoading) {
    return <p className="p-12 text-center text-sm text-on-surface-variant">Loading receipt…</p>;
  }

  if (!expense?.vendorId) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Vendor receipt not found</h3>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/payments')}>Back to Payments</Button>
      </div>
    );
  }

  const vendor = vendors.find((item) => item.id === expense.vendorId);
  const remainingDue = expense.remainingDue ?? vendor?.payableAmount ?? 0;
  const previousDue = expense.previousDue ?? remainingDue + expense.amount;
  const receiptNo = expense.receiptNumber ?? expense.id;

  const share = () => {
    const text = encodeURIComponent(
      `*${companySettings.shopName}*\nVendor payment ${receiptNo}\nPaid to: ${expense.vendorName}\n*Amount: ₹${expense.amount.toLocaleString('en-IN')}*\nStill owed: ₹${remainingDue.toLocaleString('en-IN')}${expense.nextPaymentDate ? `\nNext payment: ${expense.nextPaymentDate}` : ''}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between no-print">
        <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.push(vendor ? `/vendors/${vendor.id}` : '/payments')}>
          Vendor statement
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<MessageCircle className="w-4 h-4 text-success" />} onClick={share}>WhatsApp</Button>
          <Button variant="primary" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print Receipt</Button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl p-8 sm:p-10 ambient-shadow-elevated print-bill-container border border-surface-container/60 print:border-none">
        <div className="text-center pb-6 border-b border-surface-container">
          <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary block">Vendor payment receipt</span>
          <h1 className="text-2xl font-extrabold font-display text-on-surface tracking-tight mt-1">{companySettings.shopName}</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">{companySettings.address} • Tel: {companySettings.phone}</p>
        </div>

        <div className="py-4 border-b border-surface-container flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Receipt number</span>
            <span className="text-sm font-extrabold font-display text-tertiary">{receiptNo}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Paid on</span>
            <span className="text-xs font-semibold text-on-surface">{expense.date}</span>
          </div>
        </div>

        <div className="py-6 space-y-3 text-xs">
          <div className="flex justify-between"><span className="text-on-surface-variant">Paid to</span><span className="font-extrabold font-display">{expense.vendorName}</span></div>
          <div className="flex justify-between"><span className="text-on-surface-variant">Method</span><span className="font-bold">{expense.paymentMethod}{expense.reference ? ` (${expense.reference})` : ''}</span></div>
          <div className="flex justify-between"><span className="text-on-surface-variant">From account</span><span className="font-bold">{expense.accountName}</span></div>
          {expense.nextPaymentDate && (
            <div className="flex justify-between"><span className="text-on-surface-variant">Next payment date</span><span className="font-bold text-tertiary">{expense.nextPaymentDate}</span></div>
          )}

          <div className="p-4 rounded-2xl bg-surface-container-low flex items-center justify-between my-4">
            <span className="text-xs font-bold uppercase tracking-wider font-display">Amount paid</span>
            <span className="text-2xl font-extrabold font-display text-danger">₹{expense.amount.toLocaleString('en-IN')}</span>
          </div>

          <div className="pt-2 border-t border-surface-container space-y-1.5">
            <div className="flex justify-between text-on-surface-variant"><span>Previous due</span><span>₹{previousDue.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between text-danger font-semibold"><span>This payment</span><span>−₹{expense.amount.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between text-sm font-extrabold text-primary font-display pt-1 border-t border-surface-container-low">
              <span>Still owed</span>
              <span>₹{remainingDue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-surface-container text-[10px] text-on-surface-variant">
          Recorded by <strong>{expense.recordedBy}</strong>
        </div>
      </div>
    </div>
  );
};
