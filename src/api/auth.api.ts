import { apiClient } from '@/api/client';
import type { User } from '@/types';

export async function listUsers(): Promise<User[]> {
  return apiClient<User[]>('/users');
}

export async function login(username: string, password: string): Promise<User> {
  const session = await apiClient<{ user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  return session.user;
}

export async function logout(): Promise<void> {
  return apiClient<void>('/auth/logout', { method: 'POST' });
}

export async function getSessionUser(): Promise<User> {
  return apiClient<User>('/auth/me');
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiClient<void>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
