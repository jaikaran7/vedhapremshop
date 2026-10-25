import { apiClient, emulateApi } from '@/api/client';
import { isMockApi } from '@/config/env';
import { mockRepository } from '@/data/mock-repository';
import type { Customer, Lot, Payment, Purchase, Sale, Vendor } from '@/types';
import { buildDifferentialReport, type DifferentialReport } from '@/utils/report-differential';

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

/**
 * The lot breakdown report. The server builds it (same functions as the screens used to run in the browser, with a cache);
 * mock mode builds it from the local data.
 */
export async function getDifferentialReport(): Promise<DifferentialReport> {
  if (isMockApi()) {
    return emulateApi(buildDifferentialReport({
      lots: mockRepository.listLots(),
      purchases: mockRepository.listPurchases(),
      sales: mockRepository.listSales(),
      stockMovements: mockRepository.listStockMovements(),
      products: mockRepository.listProducts(),
    }));
  }
  return apiClient<DifferentialReport>('/reports/differential');
}
