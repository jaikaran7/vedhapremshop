'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toTelugu } from '@/i18n/translate';
import { startPageTranslation } from '@/i18n/page-translation';

export type LanguageCode = 'en' | 'te';

/** English is the default. The choice is kept in this browser only, like the theme: it never changes another device or another person on the same login. */
export const DEFAULT_LANGUAGE: LanguageCode = 'en';
export const LANGUAGE_STORAGE_KEY = 'vedhaprem-language';

function readSavedLanguage(): LanguageCode {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'te' ? 'te' : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

interface LanguageState {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
}

const LanguageContext = createContext<LanguageState>({ language: DEFAULT_LANGUAGE, setLanguage: () => undefined });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    setLanguageState(readSavedLanguage());
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // The choice still applies for this visit when storage is blocked.
    }
  }, []);

  // Every other word on screen is turned into Telugu letters as it appears, and put back when English is chosen again.
  useEffect(() => {
    if (language !== 'te') return undefined;
    return startPageTranslation(document.body);
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageState {
  return useContext(LanguageContext);
}

/** The text in the chosen language; English text with no Telugu yet is shown as it is. */
export function useT(): (text: string) => string {
  const { language } = useLanguage();
  return useCallback((text: string) => (language === 'te' ? toTelugu(text) : text), [language]);
}
