import type { CollectionAllocation, PaymentMethod } from '@/types';
import { roundMoney } from '@/utils/settlement';

export type { CollectionAllocation };

/**
 * Receipts are split across invoice components in this order:
 * onion product, Amali, other product sales, market fee, then other charges.
 * A receipt is applied to the bill named in its reference first, then to that
 * customer's other invoices that already have cash received, oldest first.
 * Unpaid credit invoices are skipped, so a credit bill is never treated as cash collected.
 * Any remainder is Other Collections. Earlier receipts consume a component first,
 * so the same rupee is not allocated twice. The parts always sum to the receipt.
 */
export const COLLECTION_CATEGORIES = [
  { id: 'ONION_SALES', label: 'Onion Sales Collections', shortLabel: 'Onion Sales', field: 'onionSales' },
  { id: 'AMALI', label: 'Amali Collections', shortLabel: 'Amali', field: 'amali' },
  { id: 'OTHER_PRODUCT', label: 'Other Product Sales Collections', shortLabel: 'Other Product Sales', field: 'otherProduct' },
  { id: 'MARKET_FEE', label: 'Market Fee Collections', shortLabel: 'Market Fee', field: 'marketFee' },
  { id: 'OTHER', label: 'Other Collections', shortLabel: 'Other Collections', field: 'other' },
] as const;

export type CollectionCategoryId = (typeof COLLECTION_CATEGORIES)[number]['id'];
export type AllocationField = (typeof COLLECTION_CATEGORIES)[number]['field'];

export const EMPTY_ALLOCATION: CollectionAllocation = {
  onionSales: 0,
  amali: 0,
  otherProduct: 0,
  marketFee: 0,
  other: 0,
};

const ALLOCATION_FIELDS: AllocationField[] = ['onionSales', 'amali', 'otherProduct', 'marketFee', 'other'];

export interface AllocatableSale {
  id: string;
  billNumber: string;
  customerId: string;
  date: string;
  createdAt?: string;
  paidAmount: number;
  totalAmount: number;
  productSubtotal?: number;
  otherProductAmount?: number;
  charges?: {
    productSubtotal: number;
    amaliAmount: number;
    marketFeeAmount: number;
    otherCharges: number;
  };
}

export interface AllocatablePayment {
  id: string;
  customerId: string;
  customerName?: string;
  amount: number;
  date: string;
  createdAt?: string;
  time?: string;
  paymentMethod: PaymentMethod | string;
  receiptNumber?: string;
  referenceNumber?: string;
  allocation?: CollectionAllocation | null;
}

export interface LedgerExpense {
  id: string;
  categoryId: string;
  categoryName: string;
  trackingCategory?: CollectionCategoryId | null;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod | string;
  accountId: string;
  reference?: string;
}

export interface LedgerAccount {
  id: string;
  name: string;
  kind: 'CASH' | 'BANK' | 'UPI';
  openingBalance: number;
}

export function allocationTotal(allocation: CollectionAllocation): number {
  return roundMoney(ALLOCATION_FIELDS.reduce((sum, field) => sum + Number(allocation[field] || 0), 0));
}

export function isCollectionCategory(value: string): value is CollectionCategoryId {
  return COLLECTION_CATEGORIES.some((category) => category.id === value);
}

export function categoryField(id: CollectionCategoryId): AllocationField {
  return COLLECTION_CATEGORIES.find((category) => category.id === id)?.field ?? 'other';
}

export function categoryLabel(id: CollectionCategoryId): string {
  return COLLECTION_CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

function invoiceCapacity(sale: AllocatableSale): CollectionAllocation {
  if (sale.charges) {
    return {
      onionSales: roundMoney(Math.max(0, sale.charges.productSubtotal)),
      amali: roundMoney(Math.max(0, sale.charges.amaliAmount)),
      otherProduct: roundMoney(Math.max(0, sale.otherProductAmount ?? 0)),
      marketFee: roundMoney(Math.max(0, sale.charges.marketFeeAmount)),
      other: roundMoney(Math.max(0, sale.charges.otherCharges)),
    };
  }
  return {
    onionSales: roundMoney(Math.max(0, sale.productSubtotal ?? sale.totalAmount)),
    amali: 0,
    otherProduct: roundMoney(Math.max(0, sale.otherProductAmount ?? 0)),
    marketFee: 0,
    other: 0,
  };
}

function cloneAllocation(allocation: CollectionAllocation): CollectionAllocation {
  return { ...allocation };
}

function consume(capacity: CollectionAllocation, budget: number, into: CollectionAllocation): number {
  let left = roundMoney(budget);
  for (const field of ALLOCATION_FIELDS) {
    if (left <= 0) break;
    const available = roundMoney(Math.max(0, capacity[field]));
    const taken = roundMoney(Math.min(left, available));
    if (taken <= 0) continue;
    capacity[field] = roundMoney(available - taken);
    into[field] = roundMoney(into[field] + taken);
    left = roundMoney(left - taken);
  }
  return left;
}

function explicitAllocation(payment: AllocatablePayment): CollectionAllocation | null {
  if (!payment.allocation) return null;
  const normalized = cloneAllocation(EMPTY_ALLOCATION);
  for (const field of ALLOCATION_FIELDS) {
    const value = Number(payment.allocation[field] || 0);
    if (!Number.isFinite(value) || value < 0) return null;
    normalized[field] = roundMoney(value);
  }
  return allocationTotal(normalized) === roundMoney(payment.amount) ? normalized : null;
}

function sortedPayments<T extends AllocatablePayment>(payments: T[]): T[] {
  return [...payments].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
    return byDate || a.id.localeCompare(b.id);
  });
}

