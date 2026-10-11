'use client';

import { useSession } from '@/store/session/session-provider';
import { useCustomersQuery } from '@/hooks/queries/use-customers-query';
import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { useMarksQuery } from '@/hooks/queries/use-directory-query';
import { useCreateSaleMutation } from '@/hooks/mutations/use-sale-mutations';
import { useSaleChargeSettingsQuery } from '@/hooks/queries/use-directory-query';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { can } from '@/auth/permissions';
import { saleLineAmount } from '@/utils/trading';
import { calculateSaleCharges } from '@/utils/sale-charges';
import { formatRupee } from '@/utils/settlement';
import type { SaleSettlement } from '@/utils/settlement';
import { TRADING_SESSION_DATE } from '@/constants/session';
import { PaymentSettlement } from '@/pages/Sales/NewSaleWorkflow/PaymentSettlement';
import { InvoiceChargeSummary } from '@/pages/Sales/NewSaleWorkflow/InvoiceChargeSummary';
import React, { useMemo, useState } from 'react';
import { SaleItem, SaleItemBag } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { 
  Scale, PlusCircle, Trash2, ArrowLeft, CheckCircle2, 
  Users, Layers, ArrowRight, Printer, AlertTriangle, 
  Calculator, Edit, Delete, RefreshCw, Sparkles 
} from 'lucide-react';

