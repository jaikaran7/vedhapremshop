import type { UserRole } from '@/types';

export type Permission =
  | 'viewPurchaseCost'
  | 'viewProfit'
  | 'viewVendorCosts'
  | 'reviewApprovals'
  | 'manageSettings'
  | 'accessPurchases'
  | 'accessVendors'
  | 'accessManagement';

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
}
