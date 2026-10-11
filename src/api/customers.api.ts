import { apiClient, emulateApi } from '@/api/client';
import { isMockApi } from '@/config/env';
import { mockRepository } from '@/data/mock-repository';
import type { Customer, CustomerLedgerEntry } from '@/types';

export async function listCustomers(): Promise<Customer[]> {
  if (isMockApi()) return emulateApi(mockRepository.listCustomers());
  return apiClient<Customer[]>('/customers');
}

export async function getCustomer(id: string): Promise<Customer | null> {
  if (isMockApi()) return emulateApi(mockRepository.getCustomer(id));
  return apiClient<Customer>(`/customers/${id}`);
}

export async function createCustomer(
  input: Omit<Customer, 'id' | 'code' | 'createdAt' | 'outstandingAmount'>
): Promise<Customer> {
  if (isMockApi()) return emulateApi(mockRepository.addCustomer(input));
  return apiClient<Customer>('/customers', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateCustomer(id: string, input: Partial<Customer>): Promise<void> {
  if (isMockApi()) return emulateApi(mockRepository.updateCustomer(id, input));
  return apiClient<void>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function deleteCustomer(id: string): Promise<void> {
  if (isMockApi()) return emulateApi(mockRepository.deleteCustomer(id));
  return apiClient<void>(`/customers/${id}`, { method: 'DELETE' });
}

export async function listLedger(): Promise<CustomerLedgerEntry[]> {
  if (isMockApi()) return emulateApi(mockRepository.listLedger());
  return apiClient<CustomerLedgerEntry[]>('/customers/ledger');
}
