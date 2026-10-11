'use client';

import { useMutation } from '@tanstack/react-query';
import { createSale, noteSaleCorrection, requestSaleEdit } from '@/api/sales.api';
import { useInvalidateMandi } from '@/hooks/mutations/invalidate';
import type { Sale } from '@/types';

export function useCreateSaleMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: Omit<Sale, 'id' | 'billNumber' | 'createdAt'>) => createSale(input),
    onSuccess: invalidate,
  });
}

export function useNoteSaleCorrectionMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({ saleId, note }: { saleId: string; note: string }) => noteSaleCorrection(saleId, note),
    onSuccess: invalidate,
  });
}

export function useRequestSaleEditMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({ saleId, requestedData, reason }: { saleId: string; requestedData: unknown; reason: string }) =>
      requestSaleEdit(saleId, requestedData, reason),
    onSuccess: invalidate,
  });
}
