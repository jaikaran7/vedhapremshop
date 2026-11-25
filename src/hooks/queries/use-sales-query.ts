'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getSale, getSalesSummary, listSales, listSalesPage, type SaleFilters } from '@/api/sales.api';
import { queryKeys } from '@/hooks/queries/keys';

export function useSalesQuery() {
  return useQuery({
    queryKey: queryKeys.sales,
    queryFn: listSales,
  });
}

export function useSaleQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sale(id ?? ''),
    queryFn: () => getSale(id ?? ''),
    enabled: Boolean(id),
  });
}

/** Filtered, paged bill list. The server sends only this page and says how many bills match in all. */
export function useSalesPageQuery(filters: SaleFilters, limit: number) {
  return useQuery({
    queryKey: queryKeys.salesPage(filters, limit),
    queryFn: () => listSalesPage(filters, limit),
    placeholderData: keepPreviousData,
  });
}

/** Totals for the same filters, so the heading is right without loading every bill. */
export function useSalesSummaryQuery(filters: SaleFilters, withCredit = false) {
  return useQuery({
    queryKey: queryKeys.salesSummary(filters, withCredit),
    queryFn: () => getSalesSummary(filters, withCredit),
    placeholderData: keepPreviousData,
  });
}
