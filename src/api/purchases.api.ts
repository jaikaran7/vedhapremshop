import { apiClient, apiClientPage } from '@/api/client';
import type { Purchase, PurchaseRevision } from '@/types';
import type { ReceivingDraft } from '@/utils/receiving';

export async function listPurchases(): Promise<Purchase[]> {
  return apiClient<Purchase[]>('/purchases');
}

/** What the consignment list narrows to. The server applies every one of these. */
export interface PurchaseFilters {
  from?: string;
  to?: string;
  vendorId?: string;
  productId?: string;
  q?: string;
}

/** One page of vendor bills, newest first; `total` is how many bills match the filters in all. */
export async function listPurchasesPage(filters: PurchaseFilters, limit: number): Promise<{ rows: Purchase[]; total: number }> {
  const query = new URLSearchParams();
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  if (filters.vendorId) query.set('vendorId', filters.vendorId);
  if (filters.productId) query.set('productId', filters.productId);
  if (filters.q?.trim()) query.set('q', filters.q.trim());
  query.set('limit', String(limit));
  return apiClientPage<Purchase>(`/purchases?${query.toString()}`);
}

export async function getPurchase(id: string): Promise<Purchase | null> {
  return apiClient<Purchase>(`/purchases/${id}`);
}

export async function createPurchase(input: Omit<Purchase, 'id' | 'createdAt'>): Promise<Purchase> {
  return apiClient<Purchase>('/purchases', { method: 'POST', body: JSON.stringify(input) });
}

export async function receiveConsignment(id: string, draft: ReceivingDraft): Promise<Purchase> {
  return apiClient<Purchase>(`/purchases/${id}/receive`, { method: 'POST', body: JSON.stringify(draft) });
}

export async function saveReceivingDraft(id: string, draft: ReceivingDraft): Promise<Purchase> {
  return apiClient<Purchase>(`/purchases/${id}/receiving-draft`, { method: 'PUT', body: JSON.stringify(draft) });
}

/** Corrects a vendor bill. The server keeps the previous version and who changed it; `reason` is required. */
export async function updatePurchase(id: string, input: Omit<Purchase, 'id' | 'createdAt'> & { reason: string }): Promise<Purchase> {
  return apiClient<Purchase>(`/purchases/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function listPurchaseRevisions(id: string): Promise<PurchaseRevision[]> {
  return apiClient<PurchaseRevision[]>(`/purchases/${id}/revisions`);
}
