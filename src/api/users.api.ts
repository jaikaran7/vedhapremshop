import { listUsers } from '@/api/auth.api';
import { apiClient, emulateApi } from '@/api/client';
import { isMockApi } from '@/config/env';
import { mockRepository } from '@/data/mock-repository';
import type {
  CompanySettings,
  CostingExpenseKind,
  CostingExpenseType,
  CostingSettings,
  Mark,
  MasterStatus,
  Product,
  SaleChargeSettings,
  SellingMarginComponent,
} from '@/types';

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

export async function getCostingSettings(): Promise<CostingSettings> {
  if (isMockApi()) return emulateApi(mockRepository.getCostingSettings());
  return apiClient<CostingSettings>('/settings/costing');
}

export async function updateCostingSettings(settings: CostingSettings): Promise<CostingSettings> {
  if (isMockApi()) return emulateApi(mockRepository.updateCostingSettings(settings));
  return apiClient<CostingSettings>('/settings/costing', { method: 'PUT', body: JSON.stringify(settings) });
}

export async function listProducts(): Promise<Product[]> {
  if (isMockApi()) return emulateApi(mockRepository.listProducts());
  return apiClient<Product[]>('/settings/products');
}

export async function createProduct(input: { name: string }): Promise<Product> {
  if (isMockApi()) return emulateApi(mockRepository.addProduct(input));
  return apiClient<Product>('/settings/products', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateProduct(id: string, input: { name?: string; status?: MasterStatus }): Promise<Product | null> {
  if (isMockApi()) return emulateApi(mockRepository.updateProduct(id, input));
  return apiClient<Product | null>(`/settings/products/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function listCostingExpenseTypes(): Promise<CostingExpenseType[]> {
  if (isMockApi()) return emulateApi(mockRepository.listCostingExpenseTypes());
  return apiClient<CostingExpenseType[]>('/settings/costing/expense-types');
}

export async function createCostingExpenseType(input: { name: string; kind: CostingExpenseKind }): Promise<CostingExpenseType> {
  if (isMockApi()) return emulateApi(mockRepository.addCostingExpenseType(input));
  return apiClient<CostingExpenseType>('/settings/costing/expense-types', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateCostingExpenseType(
  id: string,
  input: { name?: string; status?: MasterStatus },
): Promise<CostingExpenseType | null> {
  if (isMockApi()) return emulateApi(mockRepository.updateCostingExpenseType(id, input));
  return apiClient<CostingExpenseType | null>(`/settings/costing/expense-types/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function listSellingMarginComponents(): Promise<SellingMarginComponent[]> {
  if (isMockApi()) return emulateApi(mockRepository.listSellingMarginComponents());
  return apiClient<SellingMarginComponent[]>('/settings/costing/margins');
}

export async function createSellingMarginComponent(input: { name: string; perKg: number }): Promise<SellingMarginComponent> {
  if (isMockApi()) return emulateApi(mockRepository.addSellingMarginComponent(input));
  return apiClient<SellingMarginComponent>('/settings/costing/margins', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateSellingMarginComponent(
  id: string,
  input: { name?: string; perKg?: number; status?: MasterStatus },
): Promise<SellingMarginComponent | null> {
  if (isMockApi()) return emulateApi(mockRepository.updateSellingMarginComponent(id, input));
  return apiClient<SellingMarginComponent | null>(`/settings/costing/margins/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
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
