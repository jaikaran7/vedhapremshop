import { apiClient, idempotencyHeaders } from '@/api/client';
import type { EditedBill, Sale } from '@/types';

export async function listSales(): Promise<Sale[]> {
  return apiClient<Sale[]>('/sales');
}

/** Bills that have been edited, newest edit first, with previous and current values. */
export async function listEditedBills(): Promise<EditedBill[]> {
  return apiClient<EditedBill[]>('/sales/edits');
}

export async function getSale(id: string): Promise<Sale | null> {
  return apiClient<Sale>(`/sales/${id}`);
}

/** A new bill as the New Sale screen builds it. The server recomputes every amount. */
export type NewSaleInput = Omit<Sale, 'id' | 'billNumber' | 'createdAt'> & {
  dateReason?: string;
  confirmDuplicateSale?: boolean;
};

/** Owner changes apply at once; anyone else's change waits in Approvals. */
export type SaleChangeResult = { status: 'APPLIED'; sale: Sale } | { status: 'PENDING_APPROVAL'; approvalId: string };

export async function createSale(input: NewSaleInput): Promise<Sale> {
  return apiClient<Sale>('/sales', { method: 'POST', body: JSON.stringify(input), headers: idempotencyHeaders() });
}

export async function noteSaleCorrection(saleId: string, note: string): Promise<void> {
  return apiClient<void>(`/sales/${saleId}/corrections`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function cancelSale(saleId: string, reason: string): Promise<SaleChangeResult> {
  return apiClient<SaleChangeResult>(`/sales/${saleId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
}

/** Edit a bill in place. The same bill id is updated; stock and the balance move with the change. */
export async function rebillSale(saleId: string, input: NewSaleInput, reason: string): Promise<SaleChangeResult> {
  return apiClient<SaleChangeResult>(`/sales/${saleId}/rebill`, { method: 'POST', body: JSON.stringify({ ...input, reason }) });
}
