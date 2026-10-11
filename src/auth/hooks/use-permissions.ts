'use client';

import { can, homePath } from '@/auth/permissions';
import type { Permission } from '@/auth/types';
import { useSession } from '@/store/session/session-provider';

export function usePermissions() {
  const { currentUser } = useSession();
  return {
    role: currentUser.role,
    can: (permission: Permission) => can(currentUser.role, permission),
    homePath: homePath(currentUser.role),
  };
}
