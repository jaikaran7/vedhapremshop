'use client';

import React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  badge?: string;
  badgeVariant?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger';
  accentColor?: string;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  trend,
  icon,
  badge,
  badgeVariant = 'secondary',
  onClick,
  className,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-surface-container-lowest rounded-2xl p-6 ambient-shadow
        flex flex-col justify-between transition-all duration-200
        ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-ambient-elevated' : ''}
        ${className || ''}
      `}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-display">
          {label}
        </span>
        {icon && (
          <div className="p-2.5 rounded-xl bg-surface-container-low text-primary flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="text-2xl sm:text-3xl font-extrabold font-display text-on-surface tracking-tight">
          {value}
        </div>
        {subValue && (
          <div className="text-xs font-medium text-on-surface-variant mt-1">
            {subValue}
          </div>
        )}
      </div>

      {(trend || badge) && (
        <div className="mt-4 pt-3 flex items-center justify-between text-xs">
          {trend && (
            <span className={`font-semibold flex items-center gap-1 ${trend.isPositive ? 'text-success' : 'text-danger'}`}>
              <span>{trend.isPositive ? '↑' : '↓'} {trend.value}</span>
              {trend.label && <span className="font-normal text-on-surface-variant ml-1">{trend.label}</span>}
            </span>
          )}
          {badge && (
            <span className="ml-auto px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-medium text-[11px]">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
