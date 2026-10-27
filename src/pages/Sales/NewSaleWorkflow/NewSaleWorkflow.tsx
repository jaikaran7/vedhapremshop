'use client';

import { useSession } from '@/store/session/session-provider';
import { useCustomersQuery } from '@/hooks/queries/use-customers-query';
import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { usePurchasesQuery } from '@/hooks/queries/use-purchases-query';
import { useMarksQuery, useProductsQuery, useSaleChargeSettingsQuery } from '@/hooks/queries/use-directory-query';
import { useCreateSaleMutation, useRebillSaleMutation } from '@/hooks/mutations/use-sale-mutations';
import { useSalesQuery } from '@/hooks/queries/use-sales-query';
import { lotBelongsToProduct } from '@/utils/products';
import { quotedSaleRate } from '@/utils/receiving';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { can } from '@/auth/permissions';
import { saleLineAmount } from '@/utils/trading';
import { calculateSaleCharges } from '@/utils/sale-charges';
import { formatRupee } from '@/utils/settlement';
import type { SaleSettlement } from '@/utils/settlement';
import { ApiError, type DuplicateSaleSummary } from '@/api/client';
import { TRADING_SESSION_DATE } from '@/constants/session';
import { PaymentSettlement } from '@/pages/Sales/NewSaleWorkflow/PaymentSettlement';
import { InvoiceChargeSummary } from '@/pages/Sales/NewSaleWorkflow/InvoiceChargeSummary';
import { CustomerSearch } from '@/pages/Sales/NewSaleWorkflow/CustomerSearch';
import { CustomerFormModal } from '@/pages/Customers/CustomerFormModal/CustomerFormModal';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Customer, Lot, LotMarkBreakdown, Mark, SaleItem, SaleItemBag } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberField } from '@/components/ui/NumberField';
import { sanitizeTypedNumber } from '@/utils/typed-number';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  Scale, PlusCircle, ArrowLeft, CheckCircle2,
  ArrowRight, AlertTriangle, Edit,
} from 'lucide-react';

type SaleDraftLine = {
  id: string;
  lotNumber: string;
  markCode: string;
  ratePerKg: number;
  bags: SaleItemBag[];
};

type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => void;
};

const WEIGHT_PRESETS = [48, 49, 50, 51, 52, 53, 54, 55];

function lineId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptyLine(lotNumber = ''): SaleDraftLine {
  return { id: lineId(), lotNumber, markCode: '', ratePerKg: 0, bags: [] };
}

function sameCode(left: string, right: string): boolean {
  return left.toUpperCase() === right.toUpperCase();
}

function draftedBags(lines: SaleDraftLine[], lotNumber: string, markCode: string, skip?: { lineId: string; bagIndex?: number }): number {
  return lines.reduce((sum, line) => {
    if (!sameCode(line.lotNumber, lotNumber) || !sameCode(line.markCode, markCode)) return sum;
    if (skip && line.id === skip.lineId && skip.bagIndex == null) return sum;
    if (skip && line.id === skip.lineId && skip.bagIndex != null) return sum + Math.max(0, line.bags.length - 1);
    return sum + line.bags.length;
  }, 0);
}

function draftedWeight(lines: SaleDraftLine[], lotNumber: string, markCode: string, skip?: { lineId: string; bagIndex?: number }): number {
  return lines.reduce((sum, line) => {
    if (!sameCode(line.lotNumber, lotNumber) || !sameCode(line.markCode, markCode)) return sum;
    return sum + line.bags.reduce((bagSum, bag, index) => {
      if (skip && line.id === skip.lineId && (skip.bagIndex == null || skip.bagIndex === index)) return bagSum;
      return bagSum + bag.weightKg;
    }, 0);
  }, 0);
}

function parseBagWeight(raw: number): number | null {
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return raw;
}

/**
 * A stored lot is "DDMMYYYY CODE", for example "14102026 JN".
 * The date stays on the record. The sales screen shows the code only.
 */
function saleLotCode(lotNumber: string): string {
  const match = lotNumber.trim().match(/^\d{8}\s+(.+)$/);
  return match?.[1] || lotNumber;
}

/**
 * A grade is the name entered for that consignment.
 * It can be letters or an integer, such as AA, B, 1, or 2.
 * The sales screen shows that name, not the longer master title.
 */
function saleGradeLabel(code: string): string {
  return code.trim();
}

function mergeLotMarks(marks: LotMarkBreakdown[]): LotMarkBreakdown[] {
  const merged: LotMarkBreakdown[] = [];
  for (const mark of marks) {
    const index = merged.findIndex((item) => sameCode(item.markCode, mark.markCode));
    if (index < 0) {
      merged.push({ ...mark });
      continue;
    }
    const current = merged[index];
    merged[index] = {
      ...current,
      initialBags: current.initialBags + mark.initialBags,
      initialWeightKg: current.initialWeightKg + mark.initialWeightKg,
      remainingBags: current.remainingBags + mark.remainingBags,
      remainingWeightKg: current.remainingWeightKg + mark.remainingWeightKg,
    };
  }
  return merged;
}

function lotRateLabel(lot: Lot, marks: Mark[]): { label: string; tone: 'final' | 'floor' | 'missing' | 'empty' } {
  const stocked = mergeLotMarks(lot.marks).filter((mark) => mark.remainingBags > 0);
  if (stocked.length === 0) return { label: 'No stock', tone: 'empty' };
  const finalized = stocked.filter((mark) => mark.finalizedSellingRate != null && Number.isFinite(mark.finalizedSellingRate));
  if (finalized.length > 0) {
    const rates = finalized.map((mark) => mark.finalizedSellingRate as number);
    const low = Math.min(...rates);
    const high = Math.max(...rates);
    const span = low === high ? `₹${formatRupee(low)}/kg` : `₹${formatRupee(low)}–${formatRupee(high)}/kg`;
    return {
      label: finalized.length === stocked.length ? `Finalized ${span}` : `Finalized on some marks · ${span}`,
      tone: 'final',
    };
  }
  const hasFloor = stocked.some((mark) => marks.some((master) => sameCode(master.code, mark.markCode)));
  if (hasFloor) return { label: 'Floor rate — not finalized', tone: 'floor' };
  return { label: 'No selling rate', tone: 'missing' };
}

