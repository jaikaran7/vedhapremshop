import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  balanceAfterPayment,
  calculateSaleCharges,
  chargesForSale,
  countSaleBags,
  DEFAULT_SALE_CHARGE_SETTINGS,
  validateChargeAmount,
} from './sale-charges';
import type { SaleChargeSnapshot } from '../types';

const defaults = DEFAULT_SALE_CHARGE_SETTINGS;

describe('sale charges', () => {
  it('calculates amali and market fee for a three-bag sale', () => {
    const charges = calculateSaleCharges({
      totalBags: 3,
      productSubtotal: 10419,
      settings: defaults,
    });

    assert.equal(charges.amaliAmount, 60);
    assert.equal(charges.marketFeeAmount, 30);
    assert.equal(charges.totalAdditionalCharges, 90);
    assert.equal(charges.productSubtotal, 10419);
    assert.equal(charges.finalInvoiceAmount, 10509);
  });

  it('keeps the remaining due against the final invoice', () => {
    const charges = calculateSaleCharges({
      totalBags: 3,
      productSubtotal: 10419,
      settings: defaults,
    });
    assert.equal(balanceAfterPayment(charges.finalInvoiceAmount, 5000), 5509);
  });

  it('uses custom per-bag rates', () => {
    const charges = calculateSaleCharges({
      totalBags: 3,
      productSubtotal: 10419,
      settings: {
        amaliPerBag: 25,
        marketFeePerBag: 12,
        amaliEnabled: true,
        marketFeeEnabled: true,
      },
    });
    assert.equal(charges.amaliAmount, 75);
    assert.equal(charges.marketFeeAmount, 36);
    assert.equal(charges.finalInvoiceAmount, 10530);
  });

  it('keeps a finalized snapshot when settings change', () => {
    const original: SaleChargeSnapshot = calculateSaleCharges({
      totalBags: 3,
      productSubtotal: 10419,
      settings: defaults,
    });
    const updatedSettings = {
      amaliPerBag: 25,
      marketFeePerBag: 12,
      amaliEnabled: true,
      marketFeeEnabled: true,
    };
    const historical = chargesForSale({
      totalBags: 3,
      totalAmount: original.finalInvoiceAmount,
      charges: original,
    });
    const nextInvoice = calculateSaleCharges({
      totalBags: 3,
      productSubtotal: 10419,
      settings: updatedSettings,
    });

    assert.equal(historical.amaliAmount, 60);
    assert.equal(historical.marketFeeAmount, 30);
    assert.equal(historical.finalInvoiceAmount, 10509);
    assert.equal(nextInvoice.amaliAmount, 75);
    assert.equal(nextInvoice.marketFeeAmount, 36);
  });

  it('counts bags across qualities once', () => {
    const bags = countSaleBags([
      { bags: 3 },
      { bags: 2 },
    ]);
    const charges = calculateSaleCharges({
      totalBags: bags,
      productSubtotal: 16789,
      settings: defaults,
    });
    assert.equal(bags, 5);
    assert.equal(charges.amaliAmount, 100);
    assert.equal(charges.marketFeeAmount, 50);
    assert.equal(charges.finalInvoiceAmount, 16939);
  });

  it('rejects negative or blank charge amounts', () => {
    assert.equal(validateChargeAmount('20'), null);
    assert.equal(validateChargeAmount('0'), null);
    assert.match(validateChargeAmount('-1') ?? '', /negative/i);
    assert.match(validateChargeAmount('') ?? '', /amount/i);
    assert.match(validateChargeAmount('20.555') ?? '', /decimal/i);
  });

  it('does not charge a disabled fee', () => {
    const charges = calculateSaleCharges({
      totalBags: 3,
      productSubtotal: 1000,
      settings: { ...defaults, marketFeeEnabled: false },
    });
    assert.equal(charges.amaliAmount, 60);
    assert.equal(charges.marketFeeAmount, 0);
    assert.equal(charges.finalInvoiceAmount, 1060);
  });
});

describe('optional GST / tax on a bill', () => {
  const settings = { amaliPerBag: 20, marketFeePerBag: 10, amaliEnabled: true, marketFeeEnabled: true };
  // 3 bags, ₹10,419 of onions + ₹90 of fees = ₹10,509 before tax

  it('no tax: unchanged', () => {
    const charges = calculateSaleCharges({ totalBags: 3, productSubtotal: 10_419, settings });
    assert.equal(charges.taxAmount, 0);
    assert.equal(charges.finalInvoiceAmount, 10_509);
  });

  it('a percentage is applied to the whole invoice and rounded to the rupee (same as the backend)', () => {
    const charges = calculateSaleCharges({ totalBags: 3, productSubtotal: 10_419, settings, tax: { percent: 5 } });
    assert.equal(charges.taxAmount, 525);
    assert.equal(charges.taxPercent, 5);
    assert.equal(charges.finalInvoiceAmount, 11_034);
    assert.equal(charges.totalAdditionalCharges, 615);
    assert.equal(calculateSaleCharges({ totalBags: 3, productSubtotal: 10_419, settings, tax: { percent: 18 } }).taxAmount, 1_892);
  });

  it('a typed amount is added exactly', () => {
    const charges = calculateSaleCharges({ totalBags: 3, productSubtotal: 10_419, settings, tax: { amount: 250.5 } });
    assert.equal(charges.taxAmount, 250.5);
    assert.equal(charges.finalInvoiceAmount, 10_759.5);
  });
});
