'use client';

import { useQuery } from '@tanstack/react-query';
import { getSale, listSales } from '@/api/sales.api';
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
