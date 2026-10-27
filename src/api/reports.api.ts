import { apiClient } from '@/api/client';
import type { Customer, Lot, Payment, Purchase, Sale, Vendor } from '@/types';
import type { DifferentialReport } from '@/utils/report-differential';

export interface ReportsSnapshot {
  sales: Sale[];
  payments: Payment[];
  customers: Customer[];
  vendors: Vendor[];
  lots: Lot[];
  purchases: Purchase[];
}

export async function getReportsSnapshot(): Promise<ReportsSnapshot> {
  return apiClient<ReportsSnapshot>('/reports');
}

export async function getDifferentialReport(): Promise<DifferentialReport> {
  return apiClient<DifferentialReport>('/reports/differential');
}