function sortedSales(sales: AllocatableSale[]): AllocatableSale[] {
  return [...sales].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id));
}

function eligibleSales(payment: AllocatablePayment, sales: AllocatableSale[]): AllocatableSale[] {
  const own = sortedSales(sales.filter((sale) => sale.customerId === payment.customerId));
  const linked = own.find((sale) => payment.referenceNumber && sale.billNumber === payment.referenceNumber);
  const paid = own.filter((sale) => roundMoney(sale.paidAmount) > 0 && sale.id !== linked?.id);
  return linked ? [linked, ...paid] : paid;
}

export function allocatePayment(
  payment: AllocatablePayment,
  priorPayments: AllocatablePayment[],
  sales: AllocatableSale[],
): CollectionAllocation {
  const capacity = new Map<string, CollectionAllocation>();
  for (const sale of sales) capacity.set(sale.id, invoiceCapacity(sale));

  for (const earlier of sortedPayments(priorPayments)) {
    const explicit = explicitAllocation(earlier);
    if (explicit) applyToCapacity(earlier, explicit, sales, capacity);
    else drawAllocation(earlier, sales, capacity);
  }

  return explicitAllocation(payment) ?? drawAllocation(payment, sales, capacity);
}

function drawAllocation(
  payment: AllocatablePayment,
  sales: AllocatableSale[],
  capacity: Map<string, CollectionAllocation>,
): CollectionAllocation {
  const allocation = cloneAllocation(EMPTY_ALLOCATION);
  let left = roundMoney(Math.max(0, payment.amount));
  for (const sale of eligibleSales(payment, sales)) {
    const remaining = capacity.get(sale.id);
    if (!remaining) continue;
    left = consume(remaining, left, allocation);
  }
  if (left > 0) allocation.other = roundMoney(allocation.other + left);
  return allocation;
}

function applyToCapacity(
  payment: AllocatablePayment,
  allocation: CollectionAllocation,
  sales: AllocatableSale[],
  capacity: Map<string, CollectionAllocation>,
) {
  const leftover = cloneAllocation(allocation);
  for (const sale of eligibleSales(payment, sales)) {
    const remaining = capacity.get(sale.id);
    if (!remaining) continue;
    for (const field of ALLOCATION_FIELDS) {
      const taken = roundMoney(Math.min(leftover[field], Math.max(0, remaining[field])));
      remaining[field] = roundMoney(remaining[field] - taken);
      leftover[field] = roundMoney(leftover[field] - taken);
    }
  }
}

export function resolveAllocations<T extends AllocatablePayment>(payments: T[], sales: AllocatableSale[]): (T & { allocation: CollectionAllocation })[] {
  const ordered = sortedPayments(payments);
  const resolved: (T & { allocation: CollectionAllocation })[] = [];
  for (const payment of ordered) {
    const allocation = allocatePayment(payment, resolved, sales);
    resolved.push({ ...payment, allocation });
  }
  return resolved;
}

export interface CollectionLine {
  id: string;
  date: string;
  time?: string;
  reference: string;
  party: string;
  paymentMethod: string;
  amount: number;
  receiptTotal: number;
}

export function categoryLines(payments: AllocatablePayment[], categoryId: CollectionCategoryId): CollectionLine[] {
  const field = categoryField(categoryId);
  return sortedPayments(payments).flatMap((payment) => {
    const allocation = payment.allocation ?? EMPTY_ALLOCATION;
    const amount = roundMoney(allocation[field] || 0);
    if (amount <= 0) return [];
    return [{
      id: `${payment.id}-${categoryId}`,
      date: payment.date,
      time: payment.time,
      reference: payment.receiptNumber || payment.referenceNumber || payment.id,
      party: payment.customerName ?? payment.customerId,
      paymentMethod: String(payment.paymentMethod),
      amount,
      receiptTotal: roundMoney(payment.amount),
    }];
  });
}

