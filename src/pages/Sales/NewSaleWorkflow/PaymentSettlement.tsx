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
  onBack: () => void;
  onComplete: (settlement: SaleSettlement) => void;
  isSubmitting?: boolean;
}

const choiceClass = (active: boolean) =>
  `min-h-[72px] w-full px-4 py-4 rounded-2xl text-left transition-all cursor-pointer ${
    active
      ? 'bg-primary text-white shadow-ambient'
      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
  }`;

export const PaymentSettlement: React.FC<PaymentSettlementProps> = ({
  customer,
  billTotal,
  charges,
  canAdjustCreditTerms,
  saleDate = TRADING_SESSION_DATE,
  onBack,
  onComplete,
  isSubmitting = false,
}) => {
  const [mode, setMode] = useState<SettlementMode>('PAID');
  const [split, setSplit] = useState(false);
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [partialAmount, setPartialAmount] = useState('');
  const [creditDays, setCreditDays] = useState(customer?.creditDays ?? 0);
  const [rows, setRows] = useState<{ id: string; method: PaymentMethod | ''; amount: string }[]>([
    { id: 'tender-1', method: 'CASH', amount: '' },
  ]);
  const [error, setError] = useState('');

  const parsedPartial = partialAmount.trim() === '' ? null : Number(partialAmount);
  const draft = {
    mode,
    split,
    method,
    partialAmount: parsedPartial,
    tenders: rows.map((row) => ({
      method: row.method,
      amount: row.amount.trim() === '' ? null : Number(row.amount),
    })),
    creditDays,
  };

  const splitPaid = paidAmountFor(draft, billTotal);
  const partialPaid = parsedPartial != null && Number.isFinite(parsedPartial) ? roundMoney(parsedPartial) : 0;
  const paidNow = mode === 'CREDIT' ? 0 : split ? splitPaid : mode === 'PAID' ? billTotal : partialPaid;
  const remaining = roundMoney(billTotal - Math.min(Math.max(paidNow, 0), billTotal));
  const nextOutstanding = updatedOutstanding(customer?.outstandingAmount ?? 0, paidNow > billTotal ? billTotal : remaining);
  const showCreditTerms = paidNow < billTotal;
  const dueDate = showCreditTerms ? addCalendarDays(saleDate, creditDays) : '';
  const dayOptions = useMemo(() => creditDayOptions(customer?.creditDays ?? 0), [customer?.creditDays]);

  const chooseMode = (next: SettlementMode) => {
    setMode(next);
    setError('');
    if (next === 'CREDIT') setSplit(false);
  };

  const enableSplit = () => {
    setSplit(true);
    setError('');
    setRows((current) => {
      if (current.length > 1 && current.some((row) => row.amount)) return current;
      const firstAmount = mode === 'PAID' ? String(billTotal) : partialAmount;
      return [
        { id: 'tender-1', method: method || 'CASH', amount: firstAmount },
        { id: 'tender-2', method: 'UPI', amount: '' },
      ];
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = resolveSettlement(draft, billTotal, saleDate);
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
              {customer
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

      <Card variant="lowest" className="space-y-4">
        <div>
          <h3 className="text-base font-bold font-display text-on-surface">Payment Status</h3>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">How much of this bill is being collected now.</p>
        </div>
        <div className={`grid grid-cols-1 ${customer ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3`}>
          <button type="button" className={choiceClass(mode === 'PAID')} onClick={() => chooseMode('PAID')}>
            <span className="block text-sm font-bold font-display">Paid in Full</span>
            <span className={`block text-[11px] mt-1 ${mode === 'PAID' ? 'text-white/80' : 'text-on-surface-variant'}`}>
              Amount received ₹{formatRupee(billTotal)}
            </span>
          </button>
          <button type="button" className={choiceClass(mode === 'PARTIAL')} onClick={() => chooseMode('PARTIAL')}>
            <span className="block text-sm font-bold font-display">Partial Payment</span>
            <span className={`block text-[11px] mt-1 ${mode === 'PARTIAL' ? 'text-white/80' : 'text-on-surface-variant'}`}>
              Collect part now, keep a balance
            </span>
          </button>
          {customer && (
            <button type="button" className={choiceClass(mode === 'CREDIT')} onClick={() => chooseMode('CREDIT')}>
              <span className="block text-sm font-bold font-display">Credit / Pay Later</span>
              <span className={`block text-[11px] mt-1 ${mode === 'CREDIT' ? 'text-white/80' : 'text-on-surface-variant'}`}>
                Nothing collected on this bill
              </span>
            </button>
          )}
        </div>
      </Card>

      {mode !== 'CREDIT' && (
        <Card variant="lowest" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold font-display text-on-surface">Payment Method</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">How the money is received.</p>
            </div>
            {!split && (
              <Button type="button" variant="secondary" size="md" icon={<PlusCircle className="w-4 h-4" />} onClick={enableSplit}>
                + Add Payment Method
              </Button>
            )}
          </div>

          {!split && mode === 'PARTIAL' && (
            <div className="max-w-xs">
              <Input
                label="Amount Received"
                inputMode="decimal"
                value={sanitizeTypedNumber(partialAmount)}
                onChange={(event) => {
                  setPartialAmount(sanitizeTypedNumber(event.target.value));
                  setError('');
                }}
                prefixText="₹"
                required
              />
            </div>
          )}

          {!split && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PAYMENT_METHOD_OPTIONS.map((option) => {
                const active = method === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setMethod(option.value);
                      setError('');
                    }}
                    className={`min-h-[52px] px-4 py-3 rounded-2xl text-sm font-bold font-display transition-all cursor-pointer ${
                      active
                        ? 'bg-primary text-white shadow-ambient'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}

          {split && (
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
              <Button
                type="button"
                variant="secondary"
                size="md"
                icon={<PlusCircle className="w-4 h-4" />}
                onClick={() => setRows((current) => [...current, { id: `tender-${Date.now()}`, method: 'CASH', amount: '' }])}
              >
                + Add Payment Method
              </Button>
            </div>
          )}

          {mode === 'PAID' && !split && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-4 rounded-2xl bg-surface-container-low">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Amount Received</span>
                <div className="text-xl font-extrabold font-display text-on-surface mt-1">₹{formatRupee(billTotal)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-surface-container-low">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Remaining Due</span>
                <div className="text-xl font-extrabold font-display text-on-surface mt-1">₹0</div>
              </div>
            </div>
          )}
        </Card>
      )}

      {(showCreditTerms || mode === 'PARTIAL' || split) && (
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
              <span className="text-[10px] uppercase font-bold text-on-surface-variant">Remaining Due</span>
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

      {customer && (
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
        {(error || paidNow > billTotal) && (
          <p className="text-xs text-danger font-semibold mb-4">
            {error || 'Payment amount cannot exceed the bill total.'}
          </p>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={onBack}>
            ← Back to Review
          </Button>
          <Button type="submit" variant="primary" size="lg" icon={<CheckCircle2 className="w-5 h-5" />} isLoading={isSubmitting}>
            Complete Sale
          </Button>
        </div>
      </Card>
    </form>
  );
};
