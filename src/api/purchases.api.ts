import { apiClient } from '@/api/client';
import type { Purchase, PurchaseRevision } from '@/types';
import type { ReceivingDraft } from '@/utils/receiving';

export async function listPurchases(): Promise<Purchase[]> {
  return apiClient<Purchase[]>('/purchases');
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
