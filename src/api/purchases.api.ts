import { apiClient, emulateApi } from '@/api/client';
import { isMockApi } from '@/config/env';
import { mockRepository } from '@/data/mock-repository';
import type { Purchase } from '@/types';
import type { ReceivingDraft } from '@/utils/receiving';

export async function listPurchases(): Promise<Purchase[]> {
  if (isMockApi()) return emulateApi(mockRepository.listPurchases());
  return apiClient<Purchase[]>('/purchases');
}

export async function getPurchase(id: string): Promise<Purchase | null> {
  if (isMockApi()) return emulateApi(mockRepository.getPurchase(id));
  return apiClient<Purchase>(`/purchases/${id}`);
}

export async function createPurchase(input: Omit<Purchase, 'id' | 'createdAt'>): Promise<Purchase> {
  if (isMockApi()) return emulateApi(mockRepository.createPurchase(input));
  return apiClient<Purchase>('/purchases', { method: 'POST', body: JSON.stringify(input) });
}

export async function receiveConsignment(id: string, draft: ReceivingDraft): Promise<Purchase> {
  if (isMockApi()) return emulateApi(mockRepository.receiveConsignment(id, draft));
  return apiClient<Purchase>(`/purchases/${id}/receive`, { method: 'POST', body: JSON.stringify(draft) });
}
