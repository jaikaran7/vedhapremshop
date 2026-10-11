'use client';

import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { usePurchasesQuery } from '@/hooks/queries/use-purchases-query';
import { useSalesQuery } from '@/hooks/queries/use-sales-query';
import { useStockQuery } from '@/hooks/queries/use-stock-query';
import { useRouteId } from '@/hooks/shared/use-route-id';
import { can } from '@/auth/permissions';
import { useSession } from '@/store/session/session-provider';
import { buildLotDifferential, lotStatusLabel, LOT_COST_METHOD } from '@/utils/lot-differential';
import type { LotDifferentialRow } from '@/utils/lot-differential';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatMoney, formatWeight } from '@/pages/Reports/format';

export function LotDifferentialDetail() {
  const id = useRouteId();
  const router = useRouter();
  const { currentUser } = useSession();
  const showCost = can(currentUser.role, 'viewPurchaseCost');
  const { data: lots = [] } = useLotsQuery();
  const { data: purchases = [] } = usePurchasesQuery();
  const { data: sales = [] } = useSalesQuery();
  const { data: stockMovements = [] } = useStockQuery();
  const report = buildLotDifferential({ lots, purchases, sales, stockMovements });
  const row = report.lots.find((lot) => lot.lotId === id);
  const lot = lots.find((item) => item.id === id);

  if (!row || !lot) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Lot Not Found</h3>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/reports?report=lotDifferential')}>
          Back to Reports
        </Button>
      </div>
    );
  }

  const purchase = purchases.find((item) => item.lotNumber.toUpperCase() === row.lotNumber.toUpperCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/reports?report=lotDifferential')}
          className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">{row.lotNumber}</h1>
            <Chip label={lotStatusLabel(row.status)} size="sm" variant={row.status === 'COMPLETED' ? 'success' : row.status === 'NOT_STARTED' ? 'neutral' : 'primary'} />
            <Chip label={row.closureStatus === 'CLOSED' ? 'Closed' : 'Open'} size="sm" variant="secondary" />
          </div>
          <p className="text-xs text-on-surface-variant font-medium mt-1">{row.vendorName} · Arrived {row.purchaseDate}</p>
        </div>
      </div>

      <Card variant="lowest" className="space-y-3">
        <h3 className="text-base font-bold font-display text-on-surface">Incoming</h3>
        <DetailGrid
          items={[
            ['Vendor', row.vendorName],
            ['Vendor Bill', row.vendorBill ?? 'Not available'],
            ['Purchase Date', row.purchaseDate ?? 'Not available'],
            ['Initial Bags', String(row.initialBags)],
            ['Incoming Weight', formatWeight(row.incomingWeightKg)],
            ['Purchase Rate', showCost ? (row.purchaseRate == null ? 'Not available' : `₹${row.purchaseRate}/KG goods`) : 'Hidden'],
            ['Purchase Amount', showCost ? formatMoney(row.purchaseAmount) : 'Hidden'],
            ['Allocated Expenses', showCost ? formatMoney(purchase?.totalExpenses ?? null) : 'Hidden'],
          ]}
        />
      </Card>

      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="p-6 pb-4 bg-surface-container-low/40">
          <h3 className="text-base font-bold font-display text-on-surface">Outgoing</h3>
          <p className="text-xs text-on-surface-variant font-medium">Each line is the stock this invoice took from {row.lotNumber}. Invoice totals that include other lots are not used.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
              <tr>
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Quality</th>
                <th className="py-3 px-4 text-center">Bags</th>
                <th className="py-3 px-4 text-right">Weight</th>
                <th className="py-3 px-4 text-right">Rate</th>
                <th className="py-3 px-4 text-right">Product</th>
                <th className="py-3 px-4 text-right">Amali</th>
                <th className="py-3 px-4 text-right">Market Fee</th>
                <th className="py-3 px-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {row.outgoingLines.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 px-4 text-center text-on-surface-variant">No sales are linked to this lot.</td>
                </tr>
              )}
              {row.outgoingLines.map((line) => (
                <tr key={`${line.saleId}-${line.markCode}-${line.billNumber}`}>
                  <td className="py-3 px-4 font-bold text-primary">{line.billNumber}</td>
                  <td className="py-3 px-4">{line.customerName}</td>
                  <td className="py-3 px-4">{line.date}</td>
                  <td className="py-3 px-4 font-semibold">{line.markCode}</td>
                  <td className="py-3 px-4 text-center">{line.bags}</td>
                  <td className="py-3 px-4 text-right">{formatWeight(line.weightKg)}</td>
                  <td className="py-3 px-4 text-right">₹{line.ratePerKg.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">{formatMoney(line.productAmount)}</td>
                  <td className="py-3 px-4 text-right">{formatMoney(line.amali)}</td>
                  <td className="py-3 px-4 text-right">{formatMoney(line.marketFee)}</td>
                  <td className="py-3 px-4 text-right font-bold">{formatMoney(line.lineInvoiceAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="lowest" className="space-y-3">
          <h3 className="text-base font-bold font-display text-on-surface">Remaining Inventory</h3>
          <DetailGrid
            items={[
              ['Initial Stock', `${row.initialBags} bags · ${formatWeight(row.incomingWeightKg)}`],
              ['Total Incoming', formatWeight(row.incomingWeightKg)],
              ['Total Outgoing', `${row.outgoingBags} bags · ${formatWeight(row.outgoingWeightKg)}`],
              ['Adjustments', `${row.adjustmentBags} bags · ${formatWeight(row.adjustmentWeightKg)}`],
              ['Remaining Bags', String(row.remainingBags)],
              ['Remaining KG', formatWeight(row.remainingWeightKg)],
            ]}
          />
          <p className="text-[11px] text-on-surface-variant">
            Customers on this lot: {[...new Set(row.outgoingLines.map((line) => line.customerName))].join(', ') || 'None'}.
          </p>
        </Card>

        <Card variant="lowest" className="space-y-3">
          <h3 className="text-base font-bold font-display text-on-surface">Financial Differential</h3>
          {showCost ? (
            <DetailGrid
              items={[
                ['Purchase Cost', formatMoney(row.purchaseCost)],
                ['Sales Realization', formatMoney(row.salesRealization)],
                ['Cost of Goods Sold', formatMoney(row.cogs)],
                ['Remaining Inventory Cost', formatMoney(row.remainingInventoryCost)],
                ['Allocated Expenses', formatMoney(row.otherAllocatedExpenses)],
                ['Amali + Market Fee', formatMoney(row.amali + row.marketFee)],
                ['Realized Profit or Loss', formatMoney(row.realizedProfit)],
                ['Estimated Full Result', row.status === 'COMPLETED' ? formatMoney(row.estimatedProfit) : 'Not available'],
              ]}
            />
          ) : (
            <p className="text-xs text-on-surface-variant">Purchase cost and profit are hidden for this role.</p>
          )}
          <p className="text-[11px] text-on-surface-variant leading-relaxed">{showCost ? row.costNote : LOT_COST_METHOD}</p>
        </Card>
      </div>
    </div>
  );
}

function DetailGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-surface-container-low px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</div>
          <div className="text-sm font-bold font-display text-on-surface mt-1">{value}</div>
        </div>
      ))}
    </div>
  );
}

export function lotProfitLabel(row: LotDifferentialRow) {
  if (row.status === 'COMPLETED') return 'Realized';
  if (row.realizedProfit == null) return 'Not available';
  return 'Realized on sold stock';
}
