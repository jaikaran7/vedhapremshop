'use client';

import { useSession } from '@/store/session/session-provider';
import { useVendorsQuery } from '@/hooks/queries/use-vendors-query';
import { useCostingExpenseTypesQuery, useProductsQuery } from '@/hooks/queries/use-directory-query';
import { CONSIGNMENT_CHARGE_NAMES } from '@/data/costing-seed';
import { purchaseExpenseLabel } from '@/utils/receiving';
import { useCreatePurchaseMutation } from '@/hooks/mutations/use-purchase-mutations';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { can } from '@/auth/permissions';
import React, { useEffect, useState } from 'react';
import { CostingExpenseType, PurchaseItem, PurchaseExpense } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberField } from '@/components/ui/NumberField';
import { Select } from '@/components/ui/Select';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { 
  ArrowLeft, PlusCircle, Trash2, Truck, Layers, 
  FileText, CheckCircle2, Pencil
} from 'lucide-react';

const CUSTOM_EXPENSE = 'custom';

function lotDateStamp(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return '';
  return `${day}${month}${year}`;
}

function isGenericOtherExpense(type: { id: string; name: string }): boolean {
  return type.id === 'cet-other-purchase' || /^other(\s|$)/i.test(type.name.trim());
}

type QualityDraft = {
  id: string | null;
  markCode: string;
  bags: string;
  weightKg: string;
  ratePerKg: string;
};

function openingCharges(types: CostingExpenseType[]): PurchaseExpense[] {
  return CONSIGNMENT_CHARGE_NAMES.flatMap((name) => {
    const type = types.find((item) => item.name === name);
    if (!type) return [];
    return [{
      id: `pe-${type.id}`,
      type: 'OTHER' as const,
      expenseTypeId: type.id,
      expenseTypeName: type.name,
      amount: 0,
      description: '',
      remarks: '',
    }];
  });
}

function emptyQualityDraft(): QualityDraft {
  return { id: null, markCode: '', bags: '', weightKg: '', ratePerKg: '' };
}

function numericDraft(raw: string, allowDecimal: boolean): string {
  const cleaned = allowDecimal ? raw.replace(/[^\d.]/g, '') : raw.replace(/\D/g, '');
  if (!allowDecimal) return cleaned.replace(/^0+(?=\d)/, '');
  const [whole, fraction] = cleaned.split('.');
  const nextWhole = (whole || '').replace(/^0+(?=\d)/, '');
  if (fraction === undefined) return nextWhole;
  return `${nextWhole || '0'}.${fraction.replace(/\./g, '')}`;
}

