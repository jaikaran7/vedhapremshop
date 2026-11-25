import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toTelugu } from '../i18n/translate';

describe('toTelugu', () => {
  it('writes the English words in Telugu letters and keeps numbers', () => {
    assert.equal(toTelugu('35 bags'), '35 బ్యాగ్స్');
    assert.equal(toTelugu('Total sales'), 'టోటల్ సేల్స్');
    assert.equal(toTelugu('Customers to call'), 'కాల్ చేయాల్సిన కస్టమర్స్');
  });

  it('leaves marks, ids and names that are not words as they are', () => {
    for (const text of ['OK', 'AB', 'A', 'J SALAIAH', 'Anita', '₹1,200']) assert.equal(toTelugu(text), text);
  });

  it('turns a plural of a known word into the word and a Telugu s', () => {
    assert.equal(toTelugu('Mandis'), 'మండీస్');
  });
});
