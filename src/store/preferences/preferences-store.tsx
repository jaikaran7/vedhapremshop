'use client';

import React, { createContext, useContext, useState } from 'react';

interface PreferencesState {
  compactTables: boolean;
  setCompactTables: (value: boolean) => void;
}

const PreferencesContext = createContext<PreferencesState | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [compactTables, setCompactTables] = useState(false);
  return <PreferencesContext.Provider value={{ compactTables, setCompactTables }}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used within PreferencesProvider');
  return value;
}
