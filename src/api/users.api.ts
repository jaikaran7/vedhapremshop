import { listUsers } from '@/api/auth.api';
import { apiClient, emulateApi } from '@/api/client';
import { isMockApi } from '@/config/env';
import { mockRepository } from '@/data/mock-repository';
import type { CompanySettings, Mark, SaleChargeSettings } from '@/types';

export { listUsers };

export async function getCompanySettings(): Promise<CompanySettings> {
  if (isMockApi()) return emulateApi(mockRepository.getCompany());
  return apiClient<CompanySettings>('/settings/company');
}

export async function updateCompanySettings(settings: CompanySettings): Promise<CompanySettings> {
  if (isMockApi()) return emulateApi(mockRepository.updateCompany(settings));
  return apiClient<CompanySettings>('/settings/company', { method: 'PUT', body: JSON.stringify(settings) });
}

export async function getSaleChargeSettings(): Promise<SaleChargeSettings> {
  if (isMockApi()) return emulateApi(mockRepository.getSaleChargeSettings());
  return apiClient<SaleChargeSettings>('/settings/sale-charges');
}

export async function updateSaleChargeSettings(settings: SaleChargeSettings): Promise<SaleChargeSettings> {
  if (isMockApi()) return emulateApi(mockRepository.updateSaleChargeSettings(settings));
  return apiClient<SaleChargeSettings>('/settings/sale-charges', { method: 'PUT', body: JSON.stringify(settings) });
}

export async function listMarks(): Promise<Mark[]> {
  if (isMockApi()) return emulateApi(mockRepository.listMarks());
  return apiClient<Mark[]>('/settings/marks');
}

export async function createMark(input: Omit<Mark, 'id'>): Promise<Mark> {
  if (isMockApi()) return emulateApi(mockRepository.addMark(input));
  return apiClient<Mark>('/settings/marks', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateMark(id: string, input: Partial<Mark>): Promise<void> {
  if (isMockApi()) return emulateApi(mockRepository.updateMark(id, input));
  return apiClient<void>(`/settings/marks/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function resetDemoData(): Promise<void> {
  if (isMockApi()) return emulateApi(mockRepository.resetToDefault());
  return apiClient<void>('/settings/reset', { method: 'POST' });
}

export async function listAuditLogs() {
  if (isMockApi()) return emulateApi(mockRepository.listAuditLogs());
  return apiClient<ReturnType<typeof mockRepository.listAuditLogs>>('/audit');
}
