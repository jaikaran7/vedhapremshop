'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getPayment, listPayments, listPaymentsInRange } from '@/api/payments.api';
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

/** Receipts for the chosen dates only. */
export function usePaymentsRangeQuery(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.paymentsRange(from, to),
    queryFn: () => listPaymentsInRange(from, to),
    placeholderData: keepPreviousData,
  });
}
