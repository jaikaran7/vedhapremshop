'use client';

import { useCollectionsQuery } from '@/hooks/queries/use-collections-query';
import { useRouteId } from '@/hooks/shared/use-route-id';
import { useRouter } from 'next/navigation';
import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { categoryLabel, isCollectionCategory } from '@/utils/collection-ledger';
import { formatRupee, paymentMethodLabel } from '@/utils/settlement';
import { ArrowLeft } from 'lucide-react';

export const CollectionCategory: React.FC = () => {
  const categoryId = useRouteId('category');
  const router = useRouter();
  const { finance, linesFor, expenses } = useCollectionsQuery();
  const known = categoryId && isCollectionCategory(categoryId) ? categoryId : null;

  if (!known) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.push('/payments')}>
          Payments
        </Button>
        <p className="text-sm text-on-surface-variant">That collection category is not available.</p>
      </div>
    );
  }

  const lines = linesFor(known);
  const relatedExpenses = expenses.filter((expense) => expense.trackingCategory === known);
  const figures = [
    { label: 'Collected', value: finance.collectionsByCategory[known] },
    { label: 'Expenses', value: finance.expensesByTracking[known] ?? 0 },
    { label: 'Net', value: finance.netCategoryBalance[known] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/payments')}
          className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">{categoryLabel(known)}</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Each row is the part of a receipt allocated to this category.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {figures.map((figure) => (
          <div key={figure.label} className="rounded-2xl bg-surface-container-lowest px-4 py-3 ambient-shadow">
            <p className="text-xs text-on-surface-variant">{figure.label}</p>
            <p className="mt-1 text-lg font-bold font-display text-on-surface tabular-nums">₹{formatRupee(figure.value)}</p>
          </div>
        ))}
      </div>

      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="hidden md:grid md:grid-cols-5 gap-3 px-6 py-3 text-[11px] font-medium text-on-surface-variant">
          <span>Date</span>
          <span>Reference</span>
          <span>Customer / Party</span>
          <span>Payment Method</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="divide-y divide-surface-container-low">
          {lines.length === 0 && (
            <p className="p-5 text-sm text-on-surface-variant">No collections in this category.</p>
          )}
          {lines.map((line) => (
            <div key={line.id} className="p-5 sm:px-6 grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-3 md:items-center">
              <div className="text-sm text-on-surface">{line.date}{line.time ? ` · ${line.time}` : ''}</div>
              <div className="text-sm font-bold font-display text-on-surface">{line.reference}</div>
              <div className="text-sm text-on-surface">{line.party}</div>
              <div><Chip label={paymentMethodLabel(line.paymentMethod)} size="sm" variant="secondary" /></div>
              <div className="text-sm font-extrabold font-display text-success md:text-right tabular-nums">₹{formatRupee(line.amount)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="px-5 py-4 sm:px-6">
          <h2 className="text-base font-bold font-display text-on-surface">Linked expenses</h2>
        </div>
        <div className="divide-y divide-surface-container-low">
          {relatedExpenses.length === 0 && (
            <p className="px-5 pb-5 text-sm text-on-surface-variant">No expenses linked to this category.</p>
          )}
          {relatedExpenses.map((expense) => (
            <div key={expense.id} className="p-5 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold font-display text-on-surface">{expense.categoryName}</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {expense.date} · {paymentMethodLabel(expense.paymentMethod)} · {expense.accountName}
                  {expense.reference ? ` · ${expense.reference}` : ''}
                </p>
              </div>
              <div className="text-sm font-extrabold font-display text-danger tabular-nums">−₹{formatRupee(expense.amount)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
