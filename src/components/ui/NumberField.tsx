'use client';

import React, { useState } from 'react';
import { Input, type InputProps } from '@/components/ui/Input';
import { parseTypedNumber, sanitizeTypedNumber } from '@/utils/typed-number';

type NumberFieldProps = Omit<InputProps, 'type' | 'value' | 'onChange' | 'min' | 'step'> & {
  value: number;
  onValueChange: (value: number) => void;
  allowDecimal?: boolean;
};

export function NumberField({ value, onValueChange, allowDecimal = true, onBlur, ...rest }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === 0 ? '' : String(value));

  return (
    <Input
      {...rest}
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={shown}
      onChange={(event) => {
        const next = sanitizeTypedNumber(event.target.value, allowDecimal);
        setDraft(next);
        onValueChange(parseTypedNumber(next));
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
    />
  );
}
