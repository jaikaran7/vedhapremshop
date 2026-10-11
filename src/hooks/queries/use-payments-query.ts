'use client';

import { useQuery } from '@tanstack/react-query';
import { getPayment, listPayments } from '@/api/payments.api';
import { mockRepository } from '@/data/mock-repository';
import { mockInitialData } from '@/hooks/queries/options';
import { queryKeys } from '@/hooks/queries/keys';

export function usePaymentsQuery() {
  return useQuery({
    queryKey: queryKeys.payments,
    queryFn: listPayments,
    ...mockInitialData(() => mockRepository.listPayments()),
  });
}

export function usePaymentQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.payment(id ?? ''),
    queryFn: () => getPayment(id ?? ''),
    enabled: Boolean(id),
    ...mockInitialData(() => (id ? mockRepository.getPayment(id) : null)),
  });
}
