'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/store/session/session-provider';

export default function HomePage() {
  const { homePath } = useSession();
  const router = useRouter();

  useEffect(() => {
    router.replace(homePath);
  }, [homePath, router]);

  return <div className="min-h-screen bg-surface" />;
}
