import type { EditedBill, SaleRevision } from '@/types';

export interface EditedBillFilters {
  from?: string;
  to?: string;
  lot?: string;
  search?: string;
}

/** One bill's corrections made on one day. */
export interface DayEdit {
  bill: EditedBill;
  revisions: SaleRevision[];
}

export interface EditDay {
  /** The day the corrections were made, yyyy-mm-dd. */
  date: string;
  edits: DayEdit[];
  editCount: number;
  /** What was changed that day (Bags, Bill amount, Bags and rates) and how many times each. */
  kinds: { label: string; count: number }[];
}

/** The calendar day of a timestamp on this device, yyyy-mm-dd. */
export function dayOf(timestamp: string): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function matches(bill: EditedBill, filters: EditedBillFilters): boolean {
  if (filters.lot && !bill.lotNumbers.includes(filters.lot)) return false;
  const search = filters.search?.trim().toLowerCase();
  if (!search) return true;
  return bill.billNumber.toLowerCase().includes(search) || bill.customerName.toLowerCase().includes(search);
}

/** Corrections grouped by the day they were made, newest day first, each bill once per day with that day's corrections. */
export function groupEditsByDay(bills: readonly EditedBill[], filters: EditedBillFilters = {}): EditDay[] {
  const days = new Map<string, Map<string, DayEdit>>();
  for (const bill of bills) {
    if (!matches(bill, filters)) continue;
    for (const revision of bill.revisions) {
      const date = dayOf(revision.createdAt);
      if ((filters.from && date < filters.from) || (filters.to && date > filters.to)) continue;
      const day = days.get(date) ?? new Map<string, DayEdit>();
      const entry = day.get(bill.id) ?? { bill, revisions: [] };
      entry.revisions.push(revision);
      day.set(bill.id, entry);
      days.set(date, day);
    }
  }
  return [...days.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, day]) => {
      const edits = [...day.values()].sort((left, right) => right.revisions[0]!.createdAt.localeCompare(left.revisions[0]!.createdAt));
      const counts = new Map<string, number>();
      for (const edit of edits) {
        for (const revision of edit.revisions) {
          for (const change of revision.changes) counts.set(change.label, (counts.get(change.label) ?? 0) + 1);
        }
      }
      return {
        date,
        edits,
        editCount: edits.reduce((sum, edit) => sum + edit.revisions.length, 0),
        kinds: [...counts.entries()].map(([label, count]) => ({ label, count })).sort((left, right) => right.count - left.count),
      };
    });
}

/** Every lot any edited bill sold from, for the lot filter. */
export function lotsOfEditedBills(bills: readonly EditedBill[]): string[] {
  return [...new Set(bills.flatMap((bill) => bill.lotNumbers))].sort();
}
