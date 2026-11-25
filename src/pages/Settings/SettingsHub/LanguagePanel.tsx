'use client';

import React from 'react';
import { Languages } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useLanguage, useT, type LanguageCode } from '@/store/preferences/language';

const CHOICES: { value: LanguageCode; label: string; note: string }[] = [
  { value: 'en', label: 'English', note: 'The standard language. Used unless you choose otherwise.' },
  { value: 'te', label: 'తెలుగు (Telugu)', note: 'స్క్రీన్‌లు తెలుగులో కనిపిస్తాయి.' },
];

/** Language of the screens for this device only. Printed bills and reports stay in English. */
export const LanguagePanel: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const t = useT();
  return (
    <Card variant="lowest" className="space-y-4">
      <div>
        <h3 className="text-base font-bold font-display text-on-surface">{t('Language')}</h3>
        <p className="text-xs text-on-surface-variant font-medium mt-0.5">
          {t('Choose the language of the screens. Saved on this device only, so another device or another person using the same login keeps their own choice. Printed bills and reports stay in English.')}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl" role="radiogroup" aria-label={t('Language')}>
        {CHOICES.map((choice) => {
          const active = language === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setLanguage(choice.value)}
              className={`min-h-[88px] px-4 py-4 rounded-2xl text-left transition-all cursor-pointer ${
                active ? 'bg-primary text-white shadow-ambient' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-bold font-display"><Languages className="w-5 h-5" />{choice.label}</span>
              <span className={`block text-[11px] mt-1 ${active ? 'text-white/80' : 'text-on-surface-variant'}`}>{choice.note}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-on-surface-variant">{t('Some screens are not translated yet and still show English.')}</p>
    </Card>
  );
};
