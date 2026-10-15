'use client';

import { can } from '@/auth/permissions';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { useSession } from '@/store/session/session-provider';
import { differenceStatusLabel, buildDifferentialReport, type DifferentialLot, type DifferenceStatus } from '@/utils/report-differential';
import { lotBelongsToProduct } from '@/utils/products';
import { STOCK_WEIGHT_EPSILON_KG } from '@/utils/lot-differential';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCount, formatMoney, formatSignedNumber, formatWeight, moneyTone } from '@/pages/Reports/format';
import { downloadCsv, inDateRange, useReportQuery } from '@/pages/Reports/report-query';
import { useReportData } from '@/pages/Reports/use-report-data';
import { EmptyNote, FilterBar, ReportFrame, SortableHead, SummaryStrip, TablePager, compareValues, usePagedRows } from '@/pages/Reports/ReportChrome';

type SortKey = 'date' | 'lot' | 'difference' | 'remaining' | 'profit';

function statusVariant(status: DifferenceStatus): 'success' | 'danger' | 'tertiary' | 'neutral' {
  if (status === 'POSITIVE') return 'success';
  if (status === 'NEGATIVE') return 'danger';
  if (status === 'NEEDS_REVIEW') return 'tertiary';
  return 'neutral';
}

function matchesDiscrepancy(lot: DifferentialLot, filter: string) {
  const bags = lot.bagDifference ?? 0;
  const kg = lot.weightDifferenceKg ?? 0;
  const flat = bags === 0 && Math.abs(kg) <= STOCK_WEIGHT_EPSILON_KG;
  if (!filter) return true;
  if (filter === 'POSITIVE') return bags > 0 || kg > STOCK_WEIGHT_EPSILON_KG;
  if (filter === 'NEGATIVE') return bags < 0 || kg < -STOCK_WEIGHT_EPSILON_KG;
  if (filter === 'NONE') return flat;
  if (filter === 'REVIEW') return lot.reviewCount > 0 || lot.status === 'NEEDS_REVIEW';
  return true;
}

