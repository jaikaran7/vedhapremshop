'use client';

import { Eye, EyeOff } from 'lucide-react';
import React, { InputHTMLAttributes, forwardRef, useState } from 'react';

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
  type = 'text',
  ...props
}, ref) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const isPassword = type === 'password';
  const rightPadding = isPassword && suffixText ? 'pr-20' : isPassword || suffixText ? 'pr-12' : icon || prefixText ? 'pr-4' : 'px-4';

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
          type={isPassword && passwordVisible ? 'text' : type}
          className={`
            w-full py-3 text-sm font-medium rounded-t-xl transition-all duration-200
            academic-input
            ${icon ? 'pl-10' : prefixText ? 'pl-8' : 'px-4'}
            ${rightPadding}
            ${error ? 'border-b-2 !border-b-danger bg-danger-container/20' : ''}
            ${className}
          `}
          {...props}
        />

        {suffixText && (
          <span className={`absolute text-xs font-bold text-on-surface-variant select-none uppercase ${isPassword ? 'right-11' : 'right-3.5'}`}>
            {suffixText}
          </span>
        )}

        {isPassword && (
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="absolute right-3 p-1 text-on-surface-variant hover:text-on-surface rounded-full"
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            aria-pressed={passwordVisible}
          >
            {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
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
