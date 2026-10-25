import type { UserRole } from '@/types';
import type { Permission } from '@/auth/types';

const MANAGEMENT: Permission[] = [
  'viewPurchaseCost',
  'viewProfit',
  'viewVendorCosts',
  'reviewApprovals',
  'accessVendors',
  'accessManagement',
];

export function can(role: UserRole, permission: Permission): boolean {
  // Only the Owner (super admin) decides approvals, sets account openings and sees account balances; everyone can see the queue.
  if (permission === 'manageSettings' || permission === 'reviewApprovals' || permission === 'viewAccountBalances') return role === 'OWNER';
  // Vendor bills are staff work: any role can enter, correct and receive them. What is owed to vendors stays with management.
  if (permission === 'accessPurchases') return true;
  if (MANAGEMENT.includes(permission)) return role === 'OWNER' || role === 'MANAGER';
  return false;
}

export function homePath(role: UserRole): string {
  if (role === 'SALESPERSON') return '/salesperson-home';
  if (role === 'MANAGER') return '/dashboard/manager';
  return '/dashboard/owner';
}
