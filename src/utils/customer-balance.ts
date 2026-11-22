import type { CustomerLedgerEntry } from '@/types';

/**
 * What the customer owed just before this bill was added, read from their ledger.
 * The ledger is oldest first with a running balance. Returns null when the bill has no ledger
 * row (a counter sale with no customer, or a ledger that has not loaded), so nothing is guessed.
 */
export function balanceBeforeBill(
  ledger: Pick<CustomerLedgerEntry, 'customerId' | 'type' | 'referenceNo' | 'balance'>[],
  customerId: string | undefined,
  billNumber: string,
): number | null {
  if (!customerId) return null;
  const mine = ledger.filter((entry) => entry.customerId === customerId);
  const at = mine.findIndex((entry) => entry.type === 'SALE' && entry.referenceNo === billNumber);
  if (at < 0) return null;
  return at === 0 ? 0 : mine[at - 1].balance;
}

/** Previous balance plus what is still unpaid on this bill. A negative total is money the customer paid in advance. */
export function totalBalanceAfterBill(previous: number, billBalanceDue: number): number {
  return Math.round((previous + billBalanceDue) * 100) / 100;
}
