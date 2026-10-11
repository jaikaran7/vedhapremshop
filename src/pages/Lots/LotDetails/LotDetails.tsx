'use client';

import { useSession } from '@/store/session/session-provider';
import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { useStockQuery } from '@/hooks/queries/use-stock-query';
import { useRouter } from 'next/navigation';
import { useRouteId } from '@/hooks/shared/use-route-id';
import { can } from '@/auth/permissions';
import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { 
  ArrowLeft, Layers, Truck, PlusCircle, Package, 
  Calendar, FileText, ArrowRightLeft 
} from 'lucide-react';

export const LotDetails: React.FC = () => {
  const id = useRouteId();
  const router = useRouter();
  const { currentUser } = useSession();
  const { data: lots = [] } = useLotsQuery();
  const { data: stockMovements = [] } = useStockQuery();

  const lot = lots.find(l => l.id === id);

  if (!lot) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Lot Record Not Found</h3>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/lots')}>
          Return to Lots Directory
        </Button>
      </div>
    );
  }

  // Movements for this lot
  const lotMovements = stockMovements.filter(sm => sm.lotNumber.toUpperCase() === lot.lotNumber.toUpperCase());

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/lots')}
            className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
                {lot.lotNumber}
              </h1>
              <Chip
                label={lot.status}
                size="sm"
                variant={lot.status === 'ACTIVE' ? 'success' : 'neutral'}
              />
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Consignment from {lot.vendorName} • Inward Bill: {lot.purchaseBillNo} • Arrived {lot.arrivalDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {can(currentUser.role, 'viewPurchaseCost') && (
            <Button
              variant="secondary"
              icon={<Truck className="w-4 h-4" />}
              onClick={() => router.push(`/purchases/${lot.purchaseBillId}`)}
            >
              View Inward Bill
            </Button>
          )}
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => router.push(`/sales/new?lotNumber=${encodeURIComponent(lot.lotNumber)}`)}
          >
            Bill Sale from this Lot
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Available Floor Stock</span>
          <div className="text-2xl font-extrabold font-display text-primary mt-1">{lot.remainingBags} Bags</div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">{lot.remainingWeightKg.toLocaleString('en-IN')} KG balance</span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Original Inward Consignment</span>
          <div className="text-2xl font-extrabold font-display text-on-surface mt-1">{lot.totalBags} Bags</div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">{lot.totalWeightKg.toLocaleString('en-IN')} KG total</span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Dispatched Sales</span>
          <div className="text-2xl font-extrabold font-display text-success mt-1">{lot.totalBags - lot.remainingBags} Bags</div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">{(lot.totalWeightKg - lot.remainingWeightKg).toLocaleString('en-IN')} KG sold</span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Average Tare / Bag</span>
          <div className="text-2xl font-extrabold font-display text-on-surface mt-1">
            {(lot.totalWeightKg / (lot.totalBags || 1)).toFixed(1)} KG
          </div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">Standard 50kg wholesale mesh</span>
        </Card>
      </div>

      {/* Mark Breakdown Table */}
      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="p-6 pb-4 bg-surface-container-low/40">
          <h3 className="text-base font-bold font-display text-on-surface">Mark & Quality Breakdown</h3>
          <p className="text-xs text-on-surface-variant font-medium">Bags and live weight available by specific grading mark</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
              <tr>
                <th className="py-3 px-4">Mark Grade</th>
                <th className="py-3 px-4">Initial Bags</th>
                <th className="py-3 px-4">Initial Weight</th>
                <th className="py-3 px-4">Remaining Bags</th>
                <th className="py-3 px-4">Remaining Weight</th>
                {can(currentUser.role, 'viewPurchaseCost') && (
                  <th className="py-3 px-4 text-right">Inward Rate</th>
                )}
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {lot.marks.map(m => (
                <tr key={m.markCode} className="hover:bg-surface-container-low/30">
                  <td className="py-3.5 px-4 font-bold text-primary">Grade {m.markCode}</td>
                  <td className="py-3.5 px-4 font-semibold text-on-surface">{m.initialBags} bags</td>
                  <td className="py-3.5 px-4 text-on-surface-variant">{m.initialWeightKg.toLocaleString('en-IN')} KG</td>
                  <td className="py-3.5 px-4 font-extrabold text-on-surface">{m.remainingBags} bags</td>
                  <td className="py-3.5 px-4 font-extrabold text-on-surface">{m.remainingWeightKg.toLocaleString('en-IN')} KG</td>
                  {can(currentUser.role, 'viewPurchaseCost') && (
                    <td className="py-3.5 px-4 text-right font-bold text-on-surface">₹{m.purchaseRate.toFixed(2)}/kg</td>
                  )}
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => router.push(`/sales/new?lotNumber=${encodeURIComponent(lot.lotNumber)}&markCode=${m.markCode}`)}
                    >
                      Sell {m.markCode}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Lot Stock Movements History */}
      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="p-6 pb-4 bg-surface-container-low/40">
          <h3 className="text-base font-bold font-display text-on-surface">Movement Audit History for {lot.lotNumber}</h3>
          <p className="text-xs text-on-surface-variant font-medium">Inward arrival, dispatches, and scale adjustments</p>
        </div>

        <div className="divide-y divide-surface-container-low">
          {lotMovements.length === 0 ? (
            <div className="p-6 text-center text-xs text-on-surface-variant">No movements recorded yet.</div>
          ) : (
            lotMovements.map(sm => (
              <div key={sm.id} className="p-4 sm:px-6 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface font-display">{sm.date}</span>
                    <Chip
                      label={sm.type}
                      size="sm"
                      variant={sm.type === 'PURCHASE_IN' ? 'primary' : sm.type === 'SALE_OUT' ? 'tertiary' : 'neutral'}
                    />
                    <span className="font-bold text-primary">[{sm.markCode}]</span>
                  </div>
                  <p className="text-on-surface-variant text-[11px] mt-0.5">{sm.reason}</p>
                </div>

                <div className="text-right">
                  <div className={`font-extrabold font-display ${sm.type === 'PURCHASE_IN' ? 'text-primary' : 'text-danger'}`}>
                    {sm.type === 'PURCHASE_IN' ? '+' : '-'}{sm.bags} bags ({sm.weightKg} KG)
                  </div>
                  <span className="text-[10px] text-on-surface-variant">by {sm.performedBy}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
