'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Save, Wand2 } from 'lucide-react';
import type { ConsignmentScan, RateUnit, SaveScanDraft, ScanDocumentKind } from '@/api/consignment-scans.api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import {
  useConfirmScanMutation, useProcessScanMutation, useRemoveScanDocumentMutation, useSaveScanDraftMutation, useUploadScanDocumentMutation,
} from '@/hooks/mutations/use-consignment-scan-mutations';
import { useConsignmentScanQuery } from '@/hooks/queries/use-consignment-scans-query';
import { useProductsQuery } from '@/hooks/queries/use-directory-query';
import { useVendorsQuery } from '@/hooks/queries/use-vendors-query';
import { useRouteId } from '@/hooks/shared/use-route-id';
import { useSession } from '@/store/session/session-provider';
import { ScanDocuments, type UploadProgress } from './ScanDocuments';
import { BillLinesTable, type DraftExpense, type DraftLine, type DraftMark, ExpensesTable, MarksTable } from './ScanTables';
import { RATE_UNIT_LABEL, rupees, SEVERITY_STYLE, STATUS_LABEL } from './scan-labels';

interface Header { vendorId: string; productId: string; lotNumber: string; rateUnit: string; billNumber: string; billDate: string; sheetDate: string }
interface Draft { header: Header; lines: DraftLine[]; marks: DraftMark[]; expenses: DraftExpense[] }

/** The editable copy of what the server holds. */
function draftFrom(scan: ConsignmentScan): Draft {
  return {
    header: {
      vendorId: scan.vendorId ?? '', productId: scan.productId ?? '', lotNumber: scan.lotNumber ?? '', rateUnit: scan.rateUnit ?? '',
      billNumber: scan.billNumber ?? '', billDate: scan.billDate ?? '', sheetDate: scan.sheetDate ?? '',
    },
    lines: scan.lines.map((l) => ({ key: l.id, id: l.id, itemName: l.itemName, bags: String(l.bags), weightKg: String(l.weightKg), rate: String(l.rate), amount: String(l.amount), assignedMarkId: l.assignedMarkId })),
    marks: scan.marks.map((m) => ({ key: m.id, id: m.id, markCode: m.markCode, bags: String(m.bags), rateMin: String(m.rateMin), rateMax: String(m.rateMax) })),
    expenses: scan.expenses.map((e) => ({ key: e.id, id: e.id, label: e.label, category: e.category, amount: String(e.amount), includeInCost: e.includeInCost })),
  };
}

const num = (raw: string) => (raw.trim() === '' ? Number.NaN : Number(raw));
const orNull = (raw: string) => raw.trim() || null;

/** The request body, or the first problem a person must fix before saving. */
function toRequest(scan: ConsignmentScan, d: Draft, reason: string): SaveScanDraft | string {
  const lines = d.lines.map((l) => ({ ...(l.id && { id: l.id }), itemName: l.itemName, bags: num(l.bags), weightKg: num(l.weightKg), rate: num(l.rate), amount: num(l.amount), assignedMarkId: l.assignedMarkId }));
  const marks = d.marks.map((m) => ({ ...(m.id && { id: m.id }), markCode: m.markCode.trim(), bags: num(m.bags), rateMin: num(m.rateMin), rateMax: num(m.rateMax || m.rateMin) }));
  const expenses = d.expenses.map((e) => ({ ...(e.id && { id: e.id }), label: e.label.trim(), category: e.category, amount: num(e.amount), includeInCost: e.includeInCost }));
  if ([...lines.flatMap((l) => [l.bags, l.weightKg, l.rate, l.amount]), ...marks.flatMap((m) => [m.bags, m.rateMin, m.rateMax]), ...expenses.map((e) => e.amount)].some(Number.isNaN)) {
    return 'Fill every number in the tables (0 if it is really zero).';
  }
  if (marks.some((m) => !m.markCode) || expenses.some((e) => !e.label)) return 'Every mark needs a code and every charge a name.';
  const h = d.header;
  return {
    version: scan.version, reason, lines, marks, expenses,
    vendorId: orNull(h.vendorId), productId: orNull(h.productId), lotNumber: orNull(h.lotNumber), rateUnit: (orNull(h.rateUnit) as RateUnit | null),
    billNumber: orNull(h.billNumber), billDate: orNull(h.billDate), sheetDate: orNull(h.sheetDate),
  };
}

