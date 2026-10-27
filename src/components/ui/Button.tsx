'use client';

import React, { ButtonHTMLAttributes, useEffect, useRef, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-display tracking-tight transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none',
  {
    variants: {
      variant: {
        primary: 'academic-btn-primary active:scale-[0.98]',
        secondary:
          'bg-surface-container-low text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors',
        tonal: 'bg-primary-fixed text-primary-on-fixed hover:bg-primary-fixed/80 active:scale-[0.98] transition-colors',
        ghost: 'bg-transparent text-on-surface hover:bg-surface-container-low active:bg-surface-container transition-colors',
        danger: 'bg-danger-container text-danger hover:brightness-95 active:scale-[0.98] transition-all',
        tertiary: 'bg-tertiary-container text-tertiary-on-container hover:brightness-95 font-medium transition-colors',
      },
      size: {
        sm: 'px-3.5 py-1.5 text-xs font-medium rounded-xl gap-1.5',
        md: 'px-5 py-2.5 text-sm font-medium rounded-2xl gap-2',
        lg: 'px-6 py-3.5 text-base font-semibold rounded-2xl gap-2.5',
        touch: 'px-7 py-4 text-base font-bold rounded-2xl gap-3 min-h-[52px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

function isThenable(value: unknown): value is Promise<unknown> {
  return typeof value === 'object' && value != null && typeof (value as Promise<unknown>).then === 'function';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  className = '',
  disabled,
  type = 'button',
  onClick,
  ...props
}) => {
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const loadingRef = useRef(isLoading);
  loadingRef.current = isLoading;
  const locked = Boolean(disabled || isLoading || busy);

  useEffect(() => {
    if (isLoading) {
      guard.current = true;
      setBusy(true);
      return;
    }
    guard.current = false;
    setBusy(false);
  }, [isLoading]);

  const finish = () => {
    if (isLoading) return;
    guard.current = false;
    setBusy(false);
  };

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (guard.current || disabled || isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    guard.current = true;
    setBusy(true);
    try {
      const result = onClick?.(event);
      if (isThenable(result)) {
        await result;
        finish();
        return;
      }
      if (type === 'submit') {
        const form = event.currentTarget.form;
        if (form && !form.checkValidity()) {
          finish();
          return;
        }
        window.setTimeout(() => {
          if (!loadingRef.current) finish();
        }, 0);
        return;
      }
      finish();
    } catch (error) {
      finish();
      throw error;
    }
  };

  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
      disabled={locked}
      aria-busy={locked}
      onClick={handleClick}
    >
      {(isLoading || busy) && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
      )}
      {!(isLoading || busy) && icon && iconPosition === 'left' && <span>{icon}</span>}
      <span>{children}</span>
      {!(isLoading || busy) && icon && iconPosition === 'right' && <span>{icon}</span>}
    </button>
  );
};

export { buttonVariants };
