'use client';

import React from 'react';

export interface ChipProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'secondary',
  size = 'md',
  icon,
  onRemove,
  onClick,
  className = '',
}) => {
  const variantStyles = {
    primary: 'bg-primary-fixed text-primary-on-fixed',
    secondary: 'bg-secondary-container text-secondary-on-container',
    tertiary: 'bg-tertiary-container text-tertiary-on-container',
    success: 'bg-success-container text-success-on-container font-semibold',
    danger: 'bg-danger-container text-danger-on-container font-semibold',
    neutral: 'bg-surface-container-high text-on-surface'
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 font-medium gap-1',
    md: 'text-xs px-3.5 py-1.5 font-semibold gap-1.5'
  };

  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center rounded-full tracking-wide select-none
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-transform' : ''}
        ${className}
      `}
    >
      {icon && <span className="opacity-90">{icon}</span>}
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:opacity-75 focus:outline-none"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};
