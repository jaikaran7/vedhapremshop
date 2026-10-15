'use client';

import { Card } from '@/components/ui/Card';
import { lotBelongsToProduct } from '@/utils/products';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatCount, formatSignedNumber, formatWeight } from '@/pages/Reports/format';
import { downloadCsv, inDateRange, useReportQuery } from '@/pages/Reports/report-query';
import { useReportData } from '@/pages/Reports/use-report-data';
import { EmptyNote, FilterBar, ReportFrame, SummaryStrip, TablePager, usePagedRows } from '@/pages/Reports/ReportChrome';

interface StockRow {
  id: string;
  lotId: string;
  product: string;
  lotNumber: string;
  mark: string;
  receivedBags: number;
  receivedKg: number;
  soldBags: number;
  soldKg: number;
  adjustmentBags: number;
  adjustmentKg: number;
  availableBags: number;
  availableKg: number;
}

export function StockReport() {
  const router = useRouter();
  const data = useReportData();
  const { filters, setFilter, clear, listQuery } = useReportQuery();
  const product = data.products.find((item) => item.id === filters.product);
  const rows = useMemo(() => {
    const query = filters.q.trim().toLowerCase();
    const result: StockRow[] = [];
    data.lots.forEach((lot) => {
      if (product && !lotBelongsToProduct(lot, product)) return;
      if (!inDateRange(lot.arrivalDate, filters.from, filters.to)) return;
      const productName = data.products.find((item) => lotBelongsToProduct(lot, item))?.name ?? 'Onions';
      const marks = lot.marks.length
        ? lot.marks
        : [{ markCode: '—', initialBags: lot.totalBags, initialWeightKg: lot.totalWeightKg, remainingBags: lot.remainingBags, remainingWeightKg: lot.remainingWeightKg, purchaseRate: 0 }];
      marks.forEach((mark) => {
        if (query && !`${lot.lotNumber} ${mark.markCode} ${productName} ${lot.vendorName}`.toLowerCase().includes(query)) return;
        const sales = data.sales.filter((sale) => sale.status === 'CONFIRMED').flatMap((sale) => sale.items)
          .filter((item) => item.lotNumber.toUpperCase() === lot.lotNumber.toUpperCase() && item.markCode.toUpperCase() === mark.markCode.toUpperCase());
        const adjustments = data.stockMovements.filter((movement) => (
          movement.lotNumber.toUpperCase() === lot.lotNumber.toUpperCase()
          && movement.markCode.toUpperCase() === mark.markCode.toUpperCase()
          && (movement.type === 'ADJUSTMENT_ADD' || movement.type === 'ADJUSTMENT_SUB')
        ));
        const adjustmentBags = adjustments.reduce((sum, movement) => sum + (movement.type === 'ADJUSTMENT_ADD' ? movement.bags : -movement.bags), 0);
        const adjustmentKg = adjustments.reduce((sum, movement) => sum + (movement.type === 'ADJUSTMENT_ADD' ? movement.weightKg : -movement.weightKg), 0);
        result.push({
          id: `${lot.id}-${mark.markCode}`,
          lotId: lot.id,
          product: productName,
          lotNumber: lot.lotNumber,
          mark: mark.markCode,
          receivedBags: mark.initialBags,
          receivedKg: mark.initialWeightKg,
          soldBags: sales.reduce((sum, item) => sum + item.bags, 0),
          soldKg: sales.reduce((sum, item) => sum + item.weightKg, 0),
          adjustmentBags,
          adjustmentKg,
          availableBags: mark.remainingBags,
          availableKg: mark.remainingWeightKg,
        });
      });
    });
    return result;
  }, [data.lots, data.products, data.sales, data.stockMovements, filters.from, filters.q, filters.to, product]);
  const page = usePagedRows(rows, `${filters.product}|${filters.from}|${filters.to}|${filters.q}`);

  function openLot(lotId: string) {
    const query = listQuery();
    router.push(`/reports/lot/${lotId}${query ? `?${query}` : ''}`);
  }

  return (
    <ReportFrame
      title="Stock Report"
      description="Current stock by product, lot, and mark. Available quantity is the balance recorded on the lot."
      onExport={() => downloadCsv('stock-report.csv', ['Product', 'Lot', 'Mark', 'Received bags', 'Received KG', 'Sold bags', 'Sold KG', 'Adjustment bags', 'Adjustment KG', 'Available bags', 'Available KG'], rows.map((row) => [
        row.product, row.lotNumber, row.mark, row.receivedBags, row.receivedKg, row.soldBags, row.soldKg, row.adjustmentBags, row.adjustmentKg, row.availableBags, row.availableKg,
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
        searchPlaceholder="Lot, mark, or vendor"
        onClear={() => clear()}
      />
      <SummaryStrip
        items={[
          { label: 'Marks', value: formatCount(rows.length) },
          { label: 'Available bags', value: formatCount(rows.reduce((sum, row) => sum + row.availableBags, 0)) },
          { label: 'Available KG', value: formatWeight(rows.reduce((sum, row) => sum + row.availableKg, 0)) },
          { label: 'Sold bags', value: formatCount(rows.reduce((sum, row) => sum + row.soldBags, 0)) },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyNote title="No stock" message="No lots match this product, arrival period, or search." />
      ) : (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[64rem]">
              <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                <tr>
                  {['Product', 'Lot', 'Mark', 'Received bags', 'Received KG', 'Sold bags', 'Sold KG', 'Adjustments', 'Available bags', 'Available KG'].map((label) => (
                    <th key={label} className="py-3 px-3 text-right first:text-left [&:nth-child(2)]:text-left [&:nth-child(3)]:text-left">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {page.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-primary/5 cursor-pointer" onClick={() => openLot(row.lotId)}>
                    <td className="py-3 px-3">{row.product}</td>
                    <td className="py-3 px-3 font-bold text-primary">{row.lotNumber}</td>
                    <td className="py-3 px-3 font-semibold">{row.mark}</td>
                    <td className="py-3 px-3 text-right">{formatCount(row.receivedBags)}</td>
                    <td className="py-3 px-3 text-right">{formatWeight(row.receivedKg)}</td>
                    <td className="py-3 px-3 text-right">{formatCount(row.soldBags)}</td>
                    <td className="py-3 px-3 text-right">{formatWeight(row.soldKg)}</td>
                    <td className="py-3 px-3 text-right">{formatSignedNumber(row.adjustmentBags, ' bags')} · {formatSignedNumber(row.adjustmentKg, ' KG')}</td>
                    <td className="py-3 px-3 text-right font-bold">{formatCount(row.availableBags)}</td>
                    <td className="py-3 px-3 text-right font-bold">{formatWeight(row.availableKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
        </Card>
      )}
        <p className="text-[11px] text-on-surface-variant">Arrival dates limit which consignments are listed. Available bags and KG are the current recorded balance.</p>
    </ReportFrame>
  );
}
