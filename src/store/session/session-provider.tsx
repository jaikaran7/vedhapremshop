'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { homePath } from '@/auth/permissions';
import { STORAGE_KEYS } from '@/constants/storage';
import { SEED_USERS } from '@/data/seed';
import { useRoleSwitchMutation } from '@/hooks/mutations/use-settings-mutations';
import { setActor } from '@/store/session/actor';
import type { User, UserRole } from '@/types';

interface SessionContextValue {
  currentUser: User;
  users: User[];
  setCurrentUser: (user: User) => void;
  switchRole: (role: UserRole) => void;
  homePath: string;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

function readStoredUser(): User {
  if (typeof window === 'undefined') return SEED_USERS[0];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.currentUser);
    return raw ? (JSON.parse(raw) as User) : SEED_USERS[0];
  } catch {
    return SEED_USERS[0];
  }
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User>(() => {
    const user = readStoredUser();
    setActor(user);
    return user;
  });
  const roleSwitch = useRoleSwitchMutation();

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    setActor(user);
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
  };

  const switchRole = (role: UserRole) => {
    const userForRole = SEED_USERS.find((user) => user.role === role) ?? { ...currentUser, role };
    setCurrentUser(userForRole);
    roleSwitch.mutate(role);
  };

  const value = useMemo(
    () => ({
      currentUser,
      users: SEED_USERS,
      setCurrentUser,
      switchRole,
      homePath: homePath(currentUser.role),
    }),
    // setCurrentUser identity changes each render; consumers only need the latest user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser, roleSwitch]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
