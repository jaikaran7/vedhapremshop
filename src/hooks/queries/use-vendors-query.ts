'use client';

import { useQuery } from '@tanstack/react-query';
import { getVendor, listVendors } from '@/api/vendors.api';
import { mockRepository } from '@/data/mock-repository';
import { mockInitialData } from '@/hooks/queries/options';
import { queryKeys } from '@/hooks/queries/keys';

export function useVendorsQuery() {
  return useQuery({
    queryKey: queryKeys.vendors,
    queryFn: listVendors,
    ...mockInitialData(() => mockRepository.listVendors()),
  });
}

export function useVendorQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vendor(id ?? ''),
    queryFn: () => getVendor(id ?? ''),
    enabled: Boolean(id),
    ...mockInitialData(() => (id ? mockRepository.getVendor(id) : null)),
  });
}
