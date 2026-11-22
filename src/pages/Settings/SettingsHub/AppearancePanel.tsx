'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useTheme, type ThemeName } from '@/store/preferences/theme';

const CHOICES: { value: ThemeName; label: string; note: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', note: 'The standard look. Used unless you choose otherwise.', icon: <Sun className="w-5 h-5" /> },
  { value: 'dark', label: 'Dark', note: 'Dark pages and cards, easier on the eyes at night.', icon: <Moon className="w-5 h-5" /> },
];

/** Theme choice for this device. Light stays the default even when the device itself is set to dark. */
export const AppearancePanel: React.FC = () => {
  const { theme, setTheme } = useTheme();
  return (
    <Card variant="lowest" className="space-y-4">
      <div>
        <h3 className="text-base font-bold font-display text-on-surface">Appearance</h3>
        <p className="text-xs text-on-surface-variant font-medium mt-0.5">
          Saved on this device. Printed bills, receipts and reports always print on white paper.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl" role="radiogroup" aria-label="Theme">
        {CHOICES.map((choice) => {
          const active = theme === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(choice.value)}
              className={`min-h-[88px] px-4 py-4 rounded-2xl text-left transition-all cursor-pointer ${
                active ? 'bg-primary text-white shadow-ambient' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-bold font-display">{choice.icon}{choice.label}</span>
              <span className={`block text-[11px] mt-1 ${active ? 'text-white/80' : 'text-on-surface-variant'}`}>{choice.note}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
};
