'use client';

import { can } from '@/auth/permissions';
import { Button } from '@/components/ui/Button';
import { useRouteId } from '@/hooks/shared/use-route-id';
import { LotReconciliation, stockReconciliationState } from '@/pages/Reports/LotDifferential/LotReconciliation';
import { LotSalesByDate } from '@/pages/Reports/LotDifferential/LotSalesByDate';
import { formatCount, formatMoney, formatWeight, moneyTone } from '@/pages/Reports/format';
import { useReportQuery } from '@/pages/Reports/report-query';
import { useReportData } from '@/pages/Reports/use-report-data';
import { useSession } from '@/store/session/session-provider';
import { STOCK_WEIGHT_EPSILON_KG } from '@/utils/lot-differential';
import { buildDifferentialReport, type DifferentialLot, type LotActivityEntry } from '@/utils/report-differential';
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  History,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type LotDetailView = 'hub' | 'sales' | 'activity' | 'reconciliation';

// Mark-wise and cost-wise tables stay in LotBreakdownTables.tsx for a later Lot Reports entry.

function profitLabel(soldKg: number, profit: number | null) {
  if (profit != null) return formatMoney(profit);
  if (soldKg <= STOCK_WEIGHT_EPSILON_KG) return 'No sales yet';
  return 'Not available';
}

export function LotDifferentialDetail() {
  const id = useRouteId();
  const router = useRouter();
  const { currentUser } = useSession();
  const showCost = can(currentUser.role, 'viewPurchaseCost');
  const showProfit = can(currentUser.role, 'viewProfit');
  const data = useReportData();
  const { filters, listQuery } = useReportQuery();
  const [view, setView] = useState<LotDetailView>('hub');
  const [financeOpen, setFinanceOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

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

  const alerts = lot.alerts;
  const recon = stockReconciliationState(lot);
  const lotTone = recon === 'needs_review' ? 'text-danger' : 'text-primary';

  function goBack() {
    if (view === 'hub') router.push(back);
    else setView('hub');
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={goBack}
          className="mt-0.5 p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface"
          aria-label={view === 'hub' ? 'Back to differential report' : 'Back to lot'}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className={`text-2xl font-bold font-display tracking-tight ${lotTone}`}>{lot.lotNumber}</h1>
            <span className="text-sm font-medium text-on-surface">{lot.productName}</span>
            {alerts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setView('hub');
                  setReviewOpen((open) => !open);
                }}
                className="text-xs font-semibold text-tertiary"
                aria-expanded={reviewOpen}
              >
                Review{alerts.length > 1 ? ` · ${alerts.length}` : ''}
              </button>
            )}
          </div>
          <p className="text-xs font-medium text-on-surface-variant mt-1">
            {lot.vendorName} · {lot.date}
          </p>
        </div>
      </div>

      {view === 'hub' && (
        <LotHub
          lot={lot}
          alerts={alerts}
          reviewOpen={reviewOpen}
          recon={recon}
          showCost={showCost}
          showProfit={showProfit}
          financeOpen={financeOpen}
          onFinance={() => setFinanceOpen((open) => !open)}
          onOpen={setView}
        />
      )}
      {view === 'sales' && (
        <LotSalesByDate
          lines={lot.base.outgoingLines}
          sales={data.sales}
          initialFrom={filters.from}
          initialTo={filters.to}
        />
      )}
      {view === 'activity' && <LotActivity entries={lot.activity} />}
      {view === 'reconciliation' && <LotReconciliation lot={lot} />}
    </div>
  );
}

