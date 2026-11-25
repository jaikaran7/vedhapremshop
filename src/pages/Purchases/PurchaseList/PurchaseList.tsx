'use client';

import { useSession } from '@/store/session/session-provider';
import { usePurchasesPageQuery, usePurchasesQuery } from '@/hooks/queries/use-purchases-query';
import { useVendorsQuery } from '@/hooks/queries/use-vendors-query';
import { useT } from '@/store/preferences/language';
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
  Calendar, Layers, IndianRupee, ScanLine, X
} from 'lucide-react';
import { qualityOnLot, gradeOnLots } from '@/utils/lot-mark';

/** Consignments shown at first; more are asked for from the server when needed. */
const RECENT = 5;
const MORE = 20;

export const PurchaseList: React.FC = () => {
  const { currentUser } = useSession();
  const t = useT();
  const { data: products = [] } = useProductsQuery();
  const { data: vendors = [] } = useVendorsQuery();
  const [search, setSearch] = useState('');
  const [typed, setTyped] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [productId, setProductId] = useState('');
  const [limit, setLimit] = useState(RECENT);
  const [draft, setDraft] = useState<PurchaseDraft | null>(null);
  // Search waits for a short pause in typing so every key press does not ask the server.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(typed), 300);
    return () => window.clearTimeout(timer);
  }, [typed]);
  // Any change to the filters starts again from the newest few.
  useEffect(() => { setLimit(RECENT); }, [search, from, to, vendorId, productId]);
  const filters = React.useMemo(
    () => ({ from: from || undefined, to: to || undefined, vendorId: vendorId || undefined, productId: productId || undefined, q: search || undefined }),
    [from, to, vendorId, productId, search],
  );
  const filtered = Boolean(from || to || vendorId || productId || search);
  const { data: page, isLoading, isError, isFetching } = usePurchasesPageQuery(filters, limit);
  const purchases = React.useMemo(() => page?.rows ?? [], [page]);
  const total = page?.total ?? 0;
  // Only a saved-or-not check on the local draft needs the whole list, so it is fetched only while a draft exists.
  const { data: allPurchases = [] } = usePurchasesQuery(draft !== null);
  const clearFilters = () => { setTyped(''); setSearch(''); setFrom(''); setTo(''); setVendorId(''); setProductId(''); };
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
    const saved = allPurchases.some((purchase) => purchase.billNumber === draft.billNumber && purchase.lotNumber.toUpperCase() === lotNumber);
    if (saved) clearPurchaseDraft();
  }, [draft, allPurchases]);
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


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Consignment Purchases
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {filtered ? `${total} ${t('consignments match your filters')}` : `${total} ${t('consignments in all')} • ${t('showing the latest')} ${Math.min(limit, total)}`}
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

      {/* Filters: the server narrows the list, so only matching consignments are loaded. */}
      <div className="grid grid-cols-2 md:grid-cols-[minmax(0,1fr)_10rem_10rem_12rem_10rem] gap-3 items-end">
        <div className="col-span-2 md:col-span-1">
        <Input
          placeholder="Search bill number, vendor, or lot..."
          icon={<Search className="w-4 h-4" />}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        </div>
        <Input label={t('From')} type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        <Input label={t('To')} type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="academic-input py-3 px-4 text-xs font-semibold rounded-2xl w-full cursor-pointer" aria-label="Vendor">
          <option value="">{t('All vendors')}</option>
          {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
        </select>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="academic-input py-3 px-4 text-xs font-semibold rounded-2xl w-full cursor-pointer" aria-label="Item">
          <option value="">{t('All items')}</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
      </div>
      {filtered && (
        <button type="button" onClick={clearFilters} className="text-xs font-bold text-primary inline-flex items-center gap-1 cursor-pointer">
          <X className="w-3.5 h-3.5" /> {t('Clear filters')}
        </button>
      )}

      {/* Purchases Table */}
      <Card variant="lowest" padding="none" className="overflow-hidden">
        {isLoading && <p className="p-8 text-sm text-on-surface-variant text-center">Loading consignments…</p>}
        {isError && <p className="p-8 text-sm text-danger text-center">Could not load the consignments. Check the connection and try again.</p>}
        {!isLoading && !isError && purchases.length === 0 && (
          <p className="p-8 text-sm text-on-surface-variant text-center">{filtered ? t('No consignments match these filters.') : t('No consignments yet.')}</p>
        )}
        <div className="divide-y divide-surface-container-low">
          {purchases.map(pur => {
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
                    <span>{pur.items.map(i => `${qualityOnLot(i.markCode, pur.lotNumber, pur.items.map((x) => x.markCode))}: ${i.bags}b`).join(', ')}</span>
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
        {total > purchases.length && (
          <div className="p-4 text-center border-t border-surface-container-low">
            <Button variant="secondary" onClick={() => setLimit((current) => current + MORE)} disabled={isFetching}>
              {t('Show more')} ({total - purchases.length} {t('more')})
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
