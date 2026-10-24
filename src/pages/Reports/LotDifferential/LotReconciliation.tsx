'use client';

import { formatCount, formatSignedNumber, formatWeight } from '@/pages/Reports/format';
import { STOCK_WEIGHT_EPSILON_KG } from '@/utils/lot-differential';
import type { DifferentialLot } from '@/utils/report-differential';

/**
 * Difference = recorded remaining − calculated balance.
 * Calculated balance = receipts + approved inbound adjustments − sales − approved outbound adjustments.
 * Positive: recorded book is higher than the movement formula. Negative: recorded book is lower.
 * Review the gap; do not treat it as a loss or as missing stock.
 */
export function hasQuantityGap(bags: number | null | undefined, kg: number | null | undefined) {
  return (bags != null && bags !== 0) || (kg != null && Math.abs(kg) > STOCK_WEIGHT_EPSILON_KG);
}

export function stockReconciliationState(lot: DifferentialLot): 'aligned' | 'needs_review' | 'unable_to_verify' {
  const recordedOk = Number.isFinite(lot.base.remainingBags) && Number.isFinite(lot.base.remainingWeightKg);
  const calculatedOk = Number.isFinite(lot.balanceBags) && Number.isFinite(lot.balanceKg);
  const differenceOk = lot.bagDifference != null && lot.weightDifferenceKg != null;
  const hasSource = lot.arrivedBags > 0
    || lot.activity.some((entry) => entry.kind === 'Purchase' || entry.kind === 'Receiving' || entry.kind === 'Opening stock');
  if (!recordedOk || !calculatedOk || !differenceOk || !hasSource) return 'unable_to_verify';
  if (hasQuantityGap(lot.bagDifference, lot.weightDifferenceKg)) return 'needs_review';
  return 'aligned';
}

export function LotReconciliation({ lot }: { lot: DifferentialLot }) {
  const state = stockReconciliationState(lot);
  const movements = lot.activity.filter((entry) => (
    entry.kind === 'Purchase'
    || entry.kind === 'Receiving'
    || entry.kind === 'Sale'
    || entry.kind === 'Adjustment'
    || entry.kind === 'Opening stock'
  ));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold font-display text-on-surface">Stock reconciliation</h2>
        <p className="text-xs font-medium text-on-surface-variant mt-1">
          Difference is recorded remaining minus calculated balance. A gap needs review; it is not a loss.
        </p>
      </div>

      {state === 'unable_to_verify' ? (
        <div className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface">
          Unable to verify.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-surface-container-lowest ambient-shadow">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant">
              <tr>
                <th className="px-3 py-3 text-xs font-medium uppercase"> </th>
                <th className="px-3 py-3 text-xs font-medium uppercase text-right">Bags</th>
                <th className="px-3 py-3 text-xs font-medium uppercase text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-3 text-sm font-medium border-t border-outline-variant">Calculated balance</td>
                <td className="px-3 py-3 text-right text-sm font-medium tabular-nums border-t border-outline-variant">{formatCount(lot.balanceBags)}</td>
                <td className="px-3 py-3 text-right text-sm font-medium tabular-nums border-t border-outline-variant">{formatWeight(lot.balanceKg)}</td>
              </tr>
              <tr>
                <td className="px-3 py-3 text-sm font-medium border-t border-outline-variant">Recorded remaining</td>
                <td className="px-3 py-3 text-right text-sm font-medium tabular-nums border-t border-outline-variant">{formatCount(lot.base.remainingBags)}</td>
                <td className="px-3 py-3 text-right text-sm font-medium tabular-nums border-t border-outline-variant">{formatWeight(lot.base.remainingWeightKg)}</td>
              </tr>
              <tr className="bg-danger-container/50 text-danger">
                <td className="px-3 py-3 text-sm font-semibold">Difference</td>
                <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums">{formatSignedNumber(lot.bagDifference)}</td>
                <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums">{formatSignedNumber(lot.weightDifferenceKg, ' KG')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold font-display text-on-surface mb-2">Stock movements</h3>
        <div className="rounded-2xl bg-surface-container-lowest ambient-shadow divide-y divide-outline-variant">
          {movements.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-on-surface-variant">No stock movements are recorded for this lot.</p>
          )}
          {movements.map((entry) => (
            <div key={entry.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-sm font-medium text-on-surface">
                  {entry.title}
                  <span className="ml-2 text-xs text-on-surface-variant">{entry.kind}</span>
                </div>
                <div className="text-xs text-on-surface-variant mt-0.5">{entry.detail}</div>
              </div>
              <div className="text-xs font-medium text-on-surface-variant whitespace-nowrap">
                {entry.date}{entry.markCode ? ` · ${entry.markCode}` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
