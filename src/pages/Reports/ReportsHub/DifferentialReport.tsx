'use client';

import { can } from '@/auth/permissions';
import { Card } from '@/components/ui/Card';
import { useSession } from '@/store/session/session-provider';
import { differenceStatusLabel, type DifferentialLot, type DifferentialReport as DifferentialReportData } from '@/utils/report-differential';
import { lotBelongsToProduct } from '@/utils/products';
import { STOCK_WEIGHT_EPSILON_KG } from '@/utils/lot-differential';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCount, formatMoney, formatSignedNumber, moneyTone } from '@/pages/Reports/format';
import { downloadCsv, inDateRange, useReportQuery } from '@/pages/Reports/report-query';
import { useProductsQuery } from '@/hooks/queries/use-directory-query';
import { useDifferentialQuery } from '@/hooks/queries/use-reports-query';
import { EmptyNote, FilterBar, ReportFrame, SortableHead, SummaryStrip, TablePager, compareValues, usePagedRows } from '@/pages/Reports/ReportChrome';

type SortKey = 'date' | 'lot' | 'remaining' | 'profit';

const headCell = '!px-2 !py-2';
const receivedCell = 'bg-primary/[0.055] group-hover:bg-primary/[0.1] px-2 py-1.5 border-b border-b-primary/30';
const soldCell = 'bg-tertiary/[0.07] group-hover:bg-tertiary/[0.12] px-2 py-1.5 border-b border-b-outline/80';
const identityCell = 'align-middle bg-surface-container-lowest group-hover:bg-surface-container-low px-2 py-1.5 border-b border-b-outline/80';
const summaryCell = 'align-middle bg-surface-container-low/80 group-hover:bg-surface-container px-2 py-1.5 border-b border-b-outline/80 text-right whitespace-nowrap';
const figure = 'font-bold tabular-nums tracking-tight';

function profitSummary(lot: DifferentialLot, showProfit: boolean) {
  if (!showProfit) return { value: 'Hidden', tone: 'text-on-surface-variant', note: undefined as string | undefined };
  if (lot.profit == null) {
    return {
      value: '—',
      tone: 'text-on-surface-variant',
      note: lot.soldKg <= STOCK_WEIGHT_EPSILON_KG ? 'No sales yet' : 'Not available',
    };
  }
  return { value: formatMoney(lot.profit), tone: moneyTone(lot.profit), note: undefined };
}

function QuantityFigure({ value, tone }: { value: number; tone: string }) {
  return <span className={`${figure} whitespace-nowrap ${tone}`}>{value.toLocaleString('en-IN')}</span>;
}

