'use client';

import { useQueryClient } from '@tanstack/react-query';

export function useInvalidateMandi() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}