export const NewSaleWorkflow: React.FC = () => {
  const { currentUser } = useSession();
  const { data: customers = [] } = useCustomersQuery();
  const { data: stockLots = [] } = useLotsQuery();
  const { data: allSales = [] } = useSalesQuery();
  const { data: purchases = [] } = usePurchasesQuery();
  const { data: marks = [] } = useMarksQuery();
  const { data: products = [] } = useProductsQuery();
  const createSaleMutation = useCreateSaleMutation();
  const rebillMutation = useRebillSaleMutation();
  const { data: chargeSettings } = useSaleChargeSettingsQuery();
  const createSale = (data: Parameters<typeof createSaleMutation.mutateAsync>[0]) => createSaleMutation.mutateAsync(data);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const queryCustomerId = searchParams?.get('customerId') || '';
  const queryLotNumber = searchParams?.get('lotNumber') || '';
  const queryMarkCode = searchParams?.get('markCode') || '';
  const rebillId = searchParams?.get('rebill') || '';
  const rebillOf = rebillId ? allSales.find((sale) => sale.id === rebillId) ?? null : null;

  // Editing a bill: its own bags go back to stock when the edit is applied, so count them as available here.
  const lots = useMemo(() => {
    if (!rebillOf) return stockLots;
    return stockLots.map((lot) => {
      const lines = rebillOf.items.filter((item) => sameCode(item.lotNumber, lot.lotNumber));
      if (lines.length === 0) return lot;
      const marks = lot.marks.map((mark) => {
        const own = lines.filter((item) => sameCode(item.markCode, mark.markCode));
        const bags = own.reduce((sum, item) => sum + item.bags, 0);
        const kg = own.reduce((sum, item) => sum + item.weightKg, 0);
        return { ...mark, remainingBags: mark.remainingBags + bags, remainingWeightKg: mark.remainingWeightKg + kg };
      });
      return {
        ...lot,
        marks,
        remainingBags: marks.reduce((sum, mark) => sum + mark.remainingBags, 0),
        remainingWeightKg: marks.reduce((sum, mark) => sum + mark.remainingWeightKg, 0),
      };
    });
  }, [stockLots, rebillOf]);

  const [customerId, setCustomerId] = useState(queryCustomerId);
  const [counterSale, setCounterSale] = useState(!queryCustomerId);
  const [addedCustomers, setAddedCustomers] = useState<Customer[]>([]);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [productId, setProductId] = useState('');
  const [notes, setNotes] = useState('');
  const [saleDate, setSaleDate] = useState(TRADING_SESSION_DATE);
  const [dateReason, setDateReason] = useState('');
  const [rebillReason, setRebillReason] = useState('');
  // Optional GST/tax: off by default; a percentage of the invoice or a typed amount.
  const [taxMode, setTaxMode] = useState<'NONE' | 'PERCENT' | 'AMOUNT'>('NONE');
  const [taxInput, setTaxInput] = useState('');
  const loadedRebill = useRef(false);
  const backdated = saleDate !== TRADING_SESSION_DATE;
  const [saleItems, setSaleItems] = useState<SaleDraftLine[]>(() => [
    emptyLine(queryLotNumber),
  ]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [step, setStep] = useState<'entry' | 'review' | 'settlement'>('entry');
  const [quickWeightInput, setQuickWeightInput] = useState('');
  const [editingBagIdx, setEditingBagIdx] = useState<number | null>(null);
  const [editingBagWeight, setEditingBagWeight] = useState<number>(0);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [duplicateSale, setDuplicateSale] = useState<{ settlement: SaleSettlement; existing: DuplicateSaleSummary } | null>(null);
  const marksAnchor = useRef<HTMLDivElement>(null);
  const weighAnchor = useRef<HTMLDivElement>(null);
  const appliedQueryMark = useRef(false);

  const directory = useMemo(() => {
    const known = new Set(customers.map((customer) => customer.id));
    return [...customers, ...addedCustomers.filter((customer) => !known.has(customer.id))];
  }, [customers, addedCustomers]);

  useEffect(() => {
    if (appliedQueryMark.current || !queryMarkCode || lots.length === 0 || marks.length === 0) return;
    appliedQueryMark.current = true;
    const lot = lots.find((entry) => sameCode(entry.lotNumber, queryLotNumber));
    const quote = quotedSaleRate(lot, queryMarkCode, marks);
    setSaleItems((prev) => prev.map((item, index) => index === 0 ? {
      ...item,
      lotNumber: queryLotNumber,
      markCode: queryMarkCode,
      ratePerKg: quote.ratePerKg,
    } : item));
  }, [lots, marks, queryLotNumber, queryMarkCode]);

  useEffect(() => {
    if (!rebillOf || loadedRebill.current) return;
    loadedRebill.current = true;
    setCounterSale(!rebillOf.customerId);
    setCustomerId(rebillOf.customerId);
    if (rebillOf.productId) setProductId(rebillOf.productId);
    setSaleDate(rebillOf.date);
    setNotes(rebillOf.notes ?? '');
    if (rebillOf.charges?.taxPercent != null) {
      setTaxMode('PERCENT');
      setTaxInput(String(rebillOf.charges.taxPercent));
    } else if ((rebillOf.charges?.taxAmount ?? 0) > 0) {
      setTaxMode('AMOUNT');
      setTaxInput(String(rebillOf.charges?.taxAmount));
    }
    setSaleItems(rebillOf.items.map((item) => ({
      id: lineId(),
      lotNumber: item.lotNumber,
      markCode: item.markCode,
      ratePerKg: item.ratePerKg,
      bags: item.bagWeights.map((bag) => ({ ...bag })),
    })));
  }, [rebillOf]);

  const selectedCustomer = directory.find((customer) => customer.id === customerId) ?? null;
  const selectedProduct = products.find((product) => product.id === productId);
  const activeProducts = products.filter((product) => product.status === 'ACTIVE' || product.id === productId);
  const productLots = selectedProduct
    ? lots.filter((lot) => lotBelongsToProduct(lot, selectedProduct))
    : [];

  const currentItem = saleItems[activeItemIndex] || saleItems[0];

  const calculatedItems: SaleItem[] = saleItems.map((item) => {
    const totalWeight = item.bags.reduce((acc, bag) => acc + bag.weightKg, 0);
    return {
      id: item.id,
      markCode: item.markCode,
      lotNumber: item.lotNumber,
      bags: item.bags.length,
      weightKg: totalWeight,
      ratePerKg: item.ratePerKg,
      amount: saleLineAmount(totalWeight, item.ratePerKg),
      bagWeights: item.bags,
    };
  });
  const billItems = calculatedItems.filter((item) => item.bags > 0);
  const grandTotalBags = billItems.reduce((acc, item) => acc + item.bags, 0);
  const grandTotalWeightKg = billItems.reduce((acc, item) => acc + item.weightKg, 0);
  const grandTotalAmount = billItems.reduce((acc, item) => acc + item.amount, 0);
  const taxNumber = taxInput.trim() === '' ? null : Number(taxInput);
  const taxValid = taxNumber != null && Number.isFinite(taxNumber) && taxNumber >= 0 && (taxMode !== 'PERCENT' || taxNumber <= 100);
  const tax = taxMode === 'PERCENT' && taxValid ? { percent: taxNumber } : taxMode === 'AMOUNT' && taxValid ? { amount: taxNumber } : undefined;
  const invoiceCharges = useMemo(() => calculateSaleCharges({
    totalBags: grandTotalBags,
    productSubtotal: grandTotalAmount,
    settings: chargeSettings,
    tax,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [grandTotalBags, grandTotalAmount, chargeSettings, taxMode, taxInput]);

  const currentCalc = calculatedItems[activeItemIndex] || calculatedItems[0];
  const selectedLot = lots.find((lot) => sameCode(lot.lotNumber, currentItem?.lotNumber || ''));
  const selectedLotMarks = selectedLot ? mergeLotMarks(selectedLot.marks) : [];
  const selectedLotMark = selectedLotMarks.find((mark) => sameCode(mark.markCode, currentItem?.markCode || ''));
  const currentQuote = quotedSaleRate(selectedLot, currentItem?.markCode || '', marks);
  const isOverCreditLimit = !!selectedCustomer && selectedCustomer.outstandingAmount > selectedCustomer.creditLimit;
  const isBlocked = selectedCustomer?.status === 'BLOCKED';

  /** Red warning only: the salesperson may still bill a blocked or over-limit customer. */
  const warnCredit = (customer: Customer | undefined) => {
    if (!customer) return;
    const over = customer.outstandingAmount > customer.creditLimit;
    if (customer.status !== 'BLOCKED' && !over) return;
    toast({
      type: 'error',
      title: customer.status === 'BLOCKED' ? `${customer.name} is blocked` : `${customer.name} is over the credit limit`,
      message: over
        ? `Outstanding ₹${customer.outstandingAmount.toLocaleString('en-IN')} is above the ₹${customer.creditLimit.toLocaleString('en-IN')} limit. You can still continue.`
        : 'This account is blocked. You can still continue the sale.',
    });
  };

  const reveal = (node: HTMLDivElement | null) => {
    window.requestAnimationFrame(() => {
      node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const scrollToGrades = () => {
    window.setTimeout(() => {
      const node = marksAnchor.current;
      if (!node) return;
      const header = document.querySelector('header');
      const offset = (header?.getBoundingClientRect().height ?? 0) + 16;
      const top = node.getBoundingClientRect().top;
      let parent: HTMLElement | null = node.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight + 1) {
          parent.scrollTo({
            top: parent.scrollTop + top - parent.getBoundingClientRect().top - 16,
            behavior: 'smooth',
          });
          return;
        }
        parent = parent.parentElement;
      }
      window.scrollTo({ top: window.scrollY + top - offset, behavior: 'smooth' });
    }, 80);
  };

  const askConfirm = (request: ConfirmRequest) => setConfirm(request);

  const replaceActive = (patch: Partial<SaleDraftLine>) => {
    setSaleItems((prev) => prev.map((item, index) => index === activeItemIndex ? { ...item, ...patch } : item));
  };

  const requestProduct = (nextId: string) => {
    if (nextId === productId) return;
    const apply = () => {
      setProductId(nextId);
      setSaleItems([emptyLine()]);
      setActiveItemIndex(0);
      setQuickWeightInput('');
    };
    if (saleItems.some((item) => item.bags.length > 0)) {
      askConfirm({
        title: 'Change product?',
        message: 'Recorded bag weights belong to the current product. They will be cleared. The customer stays on this draft.',
        confirmLabel: 'Change product',
        action: apply,
      });
      return;
    }
    apply();
  };

  const requestLot = (lot: Lot) => {
    if (lot.remainingBags <= 0) {
      toast({ type: 'error', title: 'No stock', message: `${saleLotCode(lot.lotNumber)} has no bags left to sell.` });
      return;
    }
    const purchase = purchases.find((entry) => entry.id === lot.purchaseBillId);
    if (purchase?.receiptStatus === 'PENDING_RECEIPT') {
      toast({ type: 'error', title: 'Not received', message: `${saleLotCode(lot.lotNumber)} is still awaiting physical receipt.` });
      return;
    }
    scrollToGrades();
    if (sameCode(currentItem.lotNumber, lot.lotNumber)) return;
    if (currentItem.bags.length > 0) {
      const next = emptyLine(lot.lotNumber);
      setSaleItems((prev) => [...prev, next]);
      setActiveItemIndex(saleItems.length);
      setQuickWeightInput('');
      return;
    }
    replaceActive({ lotNumber: lot.lotNumber, markCode: '', ratePerKg: 0, bags: [] });
    setQuickWeightInput('');
  };

  const requestMark = (mark: LotMarkBreakdown) => {
    if (!selectedLot) return;
    if (mark.remainingBags <= 0) {
      toast({ type: 'error', title: 'No stock', message: `${mark.markCode} has no bags left in this lot.` });
      return;
    }
    const quote = quotedSaleRate(selectedLot, mark.markCode, marks);
    const rate = quote.source === 'MISSING' ? 0 : quote.ratePerKg;
    const existingIndex = saleItems.findIndex(
      (item) => sameCode(item.lotNumber, selectedLot.lotNumber) && sameCode(item.markCode, mark.markCode),
    );
    if (existingIndex >= 0) {
      if (currentItem.bags.length === 0 && existingIndex !== activeItemIndex) {
        setSaleItems((prev) => prev.filter((_, index) => index !== activeItemIndex));
        setActiveItemIndex(existingIndex > activeItemIndex ? existingIndex - 1 : existingIndex);
      } else {
        setActiveItemIndex(existingIndex);
      }
      setQuickWeightInput('');
      reveal(weighAnchor.current);
      return;
    }
    if (currentItem.bags.length > 0) {
      const next = { ...emptyLine(selectedLot.lotNumber), markCode: mark.markCode, ratePerKg: rate };
      setSaleItems((prev) => [...prev, next]);
      setActiveItemIndex(saleItems.length);
      setQuickWeightInput('');
      reveal(weighAnchor.current);
      return;
    }
    replaceActive({
      lotNumber: selectedLot.lotNumber,
      markCode: mark.markCode,
      ratePerKg: quote.source === 'MISSING' ? currentItem.ratePerKg : rate,
    });
    reveal(weighAnchor.current);
  };

  const stockBlock = (weight: number, skip?: { lineId: string; bagIndex?: number }): string | null => {
    if (!selectedLot || !currentItem.lotNumber || !currentItem.markCode || !selectedLotMark) {
      return 'Select a lot and a quality before recording a bag.';
    }
    if (!(currentItem.ratePerKg > 0)) {
      return currentQuote.source === 'MISSING'
        ? 'Enter a selling rate. This quality has no finalized rate and no floor rate.'
        : 'Enter a selling rate for this quality.';
    }
    const nextBags = draftedBags(saleItems, currentItem.lotNumber, currentItem.markCode, skip) + (skip?.bagIndex == null ? 1 : 0);
    if (skip?.bagIndex != null) {
      if (draftedBags(saleItems, currentItem.lotNumber, currentItem.markCode) > selectedLotMark.remainingBags) {
        return `Only ${selectedLotMark.remainingBags} bags of ${currentItem.markCode} are available.`;
      }
    } else if (nextBags > selectedLotMark.remainingBags) {
      return `Only ${selectedLotMark.remainingBags} bags of ${currentItem.markCode} are available.`;
    }
    const nextWeight = draftedWeight(saleItems, currentItem.lotNumber, currentItem.markCode, skip) + weight;
    if (nextWeight > selectedLotMark.remainingWeightKg + 0.0001) {
      return `Only ${selectedLotMark.remainingWeightKg.toLocaleString('en-IN')} kg of ${currentItem.markCode} are available.`;
    }
    return null;
  };

  const addBag = (raw: number) => {
    const weight = parseBagWeight(raw);
    if (weight == null) {
      toast({ type: 'error', title: 'Invalid weight', message: 'Enter a weight greater than zero.' });
      return;
    }
    const blocked = stockBlock(weight);
    if (blocked) {
      toast({ type: 'error', title: 'Bag not added', message: blocked });
      return;
    }
    setSaleItems((prev) => prev.map((item, index) => {
      if (index !== activeItemIndex) return item;
      return {
        ...item,
        bags: [...item.bags, { bagNumber: item.bags.length + 1, weightKg: weight }],
      };
    }));
    setQuickWeightInput('');
  };

  const removeBag = (bagIndex: number) => {
    setSaleItems((prev) => prev.map((item, index) => {
      if (index !== activeItemIndex) return item;
      return {
        ...item,
        bags: item.bags.filter((_, indexInLine) => indexInLine !== bagIndex).map((bag, indexInLine) => ({
          ...bag,
          bagNumber: indexInLine + 1,
        })),
      };
    }));
  };

  const saveEditedBag = () => {
    if (editingBagIdx === null) return;
    const weight = parseBagWeight(editingBagWeight);
    if (weight == null) {
      toast({ type: 'error', title: 'Invalid weight', message: 'Enter a weight greater than zero.' });
      return;
    }
    const blocked = stockBlock(weight, { lineId: currentItem.id, bagIndex: editingBagIdx });
    if (blocked) {
      toast({ type: 'error', title: 'Weight not updated', message: blocked });
      return;
    }
    setSaleItems((prev) => prev.map((item, index) => {
      if (index !== activeItemIndex) return item;
      return {
        ...item,
        bags: item.bags.map((bag, bagIndex) => bagIndex === editingBagIdx ? { ...bag, weightKg: weight } : bag),
      };
    }));
    setEditingBagIdx(null);
  };

  const clearAllBags = () => {
    replaceActive({ bags: [] });
  };

  const addQualityMark = () => {
    const next = emptyLine(currentItem.lotNumber);
    setSaleItems((prev) => [...prev, next]);
    setActiveItemIndex(saleItems.length);
    setQuickWeightInput('');
    if (currentItem.lotNumber) reveal(marksAnchor.current);
  };

  const removeQualityMark = (index: number) => {
    if (saleItems.length <= 1) {
      toast({ type: 'error', title: 'Cannot remove', message: 'At least one quality line is required.' });
      return;
    }
    setSaleItems((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
    setActiveItemIndex(0);
  };

  const handleKeypadPress = (val: string) => {
    if (val === 'CLEAR') setQuickWeightInput('');
    else if (val === 'BACK') setQuickWeightInput((prev) => sanitizeTypedNumber(prev.slice(0, -1)));
    else if (val === 'ENTER') addBag(Number(quickWeightInput));
    else setQuickWeightInput((prev) => sanitizeTypedNumber(prev + val));
  };

  const openReview = () => {
    if (!counterSale && !selectedCustomer) {
      toast({ type: 'error', title: 'Customer required', message: 'Search for a customer, add one, or record this as a counter sale.' });
      return;
    }
    if (!selectedProduct) {
      toast({ type: 'error', title: 'Product required', message: 'Choose a product.' });
      return;
    }
    if (billItems.length === 0) {
      toast({ type: 'error', title: 'Weighment empty', message: 'Record at least one bag weight.' });
      return;
    }
    const grouped = new Map<string, { bags: number; weightKg: number; lotNumber: string; markCode: string }>();
    for (const item of billItems) {
      if (!item.lotNumber || !item.markCode) {
        toast({ type: 'error', title: 'Quality incomplete', message: 'Each weighed quality needs a lot and a mark.' });
        return;
      }
      if (!(item.ratePerKg > 0)) {
        toast({ type: 'error', title: 'Rate required', message: `${item.markCode} has no usable selling rate.` });
        return;
      }
      const key = `${item.lotNumber.toUpperCase()}|${item.markCode.toUpperCase()}`;
      const current = grouped.get(key) ?? { bags: 0, weightKg: 0, lotNumber: item.lotNumber, markCode: item.markCode };
      current.bags += item.bags;
      current.weightKg += item.weightKg;
      grouped.set(key, current);
    }
    for (const group of grouped.values()) {
      const lot = lots.find((entry) => sameCode(entry.lotNumber, group.lotNumber));
      const mark = lot ? mergeLotMarks(lot.marks).find((entry) => sameCode(entry.markCode, group.markCode)) : undefined;
      if (!lot || !mark || group.bags > mark.remainingBags || group.weightKg > mark.remainingWeightKg + 0.0001) {
        toast({ type: 'error', title: 'Over stock', message: `${saleLotCode(group.lotNumber)} ${saleGradeLabel(group.markCode)} does not have enough stock for these bags.` });
        return;
      }
    }
    setStep('review');
  };

  const handleConfirmSale = async (settlement: SaleSettlement, confirmDuplicateSale = false) => {
    if ((!counterSale && !selectedCustomer) || !selectedProduct || billItems.length === 0) return;
    if (rebillOf && rebillReason.trim().length < 3) {
      toast({ type: 'error', title: 'Reason required', message: 'Say why this bill is being edited.' });
      setStep('entry');
      return;
    }
    const now = new Date();
    const payload = {
      customerId: counterSale ? '' : selectedCustomer!.id,
      customerName: counterSale ? 'Counter sale' : selectedCustomer!.name,
      customerPhone: counterSale ? '' : selectedCustomer!.phone,
      customerAddress: counterSale ? '' : selectedCustomer!.address,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      date: saleDate,
      dateReason: dateReason.trim() || undefined,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      items: billItems,
      totalBags: grandTotalBags,
      totalWeightKg: grandTotalWeightKg,
      productSubtotal: invoiceCharges.productSubtotal,
      charges: invoiceCharges,
      // The server recomputes the tax from whichever one was typed.
      ...(tax?.percent !== undefined && { taxPercent: tax.percent }),
      ...(tax?.amount !== undefined && { taxAmount: tax.amount }),
      totalAmount: invoiceCharges.finalInvoiceAmount,
      paymentType: settlement.paymentType,
      paymentStatus: settlement.paymentStatus,
      tenders: settlement.tenders,
      creditDays: settlement.creditDays,
      dueDate: settlement.dueDate,
      paidAmount: settlement.paidAmount,
      balanceDue: settlement.balanceDue,
      status: 'CONFIRMED' as const,
      createdByUserId: currentUser.id,
      createdByName: currentUser.name,
      createdByRole: currentUser.role,
      notes,
      ...(confirmDuplicateSale && { confirmDuplicateSale }),
    };

    try {
      if (rebillOf) {
        const result = await rebillMutation.mutateAsync({ saleId: rebillOf.id, input: payload, reason: rebillReason.trim() });
        if (result.status === 'PENDING_APPROVAL') {
          toast({ type: 'info', title: 'Sent for Owner approval', message: `The edit to ${rebillOf.billNumber} is waiting in Approvals.` });
          router.push('/approvals');
        } else {
          toast({ type: 'success', title: 'Bill replaced', message: `${rebillOf.billNumber} is now ${result.sale.billNumber}. Stock readjusted.` });
          router.push(`/sales/${result.sale.id}/bill`);
        }
        return;
      }
      const created = await createSale(payload);
      toast({
        type: 'success',
        title: 'Bill Confirmed & Stock Dispatched!',
        message: `${created.billNumber}${created.date !== TRADING_SESSION_DATE ? ` (dated ${created.date})` : ''} created: ${grandTotalBags} bags (${grandTotalWeightKg} KG) — ₹${formatRupee(created.totalAmount)}`,
      });
      router.push(`/sales/${created.id}/bill`);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'POSSIBLE_DUPLICATE_SALE' && error.existingSale) {
        setDuplicateSale({ settlement, existing: error.existingSale });
        return;
      }
      toast({ type: 'error', title: 'Bill not saved', message: error instanceof Error ? error.message : 'Try again.' });
    }
  };

  const rateHint = !currentItem.markCode
    ? 'Select a quality to use its selling rate.'
    : currentItem.ratePerKg === currentQuote.ratePerKg
      ? currentQuote.message
      : `${currentQuote.message} The rate on this bill is an override and does not change the stored consignment rate.`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
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
              Each bag keeps its own scale weight. The bill is the sum of those weights.
            </p>
          </div>
        </div>

        {step === 'settlement' ? (
          <Button type="submit" form="sale-settlement" variant="primary" size="lg" icon={<CheckCircle2 className="w-5 h-5" />} isLoading={createSaleMutation.isPending || rebillMutation.isPending}>
            Complete Sale
          </Button>
        ) : step === 'review' ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={() => setStep('entry')}>Edit Weighment</Button>
            <Button variant="primary" size="lg" onClick={() => setStep('settlement')} icon={<ArrowRight className="w-5 h-5" />}>
              Payment & Settlement
            </Button>
          </div>
        ) : null}
      </div>

      {step === 'entry' ? (
        <div className="space-y-6">
          <Card variant="lowest" padding="md" className="space-y-4">
            <CustomerSearch
              customers={directory}
              selected={selectedCustomer}
              counterSale={counterSale}
              onSelect={(id) => {
                setCounterSale(false);
                setCustomerId(id);
                warnCredit(directory.find((customer) => customer.id === id));
              }}
              onAdd={() => {
                setCounterSale(false);
                setAddingCustomer(true);
              }}
              onCounterSale={() => {
                setCounterSale(true);
                setCustomerId('');
              }}
            />
            {selectedCustomer && (selectedCustomer.advanceAmount ?? 0) > 0 && (
              <div className="rounded-2xl px-4 py-3 bg-success-container/40 text-xs font-semibold text-success">
                Advance ₹{(selectedCustomer.advanceAmount ?? 0).toLocaleString('en-IN')} will be used against this bill automatically.
              </div>
            )}
            {selectedCustomer && isBlocked && (
              <div className="rounded-2xl px-4 py-3 bg-danger-container text-danger text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> This customer is blocked. You can still complete the sale.
              </div>
            )}
            {selectedCustomer && selectedCustomer.kind !== 'REGULAR' && (
              <div className={`rounded-2xl px-4 py-3 ${isOverCreditLimit ? 'bg-danger-container' : 'bg-surface-container-low'}`}>
                <div className="text-[10px] uppercase font-bold text-on-surface-variant">Previous outstanding</div>
                <div className={`text-base font-extrabold font-display mt-0.5 ${isOverCreditLimit ? 'text-danger' : 'text-on-surface'}`}>
                  ₹{selectedCustomer.outstandingAmount.toLocaleString('en-IN')}
                </div>
                {isOverCreditLimit && (
                  <span className="text-[10px] text-danger font-semibold flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-3 h-3" /> Exceeds ₹{selectedCustomer.creditLimit.toLocaleString('en-IN')} limit
                  </span>
                )}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="date"
                label="Bill date"
                value={saleDate}
                max={TRADING_SESSION_DATE}
                disabled={!!rebillOf}
                onChange={(e) => setSaleDate(e.target.value || TRADING_SESSION_DATE)}
              />
              {backdated && !rebillOf && (
                <Input
                  label="Why another date? (optional)"
                  value={dateReason}
                  onChange={(e) => setDateReason(e.target.value)}
                  placeholder="e.g. Yesterday's slip entered late"
                />
              )}
              {rebillOf && (
                <Input
                  label={`Reason for editing ${rebillOf.billNumber}`}
                  value={rebillReason}
                  onChange={(e) => setRebillReason(e.target.value)}
                  placeholder="e.g. Bag 3 was weighed twice"
                  required
                />
              )}
            </div>
            <div className="rounded-2xl bg-surface-container-low/60 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-on-surface">GST / Tax <span className="font-medium text-on-surface-variant">(optional)</span></span>
                <div className="flex gap-1">
                  {([['NONE', 'None'], ['PERCENT', '% of bill'], ['AMOUNT', '₹ amount']] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => { setTaxMode(mode); if (mode === 'NONE') setTaxInput(''); }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${taxMode === mode ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {taxMode !== 'NONE' && (
                <Input
                  label={taxMode === 'PERCENT' ? 'Tax percentage' : 'Tax amount'}
                  inputMode="decimal"
                  value={taxInput}
                  prefixText={taxMode === 'AMOUNT' ? '₹' : undefined}
                  suffixText={taxMode === 'PERCENT' ? '%' : undefined}
                  onChange={(e) => setTaxInput(e.target.value.replace(/[^\d.]/g, ''))}
                  helperText={taxInput.trim() !== '' && !taxValid
                    ? 'Enter a valid number (a percentage cannot be more than 100).'
                    : (invoiceCharges.taxAmount ?? 0) > 0 ? `Adds ₹${formatRupee(invoiceCharges.taxAmount ?? 0)} to the bill.` : 'The tax is added to the bill total.'}
                />
              )}
            </div>
            {backdated && !rebillOf && (
              <p className="text-xs font-semibold text-tertiary flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                This bill will be dated {saleDate}, not today. Stock, the customer&apos;s balance and any payment go on that date straight away.
              </p>
            )}
            {rebillOf && (
              <p className="text-xs font-semibold text-on-surface-variant">
                Editing {rebillOf.billNumber}: it will be cancelled and replaced by this bill on {rebillOf.date}.
                {currentUser.role === 'OWNER' ? '' : ' The change waits for the Owner\'s approval.'}
              </p>
            )}
          </Card>

          <section className="space-y-3">
            <h2 className="text-sm font-bold font-display text-on-surface">Product</h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {activeProducts.map((product) => {
                const selected = product.id === productId;
                return (
                  <button
                    key={product.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => requestProduct(product.id)}
                    className={`flex-1 min-w-[8.5rem] rounded-2xl px-4 py-4 text-left cursor-pointer transition-colors ${
                      selected ? 'bg-primary text-white' : 'bg-surface-container-lowest ambient-shadow text-on-surface'
                    }`}
                  >
                    <span className="block text-base font-bold font-display">{product.name}</span>
                    <span className={`block text-xs mt-1 ${selected ? 'text-white/80' : 'text-on-surface-variant'}`}>
                      {selected ? 'Selected' : 'Sell this product'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedProduct && (
          <>
          <section className="space-y-3">
            <h2 className="text-sm font-bold font-display text-on-surface">
              Lots · {selectedProduct.name}
            </h2>
            {productLots.length === 0 ? (
              <div className="rounded-2xl bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
                No {selectedProduct?.name.toLowerCase() || 'product'} lots are in stock.
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(11.5rem, 1fr))' }}>
                {productLots.map((lot) => {
                  const selected = sameCode(lot.lotNumber, currentItem.lotNumber);
                  const purchase = purchases.find((entry) => entry.id === lot.purchaseBillId);
                  const awaiting = purchase?.receiptStatus === 'PENDING_RECEIPT';
                  const rate = lotRateLabel(lot, marks);
                  const disabled = lot.remainingBags <= 0 || awaiting;
                  return (
                    <button
                      key={lot.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => requestLot(lot)}
                      className={`rounded-2xl px-4 py-4 text-left cursor-pointer transition-colors ${
                        selected
                          ? 'bg-primary text-white'
                          : disabled
                            ? 'bg-surface-container-low text-on-surface-variant'
                            : 'bg-surface-container-lowest ambient-shadow text-on-surface'
                      }`}
                    >
                      <span className="block text-base font-bold font-display">{saleLotCode(lot.lotNumber)}</span>
                      <span className={`block text-xs mt-1 ${selected ? 'text-white/80' : 'text-on-surface-variant'}`}>
                        {lot.remainingBags} bags · {lot.remainingWeightKg.toLocaleString('en-IN')} kg
                      </span>
                      <span className={`block text-xs mt-2 font-semibold ${selected ? 'text-white' : ''}`}>
                        {awaiting ? 'Awaiting receipt' : lot.remainingBags <= 0 ? 'No stock' : 'In stock'}
                      </span>
                      <span className={`block text-xs mt-1 ${selected ? 'text-white/80' : rate.tone === 'floor' ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                        {rate.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {selectedLot && (
            <section ref={marksAnchor} className="space-y-3 scroll-mt-24">
              <div>
                <h2 className="text-sm font-bold font-display text-on-surface">Grades · {saleLotCode(selectedLot.lotNumber)}</h2>
                <p className="text-xs text-on-surface-variant mt-1">Select every quality on this bill. Each quality keeps its own bags and quantity.</p>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {selectedLotMarks.map((mark) => {
                  const selected = sameCode(currentItem.markCode, mark.markCode) && sameCode(currentItem.lotNumber, selectedLot.lotNumber);
                  const onBill = saleItems.some((item) => item.bags.length > 0 && sameCode(item.lotNumber, selectedLot.lotNumber) && sameCode(item.markCode, mark.markCode));
                  const quote = quotedSaleRate(selectedLot, mark.markCode, marks);
                  const rateLabel = quote.source === 'FINALIZED'
                    ? `Finalized ₹${formatRupee(quote.ratePerKg)}/kg`
                    : quote.source === 'FLOOR'
                      ? `Floor ₹${formatRupee(quote.ratePerKg)}/kg`
                      : 'No selling rate';
                  return (
                    <button
                      key={mark.markCode}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => requestMark(mark)}
                      className={`min-w-[11rem] shrink-0 rounded-2xl px-4 py-3 text-left cursor-pointer ${
                        selected
                          ? 'bg-primary text-white'
                          : onBill
                            ? 'bg-primary-fixed text-on-surface'
                            : mark.remainingBags <= 0
                              ? 'bg-surface-container-low text-on-surface-variant'
                              : 'bg-surface-container-lowest ambient-shadow text-on-surface'
                      }`}
                    >
                      <span className="block text-base font-bold font-display">{saleGradeLabel(mark.markCode)}</span>
                      <span className={`block text-xs mt-1 ${selected ? 'text-white/80' : 'text-on-surface-variant'}`}>
                        {mark.remainingBags} bags · {mark.remainingWeightKg.toLocaleString('en-IN')} kg
                      </span>
                      <span className={`block text-xs mt-2 font-semibold ${selected ? 'text-white' : quote.source === 'FLOOR' ? 'text-tertiary' : ''}`}>
                        {rateLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {selectedLot && (
          <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {saleItems.map((item, index) => {
                const itemCalc = calculatedItems[index];
                const label = item.markCode ? saleGradeLabel(item.markCode) : 'New quality';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveItemIndex(index)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeItemIndex === index ? 'bg-primary text-white shadow-ambient' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="opacity-80">({itemCalc.bags}b · {itemCalc.weightKg} kg · ₹{formatRupee(itemCalc.amount)})</span>
                    {saleItems.length > 1 && (
                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          removeQualityMark(index);
                        }}
                        className="p-1 hover:text-danger rounded-full"
                        title="Remove quality"
                      >
                        ×
                      </span>
                    )}
                  </button>
                );
              })}
              <Button variant="secondary" size="sm" icon={<PlusCircle className="w-3.5 h-3.5" />} onClick={addQualityMark}>
                + Add Quality Grade
              </Button>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant block">Revenue</span>
              <span className="text-2xl font-extrabold font-display text-success tracking-tight">₹{formatRupee(grandTotalAmount)}</span>
            </div>
          </div>

          <div ref={weighAnchor} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card variant="lowest" className="lg:col-span-4 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3">
                  <h3 className="text-sm font-bold font-display text-on-surface">Grade & Pricing</h3>
                  {currentItem.markCode && <Chip label={currentItem.markCode} variant="primary" size="sm" />}
                </div>
                <div className="rounded-2xl bg-surface-container-low p-4 text-sm">
                  <div className="text-[10px] uppercase font-bold text-on-surface-variant">Selected</div>
                  <div className="font-bold font-display text-on-surface mt-1">
                    {selectedProduct?.name || 'Product'} · {currentItem.lotNumber ? saleLotCode(currentItem.lotNumber) : 'No lot'} · {currentItem.markCode ? saleGradeLabel(currentItem.markCode) : 'No quality'}
                  </div>
                </div>
                <NumberField
                  label="Wholesale Selling Rate"
                  value={currentItem.ratePerKg}
                  onValueChange={(ratePerKg) => replaceActive({ ratePerKg })}
                  prefixText="₹"
                  suffixText="/KG"
                  helperText={rateHint}
                />
                {currentQuote.source === 'FLOOR' && currentItem.markCode && (
                  <p className="text-xs font-semibold text-tertiary">This is the daily floor rate. It is not a finalized receiving rate.</p>
                )}
                <div className="p-3.5 rounded-2xl bg-surface-container-low text-xs">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold block mb-1">Available stock</span>
                  <div className="font-extrabold text-on-surface text-sm">
                    {selectedLotMark
                      ? `${selectedLotMark.remainingBags} bags · ${selectedLotMark.remainingWeightKg.toLocaleString('en-IN')} kg`
                      : 'Select a lot and quality'}
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-surface-container-low/70 space-y-2 text-xs mt-4">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-medium">Bags</span>
                  <span className="font-extrabold text-on-surface">{currentCalc.bags}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-medium">Actual weight</span>
                  <span className="font-extrabold text-on-surface">{currentCalc.weightKg} kg</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-on-surface">Quality subtotal</span>
                  <span className="font-extrabold text-primary font-display text-base">₹{formatRupee(currentCalc.amount)}</span>
                </div>
              </div>
            </Card>

            <Card variant="lowest" className="lg:col-span-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="text-base font-bold font-display text-on-surface">Floor Scale Bag Weighment</h3>
                      <p className="text-[11px] text-on-surface-variant">Each bag is its own weight. Presets only fill the scale reading.</p>
                    </div>
                  </div>
                  {currentItem.bags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => askConfirm({
                        title: 'Clear this quality?',
                        message: `Remove all ${currentItem.bags.length} recorded bags from this quality. Other qualities stay.`,
                        confirmLabel: 'Clear weights',
                        action: clearAllBags,
                      })}
                      className="text-danger hover:text-danger"
                    >
                      Clear weights
                    </Button>
                  )}
                </div>

                <div className="mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">Fast weighment presets (kg)</span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {WEIGHT_PRESETS.map((preset) => (
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

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                  <div className="md:col-span-7 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="e.g. 52.5"
                          inputMode="decimal"
                          value={sanitizeTypedNumber(quickWeightInput)}
                          onChange={(event) => setQuickWeightInput(sanitizeTypedNumber(event.target.value))}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              addBag(Number(quickWeightInput));
                            }
                          }}
                          suffixText="KG"
                        />
                      </div>
                      <Button variant="primary" size="md" onClick={() => addBag(Number(quickWeightInput))} icon={<PlusCircle className="w-4 h-4" />}>
                        Add bag
                      </Button>
                    </div>
                    <div className="mt-3 p-3 rounded-2xl bg-surface-container-low">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5 text-center">Tablet touch keypad</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {['1', '2', '3', 'CLEAR', '4', '5', '6', 'BACK', '7', '8', '9', 'ENTER', '.', '0', '00', '+50kg'].map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              if (key === '+50kg') addBag(50);
                              else handleKeypadPress(key);
                            }}
                            className={`py-2.5 rounded-xl font-display font-bold text-xs select-none transition-all active:scale-95 cursor-pointer ${
                              key === 'ENTER'
                                ? 'bg-primary text-white shadow-ambient'
                                : key === 'CLEAR' || key === 'BACK'
                                  ? 'bg-danger-container text-danger'
                                  : 'bg-surface-container hover:bg-surface-container-highest text-on-surface'
                            }`}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-5 flex flex-col">
                    <span className="text-xs font-bold font-display text-on-surface block mb-2">
                      Recorded bags ({currentItem.bags.length})
                    </span>
                    {currentItem.bags.length === 0 ? (
                      <div className="flex-1 p-6 text-center rounded-2xl bg-surface-container-low text-on-surface-variant text-xs flex flex-col items-center justify-center">
                        <Scale className="w-8 h-8 opacity-40 mb-2" />
                        <span>No bags yet. Tap a preset or enter the scale weight.</span>
                      </div>
                    ) : (
                      <div className="flex-1 max-h-56 overflow-y-auto space-y-1.5 p-1">
                        {currentItem.bags.map((bag, bagIndex) => (
                          <div key={`${currentItem.id}-${bag.bagNumber}`} className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between text-xs gap-2">
                            <span className="text-on-surface-variant font-medium">Bag {bag.bagNumber}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold font-display text-on-surface">{bag.weightKg} kg</span>
                              <span className="font-bold text-on-surface-variant">₹{formatRupee(bag.weightKg * currentItem.ratePerKg)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBagIdx(bagIndex);
                                  setEditingBagWeight(bag.weightKg);
                                }}
                                className="p-1 text-on-surface-variant hover:text-primary rounded cursor-pointer"
                                title="Edit bag weight"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeBag(bagIndex)}
                                className="p-1 text-on-surface-variant hover:text-danger rounded cursor-pointer"
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
              <div className="mt-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/50 -mx-6 -mb-6 p-4 sm:p-6 rounded-b-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">This quality</span>
                  <div className="text-xs font-bold text-on-surface">
                    {currentCalc.bags} bags · {currentCalc.weightKg} kg @ ₹{currentItem.ratePerKg || 0}/kg
                  </div>
                </div>
                <div className="text-xl font-extrabold font-display text-primary">₹{formatRupee(currentCalc.amount)}</div>
              </div>
            </Card>
          </div>
          </>
          )}
          </>
          )}

          <Card variant="low" padding="md">
            <Input
              label="Yard notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional note for this bill"
            />
          </Card>

          <Button variant="primary" size="lg" onClick={openReview} icon={<ArrowRight className="w-5 h-5" />} className="w-full">
            Review Bill (₹{formatRupee(grandTotalAmount)})
          </Button>
        </div>
      ) : step === 'review' ? (
        <div className="space-y-6">
          <Card variant="lowest" className="border-t-4 border-t-primary">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary font-display">Pre-bill verification</span>
                <h3 className="text-xl font-bold font-display text-on-surface">
                  {counterSale ? 'Counter sale' : selectedCustomer?.name}
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  {counterSale
                    ? 'No customer name on this bill'
                    : [selectedCustomer?.marketLocation, selectedCustomer?.phone].filter(Boolean).join(' · ')}
                  {selectedProduct ? ` · ${selectedProduct.name}` : ''}
                </p>
                {!counterSale && selectedCustomer && (
                  <p className="text-xs font-semibold text-on-surface mt-1">
                    Outstanding ₹{selectedCustomer.outstandingAmount.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs text-on-surface-variant font-medium">Product subtotal</span>
                <div className="text-xl font-extrabold font-display text-on-surface">₹{formatRupee(invoiceCharges.productSubtotal)}</div>
              </div>
            </div>

            <InvoiceChargeSummary charges={invoiceCharges} />

            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-bold font-display text-on-surface">Qualities</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                    <tr>
                      <th className="py-2.5 px-4">Product</th>
                      <th className="py-2.5 px-4">Lot</th>
                      <th className="py-2.5 px-4">Quality</th>
                      <th className="py-2.5 px-4">Bags</th>
                      <th className="py-2.5 px-4">Weight</th>
                      <th className="py-2.5 px-4">Rate/kg</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billItems.map((item) => (
                      <tr key={item.id} className="odd:bg-surface-container-low/40">
                        <td className="py-3 px-4 font-semibold">{selectedProduct?.name}</td>
                        <td className="py-3 px-4 font-semibold">{saleLotCode(item.lotNumber)}</td>
                        <td className="py-3 px-4 font-bold text-primary">{saleGradeLabel(item.markCode)}</td>
                        <td className="py-3 px-4 font-semibold">{item.bags}</td>
                        <td className="py-3 px-4 font-semibold">{item.weightKg} kg</td>
                        <td className="py-3 px-4 font-bold">₹{item.ratePerKg.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-extrabold font-display">₹{formatRupee(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 pt-4 space-y-3">
              <h4 className="text-sm font-bold font-display text-on-surface">Bag weights</h4>
              {billItems.map((item) => (
                <div key={item.id} className="p-3.5 rounded-2xl bg-surface-container-low text-xs">
                  <span className="font-bold text-primary mr-2">{selectedProduct?.name} · {saleLotCode(item.lotNumber)} · {saleGradeLabel(item.markCode)} ({item.bags} bags)</span>
                  <span className="text-on-surface font-medium">
                    {item.bagWeights.map((bag) => `${bag.weightKg} kg`).join(' + ')} = <strong>{item.weightKg} kg</strong>
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-2 flex items-center justify-between">
              <Button variant="secondary" onClick={() => setStep('entry')}>Back to weighment</Button>
              <Button variant="primary" size="lg" onClick={() => setStep('settlement')} icon={<ArrowRight className="w-5 h-5" />}>
                Payment & Settlement
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <PaymentSettlement
          customer={counterSale ? null : selectedCustomer}
          billTotal={invoiceCharges.finalInvoiceAmount}
          charges={invoiceCharges}
          canAdjustCreditTerms={can(currentUser.role, 'accessManagement')}
          saleDate={saleDate}
          onBack={() => setStep('review')}
          onComplete={handleConfirmSale}
          isSubmitting={createSaleMutation.isPending || rebillMutation.isPending}
        />
      )}

      <Modal
        isOpen={editingBagIdx !== null}
        onClose={() => setEditingBagIdx(null)}
        title={`Edit bag ${(editingBagIdx ?? 0) + 1}`}
        subtitle="Correct the scale reading"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <NumberField
            label="Scale weight (kg)"
            value={editingBagWeight}
            onValueChange={setEditingBagWeight}
            suffixText="KG"
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditingBagIdx(null)}>Cancel</Button>
            <Button variant="primary" onClick={saveEditedBag}>Update bag</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        subtitle={confirm?.message}
        maxWidth="sm"
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              const action = confirm?.action;
              setConfirm(null);
              action?.();
            }}
          >
            {confirm?.confirmLabel || 'Confirm'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={duplicateSale !== null}
        onClose={() => setDuplicateSale(null)}
        title="Same bill already saved today"
        subtitle="Confirm this is a second order, or discard it if the first click already posted."
        maxWidth="md"
      >
        {duplicateSale && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface">
              A bill with the same customer, items and total is already on {duplicateSale.existing.date}.
            </p>
            <div className="rounded-2xl bg-surface-container-low p-4 text-xs space-y-1.5">
              <div className="flex justify-between"><span className="text-on-surface-variant">First bill</span><span className="font-extrabold">{duplicateSale.existing.billNumber}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Customer</span><span className="font-extrabold">{duplicateSale.existing.customerName}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Date</span><span className="font-extrabold">{duplicateSale.existing.date}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Total</span><span className="font-extrabold">₹{formatRupee(duplicateSale.existing.totalAmount)}</span></div>
              {duplicateSale.existing.items.map((item) => (
                <div key={`${item.lotNumber}-${item.markCode}`} className="flex justify-between">
                  <span className="text-on-surface-variant">{item.lotNumber} · {item.markCode} · {item.bags} bags</span>
                  <span className="font-extrabold">{item.weightKg} KG @ ₹{item.ratePerKg}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setDuplicateSale(null);
                  toast({
                    type: 'info',
                    title: 'Bill discarded',
                    message: `${duplicateSale.existing.billNumber} is unchanged. Nothing new was posted.`,
                  });
                }}
              >
                Discard this bill
              </Button>
              <Button
                variant="primary"
                isLoading={createSaleMutation.isPending}
                onClick={() => {
                  const pending = duplicateSale;
                  setDuplicateSale(null);
                  return handleConfirmSale(pending.settlement, true);
                }}
              >
                Yes, this is a second order
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <CustomerFormModal
        isOpen={addingCustomer}
        onClose={() => setAddingCustomer(false)}
        onCreated={(customer) => {
          setAddedCustomers((prev) => [...prev, customer]);
          setCustomerId(customer.id);
        }}
      />
    </div>
  );
};
