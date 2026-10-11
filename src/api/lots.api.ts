import { apiClient, emulateApi } from '@/api/client';
import { isMockApi } from '@/config/env';
import { mockRepository } from '@/data/mock-repository';
import type { Lot } from '@/types';

export async function listLots(): Promise<Lot[]> {
  if (isMockApi()) return emulateApi(mockRepository.listLots());
  return apiClient<Lot[]>('/lots');
}

export async function getLot(id: string): Promise<Lot | null> {
  if (isMockApi()) return emulateApi(mockRepository.getLot(id));
  return apiClient<Lot>(`/lots/${id}`);
}
