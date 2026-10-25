'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from '@/store/session/session-provider';
import { ToastProvider } from '@/components/ui/Toast';
import { TooltipProvider } from '@/components/ui/tooltip';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            // Fresh for 30 s: opening a screen again does not refetch. Mutations mark what they touch stale (useInvalidateMandi).
            staleTime: 30_000,
          },
        },
      })
  );
  const [ready, setReady] = useState(false);

  React.useEffect(() => {
    setReady(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <TooltipProvider>
          <ToastProvider>{ready ? children : <div className="min-h-screen bg-surface" />}</ToastProvider>
        </TooltipProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
