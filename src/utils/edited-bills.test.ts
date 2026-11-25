import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EditedBill } from '@/types';
import { groupEditsByDay, lotsOfEditedBills } from './edited-bills';

const revision = (id: string, createdAt: string, label: string) => ({
  id, revisionNo: 1, editedBy: 'Owner', editedByRole: 'OWNER' as const, reason: 'retrun', createdAt,
  changes: [{ field: label, label, from: '1', to: '2' }],
});
const bill = (id: string, lotNumbers: string[], revisions: ReturnType<typeof revision>[]): EditedBill => ({
  id, billNumber: `INV-${id}`, customerName: id === 'a' ? 'ANITHA' : 'Ravi', date: '2026-11-01', totalBags: 1, totalWeightKg: 50,
  totalAmount: 100, status: 'CONFIRMED', revisionCount: revisions.length, lotNumbers, revisions,
});

const bills = [
  bill('a', ['LOT 1'], [revision('r2', '2026-11-07T10:00:00', 'Bags'), revision('r1', '2026-11-03T10:00:00', 'Bill amount')]),
  bill('b', ['LOT 2'], [revision('r3', '2026-11-07T12:00:00', 'Bags')]),
];

describe('groupEditsByDay', () => {
  it('groups corrections by the day they were made, newest day first, and counts what changed', () => {
    const days = groupEditsByDay(bills);
    assert.deepEqual(days.map((day) => day.date), ['2026-11-07', '2026-11-03']);
    assert.equal(days[0]!.edits.length, 2);
    assert.equal(days[0]!.editCount, 2);
    assert.deepEqual(days[0]!.kinds, [{ label: 'Bags', count: 2 }]);
    assert.equal(days[0]!.edits[0]!.bill.id, 'b');
  });

  it('filters by lot, dates and search', () => {
    assert.equal(groupEditsByDay(bills, { lot: 'LOT 2' }).length, 1);
    assert.deepEqual(groupEditsByDay(bills, { from: '2026-11-05' }).map((day) => day.date), ['2026-11-07']);
    assert.deepEqual(groupEditsByDay(bills, { search: 'anit' }).map((day) => day.date), ['2026-11-07', '2026-11-03']);
    assert.equal(groupEditsByDay(bills, { search: 'zzz' }).length, 0);
  });

  it('lists each lot once', () => {
    assert.deepEqual(lotsOfEditedBills(bills), ['LOT 1', 'LOT 2']);
  });
});
