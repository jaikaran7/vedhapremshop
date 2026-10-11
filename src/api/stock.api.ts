import { apiClient, emulateApi } from '@/api/client';
import { isMockApi } from '@/config/env';
import { mockRepository } from '@/data/mock-repository';
import type { StockAdjustment, StockMovement } from '@/types';

export async function listStockMovements(): Promise<StockMovement[]> {
  if (isMockApi()) return emulateApi(mockRepository.listStockMovements());
  return apiClient<StockMovement[]>('/stock/movements');
}

export async function createStockAdjustment(
  input: Omit<StockAdjustment, 'id' | 'status' | 'createdAt'>
): Promise<StockAdjustment> {
  if (isMockApi()) return emulateApi(mockRepository.createStockAdjustment(input));
  return apiClient<StockAdjustment>('/stock/adjustments', { method: 'POST', body: JSON.stringify(input) });
}

export async function addOpeningStock(input: {
  lotNumber: string;
  markCode: string;
  bags: number;
  weightKg: number;
}): Promise<StockAdjustment> {
  if (isMockApi()) {
    return emulateApi(mockRepository.addOpeningStock(input.lotNumber, input.markCode, input.bags, input.weightKg));
  }
  return apiClient<StockAdjustment>('/stock/opening', { method: 'POST', body: JSON.stringify(input) });
}