export function DifferentialReport() {
  const router = useRouter();
  const { currentUser } = useSession();
  const showCost = can(currentUser.role, 'viewPurchaseCost');
  const showProfit = can(currentUser.role, 'viewProfit');
  const data = useReportData();
  const { filters, setFilter, clear, listQuery } = useReportQuery();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const report = useMemo(
    () => buildDifferentialReport({
      lots: data.lots,
      purchases: data.purchases,
      sales: data.sales,
      stockMovements: data.stockMovements,
      products: data.products,
    }),
    [data.lots, data.products, data.purchases, data.sales, data.stockMovements],
  );
  const product = data.products.find((item) => item.id === filters.product && item.status === 'ACTIVE');
  const filtered = useMemo(() => {
    if (!product) return [];
    const query = filters.q.trim().toLowerCase();
    return report.lots.filter((lot) => {
      const source = data.lots.find((item) => item.id === lot.lotId);
      if (!source || !lotBelongsToProduct(source, product)) return false;
      if (!inDateRange(lot.date, filters.from, filters.to)) return false;
      if (!matchesDiscrepancy(lot, filters.discrepancy)) return false;
      if (!query) return true;
      return lot.lotNumber.toLowerCase().includes(query)
        || (lot.base.vendorBill ?? '').toLowerCase().includes(query)
        || lot.vendorName.toLowerCase().includes(query);
    });
  }, [data.lots, filters, product, report.lots]);

  const sorted = useMemo(() => {
    const valueOf = (lot: DifferentialLot): string | number | null => {
      if (sortKey === 'date') return lot.date;
      if (sortKey === 'lot') return lot.lotNumber;
      if (sortKey === 'difference') return lot.weightDifferenceKg;
      if (sortKey === 'remaining') return lot.balanceBags;
      return showProfit ? lot.profit : null;
    };
    return [...filtered].sort((left, right) => compareValues(valueOf(left), valueOf(right), direction));
  }, [direction, filtered, showProfit, sortKey]);
  const page = usePagedRows(sorted, `${filters.product}|${filters.from}|${filters.to}|${filters.q}|${filters.discrepancy}|${sortKey}|${direction}`);

  const summary = useMemo(() => {
    const knownProfit = filtered.map((lot) => lot.profit).filter((profit): profit is number => profit != null);
    const review = filtered.filter((lot) => lot.reviewCount > 0 || lot.status === 'NEEDS_REVIEW').length;
    const weightGap = filtered.reduce((sum, lot) => sum + (lot.weightDifferenceKg ?? 0), 0);
    return { knownProfit, review, weightGap };
  }, [filtered]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setDirection(direction === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setDirection(key === 'date' || key === 'lot' ? 'asc' : 'desc');
    }
  }

  function openLot(lotId: string) {
    const query = listQuery();
    router.push(query ? `/reports/lot/${lotId}?${query}` : `/reports/lot/${lotId}`);
  }

  function exportRows() {
    const headers = [
      'Date', 'Lot', 'Product', 'Arrived bags', 'Arrived KG', 'Sold bags', 'Sold KG',
      'Balance bags', 'Balance KG',
      ...(showCost ? ['Purchase amount', 'Expenses'] : []),
      'Sales amount', 'Bag difference', 'KG difference',
      ...(showProfit ? ['Profit/Loss'] : []),
      'Status',
    ];
    downloadCsv('differential-report.csv', headers, sorted.map((lot) => [
      lot.date,
      lot.lotNumber,
      lot.productName,
      lot.arrivedBags,
      lot.arrivedKg,
      lot.soldBags,
      lot.soldKg,
      lot.balanceBags,
      lot.balanceKg,
      ...(showCost ? [lot.purchaseAmount ?? 'Not available', lot.expenses ?? 'Not available'] : []),
      lot.salesAmount,
      lot.bagDifference ?? 'Pending reconciliation',
      lot.weightDifferenceKg ?? 'Pending reconciliation',
      ...(showProfit ? [lot.profit ?? 'Not available'] : []),
      differenceStatusLabel(lot.status),
    ]));
  }

  const activeProducts = data.products
    .filter((item) => item.status === 'ACTIVE')
    .map((item) => ({ value: item.id, label: item.name }));

  return (
    <ReportFrame
      title="Differential Report"
      description="Consignment reconciliation for one product. Stock difference and realized profit are separate."
      onExport={exportRows}
    >
      <FilterBar
        product={filters.product}
        products={activeProducts}
        onProduct={(value) => setFilter('product', value)}
        from={filters.from}
        to={filters.to}
        onFrom={(value) => setFilter('from', value)}
        onTo={(value) => setFilter('to', value)}
        discrepancy={filters.discrepancy}
        onDiscrepancy={(value) => setFilter('discrepancy', value)}
        search={filters.q}
        onSearch={(value) => setFilter('q', value)}
        searchPlaceholder="Lot or bill number"
        onClear={() => clear()}
      />

      {!product && (
        <EmptyNote
          title="Select a product"
          message="Differential results are calculated for one product at a time. Choose Onions, Garlic, Ginger, or another active product."
        />
      )}

      {product && (
        <>
          <SummaryStrip
            items={[
              { label: 'Consignments', value: formatCount(filtered.length) },
              { label: 'Bags received', value: formatCount(filtered.reduce((sum, lot) => sum + lot.arrivedBags, 0)) },
              { label: 'Bags sold', value: formatCount(filtered.reduce((sum, lot) => sum + lot.soldBags, 0)) },
              { label: 'Remaining bags', value: formatCount(filtered.reduce((sum, lot) => sum + lot.balanceBags, 0)) },
              { label: 'Weight difference', value: formatSignedNumber(summary.weightGap, ' KG'), tone: moneyTone(summary.weightGap) },
              {
                label: 'Realized profit/loss',
                value: showProfit
                  ? (summary.knownProfit.length ? formatMoney(summary.knownProfit.reduce((sum, profit) => sum + profit, 0)) : 'Not available')
                  : 'Hidden',
                hint: 'Sold stock only',
                tone: showProfit && summary.knownProfit.length ? moneyTone(summary.knownProfit.reduce((sum, profit) => sum + profit, 0)) : undefined,
              },
              { label: 'Needs review', value: formatCount(summary.review), tone: summary.review ? 'text-tertiary' : undefined },
            ]}
          />
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            {report.unconfiguredRules.join(' ')} A sale is flagged for price only when that mark has a finalized floor rate. Unsold stock is not treated as a loss.
          </p>

          {sorted.length === 0 ? (
            <EmptyNote title="No consignments" message={`No ${product.name} consignments match these dates, the discrepancy filter, or the search.`} />
          ) : (
            <Card variant="lowest" padding="none" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[72rem]">
                  <thead className="bg-surface-container-low text-on-surface-variant">
                    <tr>
                      <SortableHead label="Date" active={sortKey === 'date'} direction={direction} onClick={() => toggleSort('date')} />
                      <SortableHead label="Lot" active={sortKey === 'lot'} direction={direction} onClick={() => toggleSort('lot')} />
                      <th className="py-3 px-3 text-[10px] font-bold uppercase">Product</th>
                      <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Arrived bags</th>
                      <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Arrived KG</th>
                      <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Sold bags</th>
                      <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Sold KG</th>
                      <SortableHead label="Balance bags" active={sortKey === 'remaining'} direction={direction} onClick={() => toggleSort('remaining')} align="right" />
                      <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Balance KG</th>
                      {showCost && <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Purchase</th>}
                      <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Sales</th>
                      {showCost && <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Expenses</th>}
                      <SortableHead label="Difference" active={sortKey === 'difference'} direction={direction} onClick={() => toggleSort('difference')} align="right" />
                      {showProfit && <SortableHead label="Profit/Loss" active={sortKey === 'profit'} direction={direction} onClick={() => toggleSort('profit')} align="right" />}
                      <th className="py-3 px-3 text-[10px] font-bold uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low">
                    {page.rows.map((lot) => (
                      <tr
                        key={lot.lotId}
                        className="hover:bg-primary/5 cursor-pointer"
                        onClick={() => openLot(lot.lotId)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openLot(lot.lotId);
                          }
                        }}
                        tabIndex={0}
                      >
                        <td className="py-3 px-3 whitespace-nowrap">{lot.date}</td>
                        <td className="py-3 px-3 font-bold text-primary whitespace-nowrap">{lot.lotNumber}</td>
                        <td className="py-3 px-3">{lot.productName}</td>
                        <td className="py-3 px-3 text-right">{formatCount(lot.arrivedBags)}</td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">{formatWeight(lot.arrivedKg)}</td>
                        <td className="py-3 px-3 text-right">{formatCount(lot.soldBags)}</td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">{formatWeight(lot.soldKg)}</td>
                        <td className="py-3 px-3 text-right font-semibold">{formatCount(lot.balanceBags)}</td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">{formatWeight(lot.balanceKg)}</td>
                        {showCost && <td className="py-3 px-3 text-right whitespace-nowrap">{formatMoney(lot.purchaseAmount)}</td>}
                        <td className="py-3 px-3 text-right whitespace-nowrap">{formatMoney(lot.salesAmount)}</td>
                        {showCost && <td className="py-3 px-3 text-right whitespace-nowrap">{formatMoney(lot.expenses)}</td>}
                        <td className={`py-3 px-3 text-right font-semibold whitespace-nowrap ${moneyTone(lot.weightDifferenceKg)}`}>
                          {formatSignedNumber(lot.weightDifferenceKg, ' KG')}
                          <div className="text-[10px] font-medium text-on-surface-variant">{formatSignedNumber(lot.bagDifference, ' bags')}</div>
                        </td>
                        {showProfit && (
                          <td className={`py-3 px-3 text-right font-bold whitespace-nowrap ${moneyTone(lot.profit)}`}>
                            {lot.profit == null ? (lot.soldKg <= STOCK_WEIGHT_EPSILON_KG ? 'No sales yet' : 'Not available') : formatMoney(lot.profit)}
                          </td>
                        )}
                        <td className="py-3 px-3"><Chip label={differenceStatusLabel(lot.status)} size="sm" variant={statusVariant(lot.status)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
            </Card>
          )}
        </>
      )}
    </ReportFrame>
  );
}
