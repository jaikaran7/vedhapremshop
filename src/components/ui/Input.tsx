'use client';

import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  prefixText?: string;
  suffixText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  prefixText,
  suffixText,
  icon,
  className = '',
  id,
  required,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col space-y-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-display flex items-center justify-between">
          <span>
            {label} {required && <span className="text-danger">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3.5 pointer-events-none text-on-surface-variant">
            {icon}
          </div>
        )}

        {prefixText && (
          <span className="absolute left-3.5 text-sm font-semibold text-on-surface-variant select-none">
            {prefixText}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          required={required}
          className={`
            w-full py-3 text-sm font-medium rounded-t-xl transition-all duration-200
            academic-input
            ${icon ? 'pl-10' : prefixText ? 'pl-8' : 'px-4'}
            ${suffixText ? 'pr-12' : 'pr-4'}
            ${error ? 'border-b-2 !border-b-danger bg-danger-container/20' : ''}
            ${className}
          `}
          {...props}
        />

        {suffixText && (
          <span className="absolute right-3.5 text-xs font-bold text-on-surface-variant select-none uppercase">
            {suffixText}
          </span>
        )}
      </div>

      {error ? (
        <p className="text-xs text-danger font-medium mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-on-surface-variant/80 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
