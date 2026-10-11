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
