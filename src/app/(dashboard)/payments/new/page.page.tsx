import { Suspense } from 'react';
import { PaymentEntry } from '@/pages/Payments/PaymentEntry/PaymentEntry';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-surface" />}>
      <PaymentEntry />
    </Suspense>
  );
}
