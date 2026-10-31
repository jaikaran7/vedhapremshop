'use client';

import React, { useEffect, useState } from 'react';
import { Camera, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { getApiBaseUrl } from '@/config/env';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import type { ConsignmentScan, ScanDocumentKind, ScanRun } from '@/api/consignment-scans.api';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,application/pdf,.docx,.xlsx';
const KIND_LABEL: Record<ScanDocumentKind, string> = { VENDOR_BILL: 'Vendor bill pages', MARK_SHEET: 'Handwritten mark sheet' };

export const documentUrl = (url: string) => `${getApiBaseUrl()}${url}`;

/** Seconds since a run started, ticking while it runs; a real elapsed time, not an estimate of progress. */
function useElapsed(run: ScanRun): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (run.status !== 'RUNNING') return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [run.status]);
  const end = run.finishedAt ? new Date(run.finishedAt).getTime() : now;
  return Math.max(0, Math.round((end - new Date(run.startedAt).getTime()) / 1000));
}

const RunRow: React.FC<{ run: ScanRun }> = ({ run }) => {
  const elapsed = useElapsed(run);
  const variant = run.status === 'SUCCEEDED' ? 'success' : run.status === 'FAILED' ? 'danger' : 'tertiary';
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-t border-surface-container-low text-xs">
      <div>
        <p className="font-bold text-on-surface">{KIND_LABEL[run.job]}</p>
        <p className="text-on-surface-variant">
          {run.model} · attempt {Math.max(run.attempts, 1)} · {elapsed}s
          {run.inputTokens != null && ` · ${run.inputTokens + (run.outputTokens ?? 0)} tokens`}
        </p>
        {run.error && <p className="text-danger mt-1">{run.error}</p>}
      </div>
      <Chip size="sm" variant={variant} label={run.status === 'RUNNING' ? 'Reading…' : run.status === 'SUCCEEDED' ? 'Read' : 'Failed'}
        icon={run.status === 'RUNNING' ? <Loader2 className="w-3 h-3 animate-spin" /> : undefined} />
    </div>
  );
};

/** Files being sent, one request each, for one document kind. */
export interface UploadProgress { kind: ScanDocumentKind; done: number; total: number }

/** "Scan" opens the phone camera (capture), "Upload" picks many files; both, and drag-and-drop, feed the same upload. */
const AddButtons: React.FC<{ disabled: boolean; onFiles: (files: File[]) => void }> = ({ disabled, onFiles }) => {
  const pick = (event: React.ChangeEvent<HTMLInputElement>) => { onFiles(Array.from(event.target.files ?? [])); event.target.value = ''; };
  const style = `inline-flex items-center gap-1 text-xs font-semibold text-primary ${disabled ? 'opacity-50' : 'cursor-pointer'}`;
  return (
    <span className="flex items-center gap-3">
      <label className={style} title="Take a photo with the camera">
        <Camera className="w-3.5 h-3.5" /> Scan
        <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={disabled} onChange={pick} />
      </label>
      <label className={style} title="Choose one or many photos or files">
        <Upload className="w-3.5 h-3.5" /> Upload
        <input type="file" multiple accept={ACCEPT} className="sr-only" disabled={disabled} onChange={pick} />
      </label>
    </span>
  );
};

interface Props {
  scan: ConsignmentScan;
  editable: boolean;
  upload: UploadProgress | null;
  reading: boolean;
  selectedDocumentId: string | null;
  onSelect: (documentId: string) => void;
  onUpload: (kind: ScanDocumentKind, files: File[]) => void;
  onRemove: (documentId: string) => void;
  onRead: () => void;
}

