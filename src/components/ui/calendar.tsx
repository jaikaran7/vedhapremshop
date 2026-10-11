'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/utils/cn';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={cn('rounded-2xl bg-surface-container-lowest p-3 text-on-surface', className)}
      {...props}
    />
  );
}

export { Calendar };
