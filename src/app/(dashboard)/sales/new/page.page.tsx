import { Suspense } from 'react';
import { NewSaleWorkflow } from '@/pages/Sales/NewSaleWorkflow/NewSaleWorkflow';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-surface" />}>
      <NewSaleWorkflow />
    </Suspense>
  );
}
