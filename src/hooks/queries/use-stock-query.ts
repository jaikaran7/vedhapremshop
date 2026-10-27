'use client';

import { useQuery } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { listStockMovements, listStockMovementsPage, type StockMovementFilters } from '@/api/stock.api';
import { queryKeys } from '@/hooks/queries/keys';

export function useStockQuery() {
  return useQuery({
    queryKey: queryKeys.stock,
    queryFn: listStockMovements,
  });
}

/** Filtered, paged movement history. Pass a bigger `limit` to show more; the server says how many rows match in total. */
export function useStockMovementsPageQuery(filters: StockMovementFilters, limit: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.stockPage(filters, limit),
    queryFn: () => listStockMovementsPage(filters, limit),
    placeholderData: keepPreviousData,
    enabled,
  });
}
