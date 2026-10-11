import { Suspense } from 'react';
import { ReportsHub } from '@/pages/Reports/ReportsHub/ReportsHub';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-surface" />}>
      <ReportsHub />
    </Suspense>
  );
}
