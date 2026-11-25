import { apiClient, apiClientPage, idempotencyHeaders } from '@/api/client';
import type { EditedBill, Sale, SalePaymentType } from '@/types';

export async function listSales(): Promise<Sale[]> {
  return apiClient<Sale[]>('/sales');
}

/** What the Sales screen narrows its list to. The server applies every one of these. */
export interface SaleFilters {
  from?: string;
  to?: string;
  paymentType?: SalePaymentType;
  productId?: string;
  q?: string;
}

export interface SalesSummary {
  bills: number;
  bags: number;
  weightKg: number;
  amount: number;
  /** Only when asked for: the part of these bills still unpaid, and how many bills hold it. */
  creditAmount?: number;
  creditBills?: number;
}

function filterQuery(filters: SaleFilters): URLSearchParams {
  const query = new URLSearchParams();
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  if (filters.paymentType) query.set('paymentType', filters.paymentType);
  if (filters.productId) query.set('productId', filters.productId);
  if (filters.q?.trim()) query.set('q', filters.q.trim());
  return query;
}

/** One page of bills, newest first; `total` is how many bills match the filters in all. */
export async function listSalesPage(filters: SaleFilters, limit: number): Promise<{ rows: Sale[]; total: number }> {
  const query = filterQuery(filters);
  query.set('limit', String(limit));
  return apiClientPage<Sale>(`/sales?${query.toString()}`);
}

/** Bill count, bags, weight and amount for the same filters, worked out on the server. */
export async function getSalesSummary(filters: SaleFilters, withCredit = false): Promise<SalesSummary> {
  const query = filterQuery(filters);
  if (withCredit) query.set('withCredit', 'true');
  return apiClient<SalesSummary>(`/sales/summary?${query.toString()}`);
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
