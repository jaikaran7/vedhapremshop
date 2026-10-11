'use client';

import { useQuery } from '@tanstack/react-query';
import { getLot, listLots } from '@/api/lots.api';
import { mockRepository } from '@/data/mock-repository';
import { mockInitialData } from '@/hooks/queries/options';
import { queryKeys } from '@/hooks/queries/keys';

export function useLotsQuery() {
  return useQuery({
    queryKey: queryKeys.lots,
    queryFn: listLots,
    ...mockInitialData(() => mockRepository.listLots()),
  });
}

export function useLotQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lot(id ?? ''),
    queryFn: () => getLot(id ?? ''),
    enabled: Boolean(id),
    ...mockInitialData(() => (id ? mockRepository.getLot(id) : null)),
  });
}
