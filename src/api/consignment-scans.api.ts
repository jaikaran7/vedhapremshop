import { apiClient } from '@/api/client';

export type ScanStatus = 'DRAFT' | 'PROCESSING' | 'NEEDS_REVIEW' | 'READY' | 'FAILED' | 'CONFIRMED';
export type ScanDocumentKind = 'VENDOR_BILL' | 'MARK_SHEET';
export type RateUnit = 'PER_KG' | 'PER_10_KG' | 'PER_BAG';
export type ScanConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type ScanExpenseCategory = 'HAMALI' | 'MARKET_FEE' | 'COMMISSION' | 'LEVY' | 'DRIVER_ADVANCE' | 'FREIGHT' | 'OTHER';

export interface ScanIssue {
  code: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  refs?: { lineIds?: string[]; markIds?: string[]; expenseIds?: string[] };
}

export interface ScanLine {
  id: string;
  position: number;
  itemName: string;
  bags: number;
  weightKg: number;
  rate: number;
  amount: number;
  sourcePage: number | null;
  sourceRow: number | null;
  confidence: ScanConfidence;
  rawText: Record<string, string> | null;
  origin: 'AI' | 'MANUAL';
  corrected: boolean;
  assignedMarkId: string | null;
  markId: string | null;
  matchMethod: 'MANUAL' | 'EXACT' | 'GROUPED' | 'RANGE' | null;
  suggestedMarkId: string | null;
  provenance: 'MATCHED' | 'CORRECTED' | 'UNRESOLVED';
}

export interface ScanMark {
  id: string;
  position: number;
  markCode: string;
  bags: number;
  rateMin: number;
  rateMax: number;
  sourcePage: number | null;
  sourceRow: number | null;
  confidence: ScanConfidence;
  rawText: Record<string, string> | null;
  origin: 'AI' | 'MANUAL';
  corrected: boolean;
}

export interface ScanExpense {
  id: string;
  label: string;
  category: ScanExpenseCategory;
  amount: number;
  includeInCost: boolean;
  confidence: ScanConfidence;
  rawText: string | null;
  origin: 'AI' | 'MANUAL';
  corrected: boolean;
}

export interface ScanRun {
  id: string;
  job: ScanDocumentKind;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  stage: string;
  model: string;
  promptVersion: string;
  attempts: number;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface ConsignmentScan {
  id: string;
  status: ScanStatus;
  version: number;
  vendorId: string | null;
  vendorName: string | null;
  productId: string | null;
  productName: string | null;
  lotNumber: string | null;
  rateUnit: RateUnit | null;
  billNumber: string | null;
  billDate: string | null;
  sheetDate: string | null;
  vendorNameText: string | null;
  buyerNameText: string | null;
  lotRefText: string | null;
  printed: { billBags: number | null; billWeightKg: number | null; grossAmount: number | null; expensesAmount: number | null; netAmount: number | null; sheetBags: number | null };
  purchaseId: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  createdBy: string;
  createdAt: string;
  documents: { id: string; kind: ScanDocumentKind; pageNo: number; fileName: string; mimeType: string; sizeBytes: number; url: string }[];
  runs: ScanRun[];
  lines: ScanLine[];
  marks: ScanMark[];
  expenses: ScanExpense[];
  reconciliation: {
    canConfirm: boolean;
    issues: ScanIssue[];
    rateUnitEvidence: { checked: number; agreeing: Record<RateUnit, number>; suggested: RateUnit | null };
    roundingDifference: number;
    totals: { lineBags: number; markBags: number; lineWeightKg: number; linesAmount: number; expenses: number; net: number; costExpenses: number };
    marks: { markId: string; markCode: string; expectedBags: number; matchedBags: number; weightKg: number; amount: number; rates: number[]; status: 'MATCHED' | 'SHORT' | 'OVER' }[];
    purchaseLines: { markCode: string; bags: number; weightKg: number; printedRate: number; ratePerKg: number; vendorAmount: number }[];
  };
}

export interface ConsignmentScanSummary {
  id: string;
  status: ScanStatus;
  billNumber: string | null;
  lotNumber: string | null;
  vendorName: string | null;
  purchaseId: string | null;
  documentCount: number;
  createdBy: string;
  createdAt: string;
}

export interface SaveScanDraft {
  version: number;
  reason?: string;
  vendorId?: string | null;
  productId?: string | null;
  lotNumber?: string | null;
  rateUnit?: RateUnit | null;
  billNumber?: string | null;
  billDate?: string | null;
  sheetDate?: string | null;
  lines?: { id?: string; itemName?: string; bags: number; weightKg: number; rate: number; amount: number; assignedMarkId: string | null }[];
  marks?: { id?: string; markCode: string; bags: number; rateMin: number; rateMax: number }[];
  expenses?: { id?: string; label: string; category: ScanExpenseCategory; amount: number; includeInCost: boolean }[];
}

const base = '/consignment-scans';

export const listScans = () => apiClient<ConsignmentScanSummary[]>(`${base}?limit=50`);
export const getScan = (id: string) => apiClient<ConsignmentScan>(`${base}/${id}`);
export const createScan = () => apiClient<ConsignmentScan>(base, { method: 'POST' });
export const processScan = (id: string) => apiClient<ConsignmentScan>(`${base}/${id}/process`, { method: 'POST' });
export const saveScanDraft = (id: string, draft: SaveScanDraft) => apiClient<ConsignmentScan>(`${base}/${id}`, { method: 'PATCH', body: JSON.stringify(draft) });
export const removeScanDocument = (id: string, documentId: string) => apiClient<ConsignmentScan>(`${base}/${id}/documents/${documentId}`, { method: 'DELETE' });

/** One file per request: hosted functions cap a request body at a few MB. */
export async function uploadScanDocument(id: string, kind: ScanDocumentKind, file: File): Promise<ConsignmentScan> {
  const form = new FormData();
  form.append('kind', kind);
  form.append('files', file, file.name);
  return apiClient<ConsignmentScan>(`${base}/${id}/documents`, { method: 'POST', body: form });
}

export const confirmScan = (id: string, version: number, idempotencyKey: string) =>
  apiClient<{ purchaseId: string; replayed: boolean; scan: ConsignmentScan }>(`${base}/${id}/confirm`, {
    method: 'POST', body: JSON.stringify({ version }), headers: { 'Idempotency-Key': idempotencyKey },
  });
