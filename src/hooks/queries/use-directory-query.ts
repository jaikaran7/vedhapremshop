'use client';

import { useQuery } from '@tanstack/react-query';
import { listUsers } from '@/api/auth.api';
import { listAuditLogs, getCompanySettings, getSaleChargeSettings, listMarks } from '@/api/users.api';
import { SEED_COMPANY } from '@/data/seed';
import { DEFAULT_SALE_CHARGE_SETTINGS } from '@/utils/sale-charges';
import { mockRepository } from '@/data/mock-repository';
import { mockInitialData } from '@/hooks/queries/options';
import { queryKeys } from '@/hooks/queries/keys';

export function useUsersQuery() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: listUsers,
    ...mockInitialData(() => mockRepository.listUsers()),
  });
}

export function useCompanyQuery() {
  const query = useQuery({
    queryKey: queryKeys.company,
    queryFn: getCompanySettings,
    ...mockInitialData(() => mockRepository.getCompany()),
  });
  return { ...query, data: query.data ?? SEED_COMPANY };
}

export function useSaleChargeSettingsQuery() {
  const query = useQuery({
    queryKey: queryKeys.saleCharges,
    queryFn: getSaleChargeSettings,
    ...mockInitialData(() => mockRepository.getSaleChargeSettings()),
  });
  return { ...query, data: query.data ?? DEFAULT_SALE_CHARGE_SETTINGS };
}

export function useMarksQuery() {
  return useQuery({
    queryKey: queryKeys.marks,
    queryFn: listMarks,
    ...mockInitialData(() => mockRepository.listMarks()),
  });
}

export function useAuditQuery() {
  return useQuery({
    queryKey: queryKeys.audit,
    queryFn: listAuditLogs,
    ...mockInitialData(() => mockRepository.listAuditLogs()),
  });
}
