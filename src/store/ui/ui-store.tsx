'use client';

import React, { createContext, useContext, useState } from 'react';

interface UiState {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const UiContext = createContext<UiState | undefined>(undefined);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return <UiContext.Provider value={{ mobileMenuOpen, setMobileMenuOpen }}>{children}</UiContext.Provider>;
}

export function useUiStore() {
  const value = useContext(UiContext);
  if (!value) throw new Error('useUiStore must be used within UiProvider');
  return value;
}
