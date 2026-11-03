'use client';

import { useQuery } from '@tanstack/react-query';
import { listEditedBills } from '@/api/sales.api';
import { queryKeys } from '@/hooks/queries/keys';

export function useEditedBillsQuery() {
  return useQuery({
    queryKey: queryKeys.editedBills,
    queryFn: listEditedBills,
  });
}
