import { apiClient } from '@/api/client';
import type { Customer, CustomerLedgerEntry } from '@/types';

export async function listCustomers(): Promise<Customer[]> {
  return apiClient<Customer[]>('/customers');
}

export async function getCustomer(id: string): Promise<Customer | null> {
  return apiClient<Customer>(`/customers/${id}`);
}

export async function createCustomer(
  input: Omit<Customer, 'id' | 'code' | 'createdAt' | 'outstandingAmount'>
): Promise<Customer> {
  return apiClient<Customer>('/customers', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateCustomer(id: string, input: Partial<Customer>): Promise<void> {
  return apiClient<void>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function deleteCustomer(id: string): Promise<void> {
  return apiClient<void>(`/customers/${id}`, { method: 'DELETE' });
}

export async function listLedger(): Promise<CustomerLedgerEntry[]> {
  return apiClient<CustomerLedgerEntry[]>('/customers/ledger');
}
