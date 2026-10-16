'use client';

import { useSalesQuery } from '@/hooks/queries/use-sales-query';
import { usePaymentsQuery } from '@/hooks/queries/use-payments-query';
import { useCustomersQuery } from '@/hooks/queries/use-customers-query';
import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { useMarksQuery } from '@/hooks/queries/use-directory-query';
import { useRouter } from 'next/navigation';
import React from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { 
  IndianRupee, Package, Users,
  PlusCircle, ArrowDownLeft, ChevronRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';

export const OwnerDashboard: React.FC = () => {
  const { data: sales = [] } = useSalesQuery();
  const { data: payments = [] } = usePaymentsQuery();
  const { data: customers = [] } = useCustomersQuery();
  const { data: lots = [] } = useLotsQuery();
  const { data: marks = [] } = useMarksQuery();
  const router = useRouter();
  // Dynamic calculations
  const today = '2026-10-01'; // or new Date().toISOString().split('T')[0];
  const todaysSales = sales.filter(s => s.date === today);
  const todaysSalesAmount = todaysSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const todaysSalesBags = todaysSales.reduce((acc, s) => acc + s.totalBags, 0);
  const todaysSalesWeight = todaysSales.reduce((acc, s) => acc + s.totalWeightKg, 0);

  const todaysPayments = payments.filter(p => p.date === today);
  const todaysCollections = todaysPayments.reduce((acc, p) => acc + p.amount, 0);

  const creditSalesAmount = todaysSales.filter(s => s.paymentType === 'CREDIT').reduce((acc, s) => acc + s.totalAmount, 0);
  const totalOutstanding = customers.reduce((acc, c) => acc + c.outstandingAmount, 0);

  const totalStockBags = lots.reduce((acc, l) => acc + l.remainingBags, 0);
  const totalStockWeightKg = lots.reduce((acc, l) => acc + l.remainingWeightKg, 0);

  const lotsInProgress = lots.filter((lot) => lot.remainingBags > 0 || lot.remainingWeightKg > 0.05).length;
  const lotsCompleted = lots.filter((lot) => lot.remainingBags <= 0 && lot.remainingWeightKg <= 0.05).length;

  // Chart trend data (Last 7 days)
  const salesTrendData = [
    { day: '25 Sep', sales: 42000, collections: 35000 },
    { day: '26 Sep', sales: 58000, collections: 41000 },
    { day: '27 Sep', sales: 49000, collections: 52000 },
    { day: '28 Sep', sales: 74000, collections: 60000 },
    { day: '29 Sep', sales: 62000, collections: 48000 },
    { day: '30 Sep', sales: 81000, collections: 67000 },
    { day: '01 Oct', sales: todaysSalesAmount || 59976, collections: todaysCollections || 80000 },
  ];

  // Stock by mark aggregate
  const stockByMark = marks.map(m => {
    let markBags = 0;
    let markKg = 0;
    lots.forEach(l => {
      const match = l.marks.find(lm => lm.markCode === m.code);
      if (match) {
        markBags += match.remainingBags;
        markKg += match.remainingWeightKg;
      }
    });
    return {
      code: m.code,
      name: m.name,
      bags: markBags,
      kg: markKg,
      rate: m.defaultSellingRate
    };
  });

  return (
    <div className="space-y-8">
      {/* Top Header & Contextual Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
              Owner Overview
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-fixed text-primary-on-fixed">
              Live Mandi Desk
            </span>
          </div>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Real-time auction totals, credit risk, stock movements and cashier collections.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="secondary" 
            size="md"
            icon={<ArrowDownLeft className="w-4 h-4 text-success" />}
            onClick={() => router.push('/payments/new')}
          >
            Record Payment
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

      {/* Primary KPI Grid - Intentional Asymmetry & Tonal Depth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          label="Today's Revenue"
          value={`₹${todaysSalesAmount.toLocaleString('en-IN')}`}
          subValue={`${todaysSalesBags} bags • ${todaysSalesWeight.toLocaleString('en-IN')} KG`}
          trend={{ value: '14.2%', isPositive: true, label: 'vs yesterday' }}
          icon={<IndianRupee className="w-5 h-5 text-success" />}
          onClick={() => router.push('/sales')}
          className="bg-success/5"
        />

        <StatCard
          label="Today's Collections"
          value={`₹${todaysCollections.toLocaleString('en-IN')}`}
          subValue={`${todaysPayments.length} receipts cleared`}
          trend={{ value: '8.4%', isPositive: true, label: 'cash flow' }}
          icon={<ArrowDownLeft className="w-5 h-5 text-success" />}
          onClick={() => router.push('/payments')}
        />

        <StatCard
          label="Total Receivables"
          value={`₹${totalOutstanding.toLocaleString('en-IN')}`}
          subValue={`Across ${customers.length} customers`}
          trend={{ value: '3.1%', isPositive: false, label: 'credit risk' }}
          badge={`${customers.filter(c => c.outstandingAmount > 100000).length} High Balances`}
          icon={<Users className="w-5 h-5 text-tertiary" />}
          onClick={() => router.push('/customers')}
          className="bg-tertiary/5"
        />

        <StatCard
          label="Total Stock in Mandi"
          value={`${totalStockBags} Bags`}
          subValue={`${(totalStockWeightKg / 1000).toFixed(1)} MT (${totalStockWeightKg.toLocaleString('en-IN')} KG)`}
          badge={`${lots.filter(l => l.status === 'ACTIVE').length} Active Lots`}
          icon={<Package className="w-5 h-5 text-secondary" />}
          onClick={() => router.push('/stock')}
        />
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-surface-container-low flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant font-display uppercase tracking-wider">Credit Sales Today</span>
            <div className="text-lg font-bold font-display text-on-surface mt-1">
              ₹{creditSalesAmount.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">{(creditSalesAmount / (todaysSalesAmount || 1) * 100).toFixed(0)}% of today's volume</p>
          </div>
          <Chip label="Credit Driven" variant="tertiary" />
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-low flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant font-display uppercase tracking-wider">Lots Completed / In Progress</span>
            <div className="text-lg font-bold font-display text-on-surface mt-1">
              {lotsCompleted} / {lotsInProgress}
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Based on remaining stock</p>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => router.push('/reports?report=lotDifferential')}
          >
            Lot Report
          </Button>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-low flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant font-display uppercase tracking-wider">Average Floor Rate</span>
            <div className="text-lg font-bold font-display text-on-surface mt-1">
              ₹69.00 / KG
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Top Mark: AA Grade</p>
          </div>
          <Chip label="Firm Market" variant="success" />
        </div>
      </div>

      {/* Visual Analytics - Intentional Asymmetry: 2 cols chart (7/5 split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales vs Collections 7-Day Trend */}
        <Card variant="lowest" className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold font-display text-on-surface">Weekly Sales & Collections</h3>
                <p className="text-xs text-on-surface-variant font-medium">Daily trade turnover against realized payments (₹)</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Sales
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-success" /> Collections
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#005da7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#005da7" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e7e34" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#1e7e34" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#747779" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#747779" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '1rem', boxShadow: '0px 12px 32px rgba(27,28,28,0.1)', border: 'none' }} 
                    formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, '']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#005da7" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                  <Area type="monotone" dataKey="collections" stroke="#1e7e34" strokeWidth={2.5} fillOpacity={1} fill="url(#collGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Stock Breakdown by Onion Mark / Quality */}
        <Card variant="lowest" className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold font-display text-on-surface">Available Stock by Mark</h3>
                <p className="text-xs text-on-surface-variant font-medium">Quality distribution across APMC lots</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/stock')}>
                View All
              </Button>
            </div>

            <div className="space-y-3.5">
              {stockByMark.slice(0, 5).map(m => (
                <div key={m.code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center font-bold text-[11px]">
                        {m.code}
                      </span>
                      <span className="font-semibold text-on-surface">{m.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-on-surface">{m.bags} bags</span>
                      <span className="text-on-surface-variant ml-1 font-medium">({m.kg.toLocaleString('en-IN')} KG)</span>
                    </div>
                  </div>
                  <div className="academic-progress-track">
                    <div 
                      className="academic-progress-fill" 
                      style={{ width: `${Math.min(100, (m.bags / 150) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-4 border-t border-surface-container-low flex items-center justify-between text-xs text-on-surface-variant">
            <span>Rates current as of today's morning auction</span>
            <span className="font-bold text-primary">₹49 – ₹71 / KG</span>
          </div>
        </Card>
      </div>

      {/* Recent Activity: Sales & Payments - No-Line Alternating Clean Tonal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales Table */}
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="p-6 pb-4 flex items-center justify-between bg-surface-container-low/40">
            <div>
              <h3 className="text-base font-bold font-display text-on-surface">Recent Sales</h3>
              <p className="text-xs text-on-surface-variant font-medium">Last weighment invoices posted on floor</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/sales')}>
              All Sales <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="divide-y divide-surface-container-low">
            {sales.slice(0, 5).map(s => (
              <div 
                key={s.id} 
                onClick={() => router.push(`/sales/${s.id}`)}
                className="p-4 sm:px-6 hover:bg-surface-container-low/50 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary font-display">{s.billNumber}</span>
                    <span className="text-xs font-semibold text-on-surface">{s.customerName}</span>
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-2">
                    <span>{s.time}</span>
                    <span>•</span>
                    <span>{s.totalBags} bags ({s.totalWeightKg} KG)</span>
                    <span>•</span>
                    <Chip 
                      label={s.paymentType} 
                      size="sm" 
                      variant={s.paymentType === 'CASH' ? 'success' : 'tertiary'} 
                    />
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-extrabold font-display text-on-surface">
                    ₹{s.totalAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-on-surface-variant">
                    by {s.createdByName.split(' ')[0]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Payments Table */}
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="p-6 pb-4 flex items-center justify-between bg-surface-container-low/40">
            <div>
              <h3 className="text-base font-bold font-display text-on-surface">Recent Payments</h3>
              <p className="text-xs text-on-surface-variant font-medium">Collections reducing outstanding credit balance</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/payments')}>
              All Receipts <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="divide-y divide-surface-container-low">
            {payments.slice(0, 5).map(p => (
              <div 
                key={p.id} 
                onClick={() => router.push(`/payments`)}
                className="p-4 sm:px-6 hover:bg-surface-container-low/50 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-success font-display">{p.receiptNumber}</span>
                    <span className="text-xs font-semibold text-on-surface">{p.customerName}</span>
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-2">
                    <span>{p.time}</span>
                    <span>•</span>
                    <span>via {p.paymentMethod}</span>
                    {p.referenceNumber && <span className="opacity-80">({p.referenceNumber})</span>}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-extrabold font-display text-success">
                    +₹{p.amount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-on-surface-variant">
                    Bal: ₹{p.newOutstanding.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
