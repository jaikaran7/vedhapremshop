import { formatRupee } from '@/utils/settlement';

export function formatMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 'Not available';
  const sign = value < 0 ? '−' : '';
  return `${sign}₹${formatRupee(Math.abs(value))}`;
}

export function formatWeight(value: number) {
  return `${value.toLocaleString('en-IN')} KG`;
}
