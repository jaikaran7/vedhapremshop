import { Suspense } from 'react';
import { NewPurchase } from '@/pages/Purchases/NewPurchase/NewPurchase';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-surface" />}>
      <NewPurchase />
    </Suspense>
  );
}
