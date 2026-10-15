import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CONSIGNMENT_CHARGE_NAMES, SEED_COSTING_EXPENSE_TYPES, SEED_PRODUCTS } from '@/data/costing-seed';
import { SEED_LOTS, SEED_PURCHASES, SEED_STOCK_MOVEMENTS, SEED_USERS, SEED_VENDORS } from '@/data/seed';
import { lotBelongsToProduct, lotProductLabel } from './products';

describe('consignment seed', () => {
  it('registers scale, term, and loading as purchase charges', () => {
    for (const name of CONSIGNMENT_CHARGE_NAMES) {
      const type = SEED_COSTING_EXPENSE_TYPES.find((item) => item.name === name);
      assert.ok(type, name);
      assert.equal(type.kind, 'PURCHASE');
      assert.equal(type.status, 'ACTIVE');
    }
  });

  it('gives onions five consignments and every other product at least two', () => {
    for (const product of SEED_PRODUCTS) {
      const count = SEED_LOTS.filter((lot) => lotBelongsToProduct(lot, product)).length;
      if (product.code === 'ONIONS') assert.equal(count, 5);
      else assert.ok(count >= 2, `${product.name} has ${count} consignments`);
    }
  });

  it('keeps each consignment on its product with scale, term, and loading', () => {
    assert.equal(SEED_PURCHASES.length, SEED_LOTS.length);
    for (const purchase of SEED_PURCHASES) {
      const names = purchase.expenses.map((expense) => expense.expenseTypeName);
      for (const name of CONSIGNMENT_CHARGE_NAMES) {
        assert.ok(names.includes(name), `${purchase.billNumber} is missing ${name}`);
      }
      const expenseSum = purchase.expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const goods = purchase.items.reduce((sum, item) => sum + item.totalAmount, 0);
      assert.equal(purchase.totalExpenses, expenseSum, purchase.billNumber);
      assert.equal(purchase.grossAmount, goods, purchase.billNumber);
      assert.equal(purchase.netAmount, purchase.grossAmount + purchase.totalExpenses, purchase.billNumber);
      assert.equal(purchase.attachmentUrl, undefined, purchase.billNumber);
      assert.ok(purchase.productId, purchase.billNumber);

      const lot = SEED_LOTS.find((item) => item.lotNumber === purchase.lotNumber);
      assert.ok(lot, purchase.lotNumber);
      assert.equal(lot.productId, purchase.productId);
      assert.equal(lot.purchaseBillId, purchase.id);
      assert.equal(lotProductLabel(lot, SEED_PRODUCTS), purchase.productName);
      assert.equal(
        lot.totalBags,
        purchase.items.reduce((sum, item) => sum + item.bags, 0),
      );
      assert.ok(
        SEED_STOCK_MOVEMENTS.some((movement) => movement.referenceId === purchase.id && movement.type === 'PURCHASE_IN'),
        purchase.billNumber,
      );
    }
  });

  it('matches vendor purchase totals to their consignments and drops placeholder photos', () => {
    for (const vendor of SEED_VENDORS) {
      const total = SEED_PURCHASES
        .filter((purchase) => purchase.vendorId === vendor.id)
        .reduce((sum, purchase) => sum + purchase.netAmount, 0);
      assert.equal(vendor.totalPurchases, total, vendor.name);
    }
    const serialized = JSON.stringify({ SEED_USERS, SEED_PURCHASES, SEED_LOTS });
    assert.equal(serialized.includes('unsplash.com'), false);
    assert.equal(SEED_USERS.every((user) => user.avatar == null), true);
  });
});
