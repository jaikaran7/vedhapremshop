import { apiClient } from '@/api/client';
import type { Vendor, VendorLedger } from '@/types';

export async function listVendors(): Promise<Vendor[]> {
  return apiClient<Vendor[]>('/vendors');
}

export async function getVendor(id: string): Promise<Vendor | null> {
  return apiClient<Vendor>(`/vendors/${id}`);
}

export async function createVendor(
  input: Omit<Vendor, 'id' | 'code' | 'createdAt' | 'totalPurchases' | 'payableAmount'>
): Promise<Vendor> {
  return apiClient<Vendor>('/vendors', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateVendor(id: string, input: Partial<Vendor>): Promise<void> {
  return apiClient<void>(`/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function getVendorLedger(id: string): Promise<VendorLedger | null> {
  return apiClient<VendorLedger>(`/vendors/${id}/ledger`);
}
