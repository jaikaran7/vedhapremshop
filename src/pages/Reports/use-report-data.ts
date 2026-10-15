'use client';

import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { usePurchasesQuery } from '@/hooks/queries/use-purchases-query';
import { useSalesQuery } from '@/hooks/queries/use-sales-query';
import { useStockQuery } from '@/hooks/queries/use-stock-query';
import { useCustomersQuery, useLedgerQuery } from '@/hooks/queries/use-customers-query';
import { usePaymentsQuery } from '@/hooks/queries/use-payments-query';
import { useProductsQuery } from '@/hooks/queries/use-directory-query';

export function useReportData() {
  const lots = useLotsQuery();
  const purchases = usePurchasesQuery();
  const sales = useSalesQuery();
  const stock = useStockQuery();
  const customers = useCustomersQuery();
  const payments = usePaymentsQuery();
  const products = useProductsQuery();
  const ledger = useLedgerQuery();
  const queries = [lots, purchases, sales, stock, customers, payments, products, ledger];
  return {
    lots: lots.data ?? [],
    purchases: purchases.data ?? [],
    sales: sales.data ?? [],
    stockMovements: stock.data ?? [],
    customers: customers.data ?? [],
    payments: payments.data ?? [],
    products: products.data ?? [],
    ledger: ledger.data ?? [],
    loading: queries.some((query) => query.isLoading && query.data == null),
    error: queries.some((query) => query.isError),
  };
}
