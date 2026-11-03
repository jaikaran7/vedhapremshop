'use client';

import React, { memo, useCallback, useMemo, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import type { ConsignmentScan, ScanExpenseCategory } from '@/api/consignment-scans.api';
import { EXPENSE_CATEGORY_LABEL } from './scan-labels';

/** Editable rows: numbers stay as typed text until saved, so a half-typed "46." is not lost. */
export interface DraftLine { key: string; id?: string; itemName: string; bags: string; weightKg: string; rate: string; amount: string; assignedMarkId: string | null }
export interface DraftMark { key: string; id?: string; markCode: string; bags: string; rateMin: string; rateMax: string }
export interface DraftExpense { key: string; id?: string; label: string; category: ScanExpenseCategory; amount: string; includeInCost: boolean }

const cell = 'w-full min-w-0 rounded-md border border-surface-container-high bg-surface px-1.5 py-1 text-xs text-right tabular-nums disabled:bg-transparent disabled:border-transparent';
const th = 'py-2 pr-2 text-[10px] uppercase font-bold text-on-surface-variant whitespace-nowrap';
const decimal = (raw: string) => raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
const count = (raw: string) => raw.replace(/\D/g, '');

interface LinesProps {
  scan: ConsignmentScan;
  lines: DraftLine[];
  marks: DraftMark[];
  editable: boolean;
  highlighted: Set<string>;
  onChange: (lines: DraftLine[]) => void;
  onShowSource: (page: number | null) => void;
}

const LineRow = memo(function LineRow({
  line, page, auto, markOptions, editable, hot, onPatch, onRemove, onShow,
}: {
  line: DraftLine;
  page: number | null;
  auto: string | undefined;
  markOptions: DraftMark[];
  editable: boolean;
  hot: boolean;
  onPatch: (key: string, patch: Partial<DraftLine>) => void;
  onRemove: (key: string) => void;
  onShow: (page: number | null) => void;
}) {
  return (
    <tr className={`border-t border-surface-container-low ${hot ? 'bg-danger-container/20' : ''}`}>
      <td className="py-0.5 pr-1 whitespace-nowrap">
        <button type="button" className="text-primary font-semibold" onClick={() => onShow(page)} title="Show the source page">{page ?? '—'}</button>
      </td>
      <td className="py-0.5 pr-1"><input aria-label="Bags" className={cell} disabled={!editable} value={line.bags} inputMode="numeric" onChange={(e) => onPatch(line.key, { bags: count(e.target.value) })} /></td>
      <td className="py-0.5 pr-1"><input aria-label="Weight kg" className={cell} disabled={!editable} value={line.weightKg} inputMode="decimal" onChange={(e) => onPatch(line.key, { weightKg: decimal(e.target.value) })} /></td>
      <td className="py-0.5 pr-1"><input aria-label="Rate" className={cell} disabled={!editable} value={line.rate} inputMode="decimal" onChange={(e) => onPatch(line.key, { rate: decimal(e.target.value) })} /></td>
      <td className="py-0.5 pr-1"><input aria-label="Amount" className={cell} disabled={!editable} value={line.amount} inputMode="decimal" onChange={(e) => onPatch(line.key, { amount: decimal(e.target.value) })} /></td>
      <td className="py-0.5 pr-1">
        <select aria-label="Mark" className={`${cell} text-left`} disabled={!editable} value={line.assignedMarkId ?? ''} onChange={(e) => onPatch(line.key, { assignedMarkId: e.target.value || null })}>
          <option value="">{auto ?? 'Auto'}</option>
          {markOptions.map((m) => <option key={m.key} value={m.id}>{m.markCode}</option>)}
        </select>
      </td>
      <td className="py-0.5 w-8">{editable && <button type="button" aria-label="Remove line" onClick={() => onRemove(line.key)}><Trash2 className="w-3.5 h-3.5 text-danger" /></button>}</td>
    </tr>
  );
});

export const BillLinesTable: React.FC<LinesProps> = ({ scan, lines, marks, editable, highlighted, onChange, onShowSource }) => {
  const server = new Map(scan.lines.map((l) => [l.id, l]));
  const markCode = new Map(scan.marks.map((m) => [m.id, m.markCode]));
  const markOptions = useMemo(() => marks.filter((m) => m.id), [marks]);
  const linesRef = useRef(lines);
  const onChangeRef = useRef(onChange);
  const showRef = useRef(onShowSource);
  linesRef.current = lines;
  onChangeRef.current = onChange;
  showRef.current = onShowSource;
  const onPatch = useCallback((key: string, patch: Partial<DraftLine>) => {
    onChangeRef.current(linesRef.current.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);
  const onRemove = useCallback((key: string) => {
    onChangeRef.current(linesRef.current.filter((l) => l.key !== key));
  }, []);
  const onShow = useCallback((page: number | null) => showRef.current(page), []);
  return (
    <div>
      <table className="w-full table-fixed text-left text-xs">
        <thead>
          <tr>
            <th className={`${th} w-10`}>Pg</th>
            <th className={th}>Bags</th>
            <th className={th}>Kg</th>
            <th className={th}>Rate</th>
            <th className={th}>Amount</th>
            <th className={`${th} w-[22%]`}>Mark</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const s = line.id ? server.get(line.id) : undefined;
            return (
              <LineRow
                key={line.key}
                line={line}
                page={s?.sourcePage ?? null}
                auto={s?.markId ? markCode.get(s.markId) : undefined}
                markOptions={markOptions}
                editable={editable}
                hot={highlighted.has(line.id ?? '')}
                onPatch={onPatch}
                onRemove={onRemove}
                onShow={onShow}
              />
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
  const matched = new Map(scan.reconciliation.marks.map((m) => [m.markId, m]));
  const set = (key: string, patch: Partial<DraftMark>) => onChange(marks.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  return (
    <div>
      <table className="w-full table-fixed text-left text-xs">
        <thead>
          <tr><th className={th}>Mark</th><th className={th}>Bags</th><th className={th}>From</th><th className={th}>To</th><th className={`${th} w-24`}>Lines</th><th className="w-8" /></tr>
        </thead>
        <tbody>
          {marks.map((mark) => {
            const r = mark.id ? matched.get(mark.id) : undefined;
            return (
              <tr key={mark.key} className={`border-t border-surface-container-low ${highlighted.has(mark.id ?? '') ? 'bg-danger-container/20' : ''}`}>
                <td className="py-1 pr-2"><input aria-label="Mark code" className={`${cell} text-left`} disabled={!editable} value={mark.markCode} maxLength={12} onChange={(e) => set(mark.key, { markCode: e.target.value.toUpperCase() })} /></td>
                <td className="py-1 pr-2"><input aria-label="Mark bags" className={cell} disabled={!editable} value={mark.bags} inputMode="numeric" onChange={(e) => set(mark.key, { bags: count(e.target.value) })} /></td>
                <td className="py-1 pr-2"><input aria-label="Rate from" className={cell} disabled={!editable} value={mark.rateMin} inputMode="decimal" onChange={(e) => set(mark.key, { rateMin: decimal(e.target.value) })} /></td>
                <td className="py-1 pr-2"><input aria-label="Rate to" className={cell} disabled={!editable} value={mark.rateMax} inputMode="decimal" onChange={(e) => set(mark.key, { rateMax: decimal(e.target.value) })} /></td>
                <td className="py-1 pr-2 whitespace-nowrap">
                  {r ? <Chip size="sm" variant={r.status === 'MATCHED' ? 'success' : 'danger'} label={`${r.matchedBags}/${r.expectedBags}`} /> : '—'}
                </td>
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
export const ExpensesTable: React.FC<ExpensesProps> = ({ expenses, editable, onChange }) => {
  const set = (key: string, patch: Partial<DraftExpense>) => onChange(expenses.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  return (
    <div>
      <table className="w-full table-fixed text-left text-xs">
        <thead><tr><th className={th}>Charge</th><th className={`${th} w-[28%]`}>Type</th><th className={`${th} w-24`}>Amount</th><th className={`${th} w-16`}>Cost</th><th className="w-8" /></tr></thead>
        <tbody>
          {expenses.map((e) => (
              <tr key={e.key} className="border-t border-surface-container-low">
                <td className="py-1 pr-2"><input aria-label="Charge name" className={`${cell} text-left`} disabled={!editable} value={e.label} maxLength={80} onChange={(ev) => set(e.key, { label: ev.target.value })} /></td>
                <td className="py-1 pr-2">
                  <select aria-label="Charge type" className={`${cell} text-left`} disabled={!editable} value={e.category}
                    onChange={(ev) => { const category = ev.target.value as ScanExpenseCategory; set(e.key, { category, includeInCost: category === 'DRIVER_ADVANCE' ? false : e.includeInCost }); }}>
                    {Object.entries(EXPENSE_CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </td>
                <td className="py-1 pr-2"><input aria-label="Charge amount" className={cell} disabled={!editable} value={e.amount} inputMode="decimal" onChange={(ev) => set(e.key, { amount: decimal(ev.target.value) })} /></td>
                <td className="py-1 text-center"><input type="checkbox" aria-label="Add to lot cost" disabled={!editable} checked={e.includeInCost} onChange={(ev) => set(e.key, { includeInCost: ev.target.checked })} /></td>
                <td className="py-1">{editable && <button type="button" aria-label="Remove charge" onClick={() => onChange(expenses.filter((x) => x.key !== e.key))}><Trash2 className="w-3.5 h-3.5 text-danger" /></button>}</td>
              </tr>
          ))}
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
