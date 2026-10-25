import { apiClient, emulateApi, idempotencyHeaders } from '@/api/client';
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

/** A new bill as the New Sale screen builds it. The server recomputes every amount. */
export type NewSaleInput = Omit<Sale, 'id' | 'billNumber' | 'createdAt'> & { dateReason?: string };

/** Owner changes apply at once; anyone else's change waits in Approvals. */
export type SaleChangeResult = { status: 'APPLIED'; sale: Sale } | { status: 'PENDING_APPROVAL'; approvalId: string };

export async function createSale(input: NewSaleInput): Promise<Sale> {
  if (isMockApi()) return emulateApi(mockRepository.createSale(input));
  return apiClient<Sale>('/sales', { method: 'POST', body: JSON.stringify(input), headers: idempotencyHeaders() });
}

export async function noteSaleCorrection(saleId: string, note: string): Promise<void> {
  if (isMockApi()) return emulateApi(mockRepository.noteSaleCorrection(saleId, note));
  return apiClient<void>(`/sales/${saleId}/corrections`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function cancelSale(saleId: string, reason: string): Promise<SaleChangeResult> {
  if (isMockApi()) throw new Error('Cancelling a bill needs the live API.');
  return apiClient<SaleChangeResult>(`/sales/${saleId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
}

/** Edit a bill: it is cancelled and replaced by this one (stock readjusted). */
export async function rebillSale(saleId: string, input: NewSaleInput, reason: string): Promise<SaleChangeResult> {
  if (isMockApi()) throw new Error('Editing a bill needs the live API.');
  return apiClient<SaleChangeResult>(`/sales/${saleId}/rebill`, { method: 'POST', body: JSON.stringify({ ...input, reason }) });
}

export async function requestSaleEdit(saleId: string, requestedData: unknown, reason: string): Promise<void> {
  if (isMockApi()) return emulateApi(mockRepository.requestSaleEdit(saleId, requestedData, reason));
  return apiClient<void>(`/sales/${saleId}/edit-requests`, {
    method: 'POST',
    body: JSON.stringify({ requestedData, reason }),
  });
}
