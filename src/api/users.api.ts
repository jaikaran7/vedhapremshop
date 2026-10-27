import { listUsers } from '@/api/auth.api';
import { apiClient } from '@/api/client';
import type {
  AuditLog,
  CompanySettings,
  CostingExpenseKind,
  CostingExpenseType,
  CostingSettings,
  Mark,
  MasterStatus,
  Product,
  SaleChargeSettings,
  SellingMarginComponent,
  User,
  UserRole,
} from '@/types';

export { listUsers };

export async function createUser(input: {
  username: string;
  name: string;
  role: UserRole;
  password: string;
  email?: string;
  phone?: string;
}): Promise<User> {
  return apiClient<User>('/users', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateUser(
  id: string,
  input: { name?: string; role?: UserRole; active?: boolean; password?: string; email?: string; phone?: string },
): Promise<User> {
  return apiClient<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function getCompanySettings(): Promise<CompanySettings> {
  return apiClient<CompanySettings>('/settings/company');
}

export async function updateCompanySettings(settings: CompanySettings): Promise<CompanySettings> {
  return apiClient<CompanySettings>('/settings/company', { method: 'PUT', body: JSON.stringify(settings) });
}

export async function getSaleChargeSettings(): Promise<SaleChargeSettings> {
  return apiClient<SaleChargeSettings>('/settings/sale-charges');
}

export async function updateSaleChargeSettings(settings: SaleChargeSettings): Promise<SaleChargeSettings> {
  return apiClient<SaleChargeSettings>('/settings/sale-charges', { method: 'PUT', body: JSON.stringify(settings) });
}

export async function getCostingSettings(): Promise<CostingSettings> {
  return apiClient<CostingSettings>('/settings/costing');
}

export async function updateCostingSettings(settings: CostingSettings): Promise<CostingSettings> {
  return apiClient<CostingSettings>('/settings/costing', { method: 'PUT', body: JSON.stringify(settings) });
}

export async function listProducts(): Promise<Product[]> {
  return apiClient<Product[]>('/settings/products');
}

export async function createProduct(input: { name: string }): Promise<Product> {
  return apiClient<Product>('/settings/products', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateProduct(id: string, input: { name?: string; status?: MasterStatus }): Promise<Product | null> {
  return apiClient<Product | null>(`/settings/products/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function listCostingExpenseTypes(): Promise<CostingExpenseType[]> {
  return apiClient<CostingExpenseType[]>('/settings/costing/expense-types');
}

export async function createCostingExpenseType(input: { name: string; kind: CostingExpenseKind }): Promise<CostingExpenseType> {
  return apiClient<CostingExpenseType>('/settings/costing/expense-types', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateCostingExpenseType(
  id: string,
  input: { name?: string; status?: MasterStatus },
): Promise<CostingExpenseType | null> {
  return apiClient<CostingExpenseType | null>(`/settings/costing/expense-types/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function listSellingMarginComponents(): Promise<SellingMarginComponent[]> {
  return apiClient<SellingMarginComponent[]>('/settings/costing/margins');
}

export async function createSellingMarginComponent(input: { name: string; perKg: number }): Promise<SellingMarginComponent> {
  return apiClient<SellingMarginComponent>('/settings/costing/margins', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateSellingMarginComponent(
  id: string,
  input: { name?: string; perKg?: number; status?: MasterStatus },
): Promise<SellingMarginComponent | null> {
  return apiClient<SellingMarginComponent | null>(`/settings/costing/margins/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function listMarks(): Promise<Mark[]> {
  return apiClient<Mark[]>('/settings/marks');
}

export async function createMark(input: Omit<Mark, 'id'>): Promise<Mark> {
  return apiClient<Mark>('/settings/marks', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateMark(id: string, input: Partial<Mark>): Promise<void> {
  return apiClient<void>(`/settings/marks/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function listAuditLogs(): Promise<AuditLog[]> {
  return apiClient<AuditLog[]>('/audit');
}
