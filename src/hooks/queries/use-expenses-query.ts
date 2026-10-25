'use client';

import { useQuery } from '@tanstack/react-query';
import { getCashBook, getDailyCollections, listCashAccounts, listExpenseCategories, listExpenses } from '@/api/payments.api';
import { mockRepository } from '@/data/mock-repository';
import { mockInitialData } from '@/hooks/queries/options';
import { queryKeys } from '@/hooks/queries/keys';

export function useExpensesQuery() {
  return useQuery({
    queryKey: queryKeys.expenses,
    queryFn: listExpenses,
    ...mockInitialData(() => mockRepository.listExpenses()),
  });
}

export function useCashAccountsQuery() {
  return useQuery({
    queryKey: queryKeys.cashAccounts,
    queryFn: listCashAccounts,
    ...mockInitialData(() => mockRepository.listCashAccounts()),
  });
}

export function useExpenseCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.expenseCategories,
    queryFn: listExpenseCategories,
    ...mockInitialData(() => mockRepository.listExpenseCategories()),
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
