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
import { DEFAULT_COSTING_SETTINGS } from '@/utils/costing';
import { DEFAULT_SALE_CHARGE_SETTINGS } from '@/utils/sale-charges';
import { queryKeys } from '@/hooks/queries/keys';
import type { CompanySettings } from '@/types';

const EMPTY_COMPANY: CompanySettings = {
  shopName: '',
  mandiLicenseNo: '',
  gstNo: '',
  address: '',
  phone: '',
  altPhone: '',
  email: '',
  termsAndConditions: '',
  invoicePrefix: '',
  receiptPrefix: '',
  inactivePurchaseDays: 45,
  paymentAlertDays: 2,
};

export function useUsersQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: listUsers,
    enabled,
  });
}

export function useCompanyQuery() {
  const query = useQuery({
    queryKey: queryKeys.company,
    queryFn: getCompanySettings,
  });
  return { ...query, data: query.data ?? EMPTY_COMPANY };
}

export function useSaleChargeSettingsQuery() {
  const query = useQuery({
    queryKey: queryKeys.saleCharges,
    queryFn: getSaleChargeSettings,
  });
  return { ...query, data: query.data ?? DEFAULT_SALE_CHARGE_SETTINGS };
}

export function useCostingSettingsQuery() {
  const query = useQuery({
    queryKey: queryKeys.costingSettings,
    queryFn: getCostingSettings,
  });
  return { ...query, data: query.data ?? DEFAULT_COSTING_SETTINGS };
}

export function useProductsQuery() {
  const query = useQuery({
    queryKey: queryKeys.products,
    queryFn: listProducts,
  });
  return { ...query, data: query.data ?? [] };
}

export function useCostingExpenseTypesQuery() {
  const query = useQuery({
    queryKey: queryKeys.costingExpenseTypes,
    queryFn: listCostingExpenseTypes,
  });
  return { ...query, data: query.data ?? [] };
}

export function useSellingMarginComponentsQuery() {
  const query = useQuery({
    queryKey: queryKeys.sellingMarginComponents,
    queryFn: listSellingMarginComponents,
  });
  return { ...query, data: query.data ?? [] };
}

export function useMarksQuery() {
  return useQuery({
    queryKey: queryKeys.marks,
    queryFn: listMarks,
  });
}

export function useAuditQuery() {
  return useQuery({
    queryKey: queryKeys.audit,
    queryFn: listAuditLogs,
  });
}
