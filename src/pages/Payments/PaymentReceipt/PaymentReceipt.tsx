'use client';

import { usePaymentsQuery } from '@/hooks/queries/use-payments-query';
import { useCompanyQuery } from '@/hooks/queries/use-directory-query';
import { useRouter } from 'next/navigation';
import { useRouteId } from '@/hooks/shared/use-route-id';
import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Printer, ArrowLeft, MessageCircle, CheckCircle2 } from 'lucide-react';

export const PaymentReceipt: React.FC = () => {
  const id = useRouteId();
  const router = useRouter();
  const { data: payments = [] } = usePaymentsQuery();
  const { data: companySettings } = useCompanyQuery();

  const payment = id ? payments.find(p => p.id === id) : payments[0];

  if (!payment) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Receipt Not Found</h3>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/payments')}>
          Back to Payments
        </Button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `*${companySettings.shopName}*\nOfficial Receipt No: ${payment.receiptNumber}\nReceived from: ${payment.customerName}\n*Amount: ₹${payment.amount.toLocaleString('en-IN')}*\nMethod: ${payment.paymentMethod}\nNew Balance: ₹${payment.newOutstanding.toLocaleString('en-IN')}\nThank you!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Action Bar (hidden in print) */}
      <div className="flex items-center justify-between no-print">
        <Button
          variant="secondary"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => router.push('/payments')}
        >
          Payment History
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<MessageCircle className="w-4 h-4 text-success" />}
            onClick={handleWhatsAppShare}
          >
            WhatsApp
          </Button>
          <Button
            variant="primary"
            icon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
          >
            Print Receipt
          </Button>
        </div>
      </div>

      {/* Printable Receipt Surface */}
      <div className="bg-surface-container-lowest rounded-3xl p-8 sm:p-10 ambient-shadow-elevated print-bill-container border border-surface-container/60 print:border-none">
        {/* Receipt Header */}
        <div className="text-center pb-6 border-b border-surface-container">
          <span className="text-[10px] font-bold uppercase tracking-widest text-success block">
            OFFICIAL MANDI COLLECTION RECEIPT
          </span>
          <h1 className="text-2xl font-extrabold font-display text-on-surface tracking-tight mt-1">
            {companySettings.shopName}
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">
            {companySettings.address} • Tel: {companySettings.phone}
          </p>
          <p className="text-[11px] text-on-surface-variant font-semibold mt-0.5">
            Mandi License: {companySettings.mandiLicenseNo}
          </p>
        </div>

        {/* Receipt Number & Date */}
        <div className="py-4 border-b border-surface-container flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Receipt Number</span>
            <span className="text-sm font-extrabold font-display text-success">{payment.receiptNumber}</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Date & Time</span>
            <span className="text-xs font-semibold text-on-surface">{payment.date} at {payment.time}</span>
          </div>
        </div>

        {/* Party Particulars */}
        <div className="py-6 space-y-4 text-xs">
          <div className="flex justify-between">
            <span className="text-on-surface-variant font-medium">Received with thanks from:</span>
            <span className="text-sm font-extrabold font-display text-on-surface">{payment.customerName}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-on-surface-variant font-medium">Payment Mode:</span>
            <span className="font-bold text-on-surface">
              {payment.paymentMethod} {payment.referenceNumber && `(${payment.referenceNumber})`}
            </span>
          </div>

          {payment.notes && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant font-medium">Remarks / Allocation:</span>
              <span className="text-on-surface">{payment.notes}</span>
            </div>
          )}

          {/* Amount Paid Highlight */}
          <div className="p-4 rounded-2xl bg-surface-container-low flex items-center justify-between my-4">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface font-display">
              Amount Received (INR):
            </span>
            <span className="text-2xl font-extrabold font-display text-success">
              ₹{payment.amount.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Outstanding Balance Table */}
          <div className="pt-2 border-t border-surface-container space-y-1.5 text-xs">
            <div className="flex justify-between text-on-surface-variant">
              <span>Previous Balance:</span>
              <span>₹{payment.previousOutstanding.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-success font-semibold">
              <span>Amount Paid:</span>
              <span>-₹{payment.amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-primary font-display pt-1 border-t border-surface-container-low">
              <span>Closing Balance Due:</span>
              <span>₹{payment.newOutstanding.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Footer Signature */}
        <div className="pt-8 border-t border-surface-container flex items-end justify-between text-[10px] text-on-surface-variant">
          <div>
            <span>Recorded by cashier: <strong>{payment.recordedBy}</strong></span>
            <p className="mt-0.5">Subject to realization of digital transfer / cheque.</p>
          </div>

          <div className="text-right">
            <div className="w-36 border-b border-dashed border-on-surface-variant/40 pb-10 mb-1"></div>
            <span className="font-bold text-on-surface uppercase">Authorized Signatory</span>
          </div>
        </div>
      </div>
    </div>
  );
};
