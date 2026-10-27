import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { draftIsWorthSaving, draftLotNumber, ensureSampleLotDraft, parsePurchaseDraft, readPurchaseDraft, writePurchaseDraft, clearPurchaseDraft } from './purchase-draft';

function memory() {
  const bag = new Map<string, string>();
  return {
    getItem: (key: string) => bag.get(key) ?? null,
    setItem: (key: string, value: string) => { bag.set(key, value); },
    removeItem: (key: string) => { bag.delete(key); },
  };
}

const blank = { lotCode: '', notes: '', items: [], expenses: [] };

describe('purchase draft', () => {
  it('names the lot from the purchase date and the consignment code', () => {
    assert.equal(draftLotNumber({ date: '2026-10-26', lotCode: 'ka' }), '26102026 KA');
  });

  it('ignores a blank form and keeps a started lot', () => {
    assert.equal(draftIsWorthSaving(blank), false);
    assert.equal(draftIsWorthSaving({ ...blank, lotCode: 'KA' }), true);
    assert.equal(draftIsWorthSaving({ ...blank, expenses: [{ id: '1', type: 'COMMISSION', amount: 10, description: '' }] }), true);
  });

  it('round-trips the unfinished bill and drops it when cleared', () => {
    const store = memory();
    writePurchaseDraft({
      vendorId: 'v1', vendorName: 'Murade', productId: 'p1', productName: 'Onions',
      billNumber: '00045', date: '2026-10-26', expectedArrivalDate: '', lotCode: 'KA', notes: '',
      items: [{ id: 'pi-1', markCode: 'KAOK', bags: 35, weightKg: 1719.094, ratePerKg: 46.5, totalAmount: 79938 }],
      expenses: [{ id: 'pe-1', type: 'COMMISSION', expenseTypeName: 'Commission', amount: 84592.3, description: '' }],
    }, store);
    const read = readPurchaseDraft(store);
    assert.equal(read?.lotCode, 'KA');
    assert.equal(read?.items[0]?.markCode, 'KAOK');
    assert.equal(read?.expenses[0]?.type, 'COMMISSION');
    clearPurchaseDraft(store);
    assert.equal(readPurchaseDraft(store), null);
  });

  it('offers the 26 October KA lot once, and not again after it is cleared', () => {
    const store = memory();
    const first = ensureSampleLotDraft(store);
    assert.equal(first?.lotCode, 'KA');
    assert.equal(first?.date, '2026-10-26');
    assert.equal(first?.billNumber, '00045');
    assert.equal(first?.items.length, 18);
    assert.equal(first?.items.reduce((sum, item) => sum + item.bags, 0), 513);
    const kg = first?.items.reduce((sum, item) => sum + item.weightKg, 0) ?? 0;
    assert.ok(Math.abs(kg - 25197) < 0.001);
    assert.equal(first?.items.find((item) => item.markCode === 'KABK')?.weightKg, 3203);
    assert.equal(first?.expenses[0]?.expenseTypeName, 'Commission');
    assert.equal(ensureSampleLotDraft(store)?.lotCode, 'KA');
    clearPurchaseDraft(store);
    assert.equal(ensureSampleLotDraft(store), null);
  });

  it('replaces the KA lot weights and leaves the chosen vendor in place', () => {
    const store = memory();
    writePurchaseDraft({
      ...{
        vendorId: 'vendor-1', vendorName: 'M/s. Pradip Shantaram Murade', productId: 'onions', productName: 'Onions',
        billNumber: '00045', date: '2026-10-26', expectedArrivalDate: '', lotCode: 'KA', notes: 'old',
        items: [{ id: 'old', markCode: 'KABK', bags: 50, weightKg: 2455.846, ratePerKg: 29.5, totalAmount: 1 }],
        expenses: [],
      },
    }, store);
    const updated = ensureSampleLotDraft(store);
    assert.equal(updated?.vendorId, 'vendor-1');
    assert.equal(updated?.items.find((item) => item.markCode === 'KABK')?.weightKg, 3203);
    assert.equal(updated?.items.reduce((sum, item) => sum + item.weightKg, 0), 25197);
  });

  it('rejects a broken draft', () => {
    assert.equal(parsePurchaseDraft('not-json'), null);
    assert.equal(parsePurchaseDraft('{}'), null);
  });
});
