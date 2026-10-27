import { STORAGE_KEYS } from '@/constants/storage';
import type { PurchaseExpense, PurchaseItem } from '@/types';
import { composeMarkCode, lotDateStamp } from '@/utils/lot-mark';

export interface PurchaseDraft {
  vendorId: string;
  vendorName: string;
  productId: string;
  productName: string;
  billNumber: string;
  date: string;
  expectedArrivalDate: string;
  lotCode: string;
  notes: string;
  items: PurchaseItem[];
  expenses: PurchaseExpense[];
  savedAt: string;
}

type DraftStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const DRAFT_EVENT = 'vedhaprem-purchase-draft';

function notifyDraftChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DRAFT_EVENT));
}

/** Same-tab listeners hear a save or a discard. The browser storage event does not fire in the tab that wrote it. */
export function subscribePurchaseDraft(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(DRAFT_EVENT, onChange);
  return () => window.removeEventListener(DRAFT_EVENT, onChange);
}

const memory: DraftStore = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function storeOf(store?: DraftStore): DraftStore {
  if (store) return store;
  return typeof window === 'undefined' ? memory : window.localStorage;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function itemsOf(value: unknown): PurchaseItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const item = row as Partial<PurchaseItem>;
    if (typeof item.markCode !== 'string' || typeof item.bags !== 'number') return [];
    return [{
      id: text(item.id) || `pi-${item.markCode}`,
      markCode: item.markCode,
      bags: item.bags,
      weightKg: Number(item.weightKg) || 0,
      ratePerKg: Number(item.ratePerKg) || 0,
      totalAmount: Number(item.totalAmount) || 0,
    }];
  });
}

function expensesOf(value: unknown): PurchaseExpense[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const expense = row as Partial<PurchaseExpense>;
    const type = expense.type;
    if (type !== 'FREIGHT' && type !== 'HAMALI' && type !== 'MANDI_TAX' && type !== 'COMMISSION' && type !== 'OTHER') return [];
    return [{
      id: text(expense.id) || `pe-${expense.expenseTypeName ?? 'expense'}`,
      type,
      ...(expense.expenseTypeId ? { expenseTypeId: expense.expenseTypeId } : {}),
      ...(expense.expenseTypeName ? { expenseTypeName: expense.expenseTypeName } : {}),
      amount: Number(expense.amount) || 0,
      description: text(expense.description),
      ...(expense.remarks ? { remarks: expense.remarks } : {}),
    }];
  });
}

/** A blank new-bill screen is not a draft. A lot code, a quality, a charge, or a note is. */
export function draftIsWorthSaving(draft: Pick<PurchaseDraft, 'lotCode' | 'notes' | 'items' | 'expenses'>): boolean {
  return draft.lotCode.trim() !== ''
    || draft.notes.trim() !== ''
    || draft.items.length > 0
    || draft.expenses.some((expense) => Number(expense.amount) > 0);
}

