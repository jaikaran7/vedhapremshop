'use client';

import { useMutation } from '@tanstack/react-query';
import { createPurchase, receiveConsignment, saveReceivingDraft, updatePurchase } from '@/api/purchases.api';
import { useInvalidateMandi } from '@/hooks/mutations/invalidate';
import type { Purchase } from '@/types';
import type { ReceivingDraft } from '@/utils/receiving';

export function useCreatePurchaseMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: Omit<Purchase, 'id' | 'createdAt'>) => createPurchase(input),
    onSuccess: invalidate,
  });
}

export function useReceiveConsignmentMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: ReceivingDraft }) => receiveConsignment(id, draft),
    onSuccess: invalidate,
  });
}

export function useSaveReceivingDraftMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: ReceivingDraft }) => saveReceivingDraft(id, draft),
    onSuccess: invalidate,
  });
}

export function useUpdatePurchaseMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Omit<Purchase, 'id' | 'createdAt'> & { reason: string } }) => updatePurchase(id, input),
    onSuccess: invalidate,
  });
}
