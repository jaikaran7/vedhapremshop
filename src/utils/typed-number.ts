export function sanitizeTypedNumber(raw: string, allowDecimal = true): string {
  const cleaned = allowDecimal ? raw.replace(/[^\d.]/g, '') : raw.replace(/\D/g, '');
  if (!allowDecimal) return cleaned.replace(/^0+(?=\d)/, '');
  const [whole, fraction] = cleaned.split('.');
  const nextWhole = (whole || '').replace(/^0+(?=\d)/, '');
  if (fraction === undefined) return nextWhole;
  return `${nextWhole === '' ? '0' : nextWhole}.${fraction.replace(/\./g, '')}`;
}

export function parseTypedNumber(raw: string): number {
  if (raw.trim() === '' || raw === '.' || raw === '0.') return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}
