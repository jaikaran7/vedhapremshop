'use client';

import { useQuery } from '@tanstack/react-query';
import { getReportsSnapshot } from '@/api/reports.api';
import { mockRepository } from '@/data/mock-repository';
import { mockInitialData } from '@/hooks/queries/options';
import { queryKeys } from '@/hooks/queries/keys';

export function useReportsQuery() {
  return useQuery({
    queryKey: queryKeys.reports,
    queryFn: getReportsSnapshot,
    ...mockInitialData(() => ({
      sales: mockRepository.listSales(),
      payments: mockRepository.listPayments(),
      customers: mockRepository.listCustomers(),
      vendors: mockRepository.listVendors(),
      lots: mockRepository.listLots(),
      purchases: mockRepository.listPurchases(),
    })),
  });
}
