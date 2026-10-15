'use client';

import { useQuery } from '@tanstack/react-query';
import { listUsers } from '@/api/auth.api';
import {
  listAuditLogs,
  getCompanySettings,
  getCostingSettings,
  getSaleChargeSettings,
  listCostingExpenseTypes,
  listMarks,
  listProducts,
  listSellingMarginComponents,
} from '@/api/users.api';
import { SEED_COMPANY } from '@/data/seed';
import { SEED_COSTING_EXPENSE_TYPES, SEED_PRODUCTS, SEED_SELLING_MARGIN_COMPONENTS } from '@/data/costing-seed';
import { DEFAULT_COSTING_SETTINGS } from '@/utils/costing';
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

export function useCostingSettingsQuery() {
  const query = useQuery({
    queryKey: queryKeys.costingSettings,
    queryFn: getCostingSettings,
    ...mockInitialData(() => mockRepository.getCostingSettings()),
  });
  return { ...query, data: query.data ?? DEFAULT_COSTING_SETTINGS };
}

export function useProductsQuery() {
  const query = useQuery({
    queryKey: queryKeys.products,
    queryFn: listProducts,
    ...mockInitialData(() => mockRepository.listProducts()),
  });
  return { ...query, data: query.data ?? SEED_PRODUCTS };
}

export function useCostingExpenseTypesQuery() {
  const query = useQuery({
    queryKey: queryKeys.costingExpenseTypes,
    queryFn: listCostingExpenseTypes,
    ...mockInitialData(() => mockRepository.listCostingExpenseTypes()),
  });
  return { ...query, data: query.data ?? SEED_COSTING_EXPENSE_TYPES };
}

export function useSellingMarginComponentsQuery() {
  const query = useQuery({
    queryKey: queryKeys.sellingMarginComponents,
    queryFn: listSellingMarginComponents,
    ...mockInitialData(() => mockRepository.listSellingMarginComponents()),
  });
  return { ...query, data: query.data ?? SEED_SELLING_MARGIN_COMPONENTS };
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
