'use client';

import { useQuery } from '@tanstack/react-query';
import { listApprovals } from '@/api/approvals.api';
import { queryKeys } from '@/hooks/queries/keys';

export function useApprovalsQuery() {
  return useQuery({
    queryKey: queryKeys.approvals,
    queryFn: listApprovals,
  });
}
