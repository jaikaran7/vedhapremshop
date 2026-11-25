import { apiClient, idempotencyHeaders } from '@/api/client';
import type {
  CashAccount,
  CashBook,
  CollectionAllocation,
  CollectionCategoryId,
  DailyCollections,
  Expense,
  ExpenseCategory,
  Payment,
  PaymentMethod,
} from '@/types';

export interface RecordPaymentInput {
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  allocation?: CollectionAllocation;
}

export interface RecordExpenseInput {
  categoryId: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  accountId: string;
  reference?: string;
  trackingCategory?: CollectionCategoryId | null;
  /** Required for Purchase Payments: the vendor being paid. */
  vendorId?: string;
  nextPaymentDate?: string;
}

export interface NewExpenseCategoryInput {
  name: string;
  trackingCategory: CollectionCategoryId | null;
}

/** The most rows one date range returns; the server's largest page. */
const RANGE_LIMIT = 5000;

export async function listPayments(): Promise<Payment[]> {
  return apiClient<Payment[]>('/payments');
}

/** Only the receipts received between these dates (inclusive), so a screen never loads the whole history. */
export async function listPaymentsInRange(from: string, to: string): Promise<Payment[]> {
  return apiClient<Payment[]>(`/payments?from=${from}&to=${to}&limit=${RANGE_LIMIT}`);
}

export async function getPayment(id: string): Promise<Payment | null> {
  return apiClient<Payment>(`/payments/${id}`);
}

export async function recordPayment(input: RecordPaymentInput): Promise<Payment> {
  return apiClient<Payment>('/payments', { method: 'POST', body: JSON.stringify(input), headers: idempotencyHeaders() });
}

export async function listExpenses(): Promise<Expense[]> {
  return apiClient<Expense[]>('/expenses');
}

/** Only the payments out dated between these dates (inclusive). */
export async function listExpensesInRange(from: string, to: string): Promise<Expense[]> {
  return apiClient<Expense[]>(`/expenses?from=${from}&to=${to}&limit=${RANGE_LIMIT}`);
}

export async function getExpense(id: string): Promise<Expense> {
  return apiClient<Expense>(`/expenses/${id}`);
}

export async function listCashAccounts(): Promise<CashAccount[]> {
  return apiClient<CashAccount[]>('/cash-accounts');
}

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  return apiClient<ExpenseCategory[]>('/expense-categories');
}

export async function addExpenseCategory(input: NewExpenseCategoryInput): Promise<ExpenseCategory> {
  return apiClient<ExpenseCategory>('/expense-categories', { method: 'POST', body: JSON.stringify(input) });
}

export async function recordExpense(input: RecordExpenseInput): Promise<Expense> {
  return apiClient<Expense>('/expenses', { method: 'POST', body: JSON.stringify(input) });
}

/** Owner only: every account's opening, money in, money out and closing for one day, plus that day's entries. */
export async function getCashBook(date: string): Promise<CashBook> {
  return apiClient<CashBook>(`/cash-book?date=${date}`);
}

/** Everyone: what was collected on one day, by payment method. */
export async function getDailyCollections(date: string): Promise<DailyCollections> {
  return apiClient<DailyCollections>(`/collections/daily?date=${date}`);
}

/** Owner only: what is really in an account at the start of a day. Balances carry forward from there. */
export async function setAccountOpening(id: string, input: { openingBalance: number; openingDate: string }): Promise<CashAccount> {
  return apiClient<CashAccount>(`/cash-accounts/${id}/opening`, { method: 'PUT', body: JSON.stringify(input) });
}
