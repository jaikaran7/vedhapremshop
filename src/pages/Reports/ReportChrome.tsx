'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ArrowLeft, ArrowUpDown, Download, Printer, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function ReportFrame({
  title,
  description,
  onExport,
  children,
}: {
  title: string;
  description: string;
  onExport: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href="/reports"
            className="mt-0.5 p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface shrink-0"
            aria-label="All reports"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">{title}</h1>
            <p className="text-xs text-on-surface-variant font-medium mt-1">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="primary" icon={<Download className="w-4 h-4" />} onClick={onExport}>
            Export CSV
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

export function SummaryStrip({
  items,
  columns = 'strip',
}: {
  items: { label: string; value: string; hint?: string; tone?: string }[];
  columns?: 'strip' | 'quarters';
}) {
  const grid = columns === 'quarters'
    ? 'grid grid-cols-2 lg:grid-cols-4 gap-2'
    : 'grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2';
  return (
    <div className={grid}>
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-surface-container-lowest px-3 py-3 ambient-shadow min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant leading-tight">{item.label}</div>
          <div className={`mt-1 text-base sm:text-lg font-extrabold font-display leading-tight break-words ${item.tone ?? 'text-on-surface'}`}>
            {item.value}
          </div>
          {item.hint && <div className="text-[10px] text-on-surface-variant mt-1 leading-snug">{item.hint}</div>}
        </div>
      ))}
    </div>
  );
}

export function FilterBar({
  product,
  products,
  onProduct,
  from,
  to,
  onFrom,
  onTo,
  search,
  onSearch,
  searchPlaceholder,
  discrepancy,
  onDiscrepancy,
  onClear,
  productPlaceholder = 'Select product',
}: {
  product?: string;
  products?: { value: string; label: string }[];
  productPlaceholder?: string;
  onProduct?: (value: string) => void;
  from?: string;
  to?: string;
  onFrom?: (value: string) => void;
  onTo?: (value: string) => void;
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  discrepancy?: string;
  onDiscrepancy?: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 no-print">
      {onProduct && products && (
        <Select
          label="Product"
          value={product ?? ''}
          onChange={(event) => onProduct(event.target.value)}
          options={[{ value: '', label: productPlaceholder }, ...products.filter((item) => item.value !== '')]}
        />
      )}
      {onFrom && (
        <Input label="From date" type="date" value={from ?? ''} onChange={(event) => onFrom(event.target.value)} />
      )}
      {onTo && (
        <Input label="To date" type="date" value={to ?? ''} onChange={(event) => onTo(event.target.value)} />
      )}
      {onDiscrepancy && (
        <Select
          label="Discrepancy"
          value={discrepancy ?? ''}
          onChange={(event) => onDiscrepancy(event.target.value)}
          options={[
            { value: '', label: 'All' },
            { value: 'POSITIVE', label: 'Positive Difference' },
            { value: 'NEGATIVE', label: 'Negative Difference' },
            { value: 'NONE', label: 'No Difference' },
            { value: 'REVIEW', label: 'Needs Review' },
          ]}
        />
      )}
      {onSearch && (
        <Input
          label="Search"
          placeholder={searchPlaceholder ?? 'Search'}
          icon={<Search className="w-4 h-4" />}
          value={search ?? ''}
          onChange={(event) => onSearch(event.target.value)}
        />
      )}
      <div className="flex items-end">
        <Button variant="secondary" className="w-full" onClick={onClear}>Clear filters</Button>
      </div>
    </div>
  );
}

export function EmptyNote({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl bg-surface-container-low px-5 py-10 text-center">
      <h3 className="text-base font-bold font-display text-on-surface">{title}</h3>
      <p className="text-xs text-on-surface-variant mt-2 max-w-lg mx-auto leading-relaxed">{message}</p>
    </div>
  );
}

export function SortableHead({
  label,
  active,
  direction,
  onClick,
  align = 'left',
  className = '',
}: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onClick: () => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <th className={`py-3 px-3 ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 uppercase text-[10px] font-bold text-on-surface-variant hover:text-on-surface cursor-pointer ${alignClass}`}
      >
        {label}
        <ArrowUpDown className={`w-3 h-3 ${active ? 'text-primary' : ''}`} />
        {active && <span className="sr-only">{direction === 'asc' ? 'ascending' : 'descending'}</span>}
      </button>
    </th>
  );
}

export function TablePager({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-surface-container-low text-xs no-print">
      <span className="text-on-surface-variant">{total.toLocaleString('en-IN')} rows · page {page} of {pages}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

export function usePagedRows<T>(rows: T[], resetKey: string, size = 12) {
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [resetKey]);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  return {
    page: current,
    pages,
    rows: rows.slice((current - 1) * size, current * size),
    setPage,
    total: rows.length,
  };
}

export function compareValues(left: string | number | null, right: string | number | null, direction: 'asc' | 'desc') {
  const factor = direction === 'asc' ? 1 : -1;
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor;
  return String(left).localeCompare(String(right), undefined, { numeric: true }) * factor;
}
