import { apiClient, apiClientPage, emulateApi } from '@/api/client';
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

export interface StockMovementFilters {
  lotNumber?: string;
  markCode?: string;
  types?: StockMovement['type'][];
  from?: string;
  to?: string;
}

/** Movement history filtered and paged on the server; `total` is how many rows match the filters. */
export async function listStockMovementsPage(filters: StockMovementFilters, limit: number): Promise<{ rows: StockMovement[]; total: number }> {
  if (isMockApi()) {
    const matches = mockRepository.listStockMovements().filter((m) => (
      (!filters.lotNumber || m.lotNumber.toUpperCase() === filters.lotNumber.trim().toUpperCase())
      && (!filters.markCode || m.markCode.toUpperCase() === filters.markCode.trim().toUpperCase())
      && (!filters.types?.length || filters.types.includes(m.type))
      && (!filters.from || m.date >= filters.from)
      && (!filters.to || m.date <= filters.to)
    ));
    return emulateApi({ rows: matches.slice(0, limit), total: matches.length });
  }
  const query = new URLSearchParams({ limit: String(limit) });
  if (filters.lotNumber) query.set('lotNumber', filters.lotNumber);
  if (filters.markCode) query.set('markCode', filters.markCode);
  if (filters.types?.length) query.set('type', filters.types.join(','));
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  return apiClientPage<StockMovement>(`/stock/movements?${query.toString()}`);
}
