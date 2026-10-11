'use client';

import { useMutation } from '@tanstack/react-query';
import { createPurchase } from '@/api/purchases.api';
import { useInvalidateMandi } from '@/hooks/mutations/invalidate';
import type { Purchase } from '@/types';

export function useCreatePurchaseMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: Omit<Purchase, 'id' | 'createdAt'>) => createPurchase(input),
    onSuccess: invalidate,
  });
}
