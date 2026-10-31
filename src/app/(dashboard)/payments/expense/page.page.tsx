import { Suspense } from 'react';
import { RecordExpense } from '@/pages/Payments/RecordExpense/RecordExpense';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-surface" />}>
      <RecordExpense />
    </Suspense>
  );
}
