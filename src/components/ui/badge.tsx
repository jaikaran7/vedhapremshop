'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const badgeVariants = cva('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', {
  variants: {
    variant: {
      primary: 'bg-primary-fixed text-primary-on-fixed',
      secondary: 'bg-secondary-container text-secondary-on-container',
      tertiary: 'bg-tertiary-container text-tertiary-on-container',
      success: 'bg-success-container text-success-on-container',
      danger: 'bg-danger-container text-danger-on-container',
      neutral: 'bg-surface-container-high text-on-surface',
    },
  },
  defaultVariants: { variant: 'secondary' },
});

function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
