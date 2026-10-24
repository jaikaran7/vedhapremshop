'use client';

import { formatCount, formatMoney, formatSignedNumber, formatWeight, moneyTone } from '@/pages/Reports/format';
import { EmptyNote, SortableHead } from '@/pages/Reports/ReportChrome';
import { STOCK_WEIGHT_EPSILON_KG } from '@/utils/lot-differential';

function hasQuantityGap(bags: number | null | undefined, kg: number | null | undefined) {
  return (bags != null && bags !== 0) || (kg != null && Math.abs(kg) > STOCK_WEIGHT_EPSILON_KG);
}

function gapTone(bags: number | null | undefined, kg: number | null | undefined) {
  return hasQuantityGap(bags, kg) ? 'text-danger' : 'text-on-surface';
}

/**
 * Preserved mark-wise / cost-wise table for a later Lot Reports entry.
 * Not shown on the lot hub while those reports are marked Coming Soon.
 */
export function LotBreakdownTable({
  rows,
  showProfit,
  sortKey,
  direction,
  onSort,
  onSelect,
}: {
  rows: Array<{
    id: string;
    title: string;
    subtitle?: string;
    selected: boolean;
    bags: number;
    kg: number;
    soldBags: number | null;
    soldKg: number | null;
    balanceBags: number | null;
    balanceKg: number | null;
    bagDifference: number | null;
    weightDifferenceKg: number | null;
    profit: number | null;
    note?: string;
  }>;
  showProfit: boolean;
  sortKey: 'kg' | 'bags' | 'profit';
  direction: 'asc' | 'desc';
  onSort: (key: 'kg' | 'bags' | 'profit') => void;
  onSelect: (id: string) => void;
}) {
  if (rows.length === 0) return <EmptyNote title="Nothing to group" message="This lot has no mark or purchase-rate rows." />;
  return (
    <div className="overflow-x-auto w-full rounded-2xl bg-surface-container-lowest ambient-shadow">
      <table className="w-full min-w-[44rem] table-fixed text-left border-collapse">
        <thead className="bg-surface-container-low text-on-surface-variant">
          <tr>
            <th className="px-3 py-3 text-xs font-medium uppercase">Group</th>
            <th className="px-3 py-3 text-xs font-medium uppercase text-right">Received</th>
            <th className="px-3 py-3 text-xs font-medium uppercase text-right">Sold</th>
            <th className="px-3 py-3 text-xs font-medium uppercase text-right">Balance</th>
            <SortableHead className="!px-3 !py-3" label="Bags Δ" active={sortKey === 'bags'} direction={direction} onClick={() => onSort('bags')} align="right" />
            <SortableHead className="!px-3 !py-3" label="KG Δ" active={sortKey === 'kg'} direction={direction} onClick={() => onSort('kg')} align="right" />
            {showProfit && <SortableHead className="!px-3 !py-3" label="Profit/Loss" active={sortKey === 'profit'} direction={direction} onClick={() => onSort('profit')} align="right" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const gap = hasQuantityGap(row.bagDifference, row.weightDifferenceKg);
            return (
              <tr
                key={row.id}
                className={`cursor-pointer hover:bg-primary/5 ${row.selected ? 'bg-primary/10' : ''}`}
                onClick={() => onSelect(row.id)}
              >
                <td className="px-3 py-3 border-t border-outline-variant">
                  <div className={`text-sm font-medium ${gap ? 'text-danger' : 'text-on-surface'}`}>{row.title}</div>
                  {row.subtitle && <div className="text-xs text-on-surface-variant">{row.subtitle}</div>}
                  {row.note && <div className="text-xs text-tertiary mt-0.5">{row.note}</div>}
                </td>
                <td className="px-3 py-3 text-right text-sm font-medium tabular-nums border-t border-outline-variant">
                  {formatCount(row.bags)} <span className="text-on-surface-variant">{formatWeight(row.kg)}</span>
                </td>
                <td className="px-3 py-3 text-right text-sm font-medium tabular-nums border-t border-outline-variant">
                  {row.soldBags == null || row.soldKg == null
                    ? 'Not available'
                    : <>{formatCount(row.soldBags)} <span className="text-on-surface-variant">{formatWeight(row.soldKg)}</span></>}
                </td>
                <td className="px-3 py-3 text-right text-sm font-medium tabular-nums border-t border-outline-variant">
                  {row.balanceBags == null || row.balanceKg == null
                    ? 'Not available'
                    : <>{formatCount(row.balanceBags)} <span className="text-on-surface-variant">{formatWeight(row.balanceKg)}</span></>}
                </td>
                <td className={`px-3 py-3 text-right text-sm font-medium tabular-nums border-t border-outline-variant ${gapTone(row.bagDifference, 0)}`}>
                  {formatSignedNumber(row.bagDifference)}
                </td>
                <td className={`px-3 py-3 text-right text-sm font-medium tabular-nums border-t border-outline-variant ${gapTone(0, row.weightDifferenceKg)}`}>
                  {formatSignedNumber(row.weightDifferenceKg, ' KG')}
                </td>
                {showProfit && (
                  <td className={`px-3 py-3 text-right text-sm font-semibold tabular-nums border-t border-outline-variant ${moneyTone(row.profit)}`}>
                    {row.profit == null ? 'Not available' : formatMoney(row.profit)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
