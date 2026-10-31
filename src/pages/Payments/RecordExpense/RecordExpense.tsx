'use client';

import { useCashAccountsQuery, useExpenseCategoriesQuery } from '@/hooks/queries/use-expenses-query';
import { useVendorsQuery } from '@/hooks/queries/use-vendors-query';
import { useAddExpenseCategoryMutation, useRecordExpenseMutation } from '@/hooks/mutations/use-payment-mutations';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import type { CollectionCategoryId, PaymentMethod } from '@/types';
import { TRADING_SESSION_DATE } from '@/constants/session';
import { COLLECTION_CATEGORIES, isVendorPaymentCategory, validateExpense } from '@/utils/collection-ledger';
import { PAYMENT_METHOD_OPTIONS, formatClockTime, formatRupee, paymentMethodLabel, roundMoney } from '@/utils/settlement';
import { sanitizeTypedNumber } from '@/utils/typed-number';
import { ArrowLeft } from 'lucide-react';

const NEW_CATEGORY = '__new__';

const methodOptions = [
  ...PAYMENT_METHOD_OPTIONS,
  { value: 'CHEQUE' as PaymentMethod, label: 'Cheque' },
];

export const RecordExpense: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  // Only what the form needs, so a salesperson (who cannot read the full ledger) can record an expense too.
  const { data: accounts = [] } = useCashAccountsQuery();
  const { data: expenseCategories = [] } = useExpenseCategoriesQuery();
  const { data: vendors = [] } = useVendorsQuery();
  const recordExpense = useRecordExpenseMutation();
  const addCategory = useAddExpenseCategoryMutation();

  const vendorFromQuery = searchParams?.get('vendorId') ?? '';
  const [categoryId, setCategoryId] = useState('');
  const [newName, setNewName] = useState('');
  const [trackingChoice, setTrackingChoice] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(TRADING_SESSION_DATE);
  const paidAtLabel = formatClockTime(new Date().toISOString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [accountId, setAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [vendorId, setVendorId] = useState(vendorFromQuery);
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [saving, setSaving] = useState(false);

  const purchaseCategory = expenseCategories.find((category) => isVendorPaymentCategory(category));
  const payingThisVendor = Boolean(vendorFromQuery);
  const selectedCategoryId = payingThisVendor
    ? (purchaseCategory?.id ?? '')
    : (categoryId || expenseCategories[0]?.id || '');
  const selectedCategory = expenseCategories.find((category) => category.id === selectedCategoryId);
  const isVendorPayment = payingThisVendor || (!!selectedCategory && isVendorPaymentCategory(selectedCategory));
  const selectedVendor = vendors.find((vendor) => vendor.id === vendorId);
  const paying = Number(amount) || 0;
  const owed = selectedVendor?.payableAmount ?? 0;
  const stillOwed = Math.max(0, roundMoney(owed - paying));
  const advanceAfter = roundMoney((selectedVendor?.advanceAmount ?? 0) + Math.max(0, roundMoney(paying - owed)));

  useEffect(() => {
    if (vendorFromQuery) setVendorId(vendorFromQuery);
  }, [vendorFromQuery]);
  const trackingValue = trackingChoice ?? selectedCategory?.trackingCategory ?? '';
  const selectedAccountId = accountId || accounts.find((account) => account.kind === 'CASH')?.id || accounts[0]?.id || '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    const trackingCategory = (payingThisVendor ? null : (trackingValue || null)) as CollectionCategoryId | null;
    let resolvedCategoryId = selectedCategoryId;

    if (payingThisVendor && !selectedCategoryId) {
      toast({
        type: 'error',
        title: expenseCategories.length === 0 ? 'Still loading' : 'Purchase Payments missing',
        message: expenseCategories.length === 0
          ? 'Wait a moment and save again.'
          : 'Add a Purchase Payments category before paying a vendor.',
      });
      return;
    }

    if (selectedCategoryId === NEW_CATEGORY && !newName.trim()) {
      toast({ type: 'error', title: 'Category required', message: 'Enter a name for the new expense category' });
      return;
    }

    const message = validateExpense({
      categoryId: selectedCategoryId === NEW_CATEGORY ? newName : selectedCategoryId,
      amount: parsedAmount,
      date,
      paymentMethod,
      accountId: selectedAccountId,
    });
    if (message) {
      toast({ type: 'error', title: 'Check the expense', message });
      return;
    }

    if (isVendorPayment && !selectedVendor) {
      toast({ type: 'error', title: 'Vendor required', message: 'Choose the vendor this payment is for' });
      return;
    }

    setSaving(true);
    try {
      if (selectedCategoryId === NEW_CATEGORY) {
        const created = await addCategory.mutateAsync({ name: newName.trim(), trackingCategory });
        resolvedCategoryId = created.id;
      }
      const created = await recordExpense.mutateAsync({
        categoryId: resolvedCategoryId,
        amount: parsedAmount,
        date,
        paymentMethod,
        accountId: selectedAccountId,
        reference,
        trackingCategory,
        ...(isVendorPayment && { vendorId, ...(nextPaymentDate && { nextPaymentDate }) }),
      });
      toast({
        type: 'success',
        title: isVendorPayment ? 'Vendor payment recorded' : 'Expense recorded',
        message: isVendorPayment
          ? `Still owed: ₹${formatRupee(created.remainingDue ?? 0)}`
          : 'The account balance and cash flow now include this payment.',
      });
      router.push(isVendorPayment ? `/payments/vendor-receipt/${created.id}` : '/payments');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'The expense could not be saved';
      toast({ type: 'error', title: 'Expense not saved', message: text });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(payingThisVendor && vendorId ? `/vendors/${vendorId}` : '/payments')}
          className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            {payingThisVendor ? `Pay ${selectedVendor?.name ?? 'vendor'}` : 'Record Expense'}
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {payingThisVendor
              ? 'The time and method are saved with the payment. The amount comes off what is still owed.'
              : 'One payment out. It reduces the selected account and does not change collections.'}
          </p>
        </div>
      </div>

      <Card variant="lowest">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!payingThisVendor && (
            <Select
              label="Expense category"
              required
              value={selectedCategoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setTrackingChoice(null);
              }}
              options={[
                ...expenseCategories.map((category) => ({ value: category.id, label: category.name })),
                { value: NEW_CATEGORY, label: 'Add a category…' },
              ]}
            />
          )}

          {payingThisVendor && !purchaseCategory && expenseCategories.length > 0 && (
            <p className="text-xs text-danger">Purchase Payments is not set up, so this payment cannot be applied to the vendor.</p>
          )}

          {isVendorPayment && (
            <Select
              label="Vendor being paid"
              required
              value={vendorId}
              onChange={(event) => setVendorId(event.target.value)}
              helperText={selectedVendor ? `We owe ${selectedVendor.name} ₹${formatRupee(selectedVendor.payableAmount)}${(selectedVendor.advanceAmount ?? 0) > 0 ? ` (advance already paid: ₹${formatRupee(selectedVendor.advanceAmount ?? 0)})` : ''}. Paying more than is owed is kept as an advance and used on the next bill.` : 'The amount paid reduces what we owe this vendor.'}
              options={[{ value: '', label: 'Choose a vendor' }, ...vendors.map((vendor) => ({ value: vendor.id, label: `${vendor.name} · owed ₹${formatRupee(vendor.payableAmount)}${(vendor.advanceAmount ?? 0) > 0 ? ` · advance ₹${formatRupee(vendor.advanceAmount ?? 0)}` : ''}` }))]}
            />
          )}

          {selectedCategoryId === NEW_CATEGORY && (
            <Input
              label="New category name"
              required
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Cold storage"
            />
          )}

          {!payingThisVendor && (
            <Select
              label="Linked collection category"
              value={trackingValue}
              onChange={(event) => setTrackingChoice(event.target.value)}
              helperText="Market Fee and Amali expenses update that category’s net balance. Transport and similar expenses only reduce the cash or bank account."
              options={[
                { value: '', label: 'No collection category' },
                ...COLLECTION_CATEGORIES.map((category) => ({ value: category.id, label: category.label })),
              ]}
            />
          )}

          <Input
            label="Amount"
            required
            inputMode="decimal"
            prefixText="₹"
            value={sanitizeTypedNumber(amount)}
            onChange={(event) => setAmount(sanitizeTypedNumber(event.target.value))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date"
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            {isVendorPayment && (
              <Input
                label="Payment time"
                readOnly
                value={paidAtLabel}
                helperText="Saved with this payment and shown on the account statement."
              />
            )}
          </div>

          {isVendorPayment && (
            <Input
              label="Next payment date"
              type="date"
              value={nextPaymentDate}
              onChange={(event) => setNextPaymentDate(event.target.value)}
              helperText="Optional. The dashboard alerts you when this date is close."
            />
          )}

          <Select
            label="Payment method"
            required
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            options={methodOptions}
          />

          <Select
            label="Paid from account"
            required
            value={selectedAccountId}
            onChange={(event) => setAccountId(event.target.value)}
            options={accounts.map((account) => ({ value: account.id, label: account.name }))}
          />

          {isVendorPayment && selectedVendor && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl bg-surface-container-low p-4 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Payable outstanding</span>
                <div className="text-base font-extrabold font-display mt-1">₹{formatRupee(owed)}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">This payment</span>
                <div className="text-base font-extrabold font-display text-danger mt-1">−₹{formatRupee(paying)}</div>
                <div className="text-[11px] text-on-surface-variant mt-1">{paidAtLabel} · {paymentMethodLabel(paymentMethod)}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">{stillOwed > 0 || advanceAfter === 0 ? 'Still owed' : 'Advance with vendor'}</span>
                <div className="text-base font-extrabold font-display text-primary mt-1">₹{formatRupee(stillOwed > 0 ? stillOwed : advanceAfter)}</div>
              </div>
            </div>
          )}

          <Input
            label="Reference / remarks"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Mandi receipt or note"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => router.push(payingThisVendor && vendorId ? `/vendors/${vendorId}` : '/payments')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              {isVendorPayment ? 'Save payment' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
