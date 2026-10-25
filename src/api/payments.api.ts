import { apiClient, emulateApi, idempotencyHeaders } from '@/api/client';
import { isMockApi } from '@/config/env';
import {
  mockRepository,
  type NewExpenseCategoryInput,
  type RecordExpenseInput,
  type RecordPaymentInput,
} from '@/data/mock-repository';
import type { CashAccount, CashBook, DailyCollections, Expense, ExpenseCategory, Payment } from '@/types';

export async function listPayments(): Promise<Payment[]> {
  if (isMockApi()) return emulateApi(mockRepository.listPayments());
  return apiClient<Payment[]>('/payments');
}

export async function getPayment(id: string): Promise<Payment | null> {
  if (isMockApi()) return emulateApi(mockRepository.getPayment(id));
  return apiClient<Payment>(`/payments/${id}`);
}

export async function recordPayment(input: RecordPaymentInput): Promise<Payment> {
  if (isMockApi()) return emulateApi(mockRepository.recordPayment(input));
  return apiClient<Payment>('/payments', { method: 'POST', body: JSON.stringify(input), headers: idempotencyHeaders() });
}

export async function listExpenses(): Promise<Expense[]> {
  if (isMockApi()) return emulateApi(mockRepository.listExpenses());
  return apiClient<Expense[]>('/expenses');
}

export async function listCashAccounts(): Promise<CashAccount[]> {
  if (isMockApi()) return emulateApi(mockRepository.listCashAccounts());
  return apiClient<CashAccount[]>('/cash-accounts');
}

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  if (isMockApi()) return emulateApi(mockRepository.listExpenseCategories());
  return apiClient<ExpenseCategory[]>('/expense-categories');
}

export async function addExpenseCategory(input: NewExpenseCategoryInput): Promise<ExpenseCategory> {
  if (isMockApi()) return emulateApi(mockRepository.addExpenseCategory(input));
  return apiClient<ExpenseCategory>('/expense-categories', { method: 'POST', body: JSON.stringify(input) });
}

export async function recordExpense(input: RecordExpenseInput): Promise<Expense> {
  if (isMockApi()) return emulateApi(mockRepository.recordExpense(input));
  return apiClient<Expense>('/expenses', { method: 'POST', body: JSON.stringify(input) });
}

/** Owner only: every account's opening, money in, money out and closing for one day, plus that day's entries. */
export async function getCashBook(date: string): Promise<CashBook> {
  if (isMockApi()) return emulateApi(mockRepository.getCashBook(date));
  return apiClient<CashBook>(`/cash-book?date=${date}`);
}

/** Everyone: what was collected on one day, by payment method. */
export async function getDailyCollections(date: string): Promise<DailyCollections> {
  if (isMockApi()) return emulateApi(mockRepository.getDailyCollections(date));
  return apiClient<DailyCollections>(`/collections/daily?date=${date}`);
}

/** Owner only: what is really in an account at the start of a day. Balances carry forward from there. */
export async function setAccountOpening(id: string, input: { openingBalance: number; openingDate: string }): Promise<CashAccount> {
  if (isMockApi()) return emulateApi(mockRepository.setAccountOpening(id, input.openingBalance, input.openingDate));
  return apiClient<CashAccount>(`/cash-accounts/${id}/opening`, { method: 'PUT', body: JSON.stringify(input) });
}
