'use client';

import { useSession } from '@/store/session/session-provider';
import { useVendorLedgerQuery, useVendorsQuery } from '@/hooks/queries/use-vendors-query';
import { usePurchasesQuery } from '@/hooks/queries/use-purchases-query';
import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { useRouter } from 'next/navigation';
import { useRouteId } from '@/hooks/shared/use-route-id';
import { can } from '@/auth/permissions';
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { VendorFormModal } from '@/pages/Vendors/VendorFormModal/VendorFormModal';
import { 
  ArrowLeft, PlusCircle, Phone, MapPin, Mail, 
  Truck, Layers, Edit, FileText, ChevronRight 
} from 'lucide-react';

export const VendorDetails: React.FC = () => {
  const id = useRouteId();
  const router = useRouter();
  const { currentUser } = useSession();
  const { data: vendors = [] } = useVendorsQuery();
  const { data: purchases = [] } = usePurchasesQuery();
  const { data: lots = [] } = useLotsQuery();

  const [activeTab, setActiveTab] = useState<'purchases' | 'lots' | 'account'>('purchases');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { data: ledger } = useVendorLedgerQuery(id);

  // Role Guard
  if (!can(currentUser.role, 'viewPurchaseCost')) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Access Restricted</h3>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/salesperson-home')}>
          Back to Floor
        </Button>
      </div>
    );
  }

  const vendor = vendors.find(v => v.id === id);

  if (!vendor) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Vendor Record Not Found</h3>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/vendors')}>
          Return to Vendors Directory
        </Button>
      </div>
    );
  }

  const vendorPurchases = purchases.filter(p => p.vendorId === vendor.id);
  const vendorLots = lots.filter(l => l.vendorId === vendor.id);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/vendors')}
            className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary font-display">{vendor.code}</span>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
                {vendor.name}
              </h1>
              <Chip
                label={vendor.status}
                size="sm"
                variant={vendor.status === 'ACTIVE' ? 'success' : 'neutral'}
              />
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Consignment Source Mandi: {vendor.mandiCity}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<Edit className="w-4 h-4" />}
            onClick={() => setIsEditOpen(true)}
          >
            Edit Supplier
          </Button>
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => router.push(`/purchases/new?vendorId=${vendor.id}`)}
          >
            New Consignment
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="lowest" padding="md" className="bg-danger/5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-display">
            Total Cost
          </span>
          <div className="text-2xl font-extrabold font-display text-danger mt-1">
            ₹{vendor.totalPurchases.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">
            Across {vendorPurchases.length} consignments
          </span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-display">
            Payable Outstanding
          </span>
          <div className="text-2xl font-extrabold font-display text-tertiary mt-1">
            ₹{vendor.payableAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">
            Previous due ₹{(vendor.previousDue ?? 0).toLocaleString('en-IN')} + new due ₹{(vendor.newDue ?? vendor.payableAmount).toLocaleString('en-IN')}
          </span>
        </Card>

        <Card variant="lowest" padding="md" className={(vendor.advanceAmount ?? 0) > 0 ? 'bg-success/5' : ''}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-display">
            Advance with vendor
          </span>
          <div className="text-2xl font-extrabold font-display text-success mt-1">
            ₹{(vendor.advanceAmount ?? 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">
            Paid beyond what is owed. The next bill uses it automatically.
          </span>
        </Card>

        <Card variant="lowest" padding="md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-display">
            Active Yard Lots
          </span>
          <div className="text-2xl font-extrabold font-display text-primary mt-1">
            {vendorLots.length} Lots
          </div>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">
            {vendorLots.reduce((acc, l) => acc + l.remainingBags, 0)} bags currently in yard
          </span>
        </Card>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 border-b border-surface-container-low pb-2">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'purchases'
              ? 'bg-primary text-white shadow-ambient'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          Purchase Bills ({vendorPurchases.length})
        </button>
        <button
          onClick={() => setActiveTab('lots')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'lots'
              ? 'bg-primary text-white shadow-ambient'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          Yard Lots ({vendorLots.length})
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'account'
              ? 'bg-primary text-white shadow-ambient'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          Account Statement
        </button>
      </div>

      {/* Purchases Tab */}
      {activeTab === 'purchases' && (
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="divide-y divide-surface-container-low">
            {vendorPurchases.map(pur => (
              <div 
                key={pur.id}
                onClick={() => router.push(`/purchases/${pur.id}`)}
                className="p-5 hover:bg-surface-container-low/40 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary font-display">{pur.billNumber}</span>
                    <span className="text-xs text-on-surface-variant">• Date: {pur.date}</span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container font-semibold text-[11px] text-on-surface">
                      {pur.lotNumber}
                    </span>
                  </div>
                  <div className="text-xs text-on-surface-variant mt-1">
                    {pur.items.length} quality grades ({pur.items.map(i => `${i.markCode}: ${i.bags}b`).join(', ')})
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-extrabold font-display text-on-surface">
                    ₹{pur.netAmount.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-primary hover:underline font-semibold">View Details & Bill →</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Lots Tab */}
      {activeTab === 'lots' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendorLots.map(lot => (
            <Card key={lot.id} variant="lowest">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold font-display text-primary">{lot.lotNumber}</span>
                <Chip label={lot.status} size="sm" variant={lot.status === 'ACTIVE' ? 'success' : 'neutral'} />
              </div>
              <div className="mt-2 text-xs text-on-surface-variant">
                Arrived: {lot.arrivalDate} • Purchase Bill: {lot.purchaseBillNo}
              </div>
              <div className="mt-3 p-3 rounded-xl bg-surface-container-low flex justify-between text-xs">
                <div>
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase">Stock</span>
                  <div className="font-extrabold font-display">{lot.remainingBags} / {lot.totalBags} bags</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase">Weight</span>
                  <div className="font-extrabold font-display">{lot.remainingWeightKg.toLocaleString('en-IN')} KG</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Account statement: what was owed before, each bill and how much of it is paid, every payment */}
      {activeTab === 'account' && (
        <div className="space-y-4">
          {!ledger ? (
            <Card variant="lowest"><p className="text-xs text-on-surface-variant">Loading the account…</p></Card>
          ) : (
            <>
              <Card variant="lowest" padding="md">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div><span className="text-on-surface-variant font-medium block">Owed before the system</span><span className="text-sm font-extrabold font-display">₹{ledger.openingBalance.toLocaleString('en-IN')}</span></div>
                  <div><span className="text-on-surface-variant font-medium block">Bills entered</span><span className="text-sm font-extrabold font-display">₹{ledger.totalPurchases.toLocaleString('en-IN')}</span></div>
                  <div><span className="text-on-surface-variant font-medium block">Paid to vendor</span><span className="text-sm font-extrabold font-display">₹{ledger.payments.reduce((t, p) => t + p.amount, 0).toLocaleString('en-IN')}</span></div>
                  <div><span className="text-on-surface-variant font-medium block">Still owed</span><span className="text-sm font-extrabold font-display text-tertiary">₹{ledger.payableAmount.toLocaleString('en-IN')}</span></div>
                </div>
                <p className="text-[11px] text-on-surface-variant mt-3">
                  Payments clear the old dues first, then the oldest bills. Previous due ₹{ledger.previousDue.toLocaleString('en-IN')} · New due ₹{ledger.newDue.toLocaleString('en-IN')}
                  {ledger.advanceAmount > 0 ? ` · Advance ₹${ledger.advanceAmount.toLocaleString('en-IN')}` : ''}
                </p>
              </Card>

              <Card variant="lowest" padding="none" className="overflow-hidden">
                <div className="p-5 pb-3 bg-surface-container-low/40"><h3 className="text-sm font-bold font-display">Bills</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                      <tr><th className="py-3 px-4">Date</th><th className="py-3 px-4">Bill</th><th className="py-3 px-4">Lot</th><th className="py-3 px-4 text-right">Amount</th><th className="py-3 px-4 text-right">Paid</th><th className="py-3 px-4 text-right">Balance</th><th className="py-3 px-4">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-low">
                      {ledger.bills.length === 0 && <tr><td colSpan={7} className="py-6 px-4 text-center text-on-surface-variant">No bills entered yet.</td></tr>}
                      {ledger.bills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-surface-container-low/30 cursor-pointer" onClick={() => router.push(`/purchases/${bill.id}`)}>
                          <td className="py-3 px-4 whitespace-nowrap">{bill.date}</td>
                          <td className="py-3 px-4 font-bold text-primary">{bill.billNumber}</td>
                          <td className="py-3 px-4">{bill.lotNumber}</td>
                          <td className="py-3 px-4 text-right font-semibold">₹{bill.netAmount.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right text-success font-semibold">₹{bill.paidAmount.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right font-bold">₹{bill.balanceAmount.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4"><Chip label={bill.status} size="sm" variant={bill.status === 'PAID' ? 'success' : bill.status === 'PARTIAL' ? 'tertiary' : 'neutral'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card variant="lowest" padding="none" className="overflow-hidden">
                <div className="p-5 pb-3 bg-surface-container-low/40 flex items-center justify-between">
                  <h3 className="text-sm font-bold font-display">Payments made</h3>
                  <Button size="sm" variant="secondary" onClick={() => router.push('/payments/expense')}>Record payment</Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                      <tr><th className="py-3 px-4">Date</th><th className="py-3 px-4">Method</th><th className="py-3 px-4">From account</th><th className="py-3 px-4">Reference</th><th className="py-3 px-4">By</th><th className="py-3 px-4 text-right">Amount</th></tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-low">
                      {ledger.payments.length === 0 && <tr><td colSpan={6} className="py-6 px-4 text-center text-on-surface-variant">No payments made yet.</td></tr>}
                      {ledger.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="py-3 px-4 whitespace-nowrap">{payment.date}</td>
                          <td className="py-3 px-4">{payment.paymentMethod}</td>
                          <td className="py-3 px-4">{payment.accountName}</td>
                          <td className="py-3 px-4 text-on-surface-variant">{payment.reference ?? '—'}</td>
                          <td className="py-3 px-4 text-on-surface-variant">{payment.recordedBy}</td>
                          <td className="py-3 px-4 text-right font-bold text-danger">−₹{payment.amount.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      <VendorFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        vendorToEdit={vendor}
      />
    </div>
  );
};
