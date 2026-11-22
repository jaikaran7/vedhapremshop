import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { customerLineLabels } from './bill-lines';

describe('customerLineLabels', () => {
  it('numbers each product separately and uses the singular name', () => {
    const labels = customerLineLabels([
      { productName: 'Onions' }, { productName: 'Garlic' }, { productName: 'Onions' }, { productName: 'Ginger' },
    ]);
    assert.deepEqual(labels, ['Onion 1', 'Garlic 1', 'Onion 2', 'Ginger 1']);
  });

  it('calls older lines with no product Onion', () => {
    assert.deepEqual(customerLineLabels([{}, {}]), ['Onion 1', 'Onion 2']);
  });
});
