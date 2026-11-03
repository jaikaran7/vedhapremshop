'use client';

import { useEditedBillsQuery } from '@/hooks/queries/use-edited-bills-query';
import React, { useState } from 'react';
import type { EditedBill, PurchaseRevisionChange } from '@/types';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { History, ReceiptText } from 'lucide-react';

const preview = (changes: PurchaseRevisionChange[]): string => {
  const shown = changes.find((change) => change.field !== 'items') ?? changes[0];
  if (!shown) return 'Recorded with no field difference';
  if (shown.field === 'items') return 'Bags and rates changed';
  const extra = changes.length - 1;
  return `${shown.label}: ${shown.from} → ${shown.to}${extra > 0 ? ` · +${extra} more` : ''}`;
};

export const ApprovalsHub: React.FC = () => {
  const { data: bills = [], isLoading, isError } = useEditedBillsQuery();
  const [selected, setSelected] = useState<EditedBill | null>(null);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
          Edited Bills
        </h1>
        <p className="text-xs text-on-surface-variant font-medium mt-1">
          Bills that were changed, and what changed. Open a bill to see the previous value and the current one.
        </p>
      </div>

      <Card variant="lowest" padding="none" className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <p className="text-xs text-on-surface-variant">Loading edited bills…</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <h4 className="text-base font-bold font-display text-on-surface">Could not load edited bills</h4>
            <p className="text-xs text-on-surface-variant mt-1">Refresh the page and try again.</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="p-12 text-center">
            <ReceiptText className="w-12 h-12 text-on-surface-variant/40 mx-auto mb-3" />
            <h4 className="text-base font-bold font-display text-on-surface">No edited bills</h4>
            <p className="text-xs text-on-surface-variant mt-1">When a bill is corrected, it shows up here with what changed.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-container-low">
            {bills.map((bill) => {
              const latest = bill.revisions[0];
              return (
                <button
                  key={bill.id}
                  type="button"
                  onClick={() => setSelected(bill)}
                  className="w-full text-left p-5 sm:px-6 hover:bg-surface-container-low/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-primary font-display">{bill.billNumber}</span>
                      <Chip label={bill.revisionCount === 1 ? 'Edited once' : `Edited ${bill.revisionCount}×`} size="sm" variant="tertiary" />
                      <span className="text-xs text-on-surface-variant font-medium">
                        Billed {bill.date}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-on-surface mt-1">
                      {bill.customerName}
                      {latest && <> — {latest.editedBy} ({latest.editedByRole.toLowerCase()})</>}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                      <strong>Reason:</strong> {latest?.reason ?? '—'}
                      {latest && <> · {preview(latest.changes)}</>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold font-display text-on-surface">₹{bill.totalAmount.toLocaleString('en-IN')}</div>
                    <div className="text-[11px] text-on-surface-variant mt-0.5">
                      {latest ? new Date(latest.createdAt).toLocaleString('en-IN') : `${bill.totalBags} bags · ${bill.totalWeightKg} KG`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {selected && (
        <Modal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          title={`Edits to ${selected.billNumber}`}
          subtitle={`${selected.customerName} · billed ${selected.date} · now ₹${selected.totalAmount.toLocaleString('en-IN')}`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            {selected.revisions.map((revision) => (
              <div key={revision.id} className="rounded-2xl bg-surface-container-low p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-on-surface flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-primary" />
                    Edit #{revision.revisionNo} by {revision.editedBy} ({revision.editedByRole.toLowerCase()})
                  </span>
                  <span className="text-on-surface-variant">{new Date(revision.createdAt).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Reason: <span className="text-on-surface font-medium">{revision.reason}</span></p>
                <div className="mt-3 space-y-3">
                  {revision.changes.map((change) => (
                    <div key={change.field} className="grid grid-cols-1 sm:grid-cols-[8rem_1fr_1fr] gap-2 text-xs">
                      <span className="font-bold text-on-surface-variant uppercase tracking-wide text-[10px] pt-0.5">{change.label}</span>
                      <div className="rounded-xl bg-danger/5 p-2.5">
                        <span className="block text-[10px] font-bold uppercase text-danger mb-0.5">Previous</span>
                        <span className="whitespace-pre-line text-on-surface">{change.from}</span>
                      </div>
                      <div className="rounded-xl bg-success/10 p-2.5">
                        <span className="block text-[10px] font-bold uppercase text-success mb-0.5">Current</span>
                        <span className="whitespace-pre-line text-on-surface font-semibold">{change.to}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};
