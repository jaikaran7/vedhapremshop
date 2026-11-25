'use client';

import React from 'react';
import { ThermalDoc, ThermalRow } from '@/components/print/thermal';
import { formatRupee } from '@/utils/settlement';

export interface StockReportRow {
  /** The stored mark code; unique, unlike the quality name, which two lots can share. */
  code: string;
  name: string;
  rate: number | null;
  totalBags: number;
  totalWeightKg: number;
  lots: { lotNumber: string; bags: number; kg: number }[];
}

const kg = (value: number) => `${(Math.round(value * 100) / 100).toLocaleString('en-IN')} Kg`;

/**
 * The yard's stock on the 80mm printer: each quality with its rate, bags and weight, and the lots it is in,
 * ending in the totals. Hidden on screen; printed through printThermal.
 */
export const StockReportPrint = React.forwardRef<HTMLDivElement, { rows: StockReportRow[]; printedAt: Date }>(
  function StockReportPrint({ rows, printedAt }, ref) {
    const totalBags = rows.reduce((sum, row) => sum + row.totalBags, 0);
    const totalKg = rows.reduce((sum, row) => sum + row.totalWeightKg, 0);
    const date = printedAt.toLocaleDateString('en-GB').replaceAll('/', '-');
    const time = printedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    return (
      <ThermalDoc ref={ref}>
        <p className="vp-customer">STOCK REPORT</p>
        <ThermalRow bold label="Date:" value={date} />
        <ThermalRow bold label="Time:" value={time} />
        <div className="vp-rule-solid" />
        {rows.length === 0 && <p className="vp-center vp-b">No stock in the yard.</p>}
        {rows.map((row) => (
          <div key={row.code} className="vp-stock-item">
            <p className="vp-row vp-b vp-stock-head"><span>{row.name}</span><span>{row.rate != null ? `₹${formatRupee(row.rate)}/kg` : ''}</span></p>
            <p className="vp-row"><span>Total Bags</span><span className="vp-b">{row.totalBags} Bags</span></p>
            <p className="vp-row"><span>Total Weight</span><span className="vp-b">{kg(row.totalWeightKg)}</span></p>
            <p className="vp-sub vp-b">Available across Lots:</p>
            {row.lots.map((lot) => (
              <p key={lot.lotNumber} className="vp-row vp-sub"><span>{lot.lotNumber}</span><span>{lot.bags} bags ({kg(lot.kg)})</span></p>
            ))}
          </div>
        ))}
        <div className="vp-grand">
          <ThermalRow label="TOTAL BAGS" value={`${totalBags}`} />
        </div>
        <ThermalRow bold label="Total Weight:" value={kg(totalKg)} />
      </ThermalDoc>
    );
  },
);
