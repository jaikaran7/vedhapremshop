'use client';

import { useMemo } from 'react';
import { useCustomersQuery } from '@/hooks/queries/use-customers-query';
import { useCashAccountsQuery, useExpenseCategoriesQuery, useExpensesQuery } from '@/hooks/queries/use-expenses-query';
import { usePaymentsQuery } from '@/hooks/queries/use-payments-query';
import { useSalesQuery } from '@/hooks/queries/use-sales-query';
import { buildFinanceSnapshot, categoryLines, resolveAllocations, type CollectionCategoryId } from '@/utils/collection-ledger';

export function useCollectionsQuery() {
  const paymentsQuery = usePaymentsQuery();
  const salesQuery = useSalesQuery();
  const expensesQuery = useExpensesQuery();
  const accountsQuery = useCashAccountsQuery();
  const categoriesQuery = useExpenseCategoriesQuery();
  const customersQuery = useCustomersQuery();

  const payments = useMemo(
    () => resolveAllocations(paymentsQuery.data ?? [], salesQuery.data ?? []),
    [paymentsQuery.data, salesQuery.data],
  );
  const expenses = expensesQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const expenseCategories = categoriesQuery.data ?? [];
  const customerOutstanding = (customersQuery.data ?? []).reduce((sum, customer) => sum + customer.outstandingAmount, 0);

  const finance = useMemo(
    () => buildFinanceSnapshot({
      payments,
      expenses,
      accounts,
      customerOutstanding,
    }),
    [payments, expenses, accounts, customerOutstanding],
  );

  const linesFor = (categoryId: CollectionCategoryId) => categoryLines(payments, categoryId);

  return {
    payments,
    expenses,
    accounts,
    expenseCategories,
    finance,
    linesFor,
  };
}
