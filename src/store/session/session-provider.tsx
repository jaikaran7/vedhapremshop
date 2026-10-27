'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSessionUser } from '@/api/auth.api';
import { homePath } from '@/auth/permissions';
import { STORAGE_KEYS, STORAGE_PREFIX } from '@/constants/storage';
import type { User } from '@/types';

const GUEST: User = {
  id: '',
  name: '',
  username: '',
  email: '',
  phone: '',
  role: 'SALESPERSON',
  active: false,
};

interface SessionContextValue {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  homePath: string;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

function isAuthPath(pathname: string): boolean {
  return ['/login', '/forgot-password', '/reset-password', '/change-password'].includes(pathname);
}

function readStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.currentUser);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function clearLegacyMockStorage() {
  if (typeof window === 'undefined') return;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(STORAGE_PREFIX) && key !== STORAGE_KEYS.currentUser && key !== STORAGE_KEYS.purchaseDraft && key !== STORAGE_KEYS.purchaseDraftSeeded) {
      localStorage.removeItem(key);
    }
  }
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User>(() => readStoredUser() ?? GUEST);

  useEffect(() => {
    clearLegacyMockStorage();
    if (isAuthPath(window.location.pathname)) return;
    getSessionUser()
      .then(setCurrentUser)
      .catch(() => {
        localStorage.removeItem(STORAGE_KEYS.currentUser);
        setCurrentUserState(GUEST);
        if (!isAuthPath(window.location.pathname)) window.location.assign('/login');
      });
  }, []);

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
  };

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      homePath: homePath(currentUser.role),
    }),
    [currentUser]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
