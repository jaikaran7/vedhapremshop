'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export interface ReportQuery {
  product: string;
  from: string;
  to: string;
  q: string;
  discrepancy: string;
  mark: string;
  cost: string;
}

const KEYS: (keyof ReportQuery)[] = ['product', 'from', 'to', 'q', 'discrepancy', 'mark', 'cost'];

export function useReportQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = useMemo<ReportQuery>(() => ({
    product: params?.get('product') ?? '',
    from: params?.get('from') ?? '',
    to: params?.get('to') ?? '',
    q: params?.get('q') ?? '',
    discrepancy: params?.get('discrepancy') ?? '',
    mark: params?.get('mark') ?? '',
    cost: params?.get('cost') ?? '',
  }), [params]);

  function write(next: URLSearchParams) {
    const query = next.toString();
    const path = pathname ?? '/reports';
    router.replace(query ? `${path}?${query}` : path, { scroll: false });
  }

  function setFilters(patch: Partial<ReportQuery>) {
    const next = new URLSearchParams(params?.toString() ?? '');
    (Object.entries(patch) as [keyof ReportQuery, string][]).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    write(next);
  }

  function setFilter(key: keyof ReportQuery, value: string) {
    setFilters({ [key]: value });
  }

  function clear(keep: (keyof ReportQuery)[] = []) {
    const next = new URLSearchParams();
    keep.forEach((key) => {
      if (filters[key]) next.set(key, filters[key]);
    });
    write(next);
  }

  function listQuery() {
    const next = new URLSearchParams();
    (['product', 'from', 'to', 'q', 'discrepancy'] as const).forEach((key) => {
      if (filters[key]) next.set(key, filters[key]);
    });
    return next.toString();
  }

  return { filters, setFilter, setFilters, clear, listQuery, keys: KEYS };
}

export function inDateRange(date: string, from: string, to: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
