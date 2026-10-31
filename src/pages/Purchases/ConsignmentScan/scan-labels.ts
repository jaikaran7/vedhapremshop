import type { ChipProps } from '@/components/ui/Chip';
import type { RateUnit, ScanExpenseCategory, ScanIssue, ScanStatus } from '@/api/consignment-scans.api';

export const STATUS_LABEL: Record<ScanStatus, { label: string; variant: ChipProps['variant'] }> = {
  DRAFT: { label: 'Waiting for documents', variant: 'neutral' },
  PROCESSING: { label: 'Reading documents', variant: 'tertiary' },
  NEEDS_REVIEW: { label: 'Needs review', variant: 'danger' },
  READY: { label: 'Ready to confirm', variant: 'success' },
  FAILED: { label: 'Reading failed', variant: 'danger' },
  CONFIRMED: { label: 'Confirmed', variant: 'primary' },
};

export const RATE_UNIT_LABEL: Record<RateUnit, string> = { PER_KG: 'per kg', PER_10_KG: 'per 10 kg', PER_BAG: 'per bag' };

export const EXPENSE_CATEGORY_LABEL: Record<ScanExpenseCategory, string> = {
  HAMALI: 'Hamali', MARKET_FEE: 'Market fee', COMMISSION: 'Commission', LEVY: 'Levy', DRIVER_ADVANCE: 'Driver advance', FREIGHT: 'Freight', OTHER: 'Other',
};

export const SEVERITY_STYLE: Record<ScanIssue['severity'], string> = {
  CRITICAL: 'border-danger/40 bg-danger-container/40 text-danger-on-container',
  WARNING: 'border-tertiary/40 bg-tertiary-container/40 text-tertiary-on-container',
  INFO: 'border-surface-container-high bg-surface-container-low text-on-surface-variant',
};

export const rupees = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
