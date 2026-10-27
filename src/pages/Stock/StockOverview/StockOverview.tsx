'use client';

import { useSession } from '@/store/session/session-provider';
import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { useMarksQuery } from '@/hooks/queries/use-directory-query';
import { useStockMovementsPageQuery } from '@/hooks/queries/use-stock-query';
import { useCreateStockAdjustmentMutation } from '@/hooks/mutations/use-stock-mutations';
import { useAddOpeningStockMutation } from '@/hooks/mutations/use-stock-mutations';
import { useRouter } from 'next/navigation';
import { can } from '@/auth/permissions';
import React, { useState } from 'react';
import type { StockMovement } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberField } from '@/components/ui/NumberField';
import { Select } from '@/components/ui/Select';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { 
  Package, Layers, Search, PlusCircle, ArrowUpDown, 
  RotateCcw, SlidersHorizontal, ArrowDownLeft, ArrowUpRight 
} from 'lucide-react';

/** Movements that bring bags into the yard; the rest take them out. */
function isStockIn(type: StockMovement['type']): boolean {
  return type === 'PURCHASE_IN' || type === 'OPENING_STOCK' || type === 'ADJUSTMENT_ADD' || type === 'SALE_REVERSAL';
}

export const StockOverview: React.FC = () => {
  const { currentUser } = useSession();
  const { data: lots = [] } = useLotsQuery();
  const { data: marks = [] } = useMarksQuery();
  const createStockAdjustmentMutation = useCreateStockAdjustmentMutation();
  const createStockAdjustment = (data: Parameters<typeof createStockAdjustmentMutation.mutateAsync>[0]) => createStockAdjustmentMutation.mutateAsync(data);
  const addOpeningStockMutation = useAddOpeningStockMutation();
  const addOpeningStock = (lotNumber: string, markCode: string, bags: number, weightKg: number) => addOpeningStockMutation.mutateAsync({ lotNumber, markCode, bags, weightKg });
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'byLot' | 'byMark' | 'movements'>('byLot');
  const [search, setSearch] = useState('');
  // Movement history is filtered and paged on the server; "Load more" asks for a longer page.
  const [moveLot, setMoveLot] = useState('');
  const [moveType, setMoveType] = useState('');
  const [moveFrom, setMoveFrom] = useState('');
  const [moveTo, setMoveTo] = useState('');
  const [moveLimit, setMoveLimit] = useState(100);
  const { data: movementPage } = useStockMovementsPageQuery(
    { lotNumber: moveLot || undefined, types: moveType ? [moveType as StockMovement['type']] : undefined, from: moveFrom || undefined, to: moveTo || undefined },
    moveLimit,
    activeTab === 'movements',
  );
  const stockMovements = movementPage?.rows ?? [];
  const movementTotal = movementPage?.total ?? 0;

  // Modals for Stock Adjustment and Opening Stock
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjLot, setAdjLot] = useState(lots[0]?.lotNumber || 'LOT AP');
  const [adjMark, setAdjMark] = useState('AA');
  const [adjType, setAdjType] = useState<'ADD' | 'REDUCE'>('ADD');
  const [adjBags, setAdjBags] = useState(2);
  const [adjWeight, setAdjWeight] = useState(100);
  const [adjReason, setAdjReason] = useState('Weighbridge calibration discrepancy');

  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [opLot, setOpLot] = useState('LOT AP');
  const [opMark, setOpMark] = useState('AA');
  const [opBags, setOpBags] = useState(50);
  const [opWeight, setOpWeight] = useState(2500);

  const totalBags = lots.reduce((acc, l) => acc + l.remainingBags, 0);
  const totalWeightKg = lots.reduce((acc, l) => acc + l.remainingWeightKg, 0);

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStockAdjustment({
        date: new Date().toISOString().split('T')[0],
        lotNumber: adjLot,
        markCode: adjMark,
        type: adjType,
        bags: Number(adjBags),
        weightKg: Number(adjWeight),
        reason: adjReason
      });
      toast({
        type: 'success',
        title: 'Stock Adjustment Applied',
        message: `${adjType === 'ADD' ? '+' : '-'}${adjBags} bags on ${adjLot} (${adjMark})`
      });
      setShowAdjustmentModal(false);
    } catch (error) {
      toast({ type: 'error', title: 'Adjustment not saved', message: error instanceof Error ? error.message : 'Try again.' });
    }
  };

  const handleOpeningStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addOpeningStock(opLot, opMark, Number(opBags), Number(opWeight));
      toast({
        type: 'success',
        title: 'Opening Stock Added',
        message: `Added ${opBags} bags to ${opLot} [${opMark}]`
      });
      setShowOpeningModal(false);
    } catch (error) {
      toast({ type: 'error', title: 'Opening stock not saved', message: error instanceof Error ? error.message : 'Try again.' });
    }
  };

  // A grade card exists only while that grade still has bags or weight in a lot.
  const stockByMark = lots.reduce<Array<{
    code: string;
    name: string;
    qualityGrade: string;
    rate: number | null;
    totalBags: number;
    totalWeightKg: number;
    lots: { lotNumber: string; bags: number; kg: number }[];
  }>>((rows, lot) => {
    lot.marks.forEach((line) => {
      if (line.remainingBags <= 0 && line.remainingWeightKg <= 0.05) return;
      const master = marks.find((mark) => mark.code === line.markCode);
      const existing = rows.find((row) => row.code === line.markCode);
      const lotLine = { lotNumber: lot.lotNumber, bags: line.remainingBags, kg: line.remainingWeightKg };
      if (existing) {
        existing.totalBags += line.remainingBags;
        existing.totalWeightKg += line.remainingWeightKg;
        existing.lots.push(lotLine);
        return;
      }
      rows.push({
        code: line.markCode,
        name: master?.name ?? `Grade ${line.markCode}`,
        qualityGrade: master?.qualityGrade ?? '',
        rate: master?.defaultSellingRate ?? line.finalizedSellingRate ?? null,
        totalBags: line.remainingBags,
        totalWeightKg: line.remainingWeightKg,
        lots: [lotLine],
      });
    });
    return rows;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
            Mandi Stock & Movements
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Live yard inventory • {totalBags} bags • {(totalWeightKg / 1000).toFixed(1)} MT ({totalWeightKg.toLocaleString('en-IN')} KG)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {can(currentUser.role, 'viewPurchaseCost') && (
            <>
              <Button
                variant="secondary"
                icon={<SlidersHorizontal className="w-4 h-4" />}
                onClick={() => setShowAdjustmentModal(true)}
              >
                Stock Adjustment
              </Button>
              <Button
                variant="secondary"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={() => setShowOpeningModal(true)}
              >
                Opening Stock
              </Button>
            </>
          )}
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => router.push('/sales/new')}
          >
            New Sale
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-container-low pb-2">
        <button
          onClick={() => setActiveTab('byLot')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'byLot' ? 'bg-primary text-white shadow-ambient' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          Stock by Lot ({lots.length})
        </button>
        <button
          onClick={() => setActiveTab('byMark')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'byMark' ? 'bg-primary text-white shadow-ambient' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          Stock by Quality Mark ({stockByMark.length})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'movements' ? 'bg-primary text-white shadow-ambient' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          Movement History{movementPage ? ` (${movementTotal})` : ''}
        </button>
      </div>

      {/* TAB 1: Stock by Lot */}
      {activeTab === 'byLot' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lots.map(lot => (
            <Card key={lot.id} variant="lowest" className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold font-display text-primary">{lot.lotNumber}</span>
                  <Chip label={lot.status} size="sm" variant={lot.status === 'ACTIVE' ? 'success' : 'neutral'} />
                </div>
                <h4 className="text-xs font-bold text-on-surface mt-1">{lot.vendorName}</h4>
                <p className="text-[11px] text-on-surface-variant">Arrival: {lot.arrivalDate} • Bill: {lot.purchaseBillNo}</p>

                <div className="mt-4 p-3 rounded-2xl bg-surface-container-low flex justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold">Remaining Bags</span>
                    <div className="text-lg font-extrabold font-display text-on-surface">{lot.remainingBags} bags</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold">Weight Available</span>
                    <div className="text-lg font-extrabold font-display text-primary">{lot.remainingWeightKg.toLocaleString('en-IN')} KG</div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Mark Breakdown:</span>
                  {lot.marks.map(m => (
                    <div key={m.markCode} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-primary">Grade {m.markCode}</span>
                      <span className="text-on-surface font-medium">
                        {m.remainingBags} bags ({m.remainingWeightKg} KG)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-surface-container-low flex items-center justify-between">
                <Button size="sm" variant="secondary" onClick={() => router.push(`/lots/${lot.id}`)}>
                  Lot Details
                </Button>
                <Button size="sm" variant="primary" onClick={() => router.push(`/sales/new?lotNumber=${encodeURIComponent(lot.lotNumber)}`)}>
                  Sell Lot
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 2: Stock by Mark */}
      {activeTab === 'byMark' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stockByMark.length === 0 && (
            <p className="text-sm text-on-surface-variant col-span-full">No grade has stock yet. A grade appears here after a lot is received with that quality.</p>
          )}
          {stockByMark.map(item => (
            <Card key={item.code} variant="lowest">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-surface-container-high text-primary font-extrabold font-display text-xs flex items-center justify-center">
                    {item.code}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold font-display text-on-surface">{item.name}</h3>
                    {item.qualityGrade && <span className="text-[10px] text-on-surface-variant">{item.qualityGrade}</span>}
                  </div>
                </div>
                {item.rate != null && (
                  <div className="text-right">
                    <span className="text-xs font-bold text-primary">₹{item.rate.toFixed(2)}/kg</span>
                  </div>
                )}
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-surface-container-low flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase">Total Bags</span>
                  <div className="text-xl font-extrabold font-display text-on-surface">{item.totalBags} Bags</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase">Total Weight</span>
                  <div className="text-xl font-extrabold font-display text-primary">{item.totalWeightKg.toLocaleString('en-IN')} KG</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-surface-container-low">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Available across Lots:</span>
                <div className="space-y-1 text-xs">
                  {item.lots.map(l => (
                    <div key={l.lotNumber} className="flex items-center justify-between">
                      <span className="font-semibold text-on-surface">{l.lotNumber}</span>
                      <span className="text-on-surface-variant">{l.bags} bags ({l.kg} KG)</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 3: Movement History */}
      {activeTab === 'movements' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <Select
              label="Lot"
              value={moveLot}
              onChange={(e) => { setMoveLot(e.target.value); setMoveLimit(100); }}
              options={[{ value: '', label: 'All lots' }, ...lots.map((l) => ({ value: l.lotNumber, label: l.lotNumber }))]}
            />
            <Select
              label="Type"
              value={moveType}
              onChange={(e) => { setMoveType(e.target.value); setMoveLimit(100); }}
              options={[
                { value: '', label: 'All types' },
                { value: 'PURCHASE_IN', label: 'Purchase received' },
                { value: 'SALE_OUT', label: 'Sale' },
                { value: 'SALE_REVERSAL', label: 'Sale reversed' },
                { value: 'ADJUSTMENT_ADD', label: 'Adjustment (+)' },
                { value: 'ADJUSTMENT_SUB', label: 'Adjustment (−)' },
                { value: 'OPENING_STOCK', label: 'Opening stock' },
              ]}
            />
            <Input label="From" type="date" value={moveFrom} onChange={(e) => { setMoveFrom(e.target.value); setMoveLimit(100); }} />
            <Input label="To" type="date" value={moveTo} onChange={(e) => { setMoveTo(e.target.value); setMoveLimit(100); }} />
            <Button variant="secondary" onClick={() => { setMoveLot(''); setMoveType(''); setMoveFrom(''); setMoveTo(''); setMoveLimit(100); }}>Clear filters</Button>
          </div>
        <Card variant="lowest" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Lot & Mark</th>
                  <th className="py-3 px-4">Details / Reference</th>
                  <th className="py-3 px-4 text-right">Bags</th>
                  <th className="py-3 px-4 text-right">Weight (KG)</th>
                  <th className="py-3 px-4">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {stockMovements.map(sm => (
                  <tr key={sm.id} className="hover:bg-surface-container-low/30">
                    <td className="py-3.5 px-4 font-semibold text-on-surface whitespace-nowrap">{sm.date}</td>
                    <td className="py-3.5 px-4">
                      <Chip
                        label={sm.type}
                        size="sm"
                        variant={sm.type === 'PURCHASE_IN' ? 'primary' : sm.type === 'SALE_OUT' ? 'tertiary' : 'neutral'}
                      />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-primary">
                      {sm.lotNumber} [{sm.markCode}]
                    </td>
                    <td className="py-3.5 px-4 text-on-surface font-medium">{sm.reason}</td>
                    <td className={`py-3.5 px-4 text-right font-extrabold ${isStockIn(sm.type) ? 'text-primary' : 'text-danger'}`}>
                      {isStockIn(sm.type) ? '+' : '-'}{sm.bags}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-extrabold ${isStockIn(sm.type) ? 'text-primary' : 'text-danger'}`}>
                      {isStockIn(sm.type) ? '+' : '-'}{sm.weightKg} KG
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant font-medium">{sm.performedBy}</td>
                  </tr>
                ))}
                {stockMovements.length === 0 && (
                  <tr><td colSpan={7} className="py-6 px-4 text-center text-on-surface-variant">No movements match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Showing {stockMovements.length} of {movementTotal} movements</span>
            {stockMovements.length < movementTotal && (
              <Button variant="secondary" size="sm" onClick={() => setMoveLimit((limit) => limit + 100)}>Load 100 more</Button>
            )}
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        title="Stock Adjustment Entry"
        subtitle="Scale reconciliation or moisture loss calibration"
      >
        <form onSubmit={handleCreateAdjustment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Yard Lot"
              value={adjLot}
              onChange={(e) => setAdjLot(e.target.value)}
              options={lots.map(l => ({ value: l.lotNumber, label: l.lotNumber }))}
            />
            <Select
              label="Mark Grade"
              value={adjMark}
              onChange={(e) => setAdjMark(e.target.value)}
              options={marks.map(m => ({ value: m.code, label: `Grade ${m.code}` }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Action"
              value={adjType}
              onChange={(e) => setAdjType(e.target.value as any)}
              options={[
                { value: 'ADD', label: '+ Add Stock' },
                { value: 'REDUCE', label: '- Deduct Stock' }
              ]}
            />
            <NumberField
              label="Bags"
              allowDecimal={false}
              value={adjBags}
              onValueChange={setAdjBags}
              required
            />
            <NumberField
              label="Weight (KG)"
              value={adjWeight}
              onValueChange={setAdjWeight}
              required
            />
          </div>

          <Input
            label="Reason / Calibration Audit Note"
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAdjustmentModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={createStockAdjustmentMutation.isPending}>Confirm Adjustment</Button>
          </div>
        </form>
      </Modal>

      {/* Opening Stock Modal */}
      <Modal
        isOpen={showOpeningModal}
        onClose={() => setShowOpeningModal(false)}
        title="Physical Opening Stock Entry"
        subtitle="Initial season stock count reconciliation"
      >
        <form onSubmit={handleOpeningStock} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Lot Number"
              value={opLot}
              onChange={(e) => setOpLot(e.target.value)}
              required
            />
            <Select
              label="Mark Grade"
              value={opMark}
              onChange={(e) => setOpMark(e.target.value)}
              options={marks.map(m => ({ value: m.code, label: `Grade ${m.code}` }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Opening Bags"
              allowDecimal={false}
              value={opBags}
              onValueChange={setOpBags}
              required
            />
            <NumberField
              label="Opening Weight (KG)"
              value={opWeight}
              onValueChange={setOpWeight}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowOpeningModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={addOpeningStockMutation.isPending}>Save Opening Stock</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
