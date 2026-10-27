import { apiClient } from '@/api/client';
import type { Lot } from '@/types';

export async function listLots(): Promise<Lot[]> {
  return apiClient<Lot[]>('/lots');
}

export async function getLot(id: string): Promise<Lot | null> {
  return apiClient<Lot>(`/lots/${id}`);
}
