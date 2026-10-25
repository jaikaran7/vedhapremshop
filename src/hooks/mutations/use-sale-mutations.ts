'use client';

import { useMutation } from '@tanstack/react-query';
import { cancelSale, createSale, noteSaleCorrection, rebillSale, requestSaleEdit, type NewSaleInput } from '@/api/sales.api';
import { useInvalidateMandi } from '@/hooks/mutations/invalidate';

export function useCreateSaleMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: NewSaleInput) => createSale(input),
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

export function useCancelSaleMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({ saleId, reason }: { saleId: string; reason: string }) => cancelSale(saleId, reason),
    onSuccess: invalidate,
  });
}

export function useRebillSaleMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({ saleId, input, reason }: { saleId: string; input: NewSaleInput; reason: string }) => rebillSale(saleId, input, reason),
    onSuccess: invalidate,
  });
}
