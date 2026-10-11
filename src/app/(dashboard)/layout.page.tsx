'use client';

import { AppShell } from '@/components/layout/PageLayout/AppShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
