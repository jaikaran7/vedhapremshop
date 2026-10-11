'use client';

import { useQuery } from '@tanstack/react-query';
import { listCashAccounts, listExpenseCategories, listExpenses } from '@/api/payments.api';
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
