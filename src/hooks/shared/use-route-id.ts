'use client';

import { useParams } from 'next/navigation';

export function useRouteId(name = 'id'): string | undefined {
  const params = useParams();
  const value = params?.[name];
  if (Array.isArray(value)) return value[0];
  return value;
}
