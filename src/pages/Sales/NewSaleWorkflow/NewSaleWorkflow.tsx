'use client';

import { useSession } from '@/store/session/session-provider';
import { useCustomersQuery } from '@/hooks/queries/use-customers-query';
import { useLotsQuery } from '@/hooks/queries/use-lots-query';
import { usePurchasesQuery } from '@/hooks/queries/use-purchases-query';
import { useMarksQuery, useProductsQuery, useSaleChargeSettingsQuery } from '@/hooks/queries/use-directory-query';
import { useCreateSaleMutation, useRebillSaleMutation } from '@/hooks/mutations/use-sale-mutations';
import { useSalesQuery } from '@/hooks/queries/use-sales-query';
import { gradeOnLots } from '@/utils/lot-mark';
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
import { Select } from '@/components/ui/Select';
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
const GRAMS_PER_KG = 1000;
const MAX_BAG_KG = 500;

function kgToGrams(kg: number): number {
  return Math.round(kg * GRAMS_PER_KG);
}

/** One weight per bag. The weights sum to the recorded total, to the gram. */
function splitRecordedKg(totalKg: number, bagCount: number): number[] | null {
  if (!Number.isInteger(bagCount) || bagCount < 1) return null;
  const totalGrams = kgToGrams(totalKg);
  if (totalGrams < bagCount) return null;
  const base = Math.floor(totalGrams / bagCount);
  const extra = totalGrams - base * bagCount;
  const heaviest = base + (extra > 0 ? 1 : 0);
  if (heaviest > MAX_BAG_KG * GRAMS_PER_KG) return null;
  return Array.from({ length: bagCount }, (_, index) => (base + (index < extra ? 1 : 0)) / GRAMS_PER_KG);
}

function describeSplit(weights: number[]): string {
  const heavy = weights[0];
  const light = weights[weights.length - 1];
  if (heavy === light) return `${weights.length} bags at ${heavy} kg each.`;
  const heavyCount = weights.filter((weight) => weight === heavy).length;
  return `${heavyCount} bags at ${heavy} kg and ${weights.length - heavyCount} bags at ${light} kg.`;
}

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
 * It can be letters or an integer, such as OK, K, 27, or HB.
 * The sales screen shows that name, not the lot code stored in front of it.
 */
