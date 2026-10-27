'use client';

import { useMutation } from '@tanstack/react-query';
import { changePassword } from '@/api/auth.api';
import {
  createCostingExpenseType,
  createMark,
  createProduct,
  createSellingMarginComponent,
  createUser,
  updateCompanySettings,
  updateCostingExpenseType,
  updateCostingSettings,
  updateMark,
  updateProduct,
  updateSaleChargeSettings,
  updateSellingMarginComponent,
  updateUser,
} from '@/api/users.api';
import { useInvalidateMandi } from '@/hooks/mutations/invalidate';
import type { CompanySettings, CostingExpenseKind, CostingSettings, Mark, MasterStatus, SaleChargeSettings, UserRole } from '@/types';

export function useUpdateCompanyMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: (settings: CompanySettings) => updateCompanySettings(settings),
    onSuccess: invalidate,
  });
}

export function useUpdateSaleChargeSettingsMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: (settings: SaleChargeSettings) => updateSaleChargeSettings(settings),
    onSuccess: invalidate,
  });
}

export function useUpdateCostingSettingsMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: (settings: CostingSettings) => updateCostingSettings(settings),
    onSuccess: invalidate,
  });
}

export function useCreateProductMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: (input: { name: string }) => createProduct(input),
    onSuccess: invalidate,
  });
}

export function useUpdateProductMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; status?: MasterStatus } }) => updateProduct(id, input),
    onSuccess: invalidate,
  });
}

export function useCreateCostingExpenseTypeMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: (input: { name: string; kind: CostingExpenseKind }) => createCostingExpenseType(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCostingExpenseTypeMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; status?: MasterStatus } }) => updateCostingExpenseType(id, input),
    onSuccess: invalidate,
  });
}

export function useCreateSellingMarginComponentMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: (input: { name: string; perKg: number }) => createSellingMarginComponent(input),
    onSuccess: invalidate,
  });
}

export function useUpdateSellingMarginComponentMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; perKg?: number; status?: MasterStatus } }) => (
      updateSellingMarginComponent(id, input)
    ),
    onSuccess: invalidate,
  });
}

export function useCreateMarkMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: (input: Omit<Mark, 'id'>) => createMark(input),
    onSuccess: invalidate,
  });
}

export function useUpdateMarkMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Mark> }) => updateMark(id, input),
    onSuccess: invalidate,
  });
}

export function useCreateUserMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: (input: { username: string; name: string; role: UserRole; password: string; email?: string; phone?: string }) =>
      createUser(input),
    onSuccess: invalidate,
  });
}

export function useUpdateUserMutation() {
  const invalidate = useInvalidateMandi({ masters: true });
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateUser>[1] }) => updateUser(id, input),
    onSuccess: invalidate,
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changePassword(currentPassword, newPassword),
  });
}
