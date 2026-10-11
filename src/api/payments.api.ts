import { apiClient, emulateApi } from '@/api/client';
import { isMockApi } from '@/config/env';
import {
  mockRepository,
  type NewExpenseCategoryInput,
  type RecordExpenseInput,
  type RecordPaymentInput,
} from '@/data/mock-repository';
import type { CashAccount, Expense, ExpenseCategory, Payment } from '@/types';

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
  return apiClient<Payment>('/payments', { method: 'POST', body: JSON.stringify(input) });
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