export function parsePurchaseDraft(raw: string | null): PurchaseDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PurchaseDraft>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.savedAt !== 'string') return null;
    return {
      vendorId: text(parsed.vendorId),
      vendorName: text(parsed.vendorName),
      productId: text(parsed.productId),
      productName: text(parsed.productName),
      billNumber: text(parsed.billNumber),
      date: text(parsed.date),
      expectedArrivalDate: text(parsed.expectedArrivalDate),
      lotCode: text(parsed.lotCode),
      notes: text(parsed.notes),
      items: itemsOf(parsed.items),
      expenses: expensesOf(parsed.expenses),
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function readPurchaseDraft(store?: DraftStore): PurchaseDraft | null {
  return parsePurchaseDraft(storeOf(store).getItem(STORAGE_KEYS.purchaseDraft));
}

export function writePurchaseDraft(draft: Omit<PurchaseDraft, 'savedAt'>, store?: DraftStore): PurchaseDraft {
  const saved: PurchaseDraft = { ...draft, savedAt: new Date().toISOString() };
  storeOf(store).setItem(STORAGE_KEYS.purchaseDraft, JSON.stringify(saved));
  notifyDraftChanged();
  return saved;
}

export function clearPurchaseDraft(store?: DraftStore): void {
  storeOf(store).removeItem(STORAGE_KEYS.purchaseDraft);
  notifyDraftChanged();
}

function sampleLine(quality: string, bags: number, weightKg: number, ratePerKg: number): PurchaseItem {
  return {
    id: `pi-ka-${quality}`,
    markCode: composeMarkCode('KA', quality),
    bags,
    weightKg,
    ratePerKg,
    totalAmount: Math.round(weightKg * ratePerKg),
  };
}

/**
 * The 26 October 2026 onions bill used to try a close-and-reopen.
 * Mark weights are the corrected sheet. BK is not on the sheet: it is 25,197 kg minus the other marks.
 * OK is the identified 1,167 kg. KK is the bill weight, 416 kg. The 20-bag HB line is HB2.
 * Offered once per browser. Discarding it does not bring it back.
 */
const SAMPLE_LOT: Omit<PurchaseDraft, 'savedAt'> = {
  vendorId: '',
  vendorName: 'M/s. Pradip Shantaram Murade',
  productId: '',
  productName: 'Onions',
  billNumber: '00045',
  date: '2026-10-26',
  expectedArrivalDate: '',
  lotCode: 'KA',
  notes: 'Handwritten lot reference KA36. BK weight is the remainder: 25,197 kg minus 21,994 kg on the other marks = 3,203 kg. OK uses the identified 1,167 kg. KK uses the bill weight 416 kg. The 20-bag HB line is HB2.',
  items: [
    sampleLine('OK', 35, 1167, 46.5),
    sampleLine('K', 34, 1741, 47.2),
    sampleLine('N', 26, 1279, 41),
    sampleLine('KK', 11, 416, 42),
    sampleLine('27', 27, 1292, 43.5),
    sampleLine('H', 45, 2202, 45),
    sampleLine('AB', 6, 284, 31),
    sampleLine('PB', 8, 424, 30),
    sampleLine('HB', 5, 242, 30),
    sampleLine('A', 42, 1986, 46.5),
    sampleLine('26', 26, 1271, 43),
    sampleLine('P', 72, 3502, 43.5),
    sampleLine('S', 23, 1189, 45),
    sampleLine('M', 60, 2923, 44.5),
    sampleLine('18', 18, 879, 44.5),
    sampleLine('HB2', 20, 955, 33),
    sampleLine('EB', 5, 242, 30),
    sampleLine('BK', 50, 3203, 29.5),
  ],
  expenses: [{
    id: 'pe-ka-commission',
    type: 'COMMISSION',
    expenseTypeName: 'Commission',
    amount: 84592.3,
    description: 'Commission on this vendor bill',
  }],
};

function isSampleLot(draft: PurchaseDraft): boolean {
  return draft.billNumber === SAMPLE_LOT.billNumber && draft.date === SAMPLE_LOT.date && draft.lotCode.trim().toUpperCase() === SAMPLE_LOT.lotCode;
}

function sampleWeightsMatch(draft: PurchaseDraft): boolean {
  if (draft.items.length !== SAMPLE_LOT.items.length) return false;
  return SAMPLE_LOT.items.every((item, index) => {
    const current = draft.items[index];
    return current?.markCode === item.markCode && current.bags === item.bags && current.weightKg === item.weightKg;
  });
}

/** Places the KA test lot the first time this browser has no draft, and refreshes that lot when its weights change. */
export function ensureSampleLotDraft(store?: DraftStore): PurchaseDraft | null {
  const existing = readPurchaseDraft(store);
  if (existing && isSampleLot(existing) && !sampleWeightsMatch(existing)) {
    return writePurchaseDraft({
      ...SAMPLE_LOT,
      vendorId: existing.vendorId,
      vendorName: existing.vendorName || SAMPLE_LOT.vendorName,
      productId: existing.productId,
      productName: existing.productName || SAMPLE_LOT.productName,
      expectedArrivalDate: existing.expectedArrivalDate,
    }, store);
  }
  if (existing) return existing;
  const box = storeOf(store);
  if (box.getItem(STORAGE_KEYS.purchaseDraftSeeded)) return null;
  const saved = writePurchaseDraft(SAMPLE_LOT, store);
  box.setItem(STORAGE_KEYS.purchaseDraftSeeded, '1');
  return saved;
}

/** Same lot number the new-bill screen shows: `26102026 KA`. */
export function draftLotNumber(draft: Pick<PurchaseDraft, 'date' | 'lotCode'>): string {
  const stamp = lotDateStamp(draft.date);
  const code = draft.lotCode.trim().toUpperCase();
  return code ? `${stamp} ${code}`.trim() : stamp;
}
