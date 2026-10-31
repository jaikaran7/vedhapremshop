'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import type { ConsignmentScan, ScanConfidence, ScanExpenseCategory } from '@/api/consignment-scans.api';
import { EXPENSE_CATEGORY_LABEL, rupees } from './scan-labels';

/** Editable rows: numbers stay as typed text until saved, so a half-typed "46." is not lost. */
export interface DraftLine { key: string; id?: string; itemName: string; bags: string; weightKg: string; rate: string; amount: string; assignedMarkId: string | null }
export interface DraftMark { key: string; id?: string; markCode: string; bags: string; rateMin: string; rateMax: string }
export interface DraftExpense { key: string; id?: string; label: string; category: ScanExpenseCategory; amount: string; includeInCost: boolean }

const cell = 'w-full min-w-[4.5rem] rounded-md border border-surface-container-high bg-surface px-2 py-1 text-xs text-right tabular-nums disabled:bg-transparent disabled:border-transparent';
const th = 'py-2 pr-2 text-[10px] uppercase font-bold text-on-surface-variant whitespace-nowrap';
const decimal = (raw: string) => raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
const count = (raw: string) => raw.replace(/\D/g, '');

/** Where a value came from: read by AI (and how sure), changed by a person, or added by hand. */
const Source: React.FC<{ origin: 'AI' | 'MANUAL'; corrected: boolean; confidence: ScanConfidence }> = ({ origin, corrected, confidence }) => (
  <span className="flex gap-1 flex-wrap">
    {origin === 'MANUAL' ? <Chip size="sm" variant="neutral" label="Manual" /> : <Chip size="sm" variant="secondary" label="AI" />}
    {corrected && <Chip size="sm" variant="primary" label="Corrected" />}
    {origin === 'AI' && !corrected && confidence !== 'HIGH' && <Chip size="sm" variant={confidence === 'LOW' ? 'danger' : 'tertiary'} label={confidence === 'LOW' ? 'Unclear' : 'Check'} />}
  </span>
);

const METHOD_LABEL = { EXACT: 'exact', GROUPED: 'grouped', RANGE: 'in range', MANUAL: 'set by hand' } as const;

interface LinesProps {
  scan: ConsignmentScan;
  lines: DraftLine[];
  marks: DraftMark[];
  editable: boolean;
  highlighted: Set<string>;
  onChange: (lines: DraftLine[]) => void;
  onShowSource: (page: number | null) => void;
}

