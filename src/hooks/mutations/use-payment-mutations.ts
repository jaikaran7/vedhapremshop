'use client';

import { useMutation } from '@tanstack/react-query';
import { addExpenseCategory, recordExpense, recordPayment } from '@/api/payments.api';
import type { NewExpenseCategoryInput, RecordExpenseInput, RecordPaymentInput } from '@/data/mock-repository';
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
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: NewExpenseCategoryInput) => addExpenseCategory(input),
    onSuccess: invalidate,
  });
}