export function accountForMethod(method: string, accounts: { id: string; kind: LedgerAccount['kind'] }[]): string | null {
  const wanted: LedgerAccount['kind'] = method === 'UPI' || method === 'QR'
    ? 'UPI'
    : method === 'BANK_TRANSFER' || method === 'CHEQUE' || method === 'CARD'
      ? 'BANK'
      : 'CASH';
  return accounts.find((account) => account.kind === wanted)?.id
    ?? accounts.find((account) => account.kind === 'BANK')?.id
    ?? accounts.find((account) => account.kind === 'CASH')?.id
    ?? null;
}

export interface FinanceSnapshot {
  grossCollections: number;
  collectionsByCategory: Record<CollectionCategoryId, number>;
  expensesByCategory: Record<string, number>;
  expensesByTracking: Partial<Record<CollectionCategoryId, number>>;
  totalExpenses: number;
  netCashFlow: number;
  netCategoryBalance: Record<CollectionCategoryId, number>;
  accountBalances: { id: string; name: string; kind: LedgerAccount['kind']; balance: number }[];
  customerOutstanding: number;
}

function emptyCategories(): Record<CollectionCategoryId, number> {
  return { ONION_SALES: 0, AMALI: 0, OTHER_PRODUCT: 0, MARKET_FEE: 0, OTHER: 0 };
}

export function buildFinanceSnapshot(input: {
  payments: AllocatablePayment[];
  expenses: LedgerExpense[];
  accounts: LedgerAccount[];
  customerOutstanding: number;
}): FinanceSnapshot {
  const collectionsByCategory = emptyCategories();
  for (const payment of input.payments) {
    const allocation = payment.allocation ?? EMPTY_ALLOCATION;
    for (const category of COLLECTION_CATEGORIES) {
      collectionsByCategory[category.id] = roundMoney(collectionsByCategory[category.id] + Number(allocation[category.field] || 0));
    }
  }
  const grossCollections = roundMoney(input.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
  const expensesByCategory: Record<string, number> = {};
  const expensesByTracking: Partial<Record<CollectionCategoryId, number>> = {};
  for (const expense of input.expenses) {
    expensesByCategory[expense.categoryId] = roundMoney((expensesByCategory[expense.categoryId] ?? 0) + expense.amount);
    if (expense.trackingCategory) {
      expensesByTracking[expense.trackingCategory] = roundMoney((expensesByTracking[expense.trackingCategory] ?? 0) + expense.amount);
    }
  }
  const totalExpenses = roundMoney(input.expenses.reduce((sum, expense) => sum + expense.amount, 0));
  const netCategoryBalance = emptyCategories();
  for (const category of COLLECTION_CATEGORIES) {
    netCategoryBalance[category.id] = roundMoney(collectionsByCategory[category.id] - (expensesByTracking[category.id] ?? 0));
  }
  const accountBalances = input.accounts.map((account) => {
    const received = input.payments.reduce((sum, payment) => (
      accountForMethod(String(payment.paymentMethod), input.accounts) === account.id ? sum + payment.amount : sum
    ), 0);
    const paidOut = input.expenses.reduce((sum, expense) => (
      expense.accountId === account.id ? sum + expense.amount : sum
    ), 0);
    return {
      id: account.id,
      name: account.name,
      kind: account.kind,
      balance: roundMoney(account.openingBalance + received - paidOut),
    };
  });
  return {
    grossCollections,
    collectionsByCategory,
    expensesByCategory,
    expensesByTracking,
    totalExpenses,
    netCashFlow: roundMoney(grossCollections - totalExpenses),
    netCategoryBalance,
    accountBalances,
    customerOutstanding: roundMoney(input.customerOutstanding),
  };
}

export function validateExpense(input: {
  categoryId: string;
  amount: number;
  date: string;
  paymentMethod: string;
  accountId: string;
}): string | null {
  if (!input.categoryId.trim()) return 'Choose an expense category';
  if (!Number.isFinite(input.amount) || input.amount <= 0) return 'Amount must be greater than zero';
  if (!input.date.trim()) return 'Choose a date';
  if (!input.paymentMethod.trim()) return 'Choose a payment method';
  if (!input.accountId.trim()) return 'Choose the account the expense was paid from';
  return null;
}
