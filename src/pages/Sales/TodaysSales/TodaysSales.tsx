'use client';

import { TRADING_SESSION_DATE } from '@/constants/session';
import { useSalesQuery } from '@/hooks/queries/use-sales-query';
import { useRouter } from 'next/navigation';
import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { 
  Scale, PlusCircle, Printer, ArrowLeft, IndianRupee, 
  CheckCircle2, Clock, ChevronRight 
} from 'lucide-react';

export const TodaysSales: React.FC = () => {
  const { data: sales = [] } = useSalesQuery();
  const router = useRouter();
  const today = TRADING_SESSION_DATE;
  const todaysSales = sales.filter(s => s.date === today);

  const totalBags = todaysSales.reduce((acc, s) => acc + s.totalBags, 0);
  const totalWeightKg = todaysSales.reduce((acc, s) => acc + s.totalWeightKg, 0);
  const totalAmount = todaysSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const cashAmount = todaysSales.filter(s => s.paymentType === 'CASH' || s.paymentType === 'UPI').reduce((acc, s) => acc + s.totalAmount, 0);
  const creditAmount = todaysSales.filter(s => s.paymentType === 'CREDIT').reduce((acc, s) => acc + s.totalAmount, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
                Today's Sales & Dispatch Log
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-success-container text-success-on-container">
                {today}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Live floor session • Weighment tickets and bills dispatched today
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          icon={<PlusCircle className="w-4 h-4" />}
          onClick={() => router.push('/sales/new')}
        >
          Start Next Sale
        </Button>
      </div>

      {/* Today's KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Today's Invoices</span>
          <div className="text-2xl font-extrabold font-display text-on-surface mt-1">{todaysSales.length} Bills</div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">{totalBags} bags dispatched</span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Total Weight Dispatched</span>
          <div className="text-2xl font-extrabold font-display text-on-surface mt-1">{totalWeightKg.toLocaleString('en-IN')} KG</div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">{(totalWeightKg / 1000).toFixed(2)} Metric Tons</span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Credit Dispatches</span>
          <div className="text-2xl font-extrabold font-display text-tertiary mt-1">₹{creditAmount.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">Debited to customer khata</span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Today's Turnover</span>
          <div className="text-2xl font-extrabold font-display text-primary mt-1">₹{totalAmount.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-success font-semibold mt-0.5 block">₹{cashAmount.toLocaleString('en-IN')} spot cash</span>
        </Card>
      </div>

      {/* Today's Bills List */}
      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="divide-y divide-surface-container-low">
          {todaysSales.map(s => (
            <div
              key={s.id}
              className="p-5 sm:px-6 hover:bg-surface-container-low/40 transition-colors flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary font-display">{s.billNumber}</span>
                  <span className="text-xs text-on-surface-variant">• {s.time}</span>
                  <Chip
                    label={s.paymentType}
                    size="sm"
                    variant={s.paymentType === 'CASH' ? 'success' : 'tertiary'}
                  />
                </div>
                <h3 className="text-base font-bold font-display text-on-surface mt-1">{s.customerName}</h3>
                <div className="text-xs text-on-surface-variant mt-0.5">
                  {s.totalBags} bags • {s.totalWeightKg} KG • Weighed by {s.createdByName}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-base font-extrabold font-display text-on-surface">
                    ₹{s.totalAmount.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-on-surface-variant">
                    {s.paymentType === 'CREDIT' ? 'Khata Debit' : s.paymentType === 'PARTIAL' ? `Due ₹${s.balanceDue.toLocaleString('en-IN')}` : 'Paid in full'}
                  </span>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Printer className="w-3.5 h-3.5" />}
                  onClick={() => router.push(`/sales/${s.id}/bill`)}
                >
                  Print Bill
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
