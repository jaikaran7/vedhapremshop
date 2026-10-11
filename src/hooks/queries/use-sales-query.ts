'use client';

import { useQuery } from '@tanstack/react-query';
import { getSale, listSales } from '@/api/sales.api';
import { mockRepository } from '@/data/mock-repository';
import { mockInitialData } from '@/hooks/queries/options';
import { queryKeys } from '@/hooks/queries/keys';

export function useSalesQuery() {
  return useQuery({
    queryKey: queryKeys.sales,
    queryFn: listSales,
    ...mockInitialData(() => mockRepository.listSales()),
  });
}

export function useSaleQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sale(id ?? ''),
    queryFn: () => getSale(id ?? ''),
    enabled: Boolean(id),
    ...mockInitialData(() => (id ? mockRepository.getSale(id) : null)),
  });
}
