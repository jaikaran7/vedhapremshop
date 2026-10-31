'use client';

import { useQuery } from '@tanstack/react-query';
import { getScan, listScans } from '@/api/consignment-scans.api';
import { queryKeys } from '@/hooks/queries/keys';

export function useConsignmentScansQuery() {
  return useQuery({ queryKey: queryKeys.consignmentScans, queryFn: listScans });
}

/** Polls every 2 s while the server says the documents are being read, so progress shows on any screen and survives a reload. */
export function useConsignmentScanQuery(id: string | undefined, reading = false) {
  return useQuery({
    queryKey: queryKeys.consignmentScan(id ?? ''),
    queryFn: () => getScan(id ?? ''),
    enabled: Boolean(id),
    refetchInterval: (query) => (reading || query.state.data?.status === 'PROCESSING' ? 2000 : false),
  });
}
