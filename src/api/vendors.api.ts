import { apiClient, emulateApi } from '@/api/client';
import { isMockApi } from '@/config/env';
import { mockRepository } from '@/data/mock-repository';
import type { Vendor, VendorLedger } from '@/types';

export async function listVendors(): Promise<Vendor[]> {
  if (isMockApi()) return emulateApi(mockRepository.listVendors());
  return apiClient<Vendor[]>('/vendors');
}

export async function getVendor(id: string): Promise<Vendor | null> {
  if (isMockApi()) return emulateApi(mockRepository.getVendor(id));
  return apiClient<Vendor>(`/vendors/${id}`);
}

export async function createVendor(
  input: Omit<Vendor, 'id' | 'code' | 'createdAt' | 'totalPurchases' | 'payableAmount'>
): Promise<Vendor> {
  if (isMockApi()) return emulateApi(mockRepository.addVendor(input));
  return apiClient<Vendor>('/vendors', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateVendor(id: string, input: Partial<Vendor>): Promise<void> {
  if (isMockApi()) return emulateApi(mockRepository.updateVendor(id, input));
  return apiClient<void>(`/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function getVendorLedger(id: string): Promise<VendorLedger | null> {
  if (isMockApi()) return emulateApi(mockRepository.getVendorLedger(id));
  return apiClient<VendorLedger>(`/vendors/${id}/ledger`);
}
