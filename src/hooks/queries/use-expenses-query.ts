'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getCashBook, getDailyCollections, getExpense, listCashAccounts, listExpenseCategories, listExpenses, listExpensesInRange } from '@/api/payments.api';
import { queryKeys } from '@/hooks/queries/keys';

export function useExpensesQuery() {
  return useQuery({
    queryKey: queryKeys.expenses,
    queryFn: listExpenses,
  });
}

/** Payments out for the chosen dates only. */
export function useExpensesRangeQuery(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.expensesRange(from, to),
    queryFn: () => listExpensesInRange(from, to),
    placeholderData: keepPreviousData,
  });
}

export function useExpenseQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.expense(id ?? ''),
    queryFn: () => getExpense(id!),
    enabled: Boolean(id),
  });
}

export function useCashAccountsQuery() {
  return useQuery({
    queryKey: queryKeys.cashAccounts,
    queryFn: listCashAccounts,
  });
}

export function useExpenseCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.expenseCategories,
    queryFn: listExpenseCategories,
  });
}

/** Owner only. */
export function useCashBookQuery(date: string, enabled = true) {
  return useQuery({ queryKey: queryKeys.cashBook(date), queryFn: () => getCashBook(date), enabled: enabled && Boolean(date) });
}

/** What was collected on a day: for everyone. */
export function useDailyCollectionsQuery(date: string) {
  return useQuery({ queryKey: queryKeys.dailyCollections(date), queryFn: () => getDailyCollections(date), enabled: Boolean(date) });
}
