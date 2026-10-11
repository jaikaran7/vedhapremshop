'use client';

import { useQuery } from '@tanstack/react-query';
import { listStockMovements } from '@/api/stock.api';
import { mockRepository } from '@/data/mock-repository';
import { mockInitialData } from '@/hooks/queries/options';
import { queryKeys } from '@/hooks/queries/keys';

export function useStockQuery() {
  return useQuery({
    queryKey: queryKeys.stock,
    queryFn: listStockMovements,
    ...mockInitialData(() => mockRepository.listStockMovements()),
  });
}
