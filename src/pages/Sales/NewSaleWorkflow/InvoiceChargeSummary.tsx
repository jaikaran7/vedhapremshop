'use client';

import type { SaleChargeSnapshot } from '@/types';
import { feeBasisLabel } from '@/utils/sale-charges';
import { formatRupee } from '@/utils/settlement';

export function InvoiceChargeSummary({
  charges,
  title = 'Invoice Summary',
}: {
  charges: SaleChargeSnapshot;
  title?: string;
}) {
  const rows = [
    { label: 'Product Subtotal', detail: 'Onion amount before mandi fees', amount: charges.productSubtotal },
    {
      label: 'Amali',
      detail: feeBasisLabel(charges.bagCount, charges.amaliPerBag, charges.amaliEnabled),
      amount: charges.amaliAmount,
    },
    {
      label: 'Market Fee',
      detail: feeBasisLabel(charges.bagCount, charges.marketFeePerBag, charges.marketFeeEnabled),
      amount: charges.marketFeeAmount,
    },
    ...(charges.otherCharges > 0
      ? [{ label: 'Other Charges', detail: 'Additional charges on this invoice', amount: charges.otherCharges }]
      : []),
  ];

  return (
    <div className="rounded-2xl bg-surface-container-low/70 p-4 sm:p-5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{title}</span>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 text-xs">
            <div>
              <div className="font-semibold text-on-surface">{row.label}</div>
              <div className="text-[11px] text-on-surface-variant">{row.detail}</div>
            </div>
            <div className="font-bold font-display text-on-surface">₹{formatRupee(row.amount)}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 flex items-end justify-between gap-4">
        <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Final Invoice Amount</span>
        <span className="text-2xl font-extrabold font-display text-primary">₹{formatRupee(charges.finalInvoiceAmount)}</span>
      </div>
    </div>
  );
}
