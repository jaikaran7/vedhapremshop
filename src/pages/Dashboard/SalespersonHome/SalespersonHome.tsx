'use client';

import { TRADING_SESSION_DATE } from '@/constants/session';
import { useSession } from '@/store/session/session-provider';
import { useSalesQuery } from '@/hooks/queries/use-sales-query';
import { useCustomersQuery, useLedgerQuery } from '@/hooks/queries/use-customers-query';
import { useMarksQuery } from '@/hooks/queries/use-directory-query';
import { useDailyCollectionsQuery } from '@/hooks/queries/use-expenses-query';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { bookStanding } from '@/utils/customer-standing';
import { formatLongDate } from '@/utils/settlement';
import type { Customer, CustomerLedgerEntry, Sale } from '@/types';
import { 
  PlusCircle, Scale, Receipt, Search, CheckCircle2, ChevronRight, ChevronDown 
} from 'lucide-react';

function partyMatches(customer: Customer, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  const compact = (value: string) => value.toLowerCase().replace(/[\s-]/g, '');
  return customer.name.toLowerCase().includes(text)
    || customer.code.toLowerCase().includes(text)
    || compact(customer.phone ?? '').includes(compact(text));
}

function standingFor(customerId: string, ledger: CustomerLedgerEntry[], sales: Sale[]) {
  return bookStanding({
    asOf: TRADING_SESSION_DATE,
    openingReferences: ledger.filter((entry) => entry.customerId === customerId && entry.type === 'OPENING').map((entry) => entry.referenceNo),
    saleDates: sales.filter((sale) => sale.customerId === customerId && sale.status === 'CONFIRMED').map((sale) => sale.date),
  });
}

