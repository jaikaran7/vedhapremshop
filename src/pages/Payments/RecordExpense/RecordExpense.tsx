'use client';

import { useCollectionsQuery } from '@/hooks/queries/use-collections-query';
import { useAddExpenseCategoryMutation, useRecordExpenseMutation } from '@/hooks/mutations/use-payment-mutations';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import type { CollectionCategoryId, PaymentMethod } from '@/types';
import { COLLECTION_CATEGORIES, validateExpense } from '@/utils/collection-ledger';
import { PAYMENT_METHOD_OPTIONS } from '@/utils/settlement';
import { ArrowLeft } from 'lucide-react';

const NEW_CATEGORY = '__new__';

const methodOptions = [
  ...PAYMENT_METHOD_OPTIONS,
  { value: 'CHEQUE' as PaymentMethod, label: 'Cheque' },
];

export const RecordExpense: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { accounts, expenseCategories } = useCollectionsQuery();
  const recordExpense = useRecordExpenseMutation();
  const addCategory = useAddExpenseCategoryMutation();

  const [categoryId, setCategoryId] = useState('');
  const [newName, setNewName] = useState('');
  const [trackingChoice, setTrackingChoice] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [accountId, setAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedCategoryId = categoryId || expenseCategories[0]?.id || '';
  const selectedCategory = expenseCategories.find((category) => category.id === selectedCategoryId);
  const trackingValue = trackingChoice ?? selectedCategory?.trackingCategory ?? '';
  const selectedAccountId = accountId || accounts.find((account) => account.kind === 'CASH')?.id || accounts[0]?.id || '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    const trackingCategory = (trackingValue || null) as CollectionCategoryId | null;
    let resolvedCategoryId = selectedCategoryId;

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

    setSaving(true);
    try {
      if (selectedCategoryId === NEW_CATEGORY) {
        const created = await addCategory.mutateAsync({ name: newName.trim(), trackingCategory });
        resolvedCategoryId = created.id;
      }
      await recordExpense.mutateAsync({
        categoryId: resolvedCategoryId,
        amount: parsedAmount,
        date,
        paymentMethod,
        accountId: selectedAccountId,
        reference,
        trackingCategory,
      });
      toast({ type: 'success', title: 'Expense recorded', message: 'The account balance and cash flow now include this payment.' });
      router.push('/payments');
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
          onClick={() => router.push('/payments')}
          className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">Record Expense</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            One payment out. It reduces the selected account and does not change collections.
          </p>
        </div>
      </div>

      <Card variant="lowest">
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {selectedCategoryId === NEW_CATEGORY && (
            <Input
              label="New category name"
              required
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Cold storage"
            />
          )}

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

          <Input
            label="Amount"
            required
            type="number"
            min="0"
            step="0.01"
            prefixText="₹"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
          />

          <Input
            label="Date"
            required
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />

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

          <Input
            label="Reference / remarks"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Mandi receipt or note"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => router.push('/payments')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
