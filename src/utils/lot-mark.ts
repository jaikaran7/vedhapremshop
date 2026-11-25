/** Purchase date `2026-10-26` becomes the lot date `26102026`. */
export function lotDateStamp(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return '';
  return `${day}${month}${year}`;
}

/** The short code after the date on a lot number, for example "JK" from "26102026 JK". */
export function lotCodeFromNumber(lotNumber: string): string {
  const match = lotNumber.trim().toUpperCase().match(/^\d{8}\s+([A-Z0-9]+)$/);
  return match?.[1] ?? '';
}

/**
 * The same letter can arrive on another lot at another price.
 * Lot JK and quality A are stored as JKA. Lot KJ and quality A are stored as KJA.
 * A code that already starts with the lot code is left as typed.
 */
export function composeMarkCode(lotCode: string, quality: string): string {
  const lot = lotCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const mark = quality.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!mark) return '';
  if (!lot || mark.startsWith(lot)) return mark;
  return `${lot}${mark}`;
}

function sharedPrefix(values: string[]): string {
  const first = values[0] ?? '';
  return values.reduce((prefix, value) => {
    let index = 0;
    const limit = Math.min(prefix.length, value.length);
    while (index < limit && prefix[index] === value[index]) index += 1;
    return prefix.slice(0, index);
  }, first);
}

/**
 * An older quality can already start with a two-letter code, such as KAOK.
 * Receiving it onto lot HH stores HHKAOK. Every quality on that lot still
 * starts with those same two letters, so the screen can take them off.
 */
function bakedLotPrefix(tails: string[]): string {
  if (tails.length < 2) return '';
  const extra = sharedPrefix(tails);
  if (extra.length === 2 && /^[A-Z]{2}$/.test(extra) && tails.every((tail) => tail.length > 2)) return extra;
  return '';
}

function familyCodes(markCode: string, marksOnLot: readonly string[]): string[] {
  const source = marksOnLot.length > 0 ? marksOnLot : [markCode];
  return [...new Set(source.map((item) => item.trim().toUpperCase()).filter(Boolean))];
}

/**
 * The quality typed for a consignment, without the lot code stored in front of it.
 * Lot HH and quality OK are stored as HHOK, and the screen shows OK.
 * HHKAOK shows OK when every other quality on that lot still starts with KA.
 */
export function qualityOnLot(markCode: string, lotNumber: string, marksOnLot: readonly string[] = []): string {
  const code = markCode.trim().toUpperCase();
  if (!code) return '';
  const lot = lotCodeFromNumber(lotNumber);
  const family = familyCodes(code, marksOnLot);
  const prefixed = lot !== '' && family.every((item) => item.startsWith(lot) && item.length > lot.length);
  const prefix = prefixed ? lot + bakedLotPrefix(family.map((item) => item.slice(lot.length))) : '';
  if (prefix !== '' && code.startsWith(prefix) && code.length > prefix.length) return code.slice(prefix.length);
  return code;
}

/** The quality to show for a sale line: the name typed for the consignment, never the lot code stored in front of it (ACAK shows AK). */
export function gradeOnLots(markCode: string, lotNumber: string, lots: readonly { lotNumber: string; marks: readonly { markCode: string }[] }[]): string {
  const wanted = lotNumber.trim().toUpperCase();
  const lot = lots.find((entry) => entry.lotNumber.trim().toUpperCase() === wanted);
  return qualityOnLot(markCode, lotNumber, lot?.marks.map((mark) => mark.markCode) ?? []);
}

/** The different qualities on a bill, each once, in the order sold (AK, A), without lot codes. */
export function uniqueGrades(items: readonly { markCode: string; lotNumber: string }[], lots: Parameters<typeof gradeOnLots>[2]): string[] {
  return [...new Set(items.map((item) => gradeOnLots(item.markCode, item.lotNumber, lots)).filter(Boolean))];
}

/** Each different quality on a bill once, in the order sold, with the bags sold of it: AK 4, A 1. */
export function gradesWithBags(items: readonly { markCode: string; lotNumber: string; bags: number }[], lots: Parameters<typeof gradeOnLots>[2]): { grade: string; bags: number }[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    const grade = gradeOnLots(item.markCode, item.lotNumber, lots);
    if (grade) totals.set(grade, (totals.get(grade) ?? 0) + item.bags);
  }
  return [...totals.entries()].map(([grade, bags]) => ({ grade, bags }));
}
