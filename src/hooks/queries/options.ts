import { isMockApi } from '@/config/env';

export function mockInitialData<T>(read: () => T): { initialData?: T } {
  if (typeof window === 'undefined' || !isMockApi()) return {};
  return { initialData: read() };
}
