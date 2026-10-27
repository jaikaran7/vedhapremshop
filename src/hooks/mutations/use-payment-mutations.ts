'use client';

import { useMutation } from '@tanstack/react-query';
import { addExpenseCategory, recordExpense, recordPayment, setAccountOpening } from '@/api/payments.api';
import type { NewExpenseCategoryInput, RecordExpenseInput, RecordPaymentInput } from '@/api/payments.api';
import { useInvalidateMandi } from '@/hooks/mutations/invalidate';

export function useRecordPaymentMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: RecordPaymentInput) => recordPayment(input),
    onSuccess: invalidate,
  });
}

export function useRecordExpenseMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: RecordExpenseInput) => recordExpense(input),
    onSuccess: invalidate,
  });
}

export function useAddExpenseCategoryMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: (input: NewExpenseCategoryInput) => addExpenseCategory(input),
    onSuccess: invalidate,
  });
}

export function useSetAccountOpeningMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; openingBalance: number; openingDate: string }) => setAccountOpening(id, input),
    onSuccess: invalidate,
  });
}