/** Upload by kind, page thumbnails, the source viewer, and the state of the latest AI runs as stored on the server. */
export const ScanDocuments: React.FC<Props> = ({ scan, editable, upload, reading, selectedDocumentId, onSelect, onUpload, onRemove, onRead }) => {
  const selected = scan.documents.find((d) => d.id === selectedDocumentId) ?? scan.documents[0];
  const latestRuns = (['VENDOR_BILL', 'MARK_SHEET'] as const).map((job) => scan.runs.find((r) => r.job === job)).filter((r): r is ScanRun => Boolean(r));
  const processing = scan.status === 'PROCESSING' || reading;
  const [dropTarget, setDropTarget] = useState<ScanDocumentKind | null>(null);
  const uploading = upload !== null;
  const drop = (kind: ScanDocumentKind) => (event: React.DragEvent) => {
    event.preventDefault();
    setDropTarget(null);
    if (editable && !uploading) onUpload(kind, Array.from(event.dataTransfer.files));
  };

  return (
    <Card variant="lowest" padding="md" className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {(['VENDOR_BILL', 'MARK_SHEET'] as const).map((kind) => (
          <div key={kind} onDrop={drop(kind)} onDragLeave={() => setDropTarget(null)}
            onDragOver={(event) => { if (!editable || uploading) return; event.preventDefault(); setDropTarget(kind); }}
            className={`rounded-xl border border-dashed p-3 transition-colors ${dropTarget === kind ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{KIND_LABEL[kind]}</p>
              {editable && <AddButtons disabled={uploading} onFiles={(files) => onUpload(kind, files)} />}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {scan.documents.filter((d) => d.kind === kind).map((d) => (
                <div key={d.id} className={`relative rounded-lg border ${selected?.id === d.id ? 'border-primary' : 'border-surface-container-high'}`}>
                  <button type="button" onClick={() => onSelect(d.id)} className="block w-16 h-20 overflow-hidden rounded-lg bg-surface-container-low" title={d.fileName}>
                    {d.mimeType.startsWith('image/') && d.mimeType !== 'image/heic'
                      ? <img src={documentUrl(d.url)} alt={`${KIND_LABEL[kind]} page ${d.pageNo}`} className="w-full h-full object-cover" />
                      : <span className="flex flex-col items-center justify-center h-full text-[10px] text-on-surface-variant"><FileText className="w-5 h-5" />p{d.pageNo}</span>}
                  </button>
                  {editable && (
                    <button type="button" aria-label={`Remove ${d.fileName}`} onClick={() => onRemove(d.id)} className="absolute -top-2 -right-2 rounded-full bg-surface p-1 shadow">
                      <Trash2 className="w-3 h-3 text-danger" />
                    </button>
                  )}
                </div>
              ))}
              {upload?.kind === kind && (
                <span className="flex items-center gap-1 text-xs text-on-surface-variant"><Loader2 className="w-4 h-4 animate-spin" /> Uploading {upload.done + 1} of {upload.total}</span>
              )}
            </div>
            {editable && !scan.documents.some((d) => d.kind === kind) && upload?.kind !== kind && (
              <p className="text-[11px] text-on-surface-variant mt-2">Scan each page with the camera, upload several at once, or drop files here.</p>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <div className="rounded-xl bg-surface-container-low p-2">
          <div className="flex items-center justify-between text-xs text-on-surface-variant px-1 pb-2">
            <span>{KIND_LABEL[selected.kind]} · page {selected.pageNo} · {selected.fileName}</span>
            <a href={documentUrl(selected.url)} target="_blank" rel="noreferrer" className="font-semibold text-primary">Open</a>
          </div>
          {selected.mimeType.startsWith('image/') && selected.mimeType !== 'image/heic'
            ? <img src={documentUrl(selected.url)} alt={`${KIND_LABEL[selected.kind]} page ${selected.pageNo}`} className="w-full max-h-[70vh] object-contain rounded-lg" />
            : <p className="text-sm text-on-surface-variant p-4">Preview is not shown for this file type. Use Open.</p>}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-on-surface-variant">
          {processing ? 'The bill and the mark sheet are being read in parallel. You can leave this page; it continues on the server.' : 'Reading replaces the values read earlier; your saved versions are kept.'}
        </p>
        {editable && (
          <Button size="sm" onClick={onRead} disabled={processing || scan.documents.length === 0}>
            {processing ? 'Reading…' : scan.runs.length ? 'Read again' : 'Read documents'}
          </Button>
        )}
      </div>
      {latestRuns.length > 0 && <div>{latestRuns.map((run) => <RunRow key={run.id} run={run} />)}</div>}
    </Card>
  );
};
