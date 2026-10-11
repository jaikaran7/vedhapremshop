import { apiClient, emulateApi } from '@/api/client';
import { isMockApi } from '@/config/env';
import { mockRepository } from '@/data/mock-repository';
import type { Customer, Lot, Payment, Purchase, Sale, Vendor } from '@/types';

export interface ReportsSnapshot {
  sales: Sale[];
  payments: Payment[];
  customers: Customer[];
  vendors: Vendor[];
  lots: Lot[];
  purchases: Purchase[];
}

export async function getReportsSnapshot(): Promise<ReportsSnapshot> {
  if (isMockApi()) {
    return emulateApi({
      sales: mockRepository.listSales(),
      payments: mockRepository.listPayments(),
      customers: mockRepository.listCustomers(),
      vendors: mockRepository.listVendors(),
      lots: mockRepository.listLots(),
      purchases: mockRepository.listPurchases(),
    });
  }
  return apiClient<ReportsSnapshot>('/reports');
}
