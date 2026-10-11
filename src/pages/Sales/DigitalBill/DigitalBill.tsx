'use client';

import { useSalesQuery } from '@/hooks/queries/use-sales-query';
import { useCompanyQuery } from '@/hooks/queries/use-directory-query';
import { useRouter } from 'next/navigation';
import { useRouteId } from '@/hooks/shared/use-route-id';
import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/Toast';
import { formatLongDate, formatRupee, paymentMethodLabel, paymentStatusLabel } from '@/utils/settlement';
import { chargesForSale, feeBasisLabel } from '@/utils/sale-charges';
import type { PaymentStatus, Sale, SaleChargeSnapshot } from '@/types';
import { 
  Printer, Share2, ArrowLeft, CheckCircle2, Download, 
  MessageCircle, Scale, Building2 
} from 'lucide-react';

export const DigitalBill: React.FC = () => {
  const id = useRouteId();
  const router = useRouter();
  const { data: sales = [] } = useSalesQuery();
  const { data: companySettings } = useCompanyQuery();
  const { toast } = useToast();

  const sale = sales.find(s => s.id === id);

  if (!sale) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Bill Not Found</h3>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/sales')}>
          Back to Sales
        </Button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const charges = chargesForSale(sale);
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `*${companySettings.shopName}*\nBill No: ${sale.billNumber}\nCustomer: ${sale.customerName}\nTotal Bags: ${sale.totalBags}\nTotal Weight: ${sale.totalWeightKg} KG\nProduct Subtotal: ₹${formatRupee(charges.productSubtotal)}\nAmali (${feeBasisLabel(charges.bagCount, charges.amaliPerBag, charges.amaliEnabled)}): ₹${formatRupee(charges.amaliAmount)}\nMarket Fee (${feeBasisLabel(charges.bagCount, charges.marketFeePerBag, charges.marketFeeEnabled)}): ₹${formatRupee(charges.marketFeeAmount)}\n*Grand Total: ₹${formatRupee(charges.finalInvoiceAmount)}*\nPaid: ₹${formatRupee(sale.paidAmount)}\nBalance Due: ₹${formatRupee(sale.balanceDue)}\nThank you for trading with us!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCopyBill = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ type: 'success', title: 'Link Copied', message: 'Bill URL copied to clipboard' });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Action Bar (Hidden in Print) */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push('/sales')}
          >
            Sales List
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/sales/new')}
          >
            + Next Sale
          </Button>
        </div>

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
            Print Tax Invoice
          </Button>
        </div>
      </div>

      {/* Printable Digital Mandi Bill Surface */}
      <div className="bg-surface-container-lowest rounded-3xl p-8 sm:p-12 ambient-shadow-elevated print-bill-container border border-surface-container/60 print:border-none">
        {/* Bill Header */}
        <div className="text-center pb-6 border-b border-surface-container">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary block">
            APMC WHOLESALE MANDI TAX INVOICE
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-on-surface tracking-tight mt-1">
            {companySettings.shopName}
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {companySettings.address}
          </p>
          <div className="text-[11px] text-on-surface-variant font-semibold mt-1 flex items-center justify-center gap-4 flex-wrap">
            <span>License: <strong>{companySettings.mandiLicenseNo}</strong></span>
            <span>•</span>
            <span>GSTIN: <strong>{companySettings.gstNo}</strong></span>
            <span>•</span>
            <span>Phone: <strong>{companySettings.phone}</strong></span>
          </div>
        </div>

        {/* Invoice Meta Grid */}
        <div className="grid grid-cols-2 gap-6 py-6 border-b border-surface-container text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">
              Billed To (Buyer Party):
            </span>
            <div className="text-base font-extrabold font-display text-on-surface">
              {sale.customerName}
            </div>
            <p className="text-on-surface-variant mt-0.5">{sale.customerAddress}</p>
            <p className="text-on-surface-variant font-medium mt-0.5">Phone: {sale.customerPhone}</p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">
              Invoice Particulars:
            </span>
            <div className="text-base font-extrabold font-display text-primary">
              {sale.billNumber}
            </div>
            <p className="text-on-surface-variant mt-0.5">Date: <strong>{sale.date}</strong> at {sale.time}</p>
            <p className="text-on-surface-variant mt-0.5">
              Payment Status: <span className="font-bold text-on-surface">{paymentStatusLabel(billPaymentStatus(sale))}</span>
            </p>
            <p className="text-[10px] text-on-surface-variant">Weighed by: {sale.createdByName}</p>
          </div>
        </div>

        {/* Goods Table */}
        <div className="py-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Quality Mark</th>
                <th className="py-3 px-4">Lot</th>
                <th className="py-3 px-4 text-center">Bags</th>
                <th className="py-3 px-4 text-right">Net Weight (KG)</th>
                <th className="py-3 px-4 text-right">Rate / KG</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {sale.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-3.5 px-4 font-semibold text-on-surface-variant">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-bold text-on-surface">Grade {item.markCode}</td>
                  <td className="py-3.5 px-4 font-semibold text-on-surface-variant">{item.lotNumber}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-on-surface">{item.bags}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-on-surface">{item.weightKg} KG</td>
                  <td className="py-3.5 px-4 text-right font-medium text-on-surface">₹{item.ratePerKg.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right font-extrabold font-display text-on-surface">
                    ₹{item.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-surface-container-high bg-surface-container-low/40 font-bold">
              <tr>
                <td colSpan={3} className="py-4 px-4 text-sm font-display text-on-surface">
                  Grand Totals:
                </td>
                <td className="py-4 px-4 text-center text-sm font-extrabold text-on-surface">
                  {sale.totalBags} Bags
                </td>
                <td className="py-4 px-4 text-right text-sm font-extrabold text-on-surface">
                  {sale.totalWeightKg.toLocaleString('en-IN')} KG
                </td>
                <td className="py-4 px-4 text-right text-xs text-on-surface-variant">Product Subtotal</td>
                <td className="py-4 px-4 text-right text-lg font-extrabold font-display text-on-surface">
                  ₹{formatRupee(charges.productSubtotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <ChargeLines charges={charges} />

        <BillSettlement sale={sale} />

        {/* Detailed Bag Weights Footnote */}
        <div className="p-4 rounded-2xl bg-surface-container-low/60 text-[11px] text-on-surface space-y-1.5">
          <span className="font-bold text-on-surface-variant uppercase tracking-wider block text-[10px]">
            Scale Tare & Bag Breakdown:
          </span>
          {sale.items.map(item => (
            <div key={item.id} className="text-on-surface-variant">
              <strong>Grade {item.markCode}:</strong> {item.bagWeights.map(b => `${b.weightKg}kg`).join(', ')} ({item.bags} bags = {item.weightKg} KG)
            </div>
          ))}
        </div>

        {/* Terms & Mandi Signatures */}
        <div className="pt-8 border-t border-surface-container mt-6 grid grid-cols-2 gap-6 text-[10px] text-on-surface-variant">
          <div>
            <span className="font-bold uppercase tracking-wider block text-on-surface mb-1">Mandi Trading Terms:</span>
            <p className="whitespace-pre-line leading-relaxed">{companySettings.termsAndConditions}</p>
          </div>

          <div className="flex flex-col justify-end items-end text-right">
            <div className="w-48 border-b border-dashed border-on-surface-variant/40 pb-12 mb-2"></div>
            <span className="font-bold text-on-surface uppercase text-xs">For {companySettings.shopName}</span>
            <span className="text-[10px]">Authorized Mandi Signatory</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function ChargeLines({ charges }: { charges: SaleChargeSnapshot }) {
  const rows = [
    { label: 'Product Subtotal', detail: '', amount: charges.productSubtotal },
    { label: 'Amali', detail: feeBasisLabel(charges.bagCount, charges.amaliPerBag, charges.amaliEnabled), amount: charges.amaliAmount },
    { label: 'Market Fee', detail: feeBasisLabel(charges.bagCount, charges.marketFeePerBag, charges.marketFeeEnabled), amount: charges.marketFeeAmount },
    ...(charges.otherCharges > 0 ? [{ label: 'Other Charges', detail: '', amount: charges.otherCharges }] : []),
  ];
  return (
    <div className="p-4 rounded-2xl bg-surface-container-low/60 text-[11px] text-on-surface space-y-1.5 mb-4">
      <span className="font-bold text-on-surface-variant uppercase tracking-wider block text-[10px]">
        Charges
      </span>
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4">
          <span className="text-on-surface-variant">
            {row.label}{row.detail ? ` — ${row.detail}` : ''}
          </span>
          <span className="font-bold">₹{formatRupee(row.amount)}</span>
        </div>
      ))}
      <div className="flex justify-between gap-4 pt-1">
        <span className="font-bold text-on-surface">Grand Total</span>
        <span className="font-extrabold font-display text-primary">₹{formatRupee(charges.finalInvoiceAmount)}</span>
      </div>
    </div>
  );
}

function billPaymentStatus(sale: Sale): PaymentStatus {
  if (sale.paymentStatus) return sale.paymentStatus;
  if (sale.paymentType === 'CREDIT') return 'CREDIT';
  if (sale.paymentType === 'PARTIAL') return 'PARTIAL';
  return 'PAID';
}

function BillSettlement({ sale }: { sale: Sale }) {
  const status = billPaymentStatus(sale);
  const paid = sale.paidAmount ?? (status === 'PAID' ? sale.totalAmount : 0);
  const due = sale.balanceDue ?? (status === 'PAID' ? 0 : sale.totalAmount);
  const methods = (sale.tenders ?? []).filter((tender) => tender.amount > 0);
  const methodText = methods.length
    ? methods.map((tender) => `${paymentMethodLabel(tender.method)} ₹${formatRupee(tender.amount)}`).join(' · ')
    : status === 'PAID' && sale.paymentType !== 'SPLIT' && sale.paymentType !== 'PARTIAL' && sale.paymentType !== 'CREDIT'
      ? paymentMethodLabel(sale.paymentType)
      : '';

  return (
    <div className="p-4 rounded-2xl bg-surface-container-low/60 text-[11px] text-on-surface space-y-1.5 mb-4">
      <span className="font-bold text-on-surface-variant uppercase tracking-wider block text-[10px]">
        Payment & Settlement
      </span>
      <div className="flex justify-between gap-4">
        <span className="text-on-surface-variant">Payment Status</span>
        <span className="font-bold">{paymentStatusLabel(status)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-on-surface-variant">Amount Paid</span>
        <span className="font-bold">₹{formatRupee(paid)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-on-surface-variant">Balance Due</span>
        <span className="font-bold">₹{formatRupee(due)}</span>
      </div>
      {methodText && (
        <div className="flex justify-between gap-4">
          <span className="text-on-surface-variant">Payment Method</span>
          <span className="font-bold text-right">{methodText}</span>
        </div>
      )}
      {due > 0 && sale.creditDays != null && (
        <div className="flex justify-between gap-4">
          <span className="text-on-surface-variant">Credit Terms</span>
          <span className="font-bold">{sale.creditDays} Days</span>
        </div>
      )}
      {due > 0 && sale.dueDate && (
        <div className="flex justify-between gap-4">
          <span className="text-on-surface-variant">Due Date</span>
          <span className="font-bold">{formatLongDate(sale.dueDate)}</span>
        </div>
      )}
    </div>
  );
}
