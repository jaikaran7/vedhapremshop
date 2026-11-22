'use client';

import React from 'react';
import { ThermalDoc, ThermalRow, dayMonthYear } from '@/components/print/thermal';
import { formatRupee } from '@/utils/settlement';
import type { Customer, CustomerLedgerEntry } from '@/types';

/** dd-mm-yy, short enough for the narrow statement column. */
function shortDate(date: string): string {
  const full = dayMonthYear(date);
  return /^\d{2}-\d{2}-\d{4}$/.test(full) ? `${full.slice(0, 6)}${full.slice(8)}` : full;
}

/**
 * The customer's whole account on the 80mm printer: every bill and payment with its date,
 * oldest first, ending in what they owe now. Hidden on screen; printed through printThermal.
 */
export const CustomerStatementPrint = React.forwardRef<
  HTMLDivElement,
  { customer: Customer; entries: CustomerLedgerEntry[] }
>(function CustomerStatementPrint({ customer, entries }, ref) {
  const ordered = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const lastBalance = ordered.length ? ordered[ordered.length - 1].balance : customer.outstandingAmount;

  return (
    <ThermalDoc ref={ref}>
      <p className="vp-customer">ACCOUNT STATEMENT</p>
      <p className="vp-customer">{customer.name}</p>
      <div className="vp-rule-solid" />
      <table className="vp-table vp-stmt">
        <thead>
          <tr>
            <th className="vp-l">DATE</th>
            <th>BILL</th>
            <th>PAID</th>
            <th>BALANCE</th>
          </tr>
        </thead>
        <tbody>
          {ordered.length === 0 && (
            <tr><td className="vp-l" colSpan={4}>No bills or payments yet.</td></tr>
          )}
          {ordered.map((entry) => (
            <tr key={entry.id}>
              <td className="vp-l">{shortDate(entry.date)}</td>
              <td>{entry.debit > 0 ? formatRupee(entry.debit) : ''}</td>
              <td>{entry.credit > 0 ? formatRupee(entry.credit) : ''}</td>
              <td className="vp-b">{formatRupee(entry.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="vp-grand">
        <ThermalRow label="BALANCE DUE" value={`₹${formatRupee(Math.max(0, lastBalance))}`} />
      </div>
      {lastBalance <= 0 && <p className="vp-center vp-b">NO PENDING DUES</p>}
    </ThermalDoc>
  );
});
