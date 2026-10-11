'use client';

import { useMutation } from '@tanstack/react-query';
import { createCustomer, deleteCustomer, updateCustomer } from '@/api/customers.api';
import { useInvalidateMandi } from '@/hooks/mutations/invalidate';
import type { Customer } from '@/types';

export function useCreateCustomerMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: Omit<Customer, 'id' | 'code' | 'createdAt' | 'outstandingAmount'>) => createCustomer(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCustomerMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Customer> }) => updateCustomer(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCustomerMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: invalidate,
  });
}
