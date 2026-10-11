'use client';

import { useSession } from '@/store/session/session-provider';
import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { useRouter } from 'next/navigation';
import { can } from '@/auth/permissions';
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { 
  Layers, Search, PlusCircle, Package, ArrowRight, Truck 
} from 'lucide-react';

export const LotList: React.FC = () => {
  const { currentUser } = useSession();
  const { data: lots = [] } = useLotsQuery();
  const [search, setSearch] = useState('');
  const router = useRouter();
  const filtered = lots.filter(l =>
    l.lotNumber.toLowerCase().includes(search.toLowerCase()) ||
    l.vendorName.toLowerCase().includes(search.toLowerCase()) ||
    l.marks.some(m => m.markCode.toLowerCase().includes(search.toLowerCase()))
  );

  const totalRemainingBags = lots.reduce((acc, l) => acc + l.remainingBags, 0);
  const totalRemainingKg = lots.reduce((acc, l) => acc + l.remainingWeightKg, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Yard Lots Inventory
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {lots.length} consignment lots • {totalRemainingBags} bags ({totalRemainingKg.toLocaleString('en-IN')} KG) available on floor
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<Package className="w-4 h-4" />}
            onClick={() => router.push('/stock')}
          >
            Stock Movement History
          </Button>
          {can(currentUser.role, 'viewPurchaseCost') && (
            <Button
              variant="primary"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={() => router.push('/purchases/new')}
            >
              New Consignment Lot
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search lot (e.g. LOT AP), vendor, or mark..."
          icon={<Search className="w-4 h-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Lot Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(lot => {
          const usedBags = lot.totalBags - lot.remainingBags;
          const soldPercentage = Math.round((usedBags / (lot.totalBags || 1)) * 100);

          return (
            <Card
              key={lot.id}
              variant="lowest"
              hoverable
              onClick={() => router.push(`/lots/${lot.id}`)}
              className="flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-extrabold font-display text-primary">{lot.lotNumber}</span>
                  <Chip
                    label={lot.status}
                    size="sm"
                    variant={lot.status === 'ACTIVE' ? 'success' : 'neutral'}
                  />
                </div>

                <h3 className="text-sm font-bold font-display text-on-surface mt-2">{lot.vendorName}</h3>
                <p className="text-xs text-on-surface-variant font-medium">
                  Arrived: {lot.arrivalDate} • Ref: {lot.purchaseBillNo}
                </p>

                {/* Progress bar of stock consumed */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-on-surface-variant font-medium">Remaining Bags:</span>
                    <span className="font-extrabold font-display text-on-surface">
                      {lot.remainingBags} / {lot.totalBags} bags
                    </span>
                  </div>
                  <div className="academic-progress-track">
                    <div 
                      className="academic-progress-fill" 
                      style={{ width: `${Math.max(5, 100 - soldPercentage)}%` }} 
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-on-surface-variant mt-1">
                    <span>{soldPercentage}% Dispatched</span>
                    <span>{lot.remainingWeightKg.toLocaleString('en-IN')} KG left</span>
                  </div>
                </div>

                {/* Mark Badges */}
                <div className="mt-4 pt-3 border-t border-surface-container-low">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-2">
                    Quality Marks Breakdown:
                  </span>
                  <div className="space-y-1.5">
                    {lot.marks.map(m => (
                      <div key={m.markCode} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-primary font-display">Grade {m.markCode}</span>
                        <span className="text-on-surface font-medium">
                          {m.remainingBags} bags • {m.remainingWeightKg} KG
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-surface-container-low flex items-center justify-between text-xs">
                <span className="text-primary font-bold">Inspect Bag Details</span>
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
