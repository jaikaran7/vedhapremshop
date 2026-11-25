'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getPurchase, listPurchaseRevisions, listPurchases, listPurchasesPage, type PurchaseFilters } from '@/api/purchases.api';
import { queryKeys } from '@/hooks/queries/keys';

export function usePurchasesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.purchases,
    queryFn: listPurchases,
    enabled,
  });
}

/** One page of consignments for the list screen: only the newest few until the person asks for more or narrows the list. */
export function usePurchasesPageQuery(filters: PurchaseFilters, limit: number) {
  return useQuery({
    queryKey: queryKeys.purchasesPage(filters, limit),
    queryFn: () => listPurchasesPage(filters, limit),
    placeholderData: keepPreviousData,
  });
}

export function usePurchaseQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.purchase(id ?? ''),
    queryFn: () => getPurchase(id ?? ''),
    enabled: Boolean(id),
  });
}

/** Every correction made to a bill, newest first. Only fetched when the bill has been corrected. */
export function usePurchaseRevisionsQuery(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.purchaseRevisions(id ?? ''),
    queryFn: () => listPurchaseRevisions(id ?? ''),
    enabled: Boolean(id) && enabled,
  });
}
