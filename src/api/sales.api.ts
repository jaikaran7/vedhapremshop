import { apiClient, emulateApi } from '@/api/client';
import { isMockApi } from '@/config/env';
import { mockRepository } from '@/data/mock-repository';
import type { Sale } from '@/types';

export async function listSales(): Promise<Sale[]> {
  if (isMockApi()) return emulateApi(mockRepository.listSales());
  return apiClient<Sale[]>('/sales');
}

export async function getSale(id: string): Promise<Sale | null> {
  if (isMockApi()) return emulateApi(mockRepository.getSale(id));
  return apiClient<Sale>(`/sales/${id}`);
}

export async function createSale(input: Omit<Sale, 'id' | 'billNumber' | 'createdAt'>): Promise<Sale> {
  if (isMockApi()) return emulateApi(mockRepository.createSale(input));
  return apiClient<Sale>('/sales', { method: 'POST', body: JSON.stringify(input) });
}

export async function noteSaleCorrection(saleId: string, note: string): Promise<void> {
  if (isMockApi()) return emulateApi(mockRepository.noteSaleCorrection(saleId, note));
  return apiClient<void>(`/sales/${saleId}/corrections`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function requestSaleEdit(saleId: string, requestedData: unknown, reason: string): Promise<void> {
  if (isMockApi()) return emulateApi(mockRepository.requestSaleEdit(saleId, requestedData, reason));
  return apiClient<void>(`/sales/${saleId}/edit-requests`, {
    method: 'POST',
    body: JSON.stringify({ requestedData, reason }),
  });
}
