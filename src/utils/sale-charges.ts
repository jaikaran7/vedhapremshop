import type { Sale, SaleChargeSettings, SaleChargeSnapshot } from '@/types';
import { roundMoney } from '@/utils/settlement';

export const DEFAULT_SALE_CHARGE_SETTINGS: SaleChargeSettings = {
  amaliPerBag: 20,
  marketFeePerBag: 10,
  amaliEnabled: true,
  marketFeeEnabled: true,
};

export function validateChargeAmount(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'Enter an amount';
  if (trimmed.startsWith('-')) return 'Amount cannot be negative';
  if (/^\d+\.\d{3,}$/.test(trimmed)) return 'Use at most two decimal places';
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return 'Enter a valid amount';
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return 'Enter a valid amount';
  return null;
}

export function countSaleBags(items: { bags: number }[]): number {
  return items.reduce((sum, item) => sum + Number(item.bags || 0), 0);
}

/** Optional GST/tax typed on the bill: a percentage or a rupee amount (not both). */
export interface BillTax {
  percent?: number | null;
  amount?: number | null;
}

/**
 * Tax in rupees. A percentage applies to the whole invoice before tax and is rounded to the whole rupee, half up (integer
 * paise × thousandths of a percent, the same arithmetic as the backend); a typed amount is kept as entered.
 */
export function taxAmountFor(preTaxAmount: number, tax?: BillTax): number {
  if (tax?.percent != null) {
    const paise = Math.round(preTaxAmount * 100);
    const thousandths = Math.round(tax.percent * 1000);
    return Math.floor((paise * thousandths + 5_000_000) / 10_000_000);
  }
  return roundMoney(Math.max(0, tax?.amount ?? 0));
}

export function calculateSaleCharges(input: {
  totalBags: number;
  productSubtotal: number;
  settings: SaleChargeSettings;
  otherCharges?: number;
  tax?: BillTax;
}): SaleChargeSnapshot {
  const bagCount = Math.max(0, Number(input.totalBags) || 0);
  const productSubtotal = roundMoney(input.productSubtotal);
  const otherCharges = roundMoney(Math.max(0, input.otherCharges ?? 0));
  const amaliAmount = input.settings.amaliEnabled
    ? roundMoney(bagCount * input.settings.amaliPerBag)
    : 0;
  const marketFeeAmount = input.settings.marketFeeEnabled
    ? roundMoney(bagCount * input.settings.marketFeePerBag)
    : 0;
  const taxAmount = taxAmountFor(productSubtotal + amaliAmount + marketFeeAmount + otherCharges, input.tax);
  const totalAdditionalCharges = roundMoney(amaliAmount + marketFeeAmount + otherCharges + taxAmount);
  return {
    amaliPerBag: input.settings.amaliPerBag,
    marketFeePerBag: input.settings.marketFeePerBag,
    amaliEnabled: input.settings.amaliEnabled,
    marketFeeEnabled: input.settings.marketFeeEnabled,
    bagCount,
    amaliAmount,
    marketFeeAmount,
    otherCharges,
    productSubtotal,
    taxPercent: input.tax?.percent ?? null,
    taxAmount,
    totalAdditionalCharges,
    finalInvoiceAmount: roundMoney(productSubtotal + totalAdditionalCharges),
  };
}

/** Finalized invoices keep their saved snapshot. Missing snapshots were billed before mandi fees. */
export function chargesForSale(
  sale: Pick<Sale, 'charges' | 'totalAmount' | 'totalBags' | 'productSubtotal'>,
): SaleChargeSnapshot {
  if (sale.charges) return sale.charges;
  const productSubtotal = roundMoney(sale.productSubtotal ?? sale.totalAmount);
  return {
    amaliPerBag: 0,
    marketFeePerBag: 0,
    amaliEnabled: false,
    marketFeeEnabled: false,
    bagCount: sale.totalBags,
    amaliAmount: 0,
    marketFeeAmount: 0,
    otherCharges: 0,
    productSubtotal,
    totalAdditionalCharges: 0,
    finalInvoiceAmount: roundMoney(sale.totalAmount),
  };
}

export function balanceAfterPayment(finalInvoiceAmount: number, amountPaid: number): number {
  return roundMoney(finalInvoiceAmount - amountPaid);
}

export function feeBasisLabel(bags: number, rate: number, enabled: boolean): string {
  if (!enabled) return 'Not charged';
  return `${bags} bags × ₹${rate}`;
}
