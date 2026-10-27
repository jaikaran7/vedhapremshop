'use client';

import { useQuery } from '@tanstack/react-query';
import { getVendor, getVendorLedger, listVendors } from '@/api/vendors.api';
import { queryKeys } from '@/hooks/queries/keys';

export function useVendorsQuery() {
  return useQuery({
    queryKey: queryKeys.vendors,
    queryFn: listVendors,
  });
}

export function useVendorQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vendor(id ?? ''),
    queryFn: () => getVendor(id ?? ''),
    enabled: Boolean(id),
  });
}

/** Account statement: previous due, each bill and how much of it is paid, every payment. Owner and Manager. */
export function useVendorLedgerQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vendorLedger(id ?? ''),
    queryFn: () => getVendorLedger(id ?? ''),
    enabled: Boolean(id),
  });
}
