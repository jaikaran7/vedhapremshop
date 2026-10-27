'use client';

import { useQuery } from '@tanstack/react-query';
import { getPayment, listPayments } from '@/api/payments.api';
import { queryKeys } from '@/hooks/queries/keys';

export function usePaymentsQuery() {
  return useQuery({
    queryKey: queryKeys.payments,
    queryFn: listPayments,
  });
}

export function usePaymentQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.payment(id ?? ''),
    queryFn: () => getPayment(id ?? ''),
    enabled: Boolean(id),
  });
}