export const ScanReview: React.FC = () => {
  const id = useRouteId();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useSession();
  const processMutation = useProcessScanMutation();
  const { data: scan, isLoading, error } = useConsignmentScanQuery(id, processMutation.isPending);
  const { data: vendors = [] } = useVendorsQuery();
  const { data: products } = useProductsQuery();
  const upload = useUploadScanDocumentMutation();
  const remove = useRemoveScanDocumentMutation();
  const save = useSaveScanDraftMutation();
  const confirm = useConfirmScanMutation();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const confirmKey = useRef<string>('');

  // Follow the server (new version after a save, a read or another screen) unless there are unsaved edits.
  useEffect(() => {
    if (scan && !dirty) setDraft(draftFrom(scan));
  }, [scan, dirty]);

  const highlighted = useMemo(() => new Set(scan?.reconciliation.issues.filter((i) => i.severity === 'CRITICAL').flatMap((i) => [...(i.refs?.lineIds ?? []), ...(i.refs?.markIds ?? [])]) ?? []), [scan]);

  if (isLoading) return <p className="p-6 text-sm text-on-surface-variant">Loading scan…</p>;
  if (error || !scan || !draft) return <p className="p-6 text-sm text-danger">{error?.message ?? 'Scan not found.'}</p>;

  const editable = scan.status !== 'CONFIRMED' && scan.status !== 'PROCESSING' && !processMutation.isPending;
  const isOwner = currentUser.role === 'OWNER';
  const r = scan.reconciliation;
  const edit = (patch: Partial<Draft>) => { setDraft({ ...draft, ...patch }); setDirty(true); };
  const setHeader = (patch: Partial<Header>) => edit({ header: { ...draft.header, ...patch } });
  const fail = (title: string) => (e: Error) => toast({ type: 'error', title, message: e.message });

  /** Bulk upload: one request per file (hosted body-size limits), in order; a refused file does not stop the rest. */
  const onUpload = async (kind: ScanDocumentKind, files: File[]) => {
    if (files.length === 0) return;
    const refused: string[] = [];
    for (const [done, file] of files.entries()) {
      setProgress({ kind, done, total: files.length });
      await upload.mutateAsync({ id: scan.id, kind, file }).catch((e: Error) => { refused.push(`${file.name}: ${e.message}`); });
    }
    setProgress(null);
    if (refused.length) toast({ type: 'error', title: `${refused.length} of ${files.length} file(s) not added`, message: refused.join(' · ') });
    else toast({ type: 'success', title: `${files.length} file(s) added`, message: 'Add more pages or read the documents.' });
  };
  const onRead = () => {
    if (dirty) { toast({ type: 'error', title: 'Save first', message: 'Save or discard your corrections before reading the documents again.' }); return; }
    processMutation.mutate(scan.id, {
      onSuccess: (next) => toast({ type: next.status === 'FAILED' ? 'error' : 'success', title: next.status === 'FAILED' ? 'Reading failed' : 'Documents read', message: next.status === 'FAILED' ? 'See the error under each document set, then retry.' : 'Review the highlighted rows.' }),
      onError: fail('Could not read the documents'),
    });
  };
  const onSave = (reason = 'Corrections saved') => {
    const body = toRequest(scan, draft, reason);
    if (typeof body === 'string') { toast({ type: 'error', title: 'Check the tables', message: body }); return; }
    save.mutate({ id: scan.id, draft: body }, { onSuccess: () => setDirty(false), onError: fail('Not saved') });
  };
  const acceptSuggestions = () => {
    const suggested = new Map(scan.lines.filter((l) => l.provenance === 'UNRESOLVED' && l.suggestedMarkId).map((l) => [l.id, l.suggestedMarkId]));
    edit({ lines: draft.lines.map((l) => (l.id && !l.assignedMarkId && suggested.has(l.id) ? { ...l, assignedMarkId: suggested.get(l.id) ?? null } : l)) });
  };
  const openConfirm = () => { confirmKey.current = crypto.randomUUID(); setConfirmOpen(true); };
  const onConfirm = () => confirm.mutate({ id: scan.id, version: scan.version, key: confirmKey.current }, {
    onSuccess: (res) => { toast({ type: 'success', title: 'Purchase posted', message: 'The vendor bill is saved and the stock is in the lot.' }); router.push(`/purchases/${res.purchaseId}`); },
    onError: fail('Not confirmed'),
  });
  const showSource = (page: number | null) => {
    const doc = scan.documents.find((d) => d.kind === 'VENDOR_BILL' && d.pageNo === page);
    if (doc) setDocumentId(doc.id);
  };
  const unresolved = scan.lines.filter((l) => l.provenance === 'UNRESOLVED' && l.suggestedMarkId).length;
  const evidence = r.rateUnitEvidence;
  const critical = r.issues.filter((i) => i.severity === 'CRITICAL').length;
  const summary: [string, string | number | null, string | number][] = [
    ['Bags (bill / sheet)', `${scan.printed.billBags ?? '?'} / ${scan.printed.sheetBags ?? '?'}`, `${r.totals.lineBags} / ${r.totals.markBags}`],
    ['Weight kg', scan.printed.billWeightKg, r.totals.lineWeightKg],
    ['Goods total', scan.printed.grossAmount == null ? null : rupees(scan.printed.grossAmount), rupees(r.totals.linesAmount)],
    ['Charges', scan.printed.expensesAmount == null ? null : rupees(scan.printed.expensesAmount), rupees(r.totals.expenses)],
    ['Bill total', scan.printed.netAmount == null ? null : rupees(scan.printed.netAmount), rupees(r.totals.net)],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <button type="button" onClick={() => router.push('/purchases/scan')} className="text-xs font-semibold text-on-surface-variant flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Scans
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold font-display text-on-surface">{scan.billNumber ? `Bill ${scan.billNumber}` : 'New consignment scan'}</h1>
            <Chip label={STATUS_LABEL[scan.status].label} variant={STATUS_LABEL[scan.status].variant} />
            {dirty && <Chip label="Unsaved changes" variant="tertiary" />}
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            {scan.vendorNameText ?? 'Vendor not read yet'}{scan.lotRefText && ` · sheet ref ${scan.lotRefText}`} · draft v{scan.version}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {scan.purchaseId && <Button variant="secondary" onClick={() => router.push(`/purchases/${scan.purchaseId}`)}>Open purchase</Button>}
          {editable && dirty && <Button variant="secondary" onClick={() => { setDirty(false); setDraft(draftFrom(scan)); }}>Discard</Button>}
          {editable && <Button variant="secondary" icon={<Save className="w-4 h-4" />} onClick={() => onSave()} disabled={save.isPending || !dirty}>{save.isPending ? 'Saving…' : 'Save & recalculate'}</Button>}
          {editable && isOwner && (
            <Button icon={<CheckCircle2 className="w-4 h-4" />} onClick={openConfirm} disabled={dirty || !r.canConfirm}>Confirm purchase</Button>
          )}
        </div>
      </div>
      {editable && !isOwner && r.canConfirm && <p className="text-xs text-on-surface-variant">Ready. The owner confirms it to post the purchase and stock.</p>}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5 items-start">
        <div className="space-y-5 xl:sticky xl:top-4">
          <ScanDocuments
            scan={scan} editable={editable} upload={progress} reading={processMutation.isPending} selectedDocumentId={documentId}
            onSelect={setDocumentId} onUpload={(kind, files) => { void onUpload(kind, files); }} onRead={onRead}
            onRemove={(documentId) => remove.mutate({ id: scan.id, documentId }, { onError: fail('Not removed') })}
          />
        </div>

        <div className="space-y-5">
          <Card variant="lowest" padding="md" className="space-y-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Select label="Vendor" disabled={!editable} value={draft.header.vendorId} onChange={(e) => setHeader({ vendorId: e.target.value })}
                options={[{ value: '', label: 'Choose vendor' }, ...vendors.map((v) => ({ value: v.id, label: v.name }))]} />
              <Select label="Product" disabled={!editable} value={draft.header.productId} onChange={(e) => setHeader({ productId: e.target.value })}
                options={[{ value: '', label: 'Choose product' }, ...products.filter((p) => p.status === 'ACTIVE' || p.id === draft.header.productId).map((p) => ({ value: p.id, label: p.name }))]} />
              <Input label="Lot number" disabled={!editable} value={draft.header.lotNumber} placeholder="22102026 KA56" onChange={(e) => setHeader({ lotNumber: e.target.value.toUpperCase() })} />
              <Input label="Vendor bill no." disabled={!editable} value={draft.header.billNumber} onChange={(e) => setHeader({ billNumber: e.target.value })} />
              <Input label="Bill date" type="date" disabled={!editable} value={draft.header.billDate} onChange={(e) => setHeader({ billDate: e.target.value })} />
              <Input label="Mark sheet date" type="date" disabled={!editable} value={draft.header.sheetDate} onChange={(e) => setHeader({ sheetDate: e.target.value })} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <Select label="Bill rates are quoted" disabled={!editable} value={draft.header.rateUnit} onChange={(e) => setHeader({ rateUnit: e.target.value })}
                options={[{ value: '', label: 'Choose' }, ...(Object.keys(RATE_UNIT_LABEL) as RateUnit[]).map((u) => ({ value: u, label: RATE_UNIT_LABEL[u] }))]} />
              {evidence.suggested && draft.header.rateUnit !== evidence.suggested && editable && (
                <button type="button" className="text-xs text-primary font-semibold text-left" onClick={() => setHeader({ rateUnit: evidence.suggested ?? '' })}>
                  The printed amounts fit {RATE_UNIT_LABEL[evidence.suggested]} on {evidence.agreeing[evidence.suggested]} of {evidence.checked} lines — use it
                </button>
              )}
            </div>
          </Card>

          <Card variant="lowest" padding="md">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold font-display">Check against the documents</h2>
              <Chip size="sm" variant={critical ? 'danger' : 'success'} label={critical ? `${critical} blocking` : 'Nothing blocking'} />
            </div>
            <table className="w-full text-xs mb-3">
              <thead><tr className="text-[10px] uppercase text-on-surface-variant"><th className="text-left py-1">Total</th><th className="text-right">Printed</th><th className="text-right">Lines add up to</th></tr></thead>
              <tbody>
                {summary.map(([label, printed, computed]) => (
                  <tr key={label} className="border-t border-surface-container-low"><td className="py-1">{label}</td><td className="text-right tabular-nums">{printed ?? 'not read'}</td><td className="text-right tabular-nums font-semibold">{computed}</td></tr>
                ))}
                <tr className="border-t border-surface-container-low"><td className="py-1">Added to lot cost</td><td /><td className="text-right tabular-nums">{rupees(r.totals.costExpenses)}</td></tr>
              </tbody>
            </table>
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {r.issues.map((issue, index) => (
                <li key={`${issue.code}-${index}`} className={`rounded-lg border px-3 py-2 text-xs ${SEVERITY_STYLE[issue.severity]}`}>{issue.message}</li>
              ))}
            </ul>
          </Card>

          <Card variant="lowest" padding="md">
            <div className="flex items-center justify-between mb-2 gap-2">
              <h2 className="text-sm font-bold font-display">Vendor bill lines ({draft.lines.length})</h2>
              {editable && unresolved > 0 && (
                <Button size="sm" variant="secondary" icon={<Wand2 className="w-3.5 h-3.5" />} onClick={acceptSuggestions}>Assign {unresolved} unmatched to the suggested marks</Button>
              )}
            </div>
            <BillLinesTable scan={scan} lines={draft.lines} marks={draft.marks} editable={editable} highlighted={highlighted} onChange={(lines) => edit({ lines })} onShowSource={showSource} />
          </Card>

          <Card variant="lowest" padding="md">
            <h2 className="text-sm font-bold font-display mb-2">Mark sheet and matching ({draft.marks.length})</h2>
            <MarksTable scan={scan} marks={draft.marks} editable={editable} highlighted={highlighted} onChange={(marks) => edit({ marks })} />
          </Card>

          <Card variant="lowest" padding="md">
            <h2 className="text-sm font-bold font-display mb-2">Bill charges</h2>
            <ExpensesTable scan={scan} expenses={draft.expenses} editable={editable} onChange={(expenses) => edit({ expenses })} />
          </Card>
        </div>
      </div>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Post this purchase?" subtitle="This creates the vendor bill, receives the lot and adds the stock. It cannot be undone here.">
        <div className="space-y-2 text-sm">
          <p>{scan.vendorName} · bill {scan.billNumber} · {scan.billDate} · lot {scan.lotNumber}</p>
          <p>{r.totals.lineBags} bags · {r.totals.lineWeightKg.toLocaleString('en-IN')} kg · {r.purchaseLines.length} purchase lines</p>
          <p>Owed to vendor: <strong>{rupees(r.totals.net + r.roundingDifference)}</strong>{r.roundingDifference !== 0 && ` (vendor bill ${rupees(r.totals.net)}; lines are rounded to whole rupees)`}</p>
          <p>Added to lot cost: {rupees(r.totals.costExpenses)}</p>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={onConfirm} disabled={confirm.isPending}>{confirm.isPending ? 'Posting…' : 'Confirm and post'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
