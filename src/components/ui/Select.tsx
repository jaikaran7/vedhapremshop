'use client';

import React, { SelectHTMLAttributes, forwardRef } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: { value: string | number; label: string; disabled?: boolean }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helperText,
  options,
  children,
  className = '',
  id,
  required,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col space-y-1.5 text-left">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-display flex items-center justify-between">
          <span>
            {label} {required && <span className="text-danger">*</span>}
          </span>
        </label>
      )}

      <div className="relative w-full">
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={`
            w-full py-3 px-4 text-sm font-medium rounded-t-xl transition-all duration-200 appearance-none
            academic-input pr-10 cursor-pointer
            ${error ? 'border-b-2 !border-b-danger bg-danger-container/20' : ''}
            ${className}
          `}
          {...props}
        >
          {options ? options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          )) : children}
        </select>
        
        {/* Custom Chevron icon */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      </div>

      {error ? (
        <p className="text-xs text-danger font-medium mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-on-surface-variant/80 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
