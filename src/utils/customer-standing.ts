/** A party with no bill in this many days is closed. OB on the register means the same thing. */
export const NO_RECENT_BILL_DAYS = 90;

export interface BookStanding {
  /** Billed inside the last 90 days. */
  open: boolean;
  /** Last bill date from the register or from a bill in this system. Null when the book only says OB. */
  lastBillDate: string | null;
}

function isIsoDate(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function daysBetween(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = to.split('-').map(Number);
  return Math.round((Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / 86400000);
}

/** Last bill recorded on an opening row: `LB-YYYY-MM-DD`, or none when the reference is `OB`. */
export function lastBillFromReference(referenceNo: string | null | undefined): string | null {
  const bare = referenceNo?.startsWith('REG-') ? referenceNo.slice(4) : referenceNo;
  if (!bare?.startsWith('LB-')) return null;
  const date = bare.slice(3);
  return isIsoDate(date) ? date : null;
}

/** A later `REG-` reference replaces the spreadsheet opening. Sales in this system still count. */
function registerReferences(references: Array<string | null | undefined>): Array<string | null | undefined> {
  const corrected = references.filter((reference) => reference?.startsWith('REG-'));
  return corrected.length ? corrected : references;
}

/**
 * Open when the latest known bill is inside 90 days.
 * A register OB, or no bill at all, stays closed until a bill is posted here.
 */
export function bookStanding(input: {
  asOf: string;
  openingReferences?: Array<string | null | undefined>;
  saleDates?: Array<string | null | undefined>;
  idleDays?: number;
}): BookStanding {
  const dates = [
    ...registerReferences(input.openingReferences ?? []).map((reference) => lastBillFromReference(reference)),
    ...(input.saleDates ?? []),
  ].filter(isIsoDate);
  const lastBillDate = dates.reduce<string | null>((latest, date) => (latest == null || date > latest ? date : latest), null);
  const idleDays = input.idleDays ?? NO_RECENT_BILL_DAYS;
  const open = lastBillDate != null && isIsoDate(input.asOf) && daysBetween(lastBillDate, input.asOf) < idleDays;
  return { open, lastBillDate };
}
