'use client';

import * as React from 'react';
import { cn } from '@/utils/cn';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn('academic-input min-h-[96px] w-full rounded-t-xl px-4 py-3 text-sm font-medium', className)}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
