import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateReceiving, type ReceivingDraftGroup } from './receiving';
import type { ReceivingExpenseEntry } from '@/types';

const settings = { defaultSellingMarginPerKg: 6, roundingRule: 'CEIL_WHOLE_RUPEE' as const };

const group = (over: Partial<ReceivingDraftGroup> = {}): ReceivingDraftGroup => ({
  id: 'g1', markCode: 'AA', fromVendorBill: true, expectedBags: 10, expectedWeightKg: 500,
  receivedBags: 10, acceptedBags: 10, defectiveBags: 0, receivedWeightKg: 500,
  originalPurchaseRate: 47, revisedSellingRate: null, overrideReason: '', remarks: '', bagWeights: [], ...over,
});

const expense = (over: Partial<ReceivingExpenseEntry> = {}): ReceivingExpenseEntry => ({
  id: 'e1', expenseTypeId: 'cet', expenseTypeName: 'Transport', description: '', amount: 1000, remarks: '',
  allocation: { method: 'BY_RECEIVED_KG' }, ...over,
});

describe('receiving preview matches the server rules', () => {
  it('spreads a fixed total by kilograms and ceilings the selling rate', () => {
    const ok: ReceivingDraftGroup = group({
      id: 'ok', markCode: 'KAOK', expectedBags: 35, receivedBags: 35, acceptedBags: 35,
      expectedWeightKg: 1167, receivedWeightKg: 1167, originalPurchaseRate: 46.5,
    });
    const rest = group({
      id: 'rest', markCode: 'REST', expectedBags: 478, receivedBags: 478, acceptedBags: 478,
      expectedWeightKg: 24030, receivedWeightKg: 24030, originalPurchaseRate: 40,
    });
    const result = evaluateReceiving({
      draft: { groups: [ok, rest], expenses: [expense({ amount: 20000, amountBasis: 'FIXED_TOTAL' })] },
      settings, margins: [],
    });
    assert.ok(Math.abs((result.groups[0]?.allocatedReceivingCostPerKg ?? 0) - (20000 / 25197)) < 1e-10);
    assert.notEqual(Math.round(20000 / 25197), result.groups[0]?.allocatedReceivingCostPerKg);
  });

  it('charges ₹5 for each bag instead of spreading ₹5 across the bags', () => {
    const ok = group({
      id: 'ok', markCode: 'KAOK', expectedBags: 35, receivedBags: 35, acceptedBags: 35,
      expectedWeightKg: 1167, receivedWeightKg: 1167,
    });
    const rest = group({
      id: 'rest', markCode: 'REST', expectedBags: 478, receivedBags: 478, acceptedBags: 478,
      expectedWeightKg: 24030, receivedWeightKg: 24030,
    });
    const result = evaluateReceiving({
      draft: {
        groups: [ok, rest],
        expenses: [expense({ amount: 5, amountBasis: 'PER_BAG', expenseTypeName: 'Loading', allocation: { method: 'BY_RECEIVED_BAGS' } })],
      },
      settings, margins: [],
    });
    const perKg = result.groups[0]?.allocatedReceivingCostPerKg ?? 0;
    assert.ok(Math.abs(perKg - (175 / 1167)) < 1e-10);
    assert.ok(Math.abs(perKg - (5 / 513)) > 0.001);
    const total = result.groups.reduce((sum, item) => sum + (item.allocatedReceivingCostPerKg ?? 0) * item.receivedWeightKg, 0);
    assert.ok(Math.abs(total - 2565) < 1e-6);
  });

  it('lets a mark commission replace the lot commission, and a reset inherit again', () => {
    const withOverrides = evaluateReceiving({
      draft: {
        groups: [group({ id: 'a', markCode: 'A' }), group({ id: 'b', markCode: 'B', marginPerKg: 4 })],
        expenses: [],
        lotMarginPerKg: 8,
      },
      settings, margins: [],
    });
    assert.deepEqual(withOverrides.groups.map((item) => item.calculatedFinalRate), [55, 51]);

    const reset = evaluateReceiving({
      draft: { groups: [group({ id: 'a', markCode: 'A' }), group({ id: 'b', markCode: 'B', marginPerKg: null })], expenses: [] },
      settings, margins: [],
    });
    assert.deepEqual(reset.groups.map((item) => item.calculatedFinalRate), [53, 53]);
  });

  it('ceilings 52.20 to 53 and keeps an exact 52', () => {
    const above = evaluateReceiving({ draft: { groups: [group({ originalPurchaseRate: 46.2 })], expenses: [] }, settings, margins: [] });
    const exact = evaluateReceiving({ draft: { groups: [group({ originalPurchaseRate: 46 })], expenses: [] }, settings, margins: [] });
    assert.equal(above.groups[0]?.calculatedFinalRate, 53);
    assert.equal(exact.groups[0]?.calculatedFinalRate, 52);
  });
});