export const BillLinesTable: React.FC<LinesProps> = ({ scan, lines, marks, editable, highlighted, onChange, onShowSource }) => {
  const server = new Map(scan.lines.map((l) => [l.id, l]));
  const markCode = new Map(scan.marks.map((m) => [m.id, m.markCode]));
  const set = (key: string, patch: Partial<DraftLine>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr><th className={th}>Src</th><th className={th}>Bags</th><th className={th}>Weight kg</th><th className={th}>Rate</th><th className={th}>Amount ₹</th><th className={th}>Mark</th><th className={th}>Match</th><th className={th}>Read as</th><th /></tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const s = line.id ? server.get(line.id) : undefined;
            const auto = s?.markId ? markCode.get(s.markId) : undefined;
            return (
              <tr key={line.key} className={`border-t border-surface-container-low ${highlighted.has(line.id ?? '') ? 'bg-danger-container/20' : ''}`}>
                <td className="py-1 pr-2 whitespace-nowrap">
                  <button type="button" className="text-primary font-semibold" onClick={() => onShowSource(s?.sourcePage ?? null)} title="Show the source page">
                    {s?.sourcePage ? `p${s.sourcePage}·r${s.sourceRow}` : '—'}
                  </button>
                </td>
                <td className="py-1 pr-2"><input aria-label="Bags" className={cell} disabled={!editable} value={line.bags} inputMode="numeric" onChange={(e) => set(line.key, { bags: count(e.target.value) })} /></td>
                <td className="py-1 pr-2"><input aria-label="Weight kg" className={cell} disabled={!editable} value={line.weightKg} inputMode="decimal" onChange={(e) => set(line.key, { weightKg: decimal(e.target.value) })} /></td>
                <td className="py-1 pr-2"><input aria-label="Rate" className={cell} disabled={!editable} value={line.rate} inputMode="decimal" onChange={(e) => set(line.key, { rate: decimal(e.target.value) })} /></td>
                <td className="py-1 pr-2"><input aria-label="Amount" className={cell} disabled={!editable} value={line.amount} inputMode="decimal" onChange={(e) => set(line.key, { amount: decimal(e.target.value) })} /></td>
                <td className="py-1 pr-2">
                  <select aria-label="Mark" className={`${cell} text-left`} disabled={!editable} value={line.assignedMarkId ?? ''} onChange={(e) => set(line.key, { assignedMarkId: e.target.value || null })}>
                    <option value="">Automatic{auto ? ` (${auto})` : ''}</option>
                    {marks.filter((m) => m.id).map((m) => <option key={m.key} value={m.id}>{m.markCode}</option>)}
                  </select>
                </td>
                <td className="py-1 pr-2 whitespace-nowrap">
                  {s?.provenance === 'UNRESOLVED' && <Chip size="sm" variant="danger" label="Unresolved" />}
                  {s && s.provenance !== 'UNRESOLVED' && s.matchMethod && <Chip size="sm" variant={s.matchMethod === 'MANUAL' ? 'primary' : 'success'} label={METHOD_LABEL[s.matchMethod]} />}
                  {editable && s?.suggestedMarkId && !line.assignedMarkId && (
                    <button type="button" className="ml-1 text-primary font-semibold" onClick={() => set(line.key, { assignedMarkId: s.suggestedMarkId })}>
                      → {markCode.get(s.suggestedMarkId)}?
                    </button>
                  )}
                </td>
                <td className="py-1 pr-2">{s ? <Source origin={s.origin} corrected={s.corrected} confidence={s.confidence} /> : <Chip size="sm" variant="neutral" label="New" />}</td>
                <td className="py-1">{editable && <button type="button" aria-label="Remove line" onClick={() => onChange(lines.filter((l) => l.key !== line.key))}><Trash2 className="w-3.5 h-3.5 text-danger" /></button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {editable && (
        <button type="button" className="mt-2 text-xs font-semibold text-primary flex items-center gap-1"
          onClick={() => onChange([...lines, { key: crypto.randomUUID(), itemName: 'ONION', bags: '', weightKg: '', rate: '', amount: '', assignedMarkId: null }])}>
          <Plus className="w-3.5 h-3.5" /> Add bill line
        </button>
      )}
    </div>
  );
};

interface MarksProps {
  scan: ConsignmentScan;
  marks: DraftMark[];
  editable: boolean;
  highlighted: Set<string>;
  onChange: (marks: DraftMark[]) => void;
}

/** The mark sheet, row by row, with what the bill lines matched to each mark. */
export const MarksTable: React.FC<MarksProps> = ({ scan, marks, editable, highlighted, onChange }) => {
  const server = new Map(scan.marks.map((m) => [m.id, m]));
  const matched = new Map(scan.reconciliation.marks.map((m) => [m.markId, m]));
  const set = (key: string, patch: Partial<DraftMark>) => onChange(marks.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr><th className={th}>Mark</th><th className={th}>Bags</th><th className={th}>Rate from</th><th className={th}>Rate to</th><th className={th}>Matched bags</th><th className={th}>Weight kg</th><th className={th}>Amount ₹</th><th className={th}>Bill rates</th><th className={th}>Read as</th><th /></tr>
        </thead>
        <tbody>
          {marks.map((mark) => {
            const s = mark.id ? server.get(mark.id) : undefined;
            const r = mark.id ? matched.get(mark.id) : undefined;
            return (
              <tr key={mark.key} className={`border-t border-surface-container-low ${highlighted.has(mark.id ?? '') ? 'bg-danger-container/20' : ''}`}>
                <td className="py-1 pr-2"><input aria-label="Mark code" className={`${cell} text-left`} disabled={!editable} value={mark.markCode} maxLength={12} onChange={(e) => set(mark.key, { markCode: e.target.value.toUpperCase() })} /></td>
                <td className="py-1 pr-2"><input aria-label="Mark bags" className={cell} disabled={!editable} value={mark.bags} inputMode="numeric" onChange={(e) => set(mark.key, { bags: count(e.target.value) })} /></td>
                <td className="py-1 pr-2"><input aria-label="Rate from" className={cell} disabled={!editable} value={mark.rateMin} inputMode="decimal" onChange={(e) => set(mark.key, { rateMin: decimal(e.target.value) })} /></td>
                <td className="py-1 pr-2"><input aria-label="Rate to" className={cell} disabled={!editable} value={mark.rateMax} inputMode="decimal" onChange={(e) => set(mark.key, { rateMax: decimal(e.target.value) })} /></td>
                <td className="py-1 pr-2 whitespace-nowrap">
                  {r ? <Chip size="sm" variant={r.status === 'MATCHED' ? 'success' : 'danger'} label={`${r.matchedBags} / ${r.expectedBags}`} /> : '—'}
                </td>
                <td className="py-1 pr-2 tabular-nums">{r ? r.weightKg.toLocaleString('en-IN') : '—'}</td>
                <td className="py-1 pr-2 tabular-nums">{r ? rupees(r.amount) : '—'}</td>
                <td className="py-1 pr-2 tabular-nums">{r?.rates.join(', ') || '—'}</td>
                <td className="py-1 pr-2">{s ? <Source origin={s.origin} corrected={s.corrected} confidence={s.confidence} /> : <Chip size="sm" variant="neutral" label="New" />}</td>
                <td className="py-1">{editable && <button type="button" aria-label="Remove mark" onClick={() => onChange(marks.filter((m) => m.key !== mark.key))}><Trash2 className="w-3.5 h-3.5 text-danger" /></button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {editable && (
        <button type="button" className="mt-2 text-xs font-semibold text-primary flex items-center gap-1"
          onClick={() => onChange([...marks, { key: crypto.randomUUID(), markCode: '', bags: '', rateMin: '', rateMax: '' }])}>
          <Plus className="w-3.5 h-3.5" /> Add mark
        </button>
      )}
    </div>
  );
};

interface ExpensesProps {
  scan: ConsignmentScan;
  expenses: DraftExpense[];
  editable: boolean;
  onChange: (expenses: DraftExpense[]) => void;
}

/** Bill charges: all are owed to the vendor; "Add to lot cost" also spreads one over the lot's landed cost by weight. */
export const ExpensesTable: React.FC<ExpensesProps> = ({ scan, expenses, editable, onChange }) => {
  const server = new Map(scan.expenses.map((e) => [e.id, e]));
  const set = (key: string, patch: Partial<DraftExpense>) => onChange(expenses.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead><tr><th className={th}>Charge</th><th className={th}>Type</th><th className={th}>Amount ₹</th><th className={th}>Add to lot cost</th><th className={th}>Read as</th><th /></tr></thead>
        <tbody>
          {expenses.map((e) => {
            const s = e.id ? server.get(e.id) : undefined;
            return (
              <tr key={e.key} className="border-t border-surface-container-low">
                <td className="py-1 pr-2"><input aria-label="Charge name" className={`${cell} text-left`} disabled={!editable} value={e.label} maxLength={80} onChange={(ev) => set(e.key, { label: ev.target.value })} /></td>
                <td className="py-1 pr-2">
                  <select aria-label="Charge type" className={`${cell} text-left`} disabled={!editable} value={e.category}
                    onChange={(ev) => { const category = ev.target.value as ScanExpenseCategory; set(e.key, { category, includeInCost: category === 'DRIVER_ADVANCE' ? false : e.includeInCost }); }}>
                    {Object.entries(EXPENSE_CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </td>
                <td className="py-1 pr-2"><input aria-label="Charge amount" className={cell} disabled={!editable} value={e.amount} inputMode="decimal" onChange={(ev) => set(e.key, { amount: decimal(ev.target.value) })} /></td>
                <td className="py-1 pr-2"><input type="checkbox" aria-label="Add to lot cost" disabled={!editable} checked={e.includeInCost} onChange={(ev) => set(e.key, { includeInCost: ev.target.checked })} /></td>
                <td className="py-1 pr-2">{s ? <Source origin={s.origin} corrected={s.corrected} confidence={s.confidence} /> : <Chip size="sm" variant="neutral" label="New" />}</td>
                <td className="py-1">{editable && <button type="button" aria-label="Remove charge" onClick={() => onChange(expenses.filter((x) => x.key !== e.key))}><Trash2 className="w-3.5 h-3.5 text-danger" /></button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {editable && (
        <button type="button" className="mt-2 text-xs font-semibold text-primary flex items-center gap-1"
          onClick={() => onChange([...expenses, { key: crypto.randomUUID(), label: '', category: 'OTHER', amount: '', includeInCost: true }])}>
          <Plus className="w-3.5 h-3.5" /> Add charge
        </button>
      )}
    </div>
  );
};