export const NewSaleWorkflow: React.FC = () => {
  const { currentUser } = useSession();
  const { data: customers = [] } = useCustomersQuery();
  const { data: lots = [] } = useLotsQuery();
  const { data: marks = [] } = useMarksQuery();
  const createSaleMutation = useCreateSaleMutation();
  const { data: chargeSettings } = useSaleChargeSettingsQuery();
  const createSale = (data: Parameters<typeof createSaleMutation.mutateAsync>[0]) => createSaleMutation.mutateAsync(data);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Query parameter defaults
  const preCustomerId = searchParams?.get('customerId') || (customers[0]?.id || '');
  const preLotNumber = searchParams?.get('lotNumber') || (lots[0]?.lotNumber || 'LOT AP');
  const preMarkCode = searchParams?.get('markCode') || 'AA';

  const [customerId, setCustomerId] = useState(preCustomerId);
  const [notes, setNotes] = useState('');

  // Multi-quality item list
  const [saleItems, setSaleItems] = useState<{
    id: string;
    lotNumber: string;
    markCode: string;
    ratePerKg: number;
    bags: SaleItemBag[];
  }[]>([
    {
      id: 'item-1',
      lotNumber: preLotNumber,
      markCode: preMarkCode,
      ratePerKg: 69.00,
      bags: [
        { bagNumber: 1, weightKg: 50 },
        { bagNumber: 2, weightKg: 53 },
        { bagNumber: 3, weightKg: 48 }
      ]
    }
  ]);

  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [step, setStep] = useState<'entry' | 'review' | 'settlement'>('entry');
  const [quickWeightInput, setQuickWeightInput] = useState('');
  
  // Bag edit state
  const [editingBagIdx, setEditingBagIdx] = useState<number | null>(null);
  const [editingBagWeight, setEditingBagWeight] = useState<number>(50);

  // Selected customer
  const selectedCustomer = customers.find(c => c.id === customerId);

  // Bag Weight Operations
  const addBag = (weight: number) => {
    if (!weight || isNaN(weight) || weight <= 0) {
      toast({ type: 'error', title: 'Invalid Weight', message: 'Bag weight must be positive' });
      return;
    }
    setSaleItems(prev => {
      const copy = [...prev];
      const cur = copy[activeItemIndex];
      const newBag: SaleItemBag = {
        bagNumber: cur.bags.length + 1,
        weightKg: Number(weight)
      };
      copy[activeItemIndex] = {
        ...cur,
        bags: [...cur.bags, newBag]
      };
      return copy;
    });
    setQuickWeightInput('');
  };

  const removeBag = (idx: number) => {
    setSaleItems(prev => {
      const copy = [...prev];
      const cur = copy[activeItemIndex];
      const filtered = cur.bags.filter((_, i) => i !== idx);
      const renumbered = filtered.map((b, i) => ({ ...b, bagNumber: i + 1 }));
      copy[activeItemIndex] = { ...cur, bags: renumbered };
      return copy;
    });
  };

  const saveEditedBag = () => {
    if (editingBagIdx === null) return;
    if (editingBagWeight <= 0) {
      toast({ type: 'error', title: 'Invalid Weight', message: 'Weight must be greater than zero' });
      return;
    }
    setSaleItems(prev => {
      const copy = [...prev];
      const cur = copy[activeItemIndex];
      const bags = [...cur.bags];
      bags[editingBagIdx] = { ...bags[editingBagIdx], weightKg: Number(editingBagWeight) };
      copy[activeItemIndex] = { ...cur, bags };
      return copy;
    });
    setEditingBagIdx(null);
  };

  const clearAllBags = () => {
    setSaleItems(prev => {
      const copy = [...prev];
      copy[activeItemIndex] = { ...copy[activeItemIndex], bags: [] };
      return copy;
    });
  };

  // Multi-quality operations
  const addQualityMark = () => {
    const nextMark = marks.find(m => !saleItems.some(i => i.markCode === m.code)) || marks[1] || marks[0];
    const newItem = {
      id: 'item-' + Date.now(),
      lotNumber: preLotNumber,
      markCode: nextMark.code,
      ratePerKg: nextMark.defaultSellingRate,
      bags: [
        { bagNumber: 1, weightKg: 49 },
        { bagNumber: 2, weightKg: 49 }
      ]
    };
    setSaleItems(prev => [...prev, newItem]);
    setActiveItemIndex(saleItems.length);
  };

  const removeQualityMark = (idx: number) => {
    if (saleItems.length <= 1) {
      toast({ type: 'error', title: 'Cannot Remove', message: 'At least one quality grade is required' });
      return;
    }
    setSaleItems(prev => prev.filter((_, i) => i !== idx));
    setActiveItemIndex(0);
  };

  // Calculations
  const calculatedItems: SaleItem[] = saleItems.map(item => {
    const bagsCount = item.bags.length;
    const totalWeight = item.bags.reduce((acc, b) => acc + b.weightKg, 0);
    const amount = saleLineAmount(totalWeight, item.ratePerKg);
    return {
      id: item.id,
      markCode: item.markCode,
      lotNumber: item.lotNumber,
      bags: bagsCount,
      weightKg: totalWeight,
      ratePerKg: item.ratePerKg,
      amount,
      bagWeights: item.bags
    };
  });

  const grandTotalBags = calculatedItems.reduce((acc, i) => acc + i.bags, 0);
  const grandTotalWeightKg = calculatedItems.reduce((acc, i) => acc + i.weightKg, 0);
  const grandTotalAmount = calculatedItems.reduce((acc, i) => acc + i.amount, 0);
  const invoiceCharges = useMemo(() => calculateSaleCharges({
    totalBags: grandTotalBags,
    productSubtotal: grandTotalAmount,
    settings: chargeSettings,
  }), [grandTotalBags, grandTotalAmount, chargeSettings]);

  const currentItem = saleItems[activeItemIndex] || saleItems[0];
  const currentCalc = calculatedItems[activeItemIndex] || calculatedItems[0];

  // Selected lot remaining stock check
  const selectedLot = lots.find(l => l.lotNumber.toUpperCase() === currentItem.lotNumber.toUpperCase());
  const selectedLotMark = selectedLot?.marks.find(m => m.markCode === currentItem.markCode);
  const availableBagsInLot = selectedLotMark ? selectedLotMark.remainingBags : (selectedLot?.remainingBags || 0);

  const isOverCreditLimit = selectedCustomer && selectedCustomer.outstandingAmount > selectedCustomer.creditLimit;

  // Touch keypad buttons for tablets
  const handleKeypadPress = (val: string) => {
    if (val === 'CLEAR') {
      setQuickWeightInput('');
    } else if (val === 'BACK') {
      setQuickWeightInput(prev => prev.slice(0, -1));
    } else if (val === 'ENTER') {
      addBag(Number(quickWeightInput));
    } else {
      setQuickWeightInput(prev => prev + val);
    }
  };

  const openReview = () => {
    if (!selectedCustomer) {
      toast({ type: 'error', title: 'Customer Required', message: 'Please select a wholesale customer' });
      return;
    }
    if (grandTotalBags === 0 || grandTotalWeightKg === 0) {
      toast({ type: 'error', title: 'Weighment Empty', message: 'Please enter bag weights on scale' });
      return;
    }
    setStep('review');
  };

  const handleConfirmSale = async (settlement: SaleSettlement) => {
    if (!selectedCustomer) {
      toast({ type: 'error', title: 'Customer Required', message: 'Please select a wholesale customer' });
      return;
    }

    const now = new Date();
    const created = await createSale({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      customerAddress: selectedCustomer.address,
      date: TRADING_SESSION_DATE,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      items: calculatedItems,
      totalBags: grandTotalBags,
      totalWeightKg: grandTotalWeightKg,
      productSubtotal: invoiceCharges.productSubtotal,
      charges: invoiceCharges,
      totalAmount: invoiceCharges.finalInvoiceAmount,
      paymentType: settlement.paymentType,
      paymentStatus: settlement.paymentStatus,
      tenders: settlement.tenders,
      creditDays: settlement.creditDays,
      dueDate: settlement.dueDate,
      paidAmount: settlement.paidAmount,
      balanceDue: settlement.balanceDue,
      status: 'CONFIRMED',
      createdByUserId: currentUser.id,
      createdByName: currentUser.name,
      createdByRole: currentUser.role,
      notes
    });

    toast({
      type: 'success',
      title: 'Bill Confirmed & Stock Dispatched!',
      message: `${created.billNumber} created: ${grandTotalBags} bags (${grandTotalWeightKg} KG) — ₹${formatRupee(created.totalAmount)}`
    });

    router.push(`/sales/${created.id}/bill`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (step === 'settlement') setStep('review');
              else if (step === 'review') setStep('entry');
              else router.back();
            }}
            className="p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-on-surface tracking-tight">
                {step === 'settlement' ? 'Payment & Settlement' : step === 'review' ? 'Confirm Wholesale Sale Bill' : 'Floor Weighment & Sale'}
              </h1>
              <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-fixed text-primary-on-fixed">
                Digital Scale
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Live scale weighment • Bag tare logging • Dynamic subtotals • APMC Tax Bill
            </p>
          </div>
        </div>

        {step === 'settlement' ? (
          <Button
            type="submit"
            form="sale-settlement"
            variant="primary"
            size="lg"
            icon={<CheckCircle2 className="w-5 h-5" />}
            isLoading={createSaleMutation.isPending}
          >
            Complete Sale
          </Button>
        ) : step === 'review' ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={() => setStep('entry')}>
              Edit Weighment
            </Button>
            <Button variant="primary" size="lg" onClick={() => setStep('settlement')} icon={<ArrowRight className="w-5 h-5" />}>
              Payment & Settlement
            </Button>
          </div>
        ) : (
          <Button 
            variant="primary" 
            size="lg" 
            onClick={openReview}
            icon={<ArrowRight className="w-5 h-5" />}
            className="w-full sm:w-auto"
          >
            Review Bill (₹{grandTotalAmount.toLocaleString('en-IN')})
          </Button>
        )}
      </div>

      {step === 'entry' ? (
        <div className="space-y-6">
          {/* Top Layer: Customer Selection & Account Health Bar */}
          <Card variant="lowest" padding="md">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Customer Selector */}
              <div className="md:col-span-8">
                <Select
                  label="Select Wholesale Customer / Party"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  options={customers.map(c => ({
                    value: c.id,
                    label: `${c.name} (${c.marketLocation}) — Due: ₹${c.outstandingAmount.toLocaleString('en-IN')}`
                  }))}
                  required
                />
              </div>

              {/* Previous outstanding, not the payment for this bill */}
              <div className="md:col-span-4 p-3.5 rounded-2xl bg-surface-container-low flex flex-col justify-center">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-on-surface-variant">
                  <span>Previous Outstanding</span>
                </div>
                <div className={`text-base font-extrabold font-display mt-0.5 ${isOverCreditLimit ? 'text-danger' : 'text-on-surface'}`}>
                  ₹{selectedCustomer?.outstandingAmount.toLocaleString('en-IN')}
                </div>
                {isOverCreditLimit && (
                  <span className="text-[10px] text-danger font-semibold flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-3 h-3" /> Exceeds ₹{selectedCustomer?.creditLimit.toLocaleString('en-IN')} limit
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Multi-Quality Tabs Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {saleItems.map((item, idx) => {
                const itemCalc = calculatedItems[idx];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveItemIndex(idx)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeItemIndex === idx
                        ? 'bg-primary text-white shadow-ambient'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span>Grade {item.markCode}</span>
                    <span className="opacity-80">({itemCalc.bags}b • {itemCalc.weightKg} KG • ₹{itemCalc.amount.toLocaleString('en-IN')})</span>
                    {saleItems.length > 1 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          removeQualityMark(idx);
                        }}
                        className="p-1 hover:text-danger rounded-full"
                        title="Remove grade"
                      >
                        ×
                      </span>
                    )}
                  </button>
                );
              })}

              <Button
                variant="secondary"
                size="sm"
                icon={<PlusCircle className="w-3.5 h-3.5" />}
                onClick={addQualityMark}
              >
                + Add Quality Grade
              </Button>
            </div>

            {/* Live Grand Total Badge */}
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant block">Bill Grand Total:</span>
              <span className="text-2xl font-extrabold font-display text-primary tracking-tight">
                ₹{grandTotalAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Main Work Area: Left (Configuration) + Right (Touch Weighment Scale) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 4 cols: Mark & Yard Lot Configuration */}
            <Card variant="lowest" className="lg:col-span-4 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-surface-container-low">
                  <h3 className="text-sm font-bold font-display text-on-surface">Grade & Pricing</h3>
                  <Chip label={`Grade ${currentItem.markCode}`} variant="primary" size="sm" />
                </div>

                <Select
                  label="Select Yard Consignment Lot"
                  value={currentItem.lotNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSaleItems(prev => {
                      const copy = [...prev];
                      copy[activeItemIndex].lotNumber = val;
                      return copy;
                    });
                  }}
                  options={lots.map(l => ({ 
                    value: l.lotNumber, 
                    label: `${l.lotNumber} — ${l.remainingBags} bags (${l.remainingWeightKg} KG)` 
                  }))}
                />

                <Select
                  label="Quality Mark Grade"
                  value={currentItem.markCode}
                  onChange={(e) => {
                    const mCode = e.target.value;
                    const mObj = marks.find(m => m.code === mCode);
                    setSaleItems(prev => {
                      const copy = [...prev];
                      copy[activeItemIndex].markCode = mCode;
                      if (mObj) copy[activeItemIndex].ratePerKg = mObj.defaultSellingRate;
                      return copy;
                    });
                  }}
                  options={marks.map(m => ({ value: m.code, label: `Grade ${m.code} (${m.name})` }))}
                />

                <Input
                  label="Wholesale Selling Rate"
                  type="number"
                  step="0.5"
                  value={currentItem.ratePerKg}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    setSaleItems(prev => {
                      const copy = [...prev];
                      copy[activeItemIndex].ratePerKg = r;
                      return copy;
                    });
                  }}
                  prefixText="₹"
                  suffixText="/KG"
                  helperText="Floor auction baseline rate"
                />

                <div className="p-3.5 rounded-2xl bg-surface-container-low text-xs">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold block mb-1">
                    Available Stock in Lot:
                  </span>
                  <div className="font-extrabold text-on-surface text-sm">
                    {availableBagsInLot} bags available in {currentItem.lotNumber}
                  </div>
                </div>
              </div>

              {/* Subtotal Calculation Box */}
              <div className="p-4 rounded-2xl bg-surface-container-low/70 space-y-2 text-xs mt-4">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-medium">Bags Count:</span>
                  <span className="font-extrabold text-on-surface">{currentCalc.bags} Bags</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-medium">Actual Scale Tare:</span>
                  <span className="font-extrabold text-on-surface">{currentCalc.weightKg} KG</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-surface-container">
                  <span className="font-bold text-on-surface">Quality Subtotal:</span>
                  <span className="font-extrabold text-primary font-display text-base">
                    ₹{currentCalc.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </Card>

            {/* Right 8 cols: Tablet-First Bag Weighment Scale & Touch Keypad */}
            <Card variant="lowest" className="lg:col-span-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-surface-container-low mb-4">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="text-base font-bold font-display text-on-surface">Floor Scale Bag Weighment</h3>
                      <p className="text-[11px] text-on-surface-variant">Tap rapid preset or use numeric keypad as bag sits on scale</p>
                    </div>
                  </div>

                  {currentItem.bags.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllBags} className="text-danger hover:text-danger">
                      Clear Grade Scale
                    </Button>
                  )}
                </div>

                {/* Touch Rapid Presets */}
                <div className="mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">
                    Fast Weighment Presets (KG):
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {[48, 49, 50, 51, 52, 53, 54, 55].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => addBag(preset)}
                        className="py-3 px-2 rounded-xl bg-surface-container-low hover:bg-primary-fixed hover:text-primary active:scale-95 font-display font-extrabold text-sm text-on-surface transition-all select-none cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Keypad & Input Row */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                  {/* Weight Input Box */}
                  <div className="md:col-span-7 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="e.g. 52.5"
                          type="number"
                          step="0.1"
                          value={quickWeightInput}
                          onChange={(e) => setQuickWeightInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addBag(Number(quickWeightInput));
                            }
                          }}
                          suffixText="KG"
                        />
                      </div>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => addBag(Number(quickWeightInput))}
                        icon={<PlusCircle className="w-4 h-4" />}
                      >
                        Add
                      </Button>
                    </div>

                    {/* Touch Numeric Keypad for Tablets */}
                    <div className="mt-3 p-3 rounded-2xl bg-surface-container-low">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5 text-center">
                        Tablet Touch Keypad
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {['1', '2', '3', 'CLEAR', '4', '5', '6', 'BACK', '7', '8', '9', 'ENTER', '.', '0', '00', '+50kg'].map(k => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => {
                              if (k === '+50kg') addBag(50);
                              else handleKeypadPress(k);
                            }}
                            className={`py-2.5 rounded-xl font-display font-bold text-xs select-none transition-all active:scale-95 cursor-pointer ${
                              k === 'ENTER' 
                                ? 'bg-primary text-white shadow-ambient' 
                                : k === 'CLEAR' || k === 'BACK' 
                                  ? 'bg-danger-container text-danger' 
                                  : 'bg-surface-container hover:bg-surface-container-highest text-on-surface'
                            }`}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Recorded Bags Grid */}
                  <div className="md:col-span-5 flex flex-col">
                    <span className="text-xs font-bold font-display text-on-surface block mb-2">
                      Recorded Bags ({currentItem.bags.length} bags):
                    </span>

                    {currentItem.bags.length === 0 ? (
                      <div className="flex-1 p-6 text-center rounded-2xl bg-surface-container-low text-on-surface-variant text-xs flex flex-col items-center justify-center">
                        <Scale className="w-8 h-8 opacity-40 mb-2" />
                        <span>No bags recorded yet. Tap preset numbers or keypad to log weights.</span>
                      </div>
                    ) : (
                      <div className="flex-1 max-h-56 overflow-y-auto space-y-1.5 p-1">
                        {currentItem.bags.map((bag, bagIdx) => (
                          <div
                            key={bag.bagNumber}
                            className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between text-xs"
                          >
                            <span className="text-on-surface-variant font-medium">Bag #{bag.bagNumber}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold font-display text-on-surface">{bag.weightKg} KG</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBagIdx(bagIdx);
                                  setEditingBagWeight(bag.weightKg);
                                }}
                                className="p-1 text-on-surface-variant hover:text-primary rounded"
                                title="Edit bag weight"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeBag(bagIdx)}
                                className="p-1 text-on-surface-variant hover:text-danger rounded"
                                title="Remove bag"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Weighment Bar */}
              <div className="mt-4 pt-4 border-t border-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/50 -mx-6 -mb-6 p-4 sm:p-6 rounded-b-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Live Weighment Formula</span>
                  <div className="text-xs font-bold text-on-surface">
                    {currentCalc.bags} bags • {currentCalc.weightKg} KG @ ₹{currentItem.ratePerKg} = ₹{currentCalc.amount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-extrabold font-display text-primary">
                    ₹{currentCalc.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : step === 'review' ? (
        /* Review Screen Before Final Confirmation */
        <div className="space-y-6">
          <Card variant="lowest" className="border-t-4 border-t-primary">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container-low">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary font-display">Pre-Bill Verification</span>
                <h3 className="text-xl font-bold font-display text-on-surface">{selectedCustomer?.name}</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Location: {selectedCustomer?.marketLocation}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-on-surface-variant font-medium">Product Subtotal</span>
                <div className="text-xl font-extrabold font-display text-on-surface">
                  ₹{formatRupee(invoiceCharges.productSubtotal)}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <InvoiceChargeSummary charges={invoiceCharges} />
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-bold font-display text-on-surface">Items & Actual Bag Weighments</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                    <tr>
                      <th className="py-2.5 px-4">Mark Grade</th>
                      <th className="py-2.5 px-4">Lot</th>
                      <th className="py-2.5 px-4">Bags</th>
                      <th className="py-2.5 px-4">Total Weight</th>
                      <th className="py-2.5 px-4">Rate/KG</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low">
                    {calculatedItems.map(item => (
                      <tr key={item.id}>
                        <td className="py-3 px-4 font-bold text-primary">Grade {item.markCode}</td>
                        <td className="py-3 px-4 font-semibold">{item.lotNumber}</td>
                        <td className="py-3 px-4 font-semibold">{item.bags} bags</td>
                        <td className="py-3 px-4 font-semibold">{item.weightKg} KG</td>
                        <td className="py-3 px-4 font-bold">₹{item.ratePerKg.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-extrabold font-display">₹{item.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bag-level exact breakdown */}
            <div className="mt-6 pt-4 border-t border-surface-container-low">
              <h4 className="text-sm font-bold font-display text-on-surface mb-2">Weighment Audit Check:</h4>
              <div className="space-y-3">
                {calculatedItems.map(item => (
                  <div key={item.id} className="p-3.5 rounded-2xl bg-surface-container-low text-xs">
                    <span className="font-bold text-primary mr-2">Grade {item.markCode} ({item.bags} bags):</span>
                    <span className="text-on-surface font-medium">
                      {item.bagWeights.map(b => `${b.weightKg}kg`).join(' + ')} = <strong>{item.weightKg} KG</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-surface-container-low flex items-center justify-between">
              <Button variant="secondary" onClick={() => setStep('entry')}>
                ← Back to Edit Weighment
              </Button>
              <Button variant="primary" size="lg" onClick={() => setStep('settlement')} icon={<ArrowRight className="w-5 h-5" />}>
                Payment & Settlement
              </Button>
            </div>
          </Card>
        </div>
      ) : selectedCustomer ? (
        <PaymentSettlement
          customer={selectedCustomer}
          billTotal={invoiceCharges.finalInvoiceAmount}
          charges={invoiceCharges}
          canAdjustCreditTerms={can(currentUser.role, 'accessManagement')}
          onBack={() => setStep('review')}
          onComplete={handleConfirmSale}
          isSubmitting={createSaleMutation.isPending}
        />
      ) : null}

      {/* Bag Edit Modal */}
      <Modal
        isOpen={editingBagIdx !== null}
        onClose={() => setEditingBagIdx(null)}
        title={`Edit Bag #${(editingBagIdx ?? 0) + 1} Weight`}
        subtitle="Correct scale reading entry"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Input
            label="Scale Weight (KG)"
            type="number"
            step="0.1"
            value={editingBagWeight}
            onChange={(e) => setEditingBagWeight(Number(e.target.value))}
            suffixText="KG"
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditingBagIdx(null)}>Cancel</Button>
            <Button variant="primary" onClick={saveEditedBag}>Update Bag Weight</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
