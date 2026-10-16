import { formatRupee } from '@/utils/settlement';

export function formatMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value < 0 ? '−' : '';
  return `${sign}₹${formatRupee(Math.abs(value))}`;
}

export function formatWeight(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString('en-IN')} KG`;
}

export function formatCount(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-IN');
}

export function moneyTone(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || Math.abs(value) < 0.01) return 'text-on-surface';
  return value > 0 ? 'text-success' : 'text-danger';
}

export function formatSignedNumber(value: number | null | undefined, suffix = '') {
  if (value == null || !Number.isFinite(value)) return 'Pending';
  if (Math.abs(value) < 0.001) return '0';
  const sign = value > 0 ? '+' : '−';
  return `${sign}${Math.abs(value).toLocaleString('en-IN')}${suffix}`;
}

export function varianceColor(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || Math.abs(value) < 0.001) return 'text-on-surface-variant';
  return value > 0 ? 'text-success' : 'text-danger';
}
