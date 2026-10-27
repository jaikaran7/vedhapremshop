import { apiClient, apiClientPage } from '@/api/client';
import type { StockAdjustment, StockMovement } from '@/types';

export async function listStockMovements(): Promise<StockMovement[]> {
  return apiClient<StockMovement[]>('/stock/movements');
}

export async function createStockAdjustment(
  input: Omit<StockAdjustment, 'id' | 'status' | 'createdAt'>
): Promise<StockAdjustment> {
  return apiClient<StockAdjustment>('/stock/adjustments', { method: 'POST', body: JSON.stringify(input) });
}

export async function addOpeningStock(input: {
  lotNumber: string;
  markCode: string;
  bags: number;
  weightKg: number;
}): Promise<StockAdjustment> {
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
  const query = new URLSearchParams({ limit: String(limit) });
  if (filters.lotNumber) query.set('lotNumber', filters.lotNumber);
  if (filters.markCode) query.set('markCode', filters.markCode);
  if (filters.types?.length) query.set('type', filters.types.join(','));
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  return apiClientPage<StockMovement>(`/stock/movements?${query.toString()}`);
}