function LotHub({
  lot,
  alerts,
  reviewOpen,
  recon,
  showCost,
  showProfit,
  financeOpen,
  onFinance,
  onOpen,
}: {
  lot: DifferentialLot;
  alerts: DifferentialLot['alerts'];
  reviewOpen: boolean;
  recon: ReturnType<typeof stockReconciliationState>;
  showCost: boolean;
  showProfit: boolean;
  financeOpen: boolean;
  onFinance: () => void;
  onOpen: (view: LotDetailView) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
        <Metric label="Bags received" value={formatCount(lot.arrivedBags)} hint={formatWeight(lot.arrivedKg)} />
        <Metric label="Bags sold" value={formatCount(lot.soldBags)} hint={formatWeight(lot.soldKg)} />
        <Metric
          label="Balance bags"
          value={formatCount(lot.balanceBags)}
          hint={formatWeight(lot.balanceKg)}
          tone={recon === 'needs_review' ? 'text-danger' : undefined}
        />
        <Metric label="Sales amount" value={formatMoney(lot.salesAmount)} />
      </div>

      {(showCost || showProfit) && (
        <div className="rounded-2xl bg-surface-container-lowest ambient-shadow">
          <button
            type="button"
            onClick={onFinance}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
            aria-expanded={financeOpen}
          >
            <span className="text-sm font-semibold font-display text-on-surface">Financial details</span>
            <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${financeOpen ? '' : '-rotate-90'}`} />
          </button>
          {financeOpen && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 px-4 pb-4">
              {showCost && <Fact label="Purchase amount" value={formatMoney(lot.purchaseAmount)} />}
              {showCost && <Fact label="Purchase expenses" value={formatMoney(lot.purchaseExpenses)} />}
              {showCost && (
                <Fact
                  label="Receiving expenses"
                  value={lot.receivingExpenses == null ? 'Not available' : formatMoney(lot.receivingExpenses)}
                />
              )}
              {showCost && <Fact label="Unsold stock at cost" value={formatMoney(lot.remainingInventoryCost)} />}
              {showProfit && (
                <Fact
                  label="Realized profit/loss"
                  value={profitLabel(lot.soldKg, lot.profit)}
                  tone={moneyTone(lot.profit)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {recon !== 'aligned' && (
        <button
          type="button"
          onClick={() => onOpen('reconciliation')}
          className="w-full text-left rounded-2xl bg-danger-container/60 px-4 py-3 flex items-center justify-between gap-3"
        >
          <span className="text-sm font-medium text-danger">Stock reconciliation needs review</span>
          <ChevronRight className="w-4 h-4 text-danger shrink-0" />
        </button>
      )}

      {reviewOpen && alerts.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-surface-container-lowest ambient-shadow">
          <table className="w-full text-left min-w-[52rem] border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant">
              <tr>
                {['Bill', 'Date', 'Customer', 'Mark', 'Bags', 'Actual KG', 'Rate', 'Amount', 'Reason'].map((label) => (
                  <th key={label} className="px-3 py-3 text-xs font-medium uppercase">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="px-3 py-3 text-sm font-semibold text-primary border-t border-outline-variant">
                    {alert.href && alert.saleId ? <Link href={alert.href}>{alert.billNumber}</Link> : alert.href ? <Link href={alert.href}>Open lot</Link> : alert.billNumber}
                  </td>
                  <td className="px-3 py-3 text-sm font-medium border-t border-outline-variant">{alert.date}</td>
                  <td className="px-3 py-3 text-sm font-medium border-t border-outline-variant">{alert.customerName}</td>
                  <td className="px-3 py-3 text-sm font-medium border-t border-outline-variant">{alert.markCode}</td>
                  <td className="px-3 py-3 text-right text-sm font-medium tabular-nums border-t border-outline-variant">{alert.bags == null ? '—' : formatCount(alert.bags)}</td>
                  <td className="px-3 py-3 text-right text-sm font-medium tabular-nums border-t border-outline-variant">{alert.weightKg == null ? '—' : formatWeight(alert.weightKg)}</td>
                  <td className="px-3 py-3 text-right text-sm font-medium tabular-nums border-t border-outline-variant">{alert.ratePerKg == null ? '—' : `₹${alert.ratePerKg.toLocaleString('en-IN')}`}</td>
                  <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums border-t border-outline-variant">{alert.amount == null ? '—' : formatMoney(alert.amount)}</td>
                  <td className="px-3 py-3 text-sm font-medium text-tertiary border-t border-outline-variant">{alert.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold font-display text-on-surface mb-2">Lot Reports</h2>
        <div className="rounded-2xl bg-surface-container-lowest ambient-shadow divide-y divide-outline-variant">
          <ReportRow
            icon={CalendarDays}
            title="Day-wise Sales"
            description="Daily totals and the individual bills for this consignment."
            onClick={() => onOpen('sales')}
          />
          <ReportRow
            icon={Layers}
            title="Mark-wise Report"
            description="Quality-mark received, sold, and balance for this lot."
            comingSoon
          />
          <ReportRow
            icon={CircleDollarSign}
            title="Cost-wise Report"
            description="Marks grouped by the exact purchase rate."
            comingSoon
          />
          <ReportRow
            icon={History}
            title="Lot Activity"
            description="Purchase, receiving, sales, opening stock, and approved adjustments."
            onClick={() => onOpen('activity')}
          />
        </div>
      </section>
    </>
  );
}

function ReportRow({
  icon: Icon,
  title,
  description,
  onClick,
  comingSoon,
}: {
  icon: typeof CalendarDays;
  title: string;
  description: string;
  onClick?: () => void;
  comingSoon?: boolean;
}) {
  const content = (
    <>
      <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold font-display text-on-surface">{title}</div>
        <div className="text-xs text-on-surface-variant mt-0.5">{description}</div>
      </div>
      {comingSoon ? (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant shrink-0">Coming Soon</span>
      ) : (
        <ChevronRight className="w-5 h-5 text-on-surface-variant shrink-0" />
      )}
    </>
  );

  if (comingSoon) {
    return (
      <div className="w-full flex items-center gap-3 px-4 py-3 text-left opacity-70">
        {content}
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-low/60">
      {content}
    </button>
  );
}

function LotActivity({ entries }: { entries: LotActivityEntry[] }) {
  return (
    <section>
      <h2 className="text-lg font-semibold font-display text-on-surface mb-2">Lot activity</h2>
      <div className="rounded-2xl bg-surface-container-lowest ambient-shadow divide-y divide-outline-variant">
        {entries.length === 0 && <p className="px-4 py-8 text-center text-sm text-on-surface-variant">No activity is recorded for this lot.</p>}
        {entries.map((entry) => (
          <div key={entry.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="min-w-0">
              <div className="text-sm font-medium text-on-surface">
                {entry.href ? <Link href={entry.href} className="text-primary">{entry.title}</Link> : entry.title}
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
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest px-3 py-3 ambient-shadow min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant leading-tight">{label}</div>
      <div className={`mt-1 text-lg font-bold font-display leading-tight tabular-nums ${tone ?? 'text-primary'}`}>{value}</div>
      {hint && <div className="text-xs font-medium text-on-surface-variant mt-1 leading-snug">{hint}</div>}
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</div>
      <div className={`text-sm font-semibold font-display tabular-nums mt-0.5 ${tone ?? 'text-on-surface'}`}>{value}</div>
    </div>
  );
}
