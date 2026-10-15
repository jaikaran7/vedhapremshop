'use client';

import { useMutation } from '@tanstack/react-query';
import {
  createCostingExpenseType,
  createMark,
  createProduct,
  createSellingMarginComponent,
  resetDemoData,
  updateCompanySettings,
  updateCostingExpenseType,
  updateCostingSettings,
  updateMark,
  updateProduct,
  updateSaleChargeSettings,
  updateSellingMarginComponent,
} from '@/api/users.api';
import { recordRoleSwitch } from '@/api/auth.api';
import { useInvalidateMandi } from '@/hooks/mutations/invalidate';
import type { CompanySettings, CostingExpenseKind, CostingSettings, Mark, MasterStatus, SaleChargeSettings, UserRole } from '@/types';

export function useUpdateCompanyMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (settings: CompanySettings) => updateCompanySettings(settings),
    onSuccess: invalidate,
  });
}

export function useUpdateSaleChargeSettingsMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (settings: SaleChargeSettings) => updateSaleChargeSettings(settings),
    onSuccess: invalidate,
  });
}

export function useUpdateCostingSettingsMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (settings: CostingSettings) => updateCostingSettings(settings),
    onSuccess: invalidate,
  });
}

export function useCreateProductMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: { name: string }) => createProduct(input),
    onSuccess: invalidate,
  });
}

export function useUpdateProductMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; status?: MasterStatus } }) => updateProduct(id, input),
    onSuccess: invalidate,
  });
}

export function useCreateCostingExpenseTypeMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: { name: string; kind: CostingExpenseKind }) => createCostingExpenseType(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCostingExpenseTypeMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; status?: MasterStatus } }) => updateCostingExpenseType(id, input),
    onSuccess: invalidate,
  });
}

export function useCreateSellingMarginComponentMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: { name: string; perKg: number }) => createSellingMarginComponent(input),
    onSuccess: invalidate,
  });
}

export function useUpdateSellingMarginComponentMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; perKg?: number; status?: MasterStatus } }) => (
      updateSellingMarginComponent(id, input)
    ),
    onSuccess: invalidate,
  });
}

export function useCreateMarkMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (input: Omit<Mark, 'id'>) => createMark(input),
    onSuccess: invalidate,
  });
}

export function useUpdateMarkMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Mark> }) => updateMark(id, input),
    onSuccess: invalidate,
  });
}

export function useResetDemoMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: () => resetDemoData(),
    onSuccess: invalidate,
  });
}

export function useRoleSwitchMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: (role: UserRole) => recordRoleSwitch(role),
    onSuccess: invalidate,
  });
}