export const SalespersonHome: React.FC = () => {
  const { currentUser } = useSession();
  const { data: sales = [] } = useSalesQuery();
  const { data: customers = [] } = useCustomersQuery();
  const { data: ledger = [] } = useLedgerQuery();
  const { data: marks = [] } = useMarksQuery();
  const router = useRouter();
  const [partyQuery, setPartyQuery] = useState('');
  const [openList, setOpenList] = useState(true);
  const [closedList, setClosedList] = useState(false);
  // Filter today's sales for current salesperson
  const today = TRADING_SESSION_DATE;
  const mySalesToday = sales.filter(s => s.date === today);
  const myTotalBagsToday = mySalesToday.reduce((acc, s) => acc + s.totalBags, 0);
  const myTotalWeightToday = mySalesToday.reduce((acc, s) => acc + s.totalWeightKg, 0);
  const myTotalAmountToday = mySalesToday.reduce((acc, s) => acc + s.totalAmount, 0);
  // Cash collected today (all methods, net of refunds). Balances of the accounts are the Owner's alone.
  const { data: collectedToday } = useDailyCollectionsQuery(today);
  const parties = useMemo(() => {
    const ranked = customers.map((customer) => ({ customer, standing: standingFor(customer.id, ledger, sales) }));
    const byName = (left: typeof ranked[number], right: typeof ranked[number]) => left.customer.name.localeCompare(right.customer.name);
    return {
      open: ranked.filter((row) => row.standing.open && partyMatches(row.customer, partyQuery)).sort(byName),
      closed: ranked.filter((row) => !row.standing.open && partyMatches(row.customer, partyQuery)).sort(byName),
    };
  }, [customers, ledger, sales, partyQuery]);
  const searching = partyQuery.trim().length > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome & Fast CTA Banner - Tablet Optimized Touch Surface */}
      <div className="bg-gradient-to-r from-primary to-primary-container rounded-3xl p-6 sm:p-8 text-white ambient-shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md mb-3">
            <Scale className="w-3.5 h-3.5" />
            <span>Floor Sales Weighment Terminal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight">
            Namaste, {currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-white/90 font-medium mt-1 max-w-md">
            Record bag weights quickly on the digital scale, generate instant printed bills, and assign credit dispatches.
          </p>
        </div>

        {/* Large Tablet Touch Action */}
        <button
          onClick={() => router.push('/sales/new')}
          className="bg-white text-primary hover:bg-surface active:scale-95 transition-all duration-200 py-4 px-8 rounded-2xl font-display font-extrabold text-base flex items-center justify-center gap-3 shadow-ambient cursor-pointer select-none shrink-0"
        >
          <PlusCircle className="w-6 h-6 text-primary" />
          <span>START NEW SALE</span>
        </button>
      </div>

      {/* Today's Floor Summary (Tablet touch tiles) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card variant="lowest" padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-display">Bills Generated</span>
            <div className="text-2xl font-extrabold font-display text-on-surface mt-0.5">{mySalesToday.length} Bills</div>
            <span className="text-[11px] text-on-surface-variant">Today's dispatch</span>
          </div>
        </Card>

        <Card variant="lowest" padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-display">Bags Weighed</span>
            <div className="text-2xl font-extrabold font-display text-on-surface mt-0.5">{myTotalBagsToday} Bags</div>
            <span className="text-[11px] text-on-surface-variant">{myTotalWeightToday.toLocaleString('en-IN')} KG total</span>
          </div>
        </Card>

        <Card variant="lowest" padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-success-container text-success flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-display">Gross Sales</span>
            <div className="text-2xl font-extrabold font-display text-on-surface mt-0.5">₹{myTotalAmountToday.toLocaleString('en-IN')}</div>
            <span className="text-[11px] text-on-surface-variant">Confirmed & billed</span>
          </div>
        </Card>

        <Card variant="lowest" padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-success-container text-success flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-display">Cash Collected</span>
            <div className="text-2xl font-extrabold font-display text-on-surface mt-0.5">₹{(collectedToday?.collected ?? 0).toLocaleString('en-IN')}</div>
            <span className="text-[11px] text-on-surface-variant">
              {(collectedToday?.byMethod ?? []).map((m) => `${m.method} ₹${m.amount.toLocaleString('en-IN')}`).join(' · ') || 'Nothing collected yet today'}
            </span>
          </div>
        </Card>
      </div>

      {/* Quick Customer Selection for Immediate Sale */}
      <Card variant="lowest">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold font-display text-on-surface">Select Customer to Bill</h3>
            <p className="text-xs text-on-surface-variant font-medium">Open means a bill in the last 90 days. Closed means none, including old balances marked OB.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/customers')}>
            View All ({customers.length})
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={partyQuery}
            onChange={(event) => setPartyQuery(event.target.value)}
            placeholder="Name, code or mobile"
            className="w-full rounded-2xl bg-surface-container-low pl-9 pr-3 py-2.5 text-sm text-on-surface outline-none"
          />
        </div>

        <PartyGroup
          title="Open"
          count={parties.open.length}
          expanded={searching || openList}
          onToggle={() => setOpenList((current) => !current)}
        >
          <PartyGrid rows={parties.open} onPick={(id) => router.push(`/sales/new?customerId=${id}`)} />
        </PartyGroup>
        <PartyGroup
          title="Closed"
          count={parties.closed.length}
          expanded={searching || closedList}
          onToggle={() => setClosedList((current) => !current)}
        >
          <PartyGrid rows={parties.closed} onPick={(id) => router.push(`/sales/new?customerId=${id}`)} />
        </PartyGroup>
      </Card>

      {/* Live Floor Selling Rates (Marks AA, J, K, OK, CV, TC) */}
      <Card variant="lowest">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold font-display text-on-surface">Active Floor Selling Rates</h3>
            <p className="text-xs text-on-surface-variant font-medium">Standard APMC wholesale rates per kilogram</p>
          </div>
          <span className="text-xs font-bold text-success flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Live Market
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {marks.map(mark => (
            <div key={mark.id} className="p-3.5 rounded-2xl bg-surface-container-low text-center">
              <span className="inline-block px-2.5 py-0.5 rounded-lg bg-surface-container-highest text-primary font-bold text-xs font-display">
                Grade {mark.code}
              </span>
              <div className="text-lg font-extrabold font-display text-on-surface mt-2">
                ₹{mark.defaultSellingRate.toFixed(2)}
              </div>
              <span className="text-[10px] text-on-surface-variant font-medium block mt-0.5">per KG</span>
              <span className="text-[10px] text-on-surface-variant/80 line-clamp-1 mt-1">{mark.name}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Today's Sales List */}
      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="p-6 pb-4 flex items-center justify-between bg-surface-container-low/40">
          <div>
            <h3 className="text-base font-bold font-display text-on-surface">Your Weighment Bills Today</h3>
            <p className="text-xs text-on-surface-variant font-medium">Tap any bill to view digital print copy or request edit</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/sales/todays')}>
            View Today's Log <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="divide-y divide-surface-container-low">
          {mySalesToday.map(s => (
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
                  <span>{s.totalBags} bags</span>
                  <span>•</span>
                  <span>{s.totalWeightKg} KG</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-extrabold font-display text-on-surface">
                    ₹{s.totalAmount.toLocaleString('en-IN')}
                  </div>
                  <Chip 
                    label={s.paymentType} 
                    size="sm" 
                    variant={s.paymentType === 'CASH' ? 'success' : 'tertiary'} 
                  />
                </div>
                <ChevronRight className="w-4 h-4 text-on-surface-variant" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

function PartyGroup({
  title,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-surface-container first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between py-3 cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-bold font-display text-on-surface">{title}</span>
          <span className="text-[11px] font-bold text-on-surface-variant">{count}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && children}
    </div>
  );
}

function PartyGrid({
  rows,
  onPick,
}: {
  rows: { customer: Customer; standing: { open: boolean; lastBillDate: string | null } }[];
  onPick: (id: string) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-on-surface-variant pb-3">No party in this list.</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-4">
      {rows.map(({ customer, standing }) => (
        <div
          key={customer.id}
          onClick={() => onPick(customer.id)}
          className="p-4 rounded-2xl bg-surface-container-low hover:bg-primary-fixed/30 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-primary font-display">{customer.code}</span>
              <Chip label={standing.open ? 'Open' : 'Closed'} size="sm" variant={standing.open ? 'success' : 'neutral'} />
            </div>
            <h4 className="text-sm font-bold font-display text-on-surface mt-1.5">{customer.name}</h4>
            <p className="text-[11px] text-on-surface-variant line-clamp-1">
              {standing.lastBillDate ? `Last bill ${formatLongDate(standing.lastBillDate)}` : 'No bill in the last 90 days'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-surface-container flex items-center justify-between text-xs">
            <span className="text-on-surface-variant text-[11px]">Due:</span>
            <span className="font-extrabold text-on-surface">₹{customer.outstandingAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
