import { apiClient, emulateApi } from '@/api/client';
import { isMockApi } from '@/config/env';
import { mockRepository } from '@/data/mock-repository';
import type { User, UserRole } from '@/types';

export async function listUsers(): Promise<User[]> {
  if (isMockApi()) return emulateApi(mockRepository.listUsers());
  return apiClient<User[]>('/users');
}

export async function recordRoleSwitch(role: UserRole): Promise<void> {
  if (isMockApi()) {
    mockRepository.switchRoleAudit(role);
    return emulateApi(undefined);
  }
  return apiClient<void>('/auth/role', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
}
