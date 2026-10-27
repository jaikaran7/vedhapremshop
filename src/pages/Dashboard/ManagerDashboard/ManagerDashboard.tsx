'use client';

import { TRADING_SESSION_DATE } from '@/constants/session';
import { useCompanyQuery } from '@/hooks/queries/use-directory-query';
import { useExpensesQuery } from '@/hooks/queries/use-expenses-query';
import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { usePurchasesQuery } from '@/hooks/queries/use-purchases-query';
import { useSalesQuery } from '@/hooks/queries/use-sales-query';
import { useVendorsQuery } from '@/hooks/queries/use-vendors-query';
import { PaymentAlerts } from '@/pages/Dashboard/PaymentAlerts/PaymentAlerts';
import { customerCreditAlerts, vendorPaymentAlerts } from '@/utils/payment-alerts';
import { useRouter } from 'next/navigation';
import React, { useMemo } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { 
  Package, Layers, Truck,
  PlusCircle 
} from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const { data: lots = [] } = useLotsQuery();
  const { data: purchases = [] } = usePurchasesQuery();
  const { data: expenses = [] } = useExpensesQuery();
  const { data: vendors = [] } = useVendorsQuery();
  const { data: sales = [] } = useSalesQuery();
  const { data: companySettings } = useCompanyQuery();
  const router = useRouter();
  const today = TRADING_SESSION_DATE;
  const alertDays = companySettings.paymentAlertDays || 2;
  const vendorAlerts = useMemo(
    () => vendorPaymentAlerts(vendors, expenses, today, alertDays),
    [alertDays, expenses, today, vendors],
  );
  const customerAlerts = useMemo(
    () => customerCreditAlerts(sales, today, alertDays),
    [alertDays, sales, today],
  );
  const lotsInProgress = lots.filter((lot) => lot.remainingBags > 0 || lot.remainingWeightKg > 0.05).length;
  const activeLots = lots.filter(l => l.status === 'ACTIVE');
  const totalBags = lots.reduce((acc, l) => acc + l.remainingBags, 0);
  const totalWeightKg = lots.reduce((acc, l) => acc + l.remainingWeightKg, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
              Manager Operations Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary-container text-secondary-on-container">
              Floor Oversight
            </span>
          </div>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Consignment arrivals, lot reconciliation, and weighbridge checks.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="secondary" 
            size="md"
            icon={<Truck className="w-4 h-4" />}
            onClick={() => router.push('/purchases/new')}
          >
            New Consignment Purchase
          </Button>
          <Button 
            variant="primary" 
            size="md"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => router.push('/sales/new')}
          >
            New Sale
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          label="Lots In Progress"
          value={lotsInProgress}
          subValue="Lots that still have stock"
          icon={<Layers className="w-5 h-5 text-tertiary" />}
          onClick={() => router.push('/reports?report=lotDifferential')}
        />

        <StatCard
          label="Active Lots in Yard"
          value={activeLots.length}
          subValue={`${totalBags} bags available on floor`}
          icon={<Layers className="w-5 h-5 text-primary" />}
          onClick={() => router.push('/lots')}
        />

        <StatCard
          label="Total Available Stock"
          value={`${totalBags} Bags`}
          subValue={`${totalWeightKg.toLocaleString('en-IN')} KG`}
          icon={<Package className="w-5 h-5 text-secondary" />}
          onClick={() => router.push('/stock')}
        />

        <StatCard
          label="Consignments Received"
          value={purchases.length}
          subValue="Total purchase lots verified"
          icon={<Truck className="w-5 h-5 text-success" />}
          onClick={() => router.push('/purchases')}
        />
      </div>

      <PaymentAlerts vendorAlerts={vendorAlerts} customerAlerts={customerAlerts} />

      {/* Lot Status Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold font-display text-on-surface">Yard Lot Status & Remaining Stock</h3>
            <p className="text-xs text-on-surface-variant font-medium">Consignment-level bags & multi-quality grading breakdown</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/lots')}>
            View Lot Management
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {lots.map(lot => (
            <Card key={lot.id} variant="lowest" className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold font-display text-primary">{lot.lotNumber}</span>
                  <Chip 
                    label={lot.status} 
                    size="sm" 
                    variant={lot.status === 'ACTIVE' ? 'success' : 'neutral'} 
                  />
                </div>
                <p className="text-xs font-semibold text-on-surface mt-1">{lot.vendorName}</p>
                <p className="text-[11px] text-on-surface-variant">Arrived {lot.arrivalDate} • Bill: {lot.purchaseBillNo}</p>

                <div className="mt-4 p-3 rounded-xl bg-surface-container-low/70 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant">Remaining Bags</span>
                    <div className="text-base font-extrabold text-on-surface font-display">{lot.remainingBags} / {lot.totalBags}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant">Stock Weight</span>
                    <div className="text-base font-extrabold text-on-surface font-display">{lot.remainingWeightKg.toLocaleString('en-IN')} KG</div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Mark Breakdown:</span>
                  {lot.marks.map(m => (
                    <div key={m.markCode} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-on-surface">Grade {m.markCode}</span>
                      <span className="text-on-surface-variant font-medium">
                        {m.remainingBags} bags ({m.remainingWeightKg} KG)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-surface-container-low flex justify-end">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => router.push(`/lots`)}
                >
                  Lot Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
