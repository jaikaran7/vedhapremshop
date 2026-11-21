import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bookStanding, lastBillFromReference, NO_RECENT_BILL_DAYS } from './customer-standing';

describe('customer book standing', () => {
  const asOf = '2026-11-07';

  it('treats OB as closed, with no last bill date', () => {
    assert.equal(lastBillFromReference('OB'), null);
    assert.deepEqual(bookStanding({ asOf, openingReferences: ['OB'] }), { open: false, lastBillDate: null });
  });

  it('opens a party billed inside 90 days and closes one billed before that', () => {
    assert.equal(NO_RECENT_BILL_DAYS, 90);
    assert.deepEqual(bookStanding({ asOf, openingReferences: ['LB-2026-10-21'] }), { open: true, lastBillDate: '2026-10-21' });
    assert.deepEqual(bookStanding({ asOf, openingReferences: ['LB-2026-06-29'] }), { open: false, lastBillDate: '2026-06-29' });
  });

  it('a bill posted in this system reopens a party the register marked OB', () => {
    assert.deepEqual(
      bookStanding({ asOf, openingReferences: ['OB'], saleDates: ['2026-11-01'] }),
      { open: true, lastBillDate: '2026-11-01' },
    );
  });

  it('stays closed when there is no bill date at all', () => {
    assert.deepEqual(bookStanding({ asOf }), { open: false, lastBillDate: null });
  });

  it('a scan correction replaces the spreadsheet bill date', () => {
    assert.deepEqual(
      bookStanding({ asOf, openingReferences: ['LB-2026-09-07', 'REG-LB-2026-09-04'] }),
      { open: true, lastBillDate: '2026-09-04' },
    );
  });
});
