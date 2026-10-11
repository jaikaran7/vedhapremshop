'use client';

import React, { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  variant?: 'lowest' | 'low' | 'container' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'lowest',
  padding = 'lg',
  className = '',
  onClick,
  hoverable = false,
}) => {
  const variantStyles = {
    lowest: 'bg-surface-container-lowest ambient-shadow',
    low: 'bg-surface-container-low',
    container: 'bg-surface-container',
    glass: 'academic-glass ambient-shadow'
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
    xl: 'p-8 sm:p-10'
  };

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl transition-all duration-200
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hoverable ? 'hover:-translate-y-0.5 hover:shadow-ambient-elevated cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
