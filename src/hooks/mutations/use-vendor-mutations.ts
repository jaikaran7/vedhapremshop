'use client';

import { useMutation } from '@tanstack/react-query';
import { createVendor, updateVendor } from '@/api/vendors.api';
import { useInvalidateMandi } from '@/hooks/mutations/invalidate';
import type { Vendor } from '@/types';

export function useCreateVendorMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: Omit<Vendor, 'id' | 'code' | 'createdAt' | 'totalPurchases' | 'payableAmount'>) =>
      createVendor(input),
    onSuccess: invalidate,
  });
}

export function useUpdateVendorMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Vendor> }) => updateVendor(id, input),
    onSuccess: invalidate,
  });
}
