'use client';

import { Card } from '@/components/ui/Card';
import { lotBelongsToProduct } from '@/utils/products';
import { useMemo } from 'react';
import { formatCount, formatMoney, formatWeight } from '@/pages/Reports/format';
import { downloadCsv, inDateRange, useReportQuery } from '@/pages/Reports/report-query';
import { useReportData } from '@/pages/Reports/use-report-data';
import { EmptyNote, FilterBar, ReportFrame, TablePager, usePagedRows } from '@/pages/Reports/ReportChrome';

interface OpeningRow {
  id: string;
  entity: string;
  kind: 'Customer' | 'Stock';
  bags: number | null;
  weightKg: number | null;
  amount: number | null;
  date: string;
  remarks: string;
}

export function OpeningBalancesReport() {
  const data = useReportData();
  const { filters, setFilter, clear } = useReportQuery();
  const product = data.products.find((item) => item.id === filters.product);
  const rows = useMemo(() => {
    const query = filters.q.trim().toLowerCase();
    const result: OpeningRow[] = [];
    if (!product) {
      data.ledger
        .filter((entry) => entry.type === 'OPENING')
        .forEach((entry) => {
          const customer = data.customers.find((item) => item.id === entry.customerId);
          const name = customer?.name ?? entry.customerId;
          if (!inDateRange(entry.date, filters.from, filters.to)) return;
          if (query && !`${name} ${entry.referenceNo} ${entry.description}`.toLowerCase().includes(query)) return;
          result.push({
            id: entry.id,
            entity: name,
            kind: 'Customer',
            bags: null,
            weightKg: null,
            amount: entry.debit - entry.credit,
            date: entry.date,
            remarks: entry.description || entry.referenceNo,
          });
        });
    }
    data.stockMovements
      .filter((movement) => movement.type === 'OPENING_STOCK')
      .forEach((movement) => {
        const lot = data.lots.find((item) => item.lotNumber.toUpperCase() === movement.lotNumber.toUpperCase());
        if (product && (!lot || !lotBelongsToProduct(lot, product))) return;
        if (!inDateRange(movement.date, filters.from, filters.to)) return;
        const label = `${movement.lotNumber} · ${movement.markCode}`;
        if (query && !label.toLowerCase().includes(query)) return;
        result.push({
          id: movement.id,
          entity: label,
          kind: 'Stock',
          bags: movement.bags,
          weightKg: movement.weightKg,
          amount: null,
          date: movement.date,
          remarks: movement.reason || 'Opening stock movement',
        });
      });
    return result.sort((left, right) => left.date.localeCompare(right.date) || left.entity.localeCompare(right.entity));
  }, [data.customers, data.ledger, data.lots, data.stockMovements, filters.from, filters.q, filters.to, product]);
  const page = usePagedRows(rows, `${filters.product}|${filters.from}|${filters.to}|${filters.q}`);

  return (
    <ReportFrame
      title="Opening Balances"
      description="Opening stock and opening customer balances only. Later sales, receipts, and purchases are not included."
      onExport={() => downloadCsv('opening-balances.csv', ['Entity', 'Kind', 'Bags', 'KG', 'Amount', 'Date', 'Remarks'], rows.map((row) => [
        row.entity, row.kind, row.bags ?? '', row.weightKg ?? '', row.amount ?? '', row.date, row.remarks,
      ]))}
    >
      <FilterBar
        product={filters.product}
        products={data.products.filter((item) => item.status === 'ACTIVE').map((item) => ({ value: item.id, label: item.name }))}
        productPlaceholder="All products"
        onProduct={(value) => setFilter('product', value)}
        from={filters.from}
        to={filters.to}
        onFrom={(value) => setFilter('from', value)}
        onTo={(value) => setFilter('to', value)}
        search={filters.q}
        onSearch={(value) => setFilter('q', value)}
        searchPlaceholder="Customer, lot, or mark"
        onClear={() => clear()}
      />
      <div className="rounded-2xl bg-surface-container-low px-4 py-3 text-xs text-on-surface-variant leading-relaxed">
        Vendor opening balances are not stored separately from the current payable, so they are not listed here.
        {product ? ' A product filter shows opening stock for that product and hides customer balances, which are not tied to a product.' : ''}
      </div>
      {rows.length === 0 ? (
        <EmptyNote
          title="No opening balances"
          message="No opening customer entry or opening stock movement matches these filters. Current outstanding and current stock are not shown on this report."
        />
      ) : (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[48rem]">
              <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-3">Entity</th>
                  <th className="py-3 px-3">Kind</th>
                  <th className="py-3 px-3 text-right">Opening bags</th>
                  <th className="py-3 px-3 text-right">Opening KG</th>
                  <th className="py-3 px-3 text-right">Opening amount</th>
                  <th className="py-3 px-3">Effective date</th>
                  <th className="py-3 px-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {page.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 px-3 font-bold">{row.entity}</td>
                    <td className="py-3 px-3">{row.kind}</td>
                    <td className="py-3 px-3 text-right">{row.bags == null ? '—' : formatCount(row.bags)}</td>
                    <td className="py-3 px-3 text-right">{row.weightKg == null ? '—' : formatWeight(row.weightKg)}</td>
                    <td className="py-3 px-3 text-right">{row.amount == null ? '—' : formatMoney(row.amount)}</td>
                    <td className="py-3 px-3">{row.date}</td>
                    <td className="py-3 px-3 text-on-surface-variant">{row.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
        </Card>
      )}
    </ReportFrame>
  );
}
