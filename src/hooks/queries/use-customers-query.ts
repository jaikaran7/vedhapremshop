'use client';

import { useQuery } from '@tanstack/react-query';
import { getCustomer, listCustomers, listLedger } from '@/api/customers.api';
import { mockRepository } from '@/data/mock-repository';
import { mockInitialData } from '@/hooks/queries/options';
import { queryKeys } from '@/hooks/queries/keys';

export function useCustomersQuery() {
  return useQuery({
    queryKey: queryKeys.customers,
    queryFn: listCustomers,
    ...mockInitialData(() => mockRepository.listCustomers()),
  });
}

export function useCustomerQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customer(id ?? ''),
    queryFn: () => getCustomer(id ?? ''),
    enabled: Boolean(id),
    ...mockInitialData(() => (id ? mockRepository.getCustomer(id) : null)),
  });
}

export function useLedgerQuery() {
  return useQuery({
    queryKey: queryKeys.ledger,
    queryFn: listLedger,
    ...mockInitialData(() => mockRepository.listLedger()),
  });
}
