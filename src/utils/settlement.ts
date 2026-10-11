import type { PaymentMethod, PaymentStatus, SalePaymentType, SaleTender } from '@/types';

export const CREDIT_DAY_PRESETS = [0, 7, 15, 30] as const;

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'QR', label: 'QR Code' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
];

export type SettlementMode = 'PAID' | 'PARTIAL' | 'CREDIT';

export interface SettlementDraft {
  mode: SettlementMode;
  split: boolean;
  method: PaymentMethod | '';
  partialAmount: number | null;
  tenders: { method: PaymentMethod | ''; amount: number | null }[];
  creditDays: number | null;
}

export interface SaleSettlement {
  paymentStatus: PaymentStatus;
  paymentType: SalePaymentType;
  paidAmount: number;
  balanceDue: number;
  tenders: SaleTender[];
  creditDays?: number;
  dueDate?: string;
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function formatRupee(amount: number): string {
  const rounded = roundMoney(amount);
  const hasPaise = Math.abs(rounded - Math.trunc(rounded)) > 0.001;
  return rounded.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function creditDayOptions(defaultDays: number): number[] {
  return Array.from(new Set([defaultDays, ...CREDIT_DAY_PRESETS])).sort((a, b) => a - b);
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ?? method.replaceAll('_', ' ');
}

export function paymentStatusLabel(status: PaymentStatus): string {
  if (status === 'PAID') return 'Paid';
  if (status === 'PARTIAL') return 'Partially Paid';
  return 'Credit';
}

export function updatedOutstanding(previousOutstanding: number, balanceDue: number): number {
  return roundMoney(previousOutstanding + balanceDue);
}

function activeTenders(draft: SettlementDraft, billTotal: number): SaleTender[] {
  if (draft.mode === 'CREDIT') return [];
  if (draft.split) {
    return draft.tenders
      .filter((row) => row.method && row.amount != null && row.amount > 0)
      .map((row) => ({ method: row.method as PaymentMethod, amount: roundMoney(row.amount as number) }));
  }
  if (draft.mode === 'PAID' && draft.method) {
    return [{ method: draft.method, amount: roundMoney(billTotal) }];
  }
  if (draft.mode === 'PARTIAL' && draft.method && draft.partialAmount != null && draft.partialAmount > 0) {
    return [{ method: draft.method, amount: roundMoney(draft.partialAmount) }];
  }
  return [];
}

export function paidAmountFor(draft: SettlementDraft, billTotal: number): number {
  return roundMoney(activeTenders(draft, billTotal).reduce((sum, tender) => sum + tender.amount, 0));
}

export function resolveSettlement(draft: SettlementDraft, billTotal: number, saleDate: string): SaleSettlement | { error: string } {
  const bill = roundMoney(billTotal);
  if (bill <= 0) return { error: 'The bill total must be greater than zero.' };

  const rows = draft.split ? draft.tenders : [];
  if (draft.split) {
    if (rows.some((row) => row.amount != null && row.amount < 0)) {
      return { error: 'Payment amount cannot be negative.' };
    }
    if (rows.some((row) => row.amount != null && !Number.isFinite(row.amount))) {
      return { error: 'Enter a valid payment amount.' };
    }
    if (rows.some((row) => (row.amount ?? 0) > 0 && !row.method)) {
      return { error: 'Choose a payment method for each amount received.' };
    }
  } else if (draft.mode !== 'CREDIT') {
    if (draft.mode === 'PARTIAL') {
      if (draft.partialAmount == null || !Number.isFinite(draft.partialAmount)) {
        return { error: 'Enter a valid payment amount.' };
      }
      if (draft.partialAmount < 0) return { error: 'Payment amount cannot be negative.' };
      if (draft.partialAmount === 0) return { error: 'Enter the amount received, or choose Credit / Pay Later.' };
      if (draft.partialAmount > bill) return { error: 'Payment amount cannot exceed the bill total.' };
      if (draft.partialAmount === bill) return { error: 'This amount pays the bill in full. Choose Paid in Full.' };
    }
    if (!draft.method) return { error: 'Choose a payment method for the amount received.' };
  }

  const tenders = activeTenders(draft, bill);
  const paidAmount = roundMoney(tenders.reduce((sum, tender) => sum + tender.amount, 0));
  if (paidAmount > bill) return { error: 'Split payment total cannot exceed the bill total.' };
  if (paidAmount > 0 && tenders.length === 0) return { error: 'Choose a payment method for the amount received.' };

  const balanceDue = roundMoney(bill - paidAmount);
  const paymentStatus: PaymentStatus = balanceDue === 0 ? 'PAID' : paidAmount === 0 ? 'CREDIT' : 'PARTIAL';

  if (balanceDue > 0 && (draft.creditDays == null || draft.creditDays < 0)) {
    return { error: 'Choose credit terms for the remaining balance.' };
  }

  const paymentType = paymentTypeFor(paymentStatus, tenders);
  const dueDate = balanceDue > 0 ? addCalendarDays(saleDate, draft.creditDays ?? 0) : undefined;

  return {
    paymentStatus,
    paymentType,
    paidAmount,
    balanceDue,
    tenders,
    creditDays: balanceDue > 0 ? draft.creditDays ?? 0 : undefined,
    dueDate,
  };
}

export function paymentTypeFor(status: PaymentStatus, tenders: SaleTender[]): SalePaymentType {
  if (status === 'CREDIT') return 'CREDIT';
  if (status === 'PARTIAL') return 'PARTIAL';
  const active = tenders.filter((tender) => tender.amount > 0);
  if (active.length !== 1) return 'SPLIT';
  return active[0].method;
}