function hasNegativeDiscrepancy(lot: DifferentialLot) {
  const bags = lot.bagDifference;
  const kg = lot.weightDifferenceKg;
  if (bags == null && kg == null) return false;
  return (bags != null && bags < 0) || (kg != null && kg < -STOCK_WEIGHT_EPSILON_KG);
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

const EMPTY_REPORT: DifferentialReportData = { lots: [], unconfiguredRules: [] };

export function DifferentialReport() {
  const router = useRouter();
  const { currentUser } = useSession();
  const showCost = can(currentUser.role, 'viewPurchaseCost');
  const showProfit = can(currentUser.role, 'viewProfit');
  // The lot breakdown is built on the server (cached); the browser only filters and sorts it.
  const { data: report = EMPTY_REPORT } = useDifferentialQuery();
  const { data: products = [] } = useProductsQuery();
  const { filters, setFilter, clear, listQuery } = useReportQuery();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const product = products.find((item) => item.id === filters.product && item.status === 'ACTIVE');
  const filtered = useMemo(() => {
    if (!product) return [];
    const query = filters.q.trim().toLowerCase();
    return report.lots.filter((lot) => {
      if (!lotBelongsToProduct({ productId: lot.productId ?? undefined }, product)) return false;
      if (!inDateRange(lot.date, filters.from, filters.to)) return false;
      if (!matchesDiscrepancy(lot, filters.discrepancy)) return false;
      if (!query) return true;
      return lot.lotNumber.toLowerCase().includes(query)
        || (lot.base.vendorBill ?? '').toLowerCase().includes(query)
        || lot.vendorName.toLowerCase().includes(query);
    });
  }, [filters, product, report.lots]);

  const sorted = useMemo(() => {
    const valueOf = (lot: DifferentialLot): string | number | null => {
      if (sortKey === 'date') return lot.date;
      if (sortKey === 'lot') return lot.lotNumber;
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

  const activeProducts = products
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
            <>
              <Card variant="lowest" padding="none" className="hidden md:block w-full overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[44rem] table-fixed text-left text-[13px] border-collapse">
                    <colgroup>
                      {(showProfit
                        ? ['11%', '13%', '10%', '13%', '14%', '12%', '13%', '14%']
                        : ['13%', '16%', '12%', '15%', '16%', '14%', '14%']
                      ).map((width, index) => <col key={index} style={{ width }} />)}
                    </colgroup>
                    <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline/80">
                      <tr>
                        <SortableHead className={headCell} label="Date" active={sortKey === 'date'} direction={direction} onClick={() => toggleSort('date')} />
                        <SortableHead className={headCell} label="Lot / Stock No" active={sortKey === 'lot'} direction={direction} onClick={() => toggleSort('lot')} />
                        <th className="py-2 px-2 text-[10px] font-bold uppercase text-right">Bags</th>
                        <th className="py-2 px-2 text-[10px] font-bold uppercase text-right">Quantity</th>
                        <th className="py-2 px-2 text-[10px] font-bold uppercase text-right">Amount</th>
                        <SortableHead className={headCell} label="Balance bags" active={sortKey === 'remaining'} direction={direction} onClick={() => toggleSort('remaining')} align="right" />
                        <th className="py-2 px-2 text-[10px] font-bold uppercase text-right">Balance qty</th>
                        {showProfit && <SortableHead className={headCell} label="Profit/Loss" active={sortKey === 'profit'} direction={direction} onClick={() => toggleSort('profit')} align="right" />}
                      </tr>
                    </thead>
                    {page.rows.map((lot) => {
                      const profit = profitSummary(lot, showProfit);
                      const purchase = showCost ? formatMoney(lot.purchaseAmount) : 'Hidden';
                      const lotTone = hasNegativeDiscrepancy(lot) ? 'text-danger' : 'text-primary';
                      return (
                        <tbody
                          key={lot.lotId}
                          className="group cursor-pointer"
                          onClick={() => openLot(lot.lotId)}
                        >
                          <tr
                            tabIndex={0}
                            aria-label={`${lot.lotNumber} received`}
                            className="outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70 focus-visible:-outline-offset-2"
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                openLot(lot.lotId);
                              }
                            }}
                          >
                            <td rowSpan={2} className={`${identityCell} whitespace-nowrap font-semibold text-on-surface`}>{lot.date}</td>
                            <td rowSpan={2} className={identityCell}>
                              <div className={`text-sm font-bold whitespace-nowrap ${lotTone}`}>{lot.lotNumber}</div>
                            </td>
                            <td className={`${receivedCell} border-l-2 border-l-primary/70 text-right text-primary ${figure}`}>
                              <span className="sr-only">Received </span>{formatCount(lot.arrivedBags)}
                            </td>
                            <td className={`${receivedCell} text-right`}><QuantityFigure value={lot.arrivedKg} tone="text-primary" /></td>
                            <td className={`${receivedCell} text-right ${figure} ${showCost ? 'text-on-surface' : 'text-on-surface-variant'}`} title="Purchase amount">{purchase}</td>
                            <td rowSpan={2} className={`${summaryCell} border-l border-l-outline/80 ${figure}`}>{formatCount(lot.balanceBags)}</td>
                            <td rowSpan={2} className={summaryCell}><QuantityFigure value={lot.balanceKg} tone="text-on-surface" /></td>
                            {showProfit && (
                              <td rowSpan={2} className={summaryCell}>
                                <div className={`${figure} ${profit.tone}`}>{profit.value}</div>
                                {profit.note && <div className="text-[10px] font-medium text-on-surface-variant mt-0.5">{profit.note}</div>}
                              </td>
                            )}
                          </tr>
                          <tr aria-label={`${lot.lotNumber} sold`}>
                            <td className={`${soldCell} border-l-2 border-l-tertiary/70 text-right text-tertiary ${figure}`}>
                              <span className="sr-only">Sold </span>{formatCount(lot.soldBags)}
                            </td>
                            <td className={`${soldCell} text-right`}><QuantityFigure value={lot.soldKg} tone="text-tertiary" /></td>
                            <td className={`${soldCell} text-right ${figure} text-on-surface`} title="Sales amount">{formatMoney(lot.salesAmount)}</td>
                          </tr>
                        </tbody>
                      );
                    })}
                  </table>
                </div>
                <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
              </Card>

              <div className="md:hidden space-y-3">
                {page.rows.map((lot) => {
                  const profit = profitSummary(lot, showProfit);
                  const purchase = showCost ? formatMoney(lot.purchaseAmount) : 'Hidden';
                  return (
                    <Card key={lot.lotId} variant="lowest" className="p-3 cursor-pointer hover:bg-surface-container-low/40" onClick={() => openLot(lot.lotId)}>
                      <div className="mb-2">
                        <div className={`font-bold ${hasNegativeDiscrepancy(lot) ? 'text-danger' : 'text-primary'}`}>{lot.lotNumber}</div>
                        <div className="text-xs font-semibold text-on-surface-variant">{lot.date}</div>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-outline/80 text-xs">
                        <div className="grid grid-cols-3 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                          <div className="text-right">Bags</div>
                          <div className="text-right">Quantity</div>
                          <div className="text-right">Amount</div>
                        </div>
                        <div className="grid grid-cols-3 bg-primary/[0.06] border-l-2 border-l-primary/70" aria-label={`${lot.lotNumber} received`}>
                          <div className={`px-2 py-2 text-right text-primary ${figure}`}><span className="sr-only">Received </span>{formatCount(lot.arrivedBags)}</div>
                          <div className="px-2 py-2 text-right"><QuantityFigure value={lot.arrivedKg} tone="text-primary" /></div>
                          <div className={`px-2 py-2 text-right ${figure} ${showCost ? 'text-on-surface' : 'text-on-surface-variant'}`}>{purchase}</div>
                        </div>
                        <div className="grid grid-cols-3 bg-tertiary/[0.07] border-l-2 border-l-tertiary/70 border-t border-outline/80" aria-label={`${lot.lotNumber} sold`}>
                          <div className={`px-2 py-2 text-right text-tertiary ${figure}`}><span className="sr-only">Sold </span>{formatCount(lot.soldBags)}</div>
                          <div className="px-2 py-2 text-right"><QuantityFigure value={lot.soldKg} tone="text-tertiary" /></div>
                          <div className={`px-2 py-2 text-right ${figure}`}>{formatMoney(lot.salesAmount)}</div>
                        </div>
                      </div>
                      <div className={`grid ${showProfit ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mt-3 text-xs`}>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Balance bags</div>
                          <div className={`${figure} mt-0.5`}>{formatCount(lot.balanceBags)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Balance qty</div>
                          <div className="mt-0.5"><QuantityFigure value={lot.balanceKg} tone="text-on-surface" /></div>
                        </div>
                        {showProfit && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Profit/Loss</div>
                            <div className={`${figure} mt-0.5 ${profit.tone}`}>{profit.value}</div>
                            {profit.note && <div className="text-[10px] text-on-surface-variant">{profit.note}</div>}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
                <TablePager page={page.page} pages={page.pages} total={page.total} onPage={page.setPage} />
              </div>
            </>
          )}
        </>
      )}
    </ReportFrame>
  );
}
