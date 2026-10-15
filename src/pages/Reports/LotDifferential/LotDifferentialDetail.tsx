'use client';

import { can } from '@/auth/permissions';
import { useRouteId } from '@/hooks/shared/use-route-id';
import { useSession } from '@/store/session/session-provider';
import { buildDifferentialReport, differenceStatusLabel, rateKey, type CostBreakdown, type DifferenceStatus, type MarkBreakdown } from '@/utils/report-differential';
import { STOCK_WEIGHT_EPSILON_KG } from '@/utils/lot-differential';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { formatCount, formatMoney, formatSignedNumber, formatWeight, moneyTone } from '@/pages/Reports/format';
import { useReportQuery } from '@/pages/Reports/report-query';
import { useReportData } from '@/pages/Reports/use-report-data';
import { EmptyNote, SortableHead, compareValues } from '@/pages/Reports/ReportChrome';

function statusVariant(status: DifferenceStatus): 'success' | 'danger' | 'tertiary' | 'neutral' {
  if (status === 'POSITIVE') return 'success';
  if (status === 'NEGATIVE') return 'danger';
  if (status === 'NEEDS_REVIEW') return 'tertiary';
  return 'neutral';
}

export function LotDifferentialDetail() {
  const id = useRouteId();
  const router = useRouter();
  const { currentUser } = useSession();
  const showCost = can(currentUser.role, 'viewPurchaseCost');
  const showProfit = can(currentUser.role, 'viewProfit');
  const data = useReportData();
  const { filters, setFilters, listQuery } = useReportQuery();
  const [view, setView] = useState<'marks' | 'costs'>('marks');
  const [sortKey, setSortKey] = useState<'kg' | 'bags' | 'profit'>('kg');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');

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
  const lot = report.lots.find((item) => item.lotId === id);
  const back = `/reports/differential${listQuery() ? `?${listQuery()}` : ''}`;

  if (!lot) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Lot not found</h3>
        <Button variant="primary" className="mt-4" onClick={() => router.push(back)}>Back to Differential Report</Button>
      </div>
    );
  }

  const selectedCost = lot.costs.find((group) => rateKey(group.rate) === filters.cost);
  const activeMarks = filters.mark
    ? [filters.mark]
    : selectedCost?.marks;
  const matchesMark = (mark: string | null) => {
    if (!activeMarks || !mark) return !activeMarks || !mark;
    return activeMarks.some((code) => code.toUpperCase() === mark.toUpperCase());
  };
  const alerts = lot.alerts.filter((alert) => !activeMarks || matchesMark(alert.markCode));
  const sales = lot.base.outgoingLines.filter((line) => !activeMarks || matchesMark(line.markCode));
  const activity = lot.activity.filter((entry) => !entry.markCode || !activeMarks || matchesMark(entry.markCode));

  function toggleSort(key: 'kg' | 'bags' | 'profit') {
    if (key === sortKey) setDirection(direction === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setDirection(key === 'profit' ? 'desc' : 'asc');
    }
  }

  const sortedMarks = [...lot.marks].sort((left, right) => compareValues(markValue(left, sortKey), markValue(right, sortKey), direction));
  const sortedCosts = [...lot.costs].sort((left, right) => compareValues(costValue(left, sortKey), costValue(right, sortKey), direction));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push(back)}
            className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface"
            aria-label="Back to differential report"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">{lot.lotNumber}</h1>
              <Chip label={lot.productName} size="sm" variant="primary" />
              <Chip label={differenceStatusLabel(lot.status)} size="sm" variant={statusVariant(lot.status)} />
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              {lot.vendorName} · {lot.date}
              {filters.product || filters.from || filters.to ? ' · Product and date filters are kept for the report you came from.' : ''}
            </p>
          </div>
        </div>
      </div>

      <Card variant="lowest" className="space-y-3">
        <h2 className="text-base font-bold font-display text-on-surface">Lot summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
          <Fact label="Received" value={`${formatCount(lot.arrivedBags)} bags · ${formatWeight(lot.arrivedKg)}`} />
          <Fact label="Sold" value={`${formatCount(lot.soldBags)} bags · ${formatWeight(lot.soldKg)}`} />
          <Fact label="Balance" value={`${formatCount(lot.balanceBags)} bags · ${formatWeight(lot.balanceKg)}`} />
          <Fact label="Recorded remaining" value={`${formatCount(lot.base.remainingBags)} bags · ${formatWeight(lot.base.remainingWeightKg)}`} />
          <Fact label="Bag difference" value={formatSignedNumber(lot.bagDifference, ' bags')} tone={moneyTone(lot.bagDifference)} />
          <Fact label="KG difference" value={formatSignedNumber(lot.weightDifferenceKg, ' KG')} tone={moneyTone(lot.weightDifferenceKg)} />
          {showCost && <Fact label="Purchase amount" value={formatMoney(lot.purchaseAmount)} />}
          {showCost && <Fact label="Purchase expenses" value={formatMoney(lot.purchaseExpenses)} />}
          {showCost && <Fact label="Receiving expenses" value={lot.receivingExpenses == null ? 'Not available' : formatMoney(lot.receivingExpenses)} />}
          <Fact label="Sales amount" value={formatMoney(lot.salesAmount)} />
          {showProfit && (
            <Fact
              label="Realized profit/loss"
              value={lot.profit == null ? (lot.soldKg <= STOCK_WEIGHT_EPSILON_KG ? 'No sales yet' : 'Not available') : formatMoney(lot.profit)}
              tone={moneyTone(lot.profit)}
            />
          )}
          {showCost && <Fact label="Unsold stock at cost" value={formatMoney(lot.remainingInventoryCost)} />}
        </div>
        <p className="text-[11px] text-on-surface-variant leading-relaxed">
          Balance is receipts plus approved incoming adjustments, minus sales and approved outgoing adjustments. Difference is the recorded remaining stock minus that balance. Realized profit uses landed cost on the weight already sold. Unsold stock stays in inventory and is not a loss.
          {showCost ? ` ${lot.base.costNote}` : ' Purchase cost and profit are hidden for this role.'}
          {lot.receivingExpenses != null && showCost ? ' Receiving expenses are shown once and are not subtracted again from profit.' : ''}
        </p>
      </Card>

      {alerts.length > 0 && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="px-4 py-3 bg-tertiary-container/40">
            <h2 className="text-sm font-bold font-display text-on-surface">Needs review</h2>
            <p className="text-[11px] text-on-surface-variant">These are alerts to check. Nothing is changed or rejected from this list.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[56rem]">
              <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                <tr>
                  {['Bill', 'Date', 'Customer', 'Mark', 'Bags', 'Actual KG', 'KG / bag', 'Rate', 'Amount', 'Reason'].map((label) => (
                    <th key={label} className="py-3 px-3">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td className="py-3 px-3 font-bold text-primary">
                      {alert.href && alert.saleId ? <Link href={alert.href}>{alert.billNumber}</Link> : alert.href ? <Link href={alert.href}>Open lot</Link> : alert.billNumber}
                    </td>
                    <td className="py-3 px-3">{alert.date}</td>
                    <td className="py-3 px-3">{alert.customerName}</td>
                    <td className="py-3 px-3 font-semibold">{alert.markCode}</td>
                    <td className="py-3 px-3">{alert.bags == null ? '—' : formatCount(alert.bags)}</td>
                    <td className="py-3 px-3">{alert.weightKg == null ? '—' : formatWeight(alert.weightKg)}</td>
                    <td className="py-3 px-3">{alert.averageKgPerBag == null ? '—' : `${alert.averageKgPerBag.toLocaleString('en-IN', { maximumFractionDigits: 2 })} KG`}</td>
                    <td className="py-3 px-3">{alert.ratePerKg == null ? '—' : `₹${alert.ratePerKg.toLocaleString('en-IN')}`}</td>
                    <td className="py-3 px-3">{alert.amount == null ? '—' : formatMoney(alert.amount)}</td>
                    <td className="py-3 px-3 text-tertiary font-medium">{alert.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-[11px] text-on-surface-variant">{lot && report.unconfiguredRules.join(' ')}</p>

      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="px-4 py-3 bg-surface-container-low/40 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold font-display text-on-surface">Sales</h2>
            <p className="text-[11px] text-on-surface-variant">
              {activeMarks ? `Filtered to ${activeMarks.join(', ')}.` : 'All marks on this lot.'}
            </p>
          </div>
          {activeMarks && (
            <Button size="sm" variant="secondary" onClick={() => setFilters({ mark: '', cost: '' })}>Clear mark filter</Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[48rem]">
            <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
              <tr>
                {['Bill', 'Date', 'Customer', 'Mark', 'Bags', 'Actual KG', 'Rate', 'Amount'].map((label) => (
                  <th key={label} className="py-3 px-3">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {sales.length === 0 && (
                <tr><td colSpan={8} className="py-8 px-3 text-center text-on-surface-variant">No sales are linked to this selection.</td></tr>
              )}
              {sales.map((line) => (
                <tr key={`${line.saleId}-${line.markCode}-${line.weightKg}`}>
                  <td className="py-3 px-3 font-bold text-primary"><Link href={`/sales/${line.saleId}`}>{line.billNumber}</Link></td>
                  <td className="py-3 px-3">{line.date}</td>
                  <td className="py-3 px-3">{line.customerName}</td>
                  <td className="py-3 px-3 font-semibold">{line.markCode}</td>
                  <td className="py-3 px-3 text-right">{formatCount(line.bags)}</td>
                  <td className="py-3 px-3 text-right">{formatWeight(line.weightKg)}</td>
                  <td className="py-3 px-3 text-right">₹{line.ratePerKg.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-3 text-right font-bold">{formatMoney(line.productAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center gap-2 no-print">
        <Button size="sm" variant={view === 'marks' ? 'primary' : 'secondary'} onClick={() => setView('marks')}>Mark-wise</Button>
        {showCost ? (
          <Button size="sm" variant={view === 'costs' ? 'primary' : 'secondary'} onClick={() => setView('costs')}>Cost-wise</Button>
        ) : (
          <span className="text-xs text-on-surface-variant">Cost-wise rates are hidden for this role.</span>
        )}
      </div>

      {view === 'marks' && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="px-4 py-3">
            <h2 className="text-sm font-bold font-display">Mark-wise</h2>
            <p className="text-[11px] text-on-surface-variant">Marks come from this consignment. Select a mark to filter the sales and activity above and below.</p>
          </div>
          <BreakdownTable
            rows={sortedMarks.map((mark) => ({
              id: mark.markCode,
              title: mark.markCode,
              subtitle: !showCost
                ? 'Purchase rate hidden'
                : mark.purchaseRates.length > 1
                  ? 'Several purchase rates'
                  : mark.purchaseRate == null
                    ? 'Rate not available'
                    : `₹${mark.purchaseRate}/KG`,
              selected: filters.mark.toUpperCase() === mark.markCode.toUpperCase(),
              bags: mark.purchaseBags,
              kg: mark.purchaseKg,
              soldBags: mark.soldBags,
              soldKg: mark.soldKg,
              sales: mark.salesAmount,
              balanceBags: mark.balanceBags,
              balanceKg: mark.balanceKg,
              bagDifference: mark.bagDifference,
              weightDifferenceKg: mark.weightDifferenceKg,
              profit: mark.profit,
              amount: showCost ? mark.purchaseAmount : null,
            }))}
            showCost={showCost}
            showProfit={showProfit}
            sortKey={sortKey}
            direction={direction}
            onSort={toggleSort}
            onSelect={(id) => setFilters({ mark: filters.mark.toUpperCase() === id.toUpperCase() ? '' : id, cost: '' })}
          />
        </Card>
      )}

      {view === 'costs' && showCost && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="px-4 py-3">
            <h2 className="text-sm font-bold font-display">Cost-wise</h2>
            <p className="text-[11px] text-on-surface-variant">Groups share one exact purchase rate. Marks at ₹48.00 stay together. A different rate stays in its own group.</p>
          </div>
          <BreakdownTable
            rows={sortedCosts.map((group) => ({
              id: rateKey(group.rate),
              title: `₹${group.rate.toLocaleString('en-IN')}/KG`,
              subtitle: group.marks.join(', '),
              selected: filters.cost === rateKey(group.rate),
              bags: group.purchaseBags,
              kg: group.purchaseKg,
              soldBags: group.soldBags,
              soldKg: group.soldKg,
              sales: group.salesAmount,
              balanceBags: group.balanceBags,
              balanceKg: group.balanceKg,
              bagDifference: group.bagDifference,
              weightDifferenceKg: group.weightDifferenceKg,
              profit: group.profit,
              amount: group.purchaseAmount,
              note: group.salesUnallocated ? 'Sales are not tagged with a cost, so sold quantity is not split across these rates.' : undefined,
            }))}
            showCost
            showProfit={showProfit}
            sortKey={sortKey}
            direction={direction}
            onSort={toggleSort}
            onSelect={(id) => setFilters({ cost: filters.cost === id ? '' : id, mark: '' })}
          />
          {selectedCost && (
            <div className="px-4 py-3 border-t border-surface-container-low text-xs">
              <span className="font-bold">Marks at this cost: </span>{selectedCost.marks.join(', ')}
              {selectedCost.salesUnallocated && <p className="text-on-surface-variant mt-1">Sold bags, differences, and profit stay blank for this group because one mark was purchased at more than one exact rate.</p>}
            </div>
          )}
        </Card>
      )}

      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="px-4 py-3 bg-surface-container-low/40">
          <h2 className="text-sm font-bold font-display">Lot activity</h2>
          <p className="text-[11px] text-on-surface-variant">Purchase, receiving, sales, opening stock, and approved adjustments. Returns are not recorded as their own stock movement.</p>
        </div>
        <div className="divide-y divide-surface-container-low">
          {activity.length === 0 && <p className="px-4 py-8 text-center text-xs text-on-surface-variant">No activity matches this mark or cost.</p>}
          {activity.map((entry) => (
            <div key={entry.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <div className="font-bold text-on-surface">
                  {entry.href ? <Link href={entry.href} className="text-primary">{entry.title}</Link> : entry.title}
                  <span className="ml-2 font-medium text-on-surface-variant">{entry.kind}</span>
                </div>
                <div className="text-on-surface-variant mt-0.5">{entry.detail}</div>
              </div>
              <div className="text-on-surface-variant whitespace-nowrap">{entry.date}{entry.markCode ? ` · ${entry.markCode}` : ''}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function markValue(mark: MarkBreakdown, key: 'kg' | 'bags' | 'profit') {
  if (key === 'kg') return mark.weightDifferenceKg;
  if (key === 'bags') return mark.bagDifference;
  return mark.profit;
}

function costValue(group: CostBreakdown, key: 'kg' | 'bags' | 'profit') {
  if (key === 'kg') return group.weightDifferenceKg;
  if (key === 'bags') return group.bagDifference;
  return group.profit;
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-surface-container-low px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</div>
      <div className={`text-sm font-bold font-display mt-1 ${tone ?? 'text-on-surface'}`}>{value}</div>
    </div>
  );
}

function BreakdownTable({
  rows,
  showCost,
  showProfit,
  sortKey,
  direction,
  onSort,
  onSelect,
}: {
  rows: Array<{
    id: string;
    title: string;
    subtitle: string;
    selected: boolean;
    bags: number;
    kg: number;
    soldBags: number | null;
    soldKg: number | null;
    sales: number | null;
    balanceBags: number | null;
    balanceKg: number | null;
    bagDifference: number | null;
    weightDifferenceKg: number | null;
    profit: number | null;
    amount: number | null;
    note?: string;
  }>;
  showCost: boolean;
  showProfit: boolean;
  sortKey: 'kg' | 'bags' | 'profit';
  direction: 'asc' | 'desc';
  onSort: (key: 'kg' | 'bags' | 'profit') => void;
  onSelect: (id: string) => void;
}) {
  if (rows.length === 0) return <EmptyNote title="Nothing to group" message="This lot has no mark or purchase-rate rows." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs min-w-[68rem]">
        <thead className="bg-surface-container-low text-on-surface-variant">
          <tr>
            <th className="py-3 px-3 text-[10px] font-bold uppercase">Group</th>
            <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Purchase bags</th>
            <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Purchase KG</th>
            {showCost && <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Purchase amount</th>}
            <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Sold bags</th>
            <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Sold KG</th>
            <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Sales</th>
            <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Balance bags</th>
            <th className="py-3 px-3 text-[10px] font-bold uppercase text-right">Balance KG</th>
            <SortableHead label="Bag difference" active={sortKey === 'bags'} direction={direction} onClick={() => onSort('bags')} align="right" />
            <SortableHead label="KG difference" active={sortKey === 'kg'} direction={direction} onClick={() => onSort('kg')} align="right" />
            {showProfit && <SortableHead label="Profit/Loss" active={sortKey === 'profit'} direction={direction} onClick={() => onSort('profit')} align="right" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container-low">
          {rows.map((row) => (
            <tr
              key={row.id}
              className={`cursor-pointer hover:bg-primary/5 ${row.selected ? 'bg-primary/10' : ''}`}
              onClick={() => onSelect(row.id)}
            >
              <td className="py-3 px-3">
                <div className="font-bold text-primary">{row.title}</div>
                <div className="text-[10px] text-on-surface-variant">{row.subtitle}</div>
                {row.note && <div className="text-[10px] text-tertiary mt-1 max-w-xs">{row.note}</div>}
              </td>
              <td className="py-3 px-3 text-right">{formatCount(row.bags)}</td>
              <td className="py-3 px-3 text-right">{formatWeight(row.kg)}</td>
              {showCost && <td className="py-3 px-3 text-right">{formatMoney(row.amount)}</td>}
              <td className="py-3 px-3 text-right">{row.soldBags == null ? 'Not available' : formatCount(row.soldBags)}</td>
              <td className="py-3 px-3 text-right">{row.soldKg == null ? 'Not available' : formatWeight(row.soldKg)}</td>
              <td className="py-3 px-3 text-right">{row.sales == null ? 'Not available' : formatMoney(row.sales)}</td>
              <td className="py-3 px-3 text-right">{row.balanceBags == null ? 'Not available' : formatCount(row.balanceBags)}</td>
              <td className="py-3 px-3 text-right">{row.balanceKg == null ? 'Not available' : formatWeight(row.balanceKg)}</td>
              <td className={`py-3 px-3 text-right font-semibold ${moneyTone(row.bagDifference)}`}>{formatSignedNumber(row.bagDifference)}</td>
              <td className={`py-3 px-3 text-right font-semibold ${moneyTone(row.weightDifferenceKg)}`}>{formatSignedNumber(row.weightDifferenceKg, ' KG')}</td>
              {showProfit && <td className={`py-3 px-3 text-right font-bold ${moneyTone(row.profit)}`}>{row.profit == null ? 'Not available' : formatMoney(row.profit)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