function parsePositive(raw: string, allowDecimal: boolean): number | null {
  const trimmed = raw.trim();
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) return null;
  if (!allowDecimal && trimmed.includes('.')) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export const NewPurchase: React.FC = () => {
  const { currentUser } = useSession();
  const { data: vendors = [] } = useVendorsQuery();
  const { data: products = [] } = useProductsQuery();
  const { data: expenseTypes = [] } = useCostingExpenseTypesQuery();
  const presetExpenseTypes = expenseTypes.filter((type) => type.kind === 'PURCHASE' && type.status === 'ACTIVE' && !isGenericOtherExpense(type));
  const createPurchaseMutation = useCreatePurchaseMutation();
  const createPurchase = (data: Parameters<typeof createPurchaseMutation.mutateAsync>[0]) => createPurchaseMutation.mutateAsync(data);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Preselected vendor from query
  const defaultVendorId = searchParams?.get('vendorId') || (vendors[0]?.id || '');

  // Form State
  const [vendorId, setVendorId] = useState(defaultVendorId);
  const [productId, setProductId] = useState('');
  const [billNumber, setBillNumber] = useState(`PUR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedArrivalDate, setExpectedArrivalDate] = useState('');
  const [lotCode, setLotCode] = useState('');
  const [notes, setNotes] = useState('');

  // Multi-Mark Items State
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [qualityDraft, setQualityDraft] = useState<QualityDraft | null>(null);

  // Consignment Expenses State
  const [expenses, setExpenses] = useState<PurchaseExpense[]>([]);
  const [chargesReady, setChargesReady] = useState(false);

  // Review step modal / screen toggle
  const [isReviewing, setIsReviewing] = useState(false);

  const activeProducts = products.filter((product) => product.status === 'ACTIVE');
  const resolvedProductId = productId || activeProducts.find((product) => product.code === 'ONIONS')?.id || activeProducts[0]?.id || '';

  useEffect(() => {
    if (chargesReady) return;
    const rows = openingCharges(presetExpenseTypes);
    if (rows.length < CONSIGNMENT_CHARGE_NAMES.length) return;
    setExpenses(rows);
    setChargesReady(true);
  }, [chargesReady, presetExpenseTypes]);

  // Role Guard: Salesperson cannot create purchases
  if (!can(currentUser.role, 'viewPurchaseCost')) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Restricted Floor Area</h3>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/salesperson-home')}>
          Back to Floor
        </Button>
      </div>
    );
  }

  // Math Calculations
  const openQuality = (item?: PurchaseItem) => {
    setQualityDraft(item ? {
      id: item.id,
      markCode: item.markCode,
      bags: String(item.bags),
      weightKg: String(item.weightKg),
      ratePerKg: String(item.ratePerKg),
    } : emptyQualityDraft());
  };

  const saveQuality = () => {
    if (!qualityDraft) return;
    const markCode = qualityDraft.markCode.trim().toUpperCase();
    const bags = parsePositive(qualityDraft.bags, false);
    const weightKg = parsePositive(qualityDraft.weightKg, true);
    const ratePerKg = parsePositive(qualityDraft.ratePerKg, true);
    if (!markCode || bags == null || weightKg == null || ratePerKg == null) {
      toast({ type: 'error', title: 'Check this quality', message: 'Enter the quality, bag count, weight, and purchase rate.' });
      return;
    }
    const next: PurchaseItem = {
      id: qualityDraft.id ?? 'pi-' + Date.now(),
      markCode,
      bags,
      weightKg,
      ratePerKg,
      totalAmount: Math.round(weightKg * ratePerKg),
    };
    setItems((prev) => qualityDraft.id ? prev.map((item) => item.id === qualityDraft.id ? next : item) : [...prev, next]);
    setQualityDraft(null);
  };

  const updateExpense = (index: number, field: keyof PurchaseExpense, val: any) => {
    setExpenses(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: field === 'amount' ? Number(val) : val };
      return copy;
    });
  };

  const addExpense = () => {
    setChargesReady(true);
    const type = presetExpenseTypes[0];
    setExpenses(prev => [...prev, {
      id: 'pe-' + Date.now(),
      type: 'OTHER',
      expenseTypeId: type?.id ?? CUSTOM_EXPENSE,
      expenseTypeName: type?.name ?? '',
      amount: 0,
      description: '',
      remarks: '',
    }]);
  };

  const removeExpense = (index: number) => {
    setChargesReady(true);
    setExpenses(prev => prev.filter((_, i) => i !== index));
  };

  const totalBags = items.reduce((acc, i) => acc + Number(i.bags || 0), 0);
  const totalWeightKg = items.reduce((acc, i) => acc + Number(i.weightKg || 0), 0);
  const grossAmount = items.reduce((acc, i) => acc + Number(i.totalAmount || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const netAmount = grossAmount + totalExpenses;

  const selectedVendor = vendors.find(v => v.id === vendorId);
  const selectedProduct = products.find((product) => product.id === resolvedProductId);
  const dateStamp = lotDateStamp(date);
  const lotNumber = lotCode.trim() ? `${dateStamp} ${lotCode.trim().toUpperCase()}` : dateStamp;

  const handleConfirm = async () => {
    if (!selectedVendor) {
      toast({ type: 'error', title: 'Vendor Required', message: 'Please select a consignment supplier' });
      return;
    }
    if (!selectedProduct) {
      toast({ type: 'error', title: 'Product required', message: 'Choose the product for this consignment.' });
      return;
    }
    const missingCharge = CONSIGNMENT_CHARGE_NAMES.find((name) => {
      const line = expenses.find((expense) => expense.expenseTypeName === name);
      return !line || line.amount <= 0;
    });
    if (missingCharge) {
      toast({ type: 'error', title: `${missingCharge} required`, message: `Enter the ${missingCharge.toLowerCase()} amount for this consignment.` });
      return;
    }
    if (!lotCode.trim()) {
      toast({ type: 'error', title: 'Lot code required', message: 'Add the consignment code after the date, such as QP or CV.' });
      return;
    }
    const billItems = items.map((item) => ({ ...item, markCode: item.markCode.trim().toUpperCase() }));
    if (billItems.length === 0 || billItems.some((item) => !item.markCode)) {
      toast({ type: 'error', title: 'Quality required', message: 'Type the quality for each line. It can be different on every consignment.' });
      return;
    }
    if (billItems.some((item) => item.bags <= 0 || item.weightKg <= 0)) {
      toast({ type: 'error', title: 'Quantity required', message: 'Each quality needs bags and weight.' });
      return;
    }
    if (expenses.some((expense) => expense.expenseTypeId === CUSTOM_EXPENSE && !expense.expenseTypeName?.trim())) {
      toast({ type: 'error', title: 'Expense name required', message: 'Type a name for each custom purchase expense.' });
      return;
    }

    const created = await createPurchase({
      billNumber,
      vendorId: selectedVendor.id,
      vendorName: selectedVendor.name,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      date,
      expectedArrivalDate: expectedArrivalDate || undefined,
      receiptStatus: 'PENDING_RECEIPT',
      lotNumber,
      items: billItems,
      expenses: expenses.map((expense) => ({
        ...expense,
        expenseTypeName: expense.expenseTypeName?.trim() ?? '',
      })),
      grossAmount,
      totalExpenses,
      netAmount,
      notes,
    });

    toast({
      type: 'success',
      title: 'Vendor bill saved',
      message: `${lotNumber} is awaiting arrival. ${totalBags} bags (${totalWeightKg} KG) are not in stock until you receive the lot.`
    });

    router.push(`/purchases/${created.id}`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => isReviewing ? setIsReviewing(false) : router.push('/purchases')}
            className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">
              {isReviewing ? 'Review Consignment Purchase' : 'New Consignment Purchase'}
            </h1>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Save the vendor bill now. Physical stock is posted later from Receive Lot.
            </p>
          </div>
        </div>

        {isReviewing ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setIsReviewing(false)}>
              Edit Parameters
            </Button>
            <Button variant="primary" onClick={handleConfirm} icon={<CheckCircle2 className="w-4 h-4" />}>
              Save Vendor Bill — Awaiting Arrival
            </Button>
          </div>
        ) : (
          <Button variant="primary" onClick={() => setIsReviewing(true)}>
            Review Consignment →
          </Button>
        )}
      </div>

      {!isReviewing ? (
        <div className="space-y-6">
          {/* Step 1: Consignment Source & Reference */}
          <Card variant="lowest">
            <h3 className="text-base font-bold font-display text-on-surface mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              <span>1. Supplier & Mandi Bill Reference</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="Product"
                value={resolvedProductId}
                onChange={(e) => setProductId(e.target.value)}
                options={activeProducts.map((product) => ({ value: product.id, label: product.name }))}
                required
              />

              <Select
                label="Consignment Supplier / Vendor"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                options={vendors.map(v => ({ value: v.id, label: `${v.name} (${v.mandiCity})` }))}
                required
              />

              <Input
                label="Vendor Source Bill No."
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                required
              />

              <Input
                label="Purchase Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <Input
                label="Expected Arrival"
                type="date"
                value={expectedArrivalDate}
                onChange={(e) => setExpectedArrivalDate(e.target.value)}
                helperText="The vehicle can arrive on a later day"
              />

              <Input
                label="Lot date"
                value={dateStamp || '—'}
                readOnly
                helperText="Filled from the purchase date"
              />

              <Input
                label="Consignment code"
                value={lotCode}
                onChange={(e) => setLotCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                placeholder="QP"
                helperText={lotCode.trim() ? `Lot number ${lotNumber}` : 'Added after the date, such as QP or CV'}
                required
              />
            </div>
          </Card>

          {/* Step 2: Multi-Mark Graded Breakdown */}
          <Card variant="lowest">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold font-display text-on-surface flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>2. Quality on this consignment</span>
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Type the quality for this consignment. The next bill can use a different quality.
                </p>
              </div>

              <Button variant="secondary" size="sm" icon={<PlusCircle className="w-3.5 h-3.5" />} onClick={() => openQuality()}>
                Add quality
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-on-surface-variant">No qualities yet. Add each quality from the popup.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl bg-surface-container-low">
                <table className="w-full text-left text-base">
                  <thead className="bg-surface-container text-sm uppercase font-bold text-on-surface-variant">
                    <tr>
                      <th className="py-4 px-5 w-[22%]">Quality</th>
                      <th className="py-4 px-5">Bags</th>
                      <th className="py-4 px-5">Weight</th>
                      <th className="py-4 px-5">Rate</th>
                      <th className="py-4 px-5 text-right">Amount</th>
                      <th className="py-4 px-5 w-28" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-surface-container-lowest odd:bg-surface-container-lowest cursor-pointer"
                        onClick={() => openQuality(item)}
                      >
                        <td className="py-5 px-5 text-lg font-bold text-primary">{item.markCode}</td>
                        <td className="py-5 px-5 font-semibold">{item.bags}</td>
                        <td className="py-5 px-5 font-semibold">{item.weightKg.toLocaleString('en-IN')} kg</td>
                        <td className="py-5 px-5">₹{item.ratePerKg.toFixed(2)}</td>
                        <td className="py-5 px-5 text-right text-lg font-extrabold font-display">₹{item.totalAmount.toLocaleString('en-IN')}</td>
                        <td className="py-5 px-5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            className="inline-flex p-2 rounded-xl text-primary hover:bg-surface-container"
                            aria-label={`Edit ${item.markCode}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              openQuality(item);
                            }}
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex p-2 rounded-xl text-danger hover:bg-surface-container"
                            aria-label={`Remove ${item.markCode}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setItems((prev) => prev.filter((row) => row.id !== item.id));
                            }}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-surface-container-low flex justify-between text-xs font-semibold text-on-surface">
              <span>Total Graded: {totalBags} bags • {totalWeightKg.toLocaleString('en-IN')} KG</span>
              <span className="font-extrabold font-display text-sm">Goods Subtotal: ₹{grossAmount.toLocaleString('en-IN')}</span>
            </div>
          </Card>

          {/* Step 3: Consignment Expenses (Freight, Hamali, Cess) */}
          <Card variant="lowest">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold font-display text-on-surface flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>3. Purchase expenses payable to the vendor</span>
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Scale, term, and loading start on every consignment. Enter each amount before saving.
                </p>
              </div>

              <Button variant="secondary" size="sm" icon={<PlusCircle className="w-3.5 h-3.5" />} onClick={addExpense}>
                Add Expense
              </Button>
            </div>

            <div className="space-y-3">
              {expenses.map((expense, index) => (
                <div 
                  key={expense.id} 
                  className="p-3.5 rounded-2xl bg-surface-container-low grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
                >
                  <Select
                    id={`purchase-expense-type-${expense.id}`}
                    label="Expense Type"
                    value={expense.expenseTypeId ?? ''}
                    onChange={(e) => {
                      const type = presetExpenseTypes.find((item) => item.id === e.target.value);
                      setExpenses(prev => prev.map((item, itemIndex) => itemIndex === index ? {
                        ...item,
                        type: 'OTHER',
                        expenseTypeId: e.target.value,
                        expenseTypeName: e.target.value === CUSTOM_EXPENSE ? '' : (type?.name ?? item.expenseTypeName),
                      } : item));
                    }}
                    options={[
                      ...presetExpenseTypes.map((type) => ({ value: type.id, label: type.name })),
                      { value: CUSTOM_EXPENSE, label: 'Custom' },
                    ]}
                  />
                  {expense.expenseTypeId === CUSTOM_EXPENSE && (
                    <Input
                      id={`purchase-expense-name-${expense.id}`}
                      label="Expense name"
                      value={expense.expenseTypeName}
                      onChange={(e) => updateExpense(index, 'expenseTypeName', e.target.value)}
                      placeholder="Type the expense"
                    />
                  )}

                  <Input
                    id={`purchase-expense-description-${expense.id}`}
                    label="Description"
                    value={expense.description}
                    onChange={(e) => updateExpense(index, 'description', e.target.value)}
                  />
                  <NumberField
                    id={`purchase-expense-amount-${expense.id}`}
                    label="Amount (₹)"
                    value={expense.amount}
                    onValueChange={(amount) => updateExpense(index, 'amount', amount)}
                    prefixText="₹"
                  />
                  <Input
                    id={`purchase-expense-remarks-${expense.id}`}
                    label="Remarks"
                    value={expense.remarks ?? ''}
                    onChange={(e) => updateExpense(index, 'remarks', e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={() => removeExpense(index)}
                    className="p-2 text-danger hover:bg-danger-container/50 rounded-xl mt-4"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-surface-container-low flex justify-between text-xs font-semibold text-on-surface">
              <span>Purchase expenses on this vendor bill</span>
              <span className="font-extrabold font-display">₹{totalExpenses.toLocaleString('en-IN')}</span>
            </div>
          </Card>

          {/* Step 4: Attachment & Operational Notes */}
          <Card variant="lowest">
            <h3 className="text-base font-bold font-display text-on-surface mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span>4. Yard notes</span>
            </h3>
            <Input
              label="Notes / Consignment Remarks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Lasalgaon red onion, dry quality, minimal tare."
            />
          </Card>
        </div>
      ) : (
        /* Review Screen Before Final Confirmation */
        <div className="space-y-6">
          <Card variant="lowest" className="border-t-4 border-t-primary">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container-low">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary font-display">Review Consignment</span>
                <h3 className="text-xl font-bold font-display text-on-surface">{lotNumber} — {billNumber}</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  {selectedProduct?.name ?? 'Product'} • Supplier: {selectedVendor?.name} ({selectedVendor?.mandiCity}) • Date: {date}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-on-surface-variant font-medium">Net Landing Cost</span>
                <div className="text-2xl font-extrabold font-display text-primary">
                  ₹{netAmount.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-bold font-display text-on-surface">Graded Lot Inventory Summary</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low uppercase text-[10px] font-bold text-on-surface-variant">
                    <tr>
                      <th className="py-2.5 px-4">Mark</th>
                      <th className="py-2.5 px-4">Bags</th>
                      <th className="py-2.5 px-4">Weight (KG)</th>
                      <th className="py-2.5 px-4">Avg Bag</th>
                      <th className="py-2.5 px-4">Rate/KG</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low">
                    {items.map(item => (
                      <tr key={item.id}>
                        <td className="py-3 px-4 font-bold text-primary">{item.markCode}</td>
                        <td className="py-3 px-4 font-semibold">{item.bags} bags</td>
                        <td className="py-3 px-4 font-semibold">{item.weightKg.toLocaleString('en-IN')} KG</td>
                        <td className="py-3 px-4 text-on-surface-variant">{item.bags > 0 ? `${(item.weightKg / item.bags).toFixed(1)} KG/bag` : '—'}</td>
                        <td className="py-3 px-4 font-bold">₹{item.ratePerKg.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-extrabold font-display">₹{item.totalAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {expenses.length > 0 && (
              <div className="mt-6 pt-4 border-t border-surface-container-low">
                <h4 className="text-sm font-bold font-display text-on-surface mb-2">Purchase expenses payable to the vendor</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {expenses.map(e => (
                    <div key={e.id} className="p-3 rounded-xl bg-surface-container-low flex justify-between">
                      <span className="text-on-surface-variant">{purchaseExpenseLabel(e)}{e.description ? `: ${e.description}` : ''}</span>
                      <span className="font-bold text-on-surface">₹{e.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-surface-container-low flex items-center justify-between">
              <Button variant="secondary" onClick={() => setIsReviewing(false)}>
                ← Back to Edit
              </Button>
              <Button variant="primary" size="lg" onClick={handleConfirm} icon={<CheckCircle2 className="w-5 h-5" />}>
                Save Vendor Bill — Awaiting Arrival
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Modal
        isOpen={qualityDraft != null}
        onClose={() => setQualityDraft(null)}
        title={qualityDraft?.id ? 'Edit quality' : 'Add quality'}
        subtitle="Quality, bags, weight, and purchase rate for this consignment."
        maxWidth="xl"
      >
        {qualityDraft && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="quality-draft-name"
                label="Quality"
                value={qualityDraft.markCode}
                onChange={(e) => setQualityDraft({ ...qualityDraft, markCode: e.target.value.toUpperCase() })}
                placeholder="AA, Premium, Red"
                autoFocus
              />
              <Input
                id="quality-draft-bags"
                label="Bag count"
                inputMode="numeric"
                value={qualityDraft.bags}
                onChange={(e) => setQualityDraft({ ...qualityDraft, bags: numericDraft(e.target.value, false) })}
                placeholder="100"
                suffixText="Bags"
              />
              <Input
                id="quality-draft-weight"
                label="Total weight"
                inputMode="decimal"
                value={qualityDraft.weightKg}
                onChange={(e) => setQualityDraft({ ...qualityDraft, weightKg: numericDraft(e.target.value, true) })}
                placeholder="5200"
                suffixText="KG"
              />
              <Input
                id="quality-draft-rate"
                label="Purchase rate"
                inputMode="decimal"
                value={qualityDraft.ratePerKg}
                onChange={(e) => setQualityDraft({ ...qualityDraft, ratePerKg: numericDraft(e.target.value, true) })}
                placeholder="47"
                prefixText="₹"
                suffixText="/KG"
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-surface-container-low px-4 py-3">
              <span className="text-xs font-bold uppercase text-on-surface-variant">Subtotal</span>
              <span className="text-lg font-extrabold font-display text-primary">
                ₹{Math.round((parsePositive(qualityDraft.weightKg, true) ?? 0) * (parsePositive(qualityDraft.ratePerKg, true) ?? 0)).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setQualityDraft(null)}>Cancel</Button>
              <Button variant="primary" onClick={saveQuality}>{qualityDraft.id ? 'Save quality' : 'Add quality'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
