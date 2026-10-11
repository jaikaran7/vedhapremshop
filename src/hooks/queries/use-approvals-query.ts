'use client';

import { useQuery } from '@tanstack/react-query';
import { listApprovals } from '@/api/approvals.api';
import { mockRepository } from '@/data/mock-repository';
import { mockInitialData } from '@/hooks/queries/options';
import { queryKeys } from '@/hooks/queries/keys';

export function useApprovalsQuery() {
  return useQuery({
    queryKey: queryKeys.approvals,
    queryFn: listApprovals,
    ...mockInitialData(() => mockRepository.listApprovals()),
  });
}
