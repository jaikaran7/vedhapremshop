'use client';

import { useMutation } from '@tanstack/react-query';
import { addOpeningStock, createStockAdjustment } from '@/api/stock.api';
import { useInvalidateMandi } from '@/hooks/mutations/invalidate';
import type { StockAdjustment } from '@/types';

export function useCreateStockAdjustmentMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: Omit<StockAdjustment, 'id' | 'status' | 'createdAt'>) => createStockAdjustment(input),
    onSuccess: invalidate,
  });
}

export function useAddOpeningStockMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: { lotNumber: string; markCode: string; bags: number; weightKg: number }) => addOpeningStock(input),
    onSuccess: invalidate,
  });
}