function saleGradeLabel(code: string, lotNumber: string, lots: Lot[]): string {
  return gradeOnLots(code, lotNumber, lots);
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
  const queryEditReason = searchParams?.get('reason')?.trim() || '';
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
  const [rebillReason, setRebillReason] = useState(queryEditReason);
  const loadedRebill = useRef(false);
  const backdated = saleDate !== TRADING_SESSION_DATE;
  const [saleItems, setSaleItems] = useState<SaleDraftLine[]>(() => [
    emptyLine(queryLotNumber),
  ]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [step, setStep] = useState<'entry' | 'review'>('entry');
  const [quickWeightInput, setQuickWeightInput] = useState('');
  const [editingBagIdx, setEditingBagIdx] = useState<number | null>(null);
  const [editingBagWeight, setEditingBagWeight] = useState<number>(0);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBagCount, setBulkBagCount] = useState(0);
  const [bulkTotalKg, setBulkTotalKg] = useState(0);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [duplicateSale, setDuplicateSale] = useState<{ settlement: SaleSettlement; existing: DuplicateSaleSummary } | null>(null);
  const productAnchor = useRef<HTMLDivElement>(null);
  const lotsAnchor = useRef<HTMLDivElement>(null);
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
    if (queryEditReason.length < 3) return;
    setRebillReason((current) => (current.trim().length >= 3 ? current : queryEditReason));
  }, [queryEditReason]);

  useEffect(() => {
    if (!rebillOf || loadedRebill.current) return;
    loadedRebill.current = true;
    setCounterSale(!rebillOf.customerId);
    setCustomerId(rebillOf.customerId);
    if (rebillOf.productId) setProductId(rebillOf.productId);
    setSaleDate(rebillOf.date);
    setNotes(rebillOf.notes ?? '');
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
  // A lot with no bags left is not offered. One already chosen or already on this bill stays, so the bill never loses a line from view.
  const visibleLots = productLots.filter((lot) => lot.remainingBags > 0
    || sameCode(lot.lotNumber, currentItem.lotNumber)
    || saleItems.some((item) => item.bags.length > 0 && sameCode(item.lotNumber, lot.lotNumber)));

  const productOfLot = (lotNumber: string) => {
    const lot = lots.find((entry) => sameCode(entry.lotNumber, lotNumber));
    return lot ? products.find((product) => lotBelongsToProduct(lot, product)) : undefined;
  };

  const calculatedItems: SaleItem[] = saleItems.map((item) => {
    const totalWeight = item.bags.reduce((acc, bag) => acc + bag.weightKg, 0);
    const lineProduct = productOfLot(item.lotNumber);
    return {
      id: item.id,
      productId: lineProduct?.id,
      productName: lineProduct?.name,
      chargesApply: lineProduct?.appliesSaleCharges !== false,
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
  // Amali and market fee are charged on the onion lines only; ginger and garlic add nothing.
  const chargedItems = billItems.filter((item) => item.chargesApply !== false);
  const chargedBags = chargedItems.reduce((acc, item) => acc + item.bags, 0);
  const chargedSubtotal = chargedItems.reduce((acc, item) => acc + item.amount, 0);
  const billProductName = [...new Set(billItems.map((item) => item.productName).filter(Boolean))].join(', ');
  const invoiceCharges = useMemo(() => calculateSaleCharges({
    totalBags: grandTotalBags,
    productSubtotal: grandTotalAmount,
    chargedBags,
    chargedSubtotal,
    settings: chargeSettings,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [grandTotalBags, grandTotalAmount, chargedBags, chargedSubtotal, chargeSettings]);

  const currentCalc = calculatedItems[activeItemIndex] || calculatedItems[0];
  const selectedLot = lots.find((lot) => sameCode(lot.lotNumber, currentItem?.lotNumber || ''));
  const selectedLotMarks = selectedLot ? mergeLotMarks(selectedLot.marks) : [];
  const selectedLotMark = selectedLotMarks.find((mark) => sameCode(mark.markCode, currentItem?.markCode || ''));
  const currentQuote = quotedSaleRate(selectedLot, currentItem?.markCode || '', marks);
  const draftedOnMark = selectedLotMark && currentItem?.lotNumber && currentItem.markCode
    ? {
        bags: draftedBags(saleItems, currentItem.lotNumber, currentItem.markCode),
        grams: kgToGrams(draftedWeight(saleItems, currentItem.lotNumber, currentItem.markCode)),
      }
    : { bags: 0, grams: 0 };
  const bagsLeft = selectedLotMark ? Math.max(0, selectedLotMark.remainingBags - draftedOnMark.bags) : 0;
  const kgLeftGrams = selectedLotMark
    ? Math.max(0, kgToGrams(selectedLotMark.remainingWeightKg) - draftedOnMark.grams)
    : 0;
  const bulkSplit = bulkOpen ? splitRecordedKg(bulkTotalKg, bulkBagCount) : null;
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

  const reveal = (node: HTMLElement | null) => {
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

  // Choosing a product only changes which lots are listed. A bill can hold lines of several products,
  // so lines already weighed stay, and the next lot picked starts a new line.
  const requestProduct = (nextId: string) => {
    if (nextId === productId) return;
    setProductId(nextId);
    reveal(lotsAnchor.current);
    setQuickWeightInput('');
    const nextProduct = products.find((product) => product.id === nextId);
    const currentLot = lots.find((lot) => sameCode(lot.lotNumber, currentItem?.lotNumber || ''));
    const currentFits = !!nextProduct && !!currentLot && lotBelongsToProduct(currentLot, nextProduct);
    if (currentFits) return;
    if (currentItem && currentItem.bags.length > 0) {
      setSaleItems((prev) => [...prev, emptyLine()]);
      setActiveItemIndex(saleItems.length);
      return;
    }
    replaceActive({ lotNumber: '', markCode: '', ratePerKg: 0 });
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

  const openSellTotalMark = () => {
    if (!selectedLot || !currentItem.markCode || !selectedLotMark) {
      toast({ type: 'error', title: 'Select a quality', message: 'Choose a lot and a quality before selling this mark.' });
      return;
    }
    if (!(currentItem.ratePerKg > 0)) {
      toast({
        type: 'error',
        title: 'Rate required',
        message: currentQuote.source === 'MISSING'
          ? 'Enter a selling rate. This quality has no finalized rate and no floor rate.'
          : 'Enter a selling rate for this quality.',
      });
      return;
    }
    if (bagsLeft < 1) {
      toast({
        type: 'error',
        title: 'No bags left',
        message: `Every available bag of ${saleGradeLabel(currentItem.markCode, currentItem.lotNumber, lots)} is already on this bill.`,
      });
      return;
    }
    setBulkBagCount(bagsLeft);
    setBulkTotalKg(0);
    setBulkOpen(true);
  };

  const recordTotalMark = () => {
    const totalKg = parseBagWeight(bulkTotalKg);
    if (!Number.isInteger(bulkBagCount) || bulkBagCount < 1 || bulkBagCount > bagsLeft) {
      toast({ type: 'error', title: 'Bag count', message: `Choose between 1 and ${bagsLeft} bags.` });
      return;
    }
    if (totalKg == null) {
      toast({ type: 'error', title: 'Invalid weight', message: 'Enter the total kilograms recorded.' });
      return;
    }
    if (kgToGrams(totalKg) > kgLeftGrams) {
      toast({
        type: 'error',
        title: 'Over stock',
        message: `Only ${(kgLeftGrams / GRAMS_PER_KG).toLocaleString('en-IN')} kg of ${saleGradeLabel(currentItem.markCode, currentItem.lotNumber, lots)} are still available.`,
      });
      return;
    }
    const weights = splitRecordedKg(totalKg, bulkBagCount);
    if (!weights) {
      toast({
        type: 'error',
        title: 'Weight does not fit',
        message: 'Each bag needs a weight above zero and at most 500 kg.',
      });
      return;
    }
    setSaleItems((prev) => prev.map((item, index) => {
      if (index !== activeItemIndex) return item;
      return {
        ...item,
        bags: [
          ...item.bags,
          ...weights.map((weightKg, offset) => ({
            bagNumber: item.bags.length + offset + 1,
            weightKg,
          })),
        ],
      };
    }));
    setBulkOpen(false);
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
        toast({ type: 'error', title: 'Rate required', message: `${saleGradeLabel(item.markCode, item.lotNumber, lots)} has no usable selling rate.` });
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
        toast({ type: 'error', title: 'Over stock', message: `${saleLotCode(group.lotNumber)} ${saleGradeLabel(group.markCode, group.lotNumber, lots)} does not have enough stock for these bags.` });
        return;
      }
    }
    setStep('review');
  };

  const handleConfirmSale = async (settlement: SaleSettlement, confirmDuplicateSale = false) => {
    if ((!counterSale && !selectedCustomer) || billItems.length === 0) return;
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
      productId: billItems[0]?.productId ?? selectedProduct?.id,
      productName: billProductName || selectedProduct?.name,
      date: saleDate,
      dateReason: dateReason.trim() || undefined,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      items: billItems,
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
          toast({ type: 'info', title: 'Sent for Owner approval', message: `The edit to ${rebillOf.billNumber} is waiting for the Owner.` });
          router.push(`/sales/${rebillOf.id}`);
        } else {
          toast({ type: 'success', title: 'Bill updated', message: `${rebillOf.billNumber} now has the new product, bags and amount. Stock readjusted.` });
          router.push(`/sales/${result.sale.id}`);
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
              if (step === 'review') setStep('entry');
              else router.back();
            }}
            className="p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-on-surface tracking-tight">
                {step === 'review' ? 'Confirm Wholesale Sale Bill' : 'Floor Weighment & Sale'}
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

        {step === 'review' ? (
          <Button variant="secondary" size="md" onClick={() => setStep('entry')}>Edit Weighment</Button>
        ) : null}
      </div>

      {step === 'entry' ? (
        <div className="space-y-6">
          <Card variant="lowest" padding="md" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] gap-4 items-start">
            <CustomerSearch
              customers={directory}
              selected={selectedCustomer}
              counterSale={counterSale}
              locked={!!rebillOf}
              onSelect={(id) => {
                setCounterSale(false);
                setCustomerId(id);
                warnCredit(directory.find((customer) => customer.id === id));
                reveal(productAnchor.current);
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
            <Input
              label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional note for this bill"
            />
            </div>
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
            {backdated && !rebillOf && (
              <p className="text-xs font-semibold text-tertiary flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                This bill will be dated {saleDate}, not today. Stock, the customer&apos;s balance and any payment go on that date straight away.
              </p>
            )}
            {rebillOf && (
              <p className="text-xs font-semibold text-on-surface-variant">
                Editing {rebillOf.billNumber}. The bill number stays. Bags go back to the old lot, the new bags are taken, and the balance moves by the difference.
                {currentUser.role === 'OWNER' ? '' : ' The change waits for the Owner\'s approval.'}
              </p>
            )}
          </Card>

          <section ref={productAnchor} className="space-y-3">
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
          <section ref={lotsAnchor} className="space-y-3">
            <h2 className="text-sm font-bold font-display text-on-surface">
              Lots · {selectedProduct.name}
            </h2>
            {visibleLots.length === 0 ? (
              <div className="rounded-2xl bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
                No {selectedProduct?.name.toLowerCase() || 'product'} lots are in stock.
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(11.5rem, 1fr))' }}>
                {visibleLots.map((lot) => {
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
                      <span className="block text-base font-bold font-display">{saleGradeLabel(mark.markCode, selectedLot.lotNumber, lots)}</span>
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
          <div className="flex items-center justify-between flex-wrap gap-3 min-w-0">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 min-w-0 max-w-full flex-1">
              {saleItems.map((item, index) => {
                const itemCalc = calculatedItems[index];
                const label = item.markCode ? saleGradeLabel(item.markCode, item.lotNumber, lots) : 'New quality';
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

          <div ref={weighAnchor} className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
            <Card variant="lowest" className="lg:col-span-4 min-w-0 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3">
                  <h3 className="text-sm font-bold font-display text-on-surface">Grade & Pricing</h3>
                  {currentItem.markCode && <Chip label={currentItem.markCode} variant="primary" size="sm" />}
                </div>
                <div className="rounded-2xl bg-surface-container-low p-4 text-sm">
                  <div className="text-[10px] uppercase font-bold text-on-surface-variant">Selected</div>
                  <div className="font-bold font-display text-on-surface mt-1">
                    {productOfLot(currentItem.lotNumber)?.name || selectedProduct?.name || 'Product'} · {currentItem.lotNumber ? saleLotCode(currentItem.lotNumber) : 'No lot'} · {currentItem.markCode ? saleGradeLabel(currentItem.markCode, currentItem.lotNumber, lots) : 'No quality'}
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

            <Card variant="lowest" className="lg:col-span-8 min-w-0 flex flex-col justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <Scale className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
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
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 min-w-0">
                    {WEIGHT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => addBag(preset)}
                        className="min-w-0 py-3 px-1 rounded-xl bg-surface-container-low hover:bg-primary-fixed hover:text-primary active:scale-95 font-display font-extrabold text-sm text-on-surface transition-all select-none cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-6 min-w-0">
                  <div className="xl:col-span-7 flex flex-col justify-between min-w-0">
                    <div className="flex flex-col gap-2 min-w-0">
                      <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:items-center">
                        <div className="flex-1 min-w-0 w-full">
                          <Input
                            className="min-w-0"
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
                        <Button variant="primary" size="md" className="w-full shrink-0 sm:w-auto" onClick={() => addBag(Number(quickWeightInput))} icon={<PlusCircle className="w-4 h-4" />}>
                          Add bag
                        </Button>
                      </div>
                      <Button variant="secondary" size="md" className="w-full" onClick={openSellTotalMark}>
                        Sell total mark in this slot
                      </Button>
                    </div>
                    <div className="mt-3 hidden p-2 sm:p-3 rounded-2xl bg-surface-container-low min-w-0 xl:block">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5 text-center">Tablet touch keypad</span>
                      <div className="grid grid-cols-4 gap-1.5 min-w-0">
                        {['1', '2', '3', 'CLEAR', '4', '5', '6', 'BACK', '7', '8', '9', 'ENTER', '.', '0', '00', '+50kg'].map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              if (key === '+50kg') addBag(50);
                              else handleKeypadPress(key);
                            }}
                            className={`min-h-11 min-w-0 px-0.5 py-2.5 rounded-xl font-display font-bold text-[11px] sm:text-xs select-none transition-all active:scale-95 cursor-pointer ${
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

                  <div className="xl:col-span-5 flex flex-col min-w-0">
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
                          <div key={`${currentItem.id}-${bag.bagNumber}`} className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between text-xs gap-2 min-w-0">
                            <span className="text-on-surface-variant font-medium shrink-0">Bag {bag.bagNumber}</span>
                            <div className="flex items-center gap-2 min-w-0">
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
              <div className="mt-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/50 -mx-6 -mb-6 p-4 sm:-mx-8 sm:-mb-8 sm:p-6 rounded-b-2xl">
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

          <Button variant="primary" size="lg" onClick={openReview} icon={<ArrowRight className="w-5 h-5" />} className="w-full">
            Review Bill (₹{formatRupee(grandTotalAmount)})
          </Button>
        </div>
      ) : step === 'review' ? (
        <div className="space-y-6">
          <Card variant="lowest" className="border-t-4 border-t-primary">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary font-display">Check the bill before saving</span>
                <h3 className="text-xl font-bold font-display text-on-surface">
                  {counterSale ? 'Counter sale' : selectedCustomer?.name}
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  {counterSale
                    ? 'No customer name on this bill'
                    : [selectedCustomer?.marketLocation, selectedCustomer?.phone].filter(Boolean).join(' · ')}
                  {billProductName ? ` · ${billProductName}` : ''}
                </p>
                {!counterSale && selectedCustomer && (
                  <p className="text-xs font-semibold text-on-surface mt-1">
                    Outstanding ₹{selectedCustomer.outstandingAmount.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs text-on-surface-variant font-medium">Bill total</span>
                <div className="text-2xl font-extrabold font-display text-success">₹{formatRupee(invoiceCharges.finalInvoiceAmount)}</div>
              </div>
            </div>

            <InvoiceChargeSummary charges={invoiceCharges} />

            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-bold font-display text-on-surface">What is being sold</h4>
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
                      <React.Fragment key={item.id}>
                        <tr className="bg-surface-container-low/40">
                          <td className="pt-3 pb-1 px-4 font-semibold">{item.productName}</td>
                          <td className="pt-3 pb-1 px-4 font-semibold">{saleLotCode(item.lotNumber)}</td>
                          <td className="pt-3 pb-1 px-4 font-bold text-primary">{saleGradeLabel(item.markCode, item.lotNumber, lots)}</td>
                          <td className="pt-3 pb-1 px-4 font-semibold">{item.bags}</td>
                          <td className="pt-3 pb-1 px-4 font-semibold">{item.weightKg} kg</td>
                          <td className="pt-3 pb-1 px-4 font-bold">₹{item.ratePerKg.toFixed(2)}</td>
                          <td className="pt-3 pb-1 px-4 text-right font-extrabold font-display">₹{formatRupee(item.amount)}</td>
                        </tr>
                        <tr className="bg-surface-container-low/40">
                          <td colSpan={7} className="pb-3 px-4 text-[11px] text-on-surface-variant">
                            Bag weights: {item.bagWeights.map((bag) => `${bag.weightKg}`).join(' + ')} = <strong className="text-on-surface">{item.weightKg} kg</strong>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </Card>

          <PaymentSettlement
          customer={counterSale ? null : selectedCustomer}
          billTotal={invoiceCharges.finalInvoiceAmount}
          canAdjustCreditTerms={can(currentUser.role, 'accessManagement')}
          saleDate={saleDate}
          editing={!!rebillOf}
          alreadyCollected={rebillOf?.paidAmount ?? 0}
          onBack={() => setStep('entry')}
          onComplete={handleConfirmSale}
          isSubmitting={createSaleMutation.isPending || rebillMutation.isPending}
        />
        </div>
      ) : null}

      <Modal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Sell total mark in this slot"
        subtitle={
          selectedLot && currentItem.markCode
            ? `${saleLotCode(currentItem.lotNumber)} · ${saleGradeLabel(currentItem.markCode, currentItem.lotNumber, lots)} · ${bagsLeft} bags · ${(kgLeftGrams / GRAMS_PER_KG).toLocaleString('en-IN')} kg still available`
            : undefined
        }
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Select
            label="Total available bags"
            value={bulkBagCount}
            onChange={(event) => setBulkBagCount(Number(event.target.value))}
            options={Array.from({ length: bagsLeft }, (_, index) => {
              const count = bagsLeft - index;
              return {
                value: count,
                label: count === bagsLeft ? `${count} bags (all available)` : `${count} bags`,
              };
            })}
            helperText="All available bags are selected. Change this if you are selling fewer."
            required
          />
          <NumberField
            label="Total kg recorded"
            value={bulkTotalKg}
            onValueChange={setBulkTotalKg}
            suffixText="KG"
            placeholder="e.g. 520"
            helperText={bulkSplit ? describeSplit(bulkSplit) : 'Enter the scale total for the bags you selected.'}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={recordTotalMark}>Record bags</Button>
          </div>
        </div>
      </Modal>

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
