import { Suspense } from 'react';
import { VendorDetails } from '@/pages/Vendors/VendorDetails/VendorDetails';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-surface" />}>
      <VendorDetails />
    </Suspense>
  );
}
