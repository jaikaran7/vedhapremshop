import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  balanceAfterPayment,
  calculateSaleCharges,
  chargesForSale,
  countSaleBags,
  DEFAULT_SALE_CHARGE_SETTINGS,
  validateChargeAmount,
  validateFeePercent,
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
    assert.equal(charges.marketFeeAmount, 105);
    assert.equal(charges.marketFeeBasis, 'BILL_PERCENT');
    assert.equal(charges.totalAdditionalCharges, 165);
    assert.equal(charges.productSubtotal, 10419);
    assert.equal(charges.finalInvoiceAmount, 10584);
  });

  it('keeps the remaining due against the final invoice', () => {
    const charges = calculateSaleCharges({
      totalBags: 3,
      productSubtotal: 10419,
      settings: defaults,
    });
    assert.equal(balanceAfterPayment(charges.finalInvoiceAmount, 5000), 5584);
  });

  it('uses custom per-bag rates', () => {
    const charges = calculateSaleCharges({
      totalBags: 3,
      productSubtotal: 10419,
      settings: {
        amaliPerBag: 25,
        marketFeePerBag: 12,
        marketFeeBasis: 'PER_BAG',
        marketFeePercent: 1,
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
      marketFeeBasis: 'PER_BAG' as const,
      marketFeePercent: 1,
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
    assert.equal(historical.marketFeeAmount, 105);
    assert.equal(historical.finalInvoiceAmount, 10584);
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
    assert.equal(charges.marketFeeAmount, 168);
    assert.equal(charges.finalInvoiceAmount, 17057);
  });

  it('rejects negative or blank charge amounts', () => {
    assert.equal(validateChargeAmount('20'), null);
    assert.equal(validateChargeAmount('0'), null);
    assert.match(validateChargeAmount('-1') ?? '', /negative/i);
    assert.match(validateChargeAmount('') ?? '', /amount/i);
    assert.match(validateChargeAmount('20.555') ?? '', /decimal/i);
    assert.equal(validateFeePercent('1'), null);
    assert.match(validateFeePercent('101') ?? '', /100/);
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
  const settings = DEFAULT_SALE_CHARGE_SETTINGS;
  // 3 bags, ₹10,419 of onions + ₹60 Amali + 1% market fee ₹104.19, rounded up to ₹10,584 before tax

  it('no tax: the bill is a whole rupee', () => {
    const charges = calculateSaleCharges({ totalBags: 3, productSubtotal: 10_419, settings });
    assert.equal(charges.taxAmount, 0);
    assert.equal(charges.finalInvoiceAmount, 10_584);
  });

  it('a percentage is applied to the whole invoice and rounded to the rupee (same as the backend)', () => {
    const charges = calculateSaleCharges({ totalBags: 3, productSubtotal: 10_419, settings, tax: { percent: 5 } });
    assert.equal(charges.taxAmount, 529);
    assert.equal(charges.taxPercent, 5);
    assert.equal(charges.finalInvoiceAmount, 11_113);
    assert.equal(charges.totalAdditionalCharges, 694);
    assert.equal(calculateSaleCharges({ totalBags: 3, productSubtotal: 10_419, settings, tax: { percent: 18 } }).taxAmount, 1_905);
  });

  it('a typed amount is added, then the bill is rounded up to the next rupee', () => {
    const charges = calculateSaleCharges({ totalBags: 3, productSubtotal: 10_419, settings, tax: { amount: 250.5 } });
    assert.equal(charges.taxAmount, 250.5);
    assert.equal(charges.finalInvoiceAmount, 10_834);
  });
});
