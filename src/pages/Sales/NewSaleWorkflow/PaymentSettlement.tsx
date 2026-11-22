'use client';

import React, { useMemo, useState } from 'react';
import type { Customer, SaleChargeSnapshot } from '@/types';
import type { PaymentMethod } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { sanitizeTypedNumber } from '@/utils/typed-number';
import { Select } from '@/components/ui/Select';
import {
  PAYMENT_METHOD_OPTIONS,
  addCalendarDays,
  creditDayOptions,
  formatLongDate,
  formatRupee,
  paidAmountFor,
  resolveSettlement,
  roundMoney,
  updatedOutstanding,
  type SaleSettlement,
  type SettlementMode,
} from '@/utils/settlement';
import { TRADING_SESSION_DATE } from '@/constants/session';
import { CheckCircle2, PlusCircle, Trash2 } from 'lucide-react';
import { InvoiceChargeSummary } from '@/pages/Sales/NewSaleWorkflow/InvoiceChargeSummary';

interface PaymentSettlementProps {
  customer: Customer | null;
  billTotal: number;
  charges?: SaleChargeSnapshot;
  canAdjustCreditTerms: boolean;
  /** The bill date; due dates count from it. */
  saleDate?: string;
  /** Edit of an existing bill: collect only what is not already on it. */
  editing?: boolean;
  alreadyCollected?: number;
  onBack: () => void;
  onComplete: (settlement: SaleSettlement) => void;
  isSubmitting?: boolean;
}

