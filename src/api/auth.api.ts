import { apiClient, emulateApi } from '@/api/client';
import { isMockApi } from '@/config/env';
import { mockRepository } from '@/data/mock-repository';
import type { User, UserRole } from '@/types';

export async function listUsers(): Promise<User[]> {
  if (isMockApi()) return emulateApi(mockRepository.listUsers());
  return apiClient<User[]>('/users');
}

/** Demo persona switch. With the real API a role belongs to the signed-in account, so there is nothing to record. */
export async function recordRoleSwitch(role: UserRole): Promise<void> {
  if (isMockApi()) mockRepository.switchRoleAudit(role);
  return emulateApi(undefined);
}

export async function login(username: string, password: string): Promise<User> {
  const session = await apiClient<{ user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  return session.user;
}

export async function logout(): Promise<void> {
  if (isMockApi()) return emulateApi(undefined);
  return apiClient<void>('/auth/logout', { method: 'POST' });
}

export async function getSessionUser(): Promise<User> {
  return apiClient<User>('/auth/me');
}
