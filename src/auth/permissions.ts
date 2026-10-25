import type { UserRole } from '@/types';
import type { Permission } from '@/auth/types';

const MANAGEMENT: Permission[] = [
  'viewPurchaseCost',
  'viewProfit',
  'viewVendorCosts',
  'reviewApprovals',
  'accessPurchases',
  'accessVendors',
  'accessManagement',
];

export function can(role: UserRole, permission: Permission): boolean {
  // Only the Owner (super admin) decides approvals; everyone can see the queue.
  if (permission === 'manageSettings' || permission === 'reviewApprovals') return role === 'OWNER';
  if (MANAGEMENT.includes(permission)) return role === 'OWNER' || role === 'MANAGER';
  return false;
}

export function homePath(role: UserRole): string {
  if (role === 'SALESPERSON') return '/salesperson-home';
  if (role === 'MANAGER') return '/dashboard/manager';
  return '/dashboard/owner';
}
