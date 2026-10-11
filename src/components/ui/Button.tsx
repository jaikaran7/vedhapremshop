'use client';

import React, { ButtonHTMLAttributes } from 'react';
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

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
      )}
      {!isLoading && icon && iconPosition === 'left' && <span>{icon}</span>}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'right' && <span>{icon}</span>}
    </button>
  );
};

export { buttonVariants };
