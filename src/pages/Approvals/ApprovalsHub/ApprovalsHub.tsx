'use client';

import { useEditedBillsQuery } from '@/hooks/queries/use-edited-bills-query';
import React, { useMemo, useState } from 'react';
import type { EditedBill, PurchaseRevisionChange } from '@/types';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useT } from '@/store/preferences/language';
import { dayOf, groupEditsByDay, lotsOfEditedBills } from '@/utils/edited-bills';
import { ChevronDown, History, ReceiptText, Search, X } from 'lucide-react';

const preview = (changes: PurchaseRevisionChange[]): string => {
  const shown = changes.find((change) => change.field !== 'items') ?? changes[0];
  if (!shown) return 'Recorded with no field difference';
  if (shown.field === 'items') return 'Bags and rates changed';
  const extra = changes.length - 1;
  return `${shown.label}: ${shown.from} → ${shown.to}${extra > 0 ? ` · +${extra} more` : ''}`;
};

const DAYS_AT_FIRST = 10;

const dayLabel = (date: string, today: string): string => {
  if (date === today) return 'Today';
  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === dayOf(yesterday.toISOString())) return 'Yesterday';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export const ApprovalsHub: React.FC = () => {
  const t = useT();
  const { data: bills = [], isLoading, isError } = useEditedBillsQuery();
  const [selected, setSelected] = useState<EditedBill | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [lot, setLot] = useState('');
  const [search, setSearch] = useState('');
  const [shownDays, setShownDays] = useState(DAYS_AT_FIRST);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<Set<string>>(new Set());

  const today = dayOf(new Date().toISOString());
  const days = useMemo(() => groupEditsByDay(bills, { from, to, lot, search }), [bills, from, to, lot, search]);
  const lots = useMemo(() => lotsOfEditedBills(bills), [bills]);
  const filtered = Boolean(from || to || lot || search);
  const shown = days.slice(0, shownDays);
  // The newest day starts open; any day can be opened or closed.
  const isOpen = (date: string, index: number) => (index === 0 ? !closed.has(date) : opened.has(date));
  const toggle = (date: string, index: number) => {
    const flip = (set: Set<string>) => {
      const next = new Set(set);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    };
    if (index === 0) setClosed(flip); else setOpened(flip);
  };
  const clearFilters = () => { setFrom(''); setTo(''); setLot(''); setSearch(''); setShownDays(DAYS_AT_FIRST); };
  const totalEdits = days.reduce((sum, day) => sum + day.editCount, 0);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
          Edited Bills
        </h1>
        <p className="text-xs text-on-surface-variant font-medium mt-1">
          {t('Day by day, the bills that were changed and what changed. Open a day to see its bills.')}
          {days.length > 0 && <> {days.length} {t('days')} · {totalEdits} {t('edits')}</>}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-[minmax(0,1fr)_10rem_10rem_12rem] gap-3 items-end">
        <div className="col-span-2 md:col-span-1">
          <Input placeholder="Search bill number or customer..." icon={<Search className="w-4 h-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Input label={t('From')} type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        <Input label={t('To')} type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        <select value={lot} onChange={(e) => setLot(e.target.value)} className="academic-input py-3 px-4 text-xs font-semibold rounded-2xl w-full cursor-pointer" aria-label="Lot">
          <option value="">{t('All lots')}</option>
          {lots.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
      {filtered && (
        <button type="button" onClick={clearFilters} className="text-xs font-bold text-primary inline-flex items-center gap-1 cursor-pointer">
          <X className="w-3.5 h-3.5" /> {t('Clear filters')}
        </button>
      )}

      {isLoading ? (
        <Card variant="lowest" className="p-12 text-center"><p className="text-xs text-on-surface-variant">Loading edited bills…</p></Card>
      ) : isError ? (
        <Card variant="lowest" className="p-12 text-center">
          <h4 className="text-base font-bold font-display text-on-surface">Could not load edited bills</h4>
          <p className="text-xs text-on-surface-variant mt-1">Refresh the page and try again.</p>
        </Card>
      ) : days.length === 0 ? (
        <Card variant="lowest" className="p-12 text-center">
          <ReceiptText className="w-12 h-12 text-on-surface-variant/40 mx-auto mb-3" />
          <h4 className="text-base font-bold font-display text-on-surface">{filtered ? t('No edited bills match these filters') : t('No edited bills')}</h4>
          <p className="text-xs text-on-surface-variant mt-1">When a bill is corrected, it shows up here with what changed.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((day, index) => {
            const open = isOpen(day.date, index);
            return (
              <Card key={day.date} variant="lowest" padding="none" className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(day.date, index)}
                  aria-expanded={open}
                  className="w-full text-left p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-surface-container-low/40 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold font-display text-on-surface">{dayLabel(day.date, today)}</span>
                      <span className="text-xs text-on-surface-variant">{day.date}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {day.kinds.map((kind) => (
                        <span key={kind.label} className="px-2 py-0.5 rounded-full bg-tertiary/10 text-[11px] font-semibold text-on-surface">{kind.label} · {kind.count}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xl font-extrabold font-display text-on-surface">{day.edits.length}</div>
                      <div className="text-[11px] text-on-surface-variant">{day.edits.length === 1 ? t('bill') : t('bills')} · {day.editCount} {day.editCount === 1 ? t('edit') : t('edits')}</div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-on-surface-variant transition-transform ${open ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {open && (
                  <div className="divide-y divide-surface-container-low border-t border-surface-container-low">
                    {day.edits.map(({ bill, revisions }) => {
                      const latest = revisions[0]!;
                      return (
                        <button
                          key={bill.id}
                          type="button"
                          onClick={() => setSelected(bill)}
                          className="w-full text-left p-4 sm:px-6 hover:bg-surface-container-low/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-primary font-display">{bill.billNumber}</span>
                              <Chip label={revisions.length === 1 ? 'Edited once' : `Edited ${revisions.length}×`} size="sm" variant="tertiary" />
                              {bill.lotNumbers.map((number) => (
                                <span key={number} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-fixed text-primary-on-fixed">{number}</span>
                              ))}
                              <span className="text-xs text-on-surface-variant font-medium">Billed {bill.date}</span>
                            </div>
                            <h3 className="text-sm font-bold text-on-surface mt-1">
                              {bill.customerName} — {latest.editedBy} ({latest.editedByRole.toLowerCase()})
                            </h3>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                              <strong>Reason:</strong> {latest.reason} · {preview(latest.changes)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-extrabold font-display text-on-surface">₹{bill.totalAmount.toLocaleString('en-IN')}</div>
                            <div className="text-[11px] text-on-surface-variant mt-0.5">{new Date(latest.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
          {days.length > shown.length && (
            <div className="text-center">
              <Button variant="secondary" onClick={() => setShownDays((current) => current + DAYS_AT_FIRST)}>
                {t('Show more days')} ({days.length - shown.length} {t('more')})
              </Button>
            </div>
          )}
        </div>
      )}

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
