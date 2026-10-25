'use client';

import { useQuery } from '@tanstack/react-query';
import { getPurchase, listPurchaseRevisions, listPurchases } from '@/api/purchases.api';
import { mockRepository } from '@/data/mock-repository';
import { mockInitialData } from '@/hooks/queries/options';
import { queryKeys } from '@/hooks/queries/keys';

export function usePurchasesQuery() {
  return useQuery({
    queryKey: queryKeys.purchases,
    queryFn: listPurchases,
    ...mockInitialData(() => mockRepository.listPurchases()),
  });
}

export function usePurchaseQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.purchase(id ?? ''),
    queryFn: () => getPurchase(id ?? ''),
    enabled: Boolean(id),
    ...mockInitialData(() => (id ? mockRepository.getPurchase(id) : null)),
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
