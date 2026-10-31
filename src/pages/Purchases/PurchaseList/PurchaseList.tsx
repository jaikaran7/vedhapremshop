'use client';

import { useSession } from '@/store/session/session-provider';
import { usePurchasesQuery } from '@/hooks/queries/use-purchases-query';
import { useProductsQuery } from '@/hooks/queries/use-directory-query';
import { lotProductLabel } from '@/utils/products';
import { useRouter } from 'next/navigation';
import { can } from '@/auth/permissions';
import { isPendingReceipt } from '@/utils/receiving';
import { clearPurchaseDraft, draftLotNumber, ensureSampleLotDraft, readPurchaseDraft, subscribePurchaseDraft, type PurchaseDraft } from '@/utils/purchase-draft';
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { 
  Truck, PlusCircle, Search, FileText, ChevronRight, 
  Calendar, Layers, IndianRupee, ScanLine
} from 'lucide-react';

export const PurchaseList: React.FC = () => {
  const { currentUser } = useSession();
  const { data: purchases = [] } = usePurchasesQuery();
  const { data: products = [] } = useProductsQuery();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<PurchaseDraft | null>(null);
  const router = useRouter();
  useEffect(() => {
    const sync = () => setDraft(readPurchaseDraft());
    setDraft(ensureSampleLotDraft());
    const unsubscribe = subscribePurchaseDraft(sync);
    window.addEventListener('focus', sync);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', sync);
    };
  }, []);

  useEffect(() => {
    if (!draft) return;
    const lotNumber = draftLotNumber(draft).toUpperCase();
    const saved = purchases.some((purchase) => purchase.billNumber === draft.billNumber && purchase.lotNumber.toUpperCase() === lotNumber);
    if (saved) clearPurchaseDraft();
  }, [draft, purchases]);
  // Role Guard: Salesperson cannot view purchases
  if (!can(currentUser.role, 'accessPurchases')) {
    return (
      <Card variant="lowest" className="p-12 text-center max-w-lg mx-auto">
        <Truck className="w-12 h-12 text-tertiary mx-auto mb-3" />
        <h3 className="text-xl font-bold font-display text-on-surface">Restricted Floor Area</h3>
        <p className="text-xs text-on-surface-variant mt-2">
          Vendor bills are not available to this role.
        </p>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/salesperson-home')}>
          Return to Sales Floor
        </Button>
      </Card>
    );
  }

  const filtered = purchases.filter(p => {
    const productName = p.productName || lotProductLabel(p, products);
    const query = search.toLowerCase();
    return p.billNumber.toLowerCase().includes(query)
      || p.vendorName.toLowerCase().includes(query)
      || p.lotNumber.toLowerCase().includes(query)
      || productName.toLowerCase().includes(query);
  });

  const totalPurchasedValue = purchases.reduce((sum, p) => sum + p.netAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Consignment Purchases
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {purchases.length} consignments received • Total landing inward value: ₹{totalPurchasedValue.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<Layers className="w-4 h-4" />}
            onClick={() => router.push('/lots')}
          >
            Yard Lots
          </Button>
          <Button
            variant="secondary"
            icon={<ScanLine className="w-4 h-4" />}
            onClick={() => router.push('/purchases/scan')}
          >
            Scan Consignment
          </Button>
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => router.push('/purchases/new')}
          >
            New Consignment Purchase
          </Button>
        </div>
      </div>

      {draft && (
        <Card variant="lowest" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold font-display text-on-surface">Unconfirmed lot draft</p>
            <p className="text-xs text-on-surface-variant mt-1">
              {draftLotNumber(draft) || 'New consignment'} · {draft.items.length} qualities · saved on this device, not on the vendor bill yet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => { clearPurchaseDraft(); setDraft(null); }}>
              Discard
            </Button>
            <Button variant="primary" onClick={() => router.push('/purchases/new')}>
              Continue draft
            </Button>
          </div>
        </Card>
      )}

      {/* Search Bar */}
      <div className="max-w-md">
        <Input
          placeholder="Search bill number, vendor, or lot..."
          icon={<Search className="w-4 h-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Purchases Table */}
      <Card variant="lowest" padding="none" className="overflow-hidden">
        <div className="divide-y divide-surface-container-low">
          {filtered.map(pur => {
            const totalBags = pur.items.reduce((acc, i) => acc + i.bags, 0);
            const totalWeight = pur.items.reduce((acc, i) => acc + i.weightKg, 0);
            const productName = pur.productName || lotProductLabel(pur, products);

            return (
              <div
                key={pur.id}
                onClick={() => router.push(`/purchases/${pur.id}`)}
                className="p-5 sm:px-6 hover:bg-surface-container-low/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary font-display">{pur.billNumber}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-fixed text-primary-on-fixed">
                      {pur.lotNumber}
                    </span>
                    <span className="text-xs text-on-surface-variant">• {pur.date}</span>
                    <Chip
                      label={isPendingReceipt(pur) ? 'Pending receipt' : 'In stock'}
                      size="sm"
                      variant={isPendingReceipt(pur) ? 'tertiary' : 'success'}
                    />
                  </div>
                  <h3 className="text-base font-bold font-display text-on-surface mt-1">{productName} • {pur.vendorName}</h3>
                  <div className="text-xs text-on-surface-variant font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{totalBags} bags</span>
                    <span>•</span>
                    <span>{totalWeight.toLocaleString('en-IN')} KG</span>
                    <span>•</span>
                    <span>{pur.items.map(i => `${i.markCode}: ${i.bags}b`).join(', ')}</span>
                  </div>
                </div>

                {/* Right Value & CTA */}
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold">Total Inward Bill</span>
                    <div className="text-base font-extrabold font-display text-on-surface">
                      ₹{pur.netAmount.toLocaleString('en-IN')}
                    </div>
                    {pur.totalExpenses > 0 && (
                      <span className="text-[10px] text-on-surface-variant">Incl. ₹{pur.totalExpenses.toLocaleString('en-IN')} scale, term, loading</span>
                    )}
                  </div>
                  {isPendingReceipt(pur) && (
                    <Button
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/purchases/${pur.id}/receive`);
                      }}
                    >
                      Receive Lot
                    </Button>
                  )}
                  <ChevronRight className="w-5 h-5 text-on-surface-variant" />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
