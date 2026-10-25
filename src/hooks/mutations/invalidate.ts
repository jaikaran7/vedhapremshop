'use client';

import { useQueryClient } from '@tanstack/react-query';

/** Masters change rarely: a sale or payment does not touch them, so they are not refetched after one. */
const MASTER_KEYS = new Set([
  'users', 'company', 'sale-charges', 'costing-settings', 'products', 'costing-expense-types',
  'selling-margin-components', 'marks', 'expense-categories', 'cash-accounts',
]);

/**
 * Marks the data a change can affect as stale; only screens that are open refetch. Pass `masters` from mutations that edit
 * a master (settings, categories, account openings) so those are refreshed too.
 */
export function useInvalidateMandi(options: { masters?: boolean } = {}) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ predicate: (query) => options.masters === true || !MASTER_KEYS.has(String(query.queryKey[0])) });
}
