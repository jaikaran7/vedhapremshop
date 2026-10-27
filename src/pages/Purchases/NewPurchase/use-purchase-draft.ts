'use client';

import { useEffect, useRef, useState } from 'react';
import type { PurchaseExpense, PurchaseItem } from '@/types';
import { clearPurchaseDraft, draftIsWorthSaving, ensureSampleLotDraft, writePurchaseDraft, type PurchaseDraft } from '@/utils/purchase-draft';

interface DraftFields {
  editing: boolean;
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
  apply: (draft: PurchaseDraft) => void;
}

/** Keeps the unfinished vendor bill on this device and restores it when the page is opened again. */
export function usePurchaseDraft(fields: DraftFields) {
  const [hydrated, setHydrated] = useState(fields.editing);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const applyRef = useRef(fields.apply);
  const sealed = useRef(false);
  const timerRef = useRef<number | null>(null);
  const flushRef = useRef<(() => void) | null>(null);
  applyRef.current = fields.apply;

  useEffect(() => {
    if (fields.editing) return;
    const existing = ensureSampleLotDraft();
    if (existing) {
      applyRef.current(existing);
      setSavedAt(existing.savedAt);
      setRestored(true);
    }
    setHydrated(true);
  }, [fields.editing]);

  useEffect(() => {
    if (!hydrated || fields.editing || sealed.current) return;
    const snapshot = {
      vendorId: fields.vendorId,
      vendorName: fields.vendorName,
      productId: fields.productId,
      productName: fields.productName,
      billNumber: fields.billNumber,
      date: fields.date,
      expectedArrivalDate: fields.expectedArrivalDate,
      lotCode: fields.lotCode,
      notes: fields.notes,
      items: fields.items,
      expenses: fields.expenses,
    };
    if (!draftIsWorthSaving(snapshot)) {
      clearPurchaseDraft();
      setSavedAt(null);
      return;
    }
    const write = () => {
      if (sealed.current) return;
      setSavedAt(writePurchaseDraft(snapshot).savedAt);
    };
    timerRef.current = window.setTimeout(write, 300);
    flushRef.current = write;
    window.addEventListener('pagehide', write);
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      window.removeEventListener('pagehide', write);
      if (flushRef.current === write) flushRef.current = null;
    };
  }, [
    hydrated, fields.editing, fields.vendorId, fields.vendorName, fields.productId, fields.productName,
    fields.billNumber, fields.date, fields.expectedArrivalDate, fields.lotCode, fields.notes, fields.items, fields.expenses,
  ]);

  const forget = () => {
    sealed.current = true;
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    if (flushRef.current) window.removeEventListener('pagehide', flushRef.current);
    flushRef.current = null;
    clearPurchaseDraft();
    setSavedAt(null);
    setRestored(false);
  };

  return { hydrated, savedAt, restored, forget };
}