export const PaymentSettlement: React.FC<PaymentSettlementProps> = ({
  customer,
  billTotal,
  charges,
  canAdjustCreditTerms,
  saleDate = TRADING_SESSION_DATE,
  editing = false,
  alreadyCollected = 0,
  onBack,
  onComplete,
  isSubmitting = false,
}) => {
  const dueNow = roundMoney(Math.max(0, billTotal - (editing ? alreadyCollected : 0)));
  const collecting = editing ? dueNow : billTotal;
  const [creditDays, setCreditDays] = useState(customer?.creditDays ?? 0);
  // A counter sale has no credit account, so it starts with the whole bill on the first payment.
  const [rows, setRows] = useState<{ id: string; method: PaymentMethod | ''; amount: string }[]>([
    { id: 'tender-1', method: 'CASH', amount: customer ? '' : String(collecting) },
  ]);
  const [error, setError] = useState('');

  const draft = {
    mode: 'PAID' as SettlementMode,
    split: true,
    method: '' as PaymentMethod | '',
    partialAmount: null,
    tenders: rows.map((row) => ({
      method: row.method,
      amount: row.amount.trim() === '' ? null : Number(row.amount),
    })),
    creditDays,
  };

  // Whatever the payments do not cover stays on the customer's account as credit; nothing left means paid in full.
  const paidNow = Math.max(paidAmountFor(draft, collecting), 0);
  const covered = roundMoney((editing ? alreadyCollected : 0) + paidNow);
  const remaining = roundMoney(Math.max(0, billTotal - covered));
  const nextOutstanding = updatedOutstanding(customer?.outstandingAmount ?? 0, remaining);
  const showCreditTerms = remaining > 0;
  const dueDate = showCreditTerms ? addCalendarDays(saleDate, creditDays) : '';
  const dayOptions = useMemo(() => creditDayOptions(customer?.creditDays ?? 0), [customer?.creditDays]);
  const stillToCover = roundMoney(Math.max(0, collecting - paidNow));

  const addPayment = () => {
    setError('');
    setRows((current) => {
      const used = new Set(current.map((row) => row.method));
      const nextMethod = PAYMENT_METHOD_OPTIONS.find((option) => !used.has(option.value))?.value ?? 'CASH';
      // The next payment starts with what is still unpaid; it can be edited.
      return [...current, { id: `tender-${Date.now()}`, method: nextMethod, amount: stillToCover > 0 ? String(stillToCover) : '' }];
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (editing && dueNow === 0) {
      onComplete({
        paymentStatus: 'PAID',
        paymentType: customer ? 'CREDIT' : 'CASH',
        paidAmount: alreadyCollected,
        balanceDue: 0,
        tenders: [],
      });
      return;
    }
    if (!customer && remaining > 0) {
      setError('A counter sale has no credit account. Collect the full amount.');
      return;
    }
    const result = resolveSettlement(draft, collecting, saleDate);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError('');
    onComplete(result);
  };

  return (
    <form id="sale-settlement" onSubmit={handleSubmit} className="space-y-6">
      <Card variant="lowest" className="space-y-5">
        {charges && <InvoiceChargeSummary charges={charges} title="Amount To Collect" />}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Final Invoice Amount</span>
            <div className="text-4xl font-extrabold font-display text-primary tracking-tight mt-1">
              ₹{formatRupee(billTotal)}
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              {editing
                ? `Already collected ₹${formatRupee(alreadyCollected)}. ${dueNow === 0 ? 'Nothing more is collected now.' : `Still to collect ₹${formatRupee(dueNow)}.`}`
                : customer
                  ? `${customer.name} • Previous outstanding ₹${formatRupee(customer.outstandingAmount)}`
                  : 'Counter sale • no customer name on this bill'}
            </p>
          </div>
          {customer && (
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Default Credit</span>
              <div className="text-sm font-bold font-display text-on-surface mt-1">{customer.creditDays} Days</div>
            </div>
          )}
        </div>
      </Card>

      {collecting > 0 && (
        <Card variant="lowest" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold font-display text-on-surface">Payment</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                {customer
                  ? 'Add what is paid now. Anything left stays on credit; nothing left means paid in full.'
                  : 'Collect the full amount.'}
              </p>
            </div>
            <Button type="button" variant="secondary" size="md" icon={<PlusCircle className="w-4 h-4" />} onClick={addPayment} disabled={stillToCover <= 0}>
              + Add Payment
            </Button>
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.id} className="p-4 rounded-2xl bg-surface-container-low grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
                <Select
                  label={`Payment ${index + 1}`}
                  value={row.method}
                  onChange={(event) => {
                    const value = event.target.value as PaymentMethod;
                    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, method: value } : item)));
                    setError('');
                  }}
                  options={PAYMENT_METHOD_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                />
                <Input
                  label="Amount"
                  inputMode="decimal"
                  value={sanitizeTypedNumber(row.amount)}
                  onChange={(event) => {
                    const value = sanitizeTypedNumber(event.target.value);
                    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, amount: value } : item)));
                    setError('');
                  }}
                  prefixText="₹"
                />
                <button
                  type="button"
                  onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                  className="h-11 px-3 rounded-2xl text-danger hover:bg-danger-container/50"
                  title="Remove payment"
                  disabled={rows.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {collecting > 0 && (
        <Card variant="lowest" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-4 rounded-2xl bg-surface-container-low">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant">Bill Total</span>
              <div className="text-lg font-extrabold font-display text-on-surface mt-1">₹{formatRupee(billTotal)}</div>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-low">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant">Paid Now</span>
              <div className="text-lg font-extrabold font-display text-on-surface mt-1">₹{formatRupee(Math.max(paidNow, 0))}</div>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-low">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant">{remaining > 0 ? 'Goes on credit' : 'Paid in full'}</span>
              <div className="text-lg font-extrabold font-display text-primary mt-1">
                ₹{formatRupee(remaining)}
              </div>
            </div>
          </div>

          {showCreditTerms && (
            <div>
              <h3 className="text-base font-bold font-display text-on-surface">Credit Terms</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                {customer ? `${customer.name} default credit is ${customer.creditDays} days.` : 'This counter sale has no credit account.'}
                {customer && !canAdjustCreditTerms ? ' Credit days follow the customer account.' : ''}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {dayOptions.map((days) => {
                  const active = creditDays === days;
                  return (
                    <button
                      key={days}
                      type="button"
                      disabled={!!customer && !canAdjustCreditTerms && days !== customer.creditDays}
                      onClick={() => (!customer || canAdjustCreditTerms) && setCreditDays(days)}
                      className={`min-h-[48px] px-4 rounded-2xl text-sm font-bold font-display ${
                        active ? 'bg-primary text-white shadow-ambient' : 'bg-surface-container-low text-on-surface'
                      } ${customer && !canAdjustCreditTerms && days !== customer.creditDays ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {days} Days
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-semibold text-on-surface mt-3">
                Sale date {formatLongDate(saleDate)} • Due date {formatLongDate(dueDate)}
              </p>
            </div>
          )}
        </Card>
      )}

      {customer && !editing && (
      <Card variant="lowest">
        <h3 className="text-base font-bold font-display text-on-surface mb-3">Outstanding After This Bill</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="p-4 rounded-2xl bg-surface-container-low">
            <span className="text-[10px] uppercase font-bold text-on-surface-variant">Previous Outstanding</span>
            <div className="text-base font-extrabold font-display mt-1">₹{formatRupee(customer.outstandingAmount)}</div>
          </div>
          <div className="p-4 rounded-2xl bg-surface-container-low">
            <span className="text-[10px] uppercase font-bold text-on-surface-variant">Current Bill</span>
            <div className="text-base font-extrabold font-display mt-1">₹{formatRupee(billTotal)}</div>
          </div>
          <div className="p-4 rounded-2xl bg-surface-container-low">
            <span className="text-[10px] uppercase font-bold text-on-surface-variant">Payment Now</span>
            <div className="text-base font-extrabold font-display mt-1">₹{formatRupee(Math.max(paidNow, 0))}</div>
          </div>
          <div className="p-4 rounded-2xl bg-surface-container-low">
            <span className="text-[10px] uppercase font-bold text-on-surface-variant">Updated Outstanding</span>
            <div className="text-base font-extrabold font-display text-primary mt-1">
              ₹{formatRupee(nextOutstanding)}
            </div>
          </div>
        </div>
      </Card>
      )}
      <Card variant="lowest">
        {(error || paidNow > collecting) && (
          <p className="text-xs text-danger font-semibold mb-4">
            {error || 'Payment amount cannot exceed the bill total.'}
          </p>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={onBack}>
            ← Edit Weighment
          </Button>
          <Button type="submit" variant="primary" size="lg" icon={<CheckCircle2 className="w-5 h-5" />} isLoading={isSubmitting}>
            {editing ? 'Save edit' : 'Complete Sale'}
          </Button>
        </div>
      </Card>
    </form>
  );
};
