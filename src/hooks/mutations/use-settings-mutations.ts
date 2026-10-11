'use client';

import { useMutation } from '@tanstack/react-query';
import { createMark, resetDemoData, updateCompanySettings, updateMark, updateSaleChargeSettings } from '@/api/users.api';
import { recordRoleSwitch } from '@/api/auth.api';
import { useInvalidateMandi } from '@/hooks/mutations/invalidate';
import type { CompanySettings, Mark, SaleChargeSettings, UserRole } from '@/types';

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
