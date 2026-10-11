'use client';

import { useSession } from '@/store/session/session-provider';
import { useVendorsQuery } from '@/hooks/queries/use-vendors-query';
import { useMarksQuery } from '@/hooks/queries/use-directory-query';
import { useCreatePurchaseMutation } from '@/hooks/mutations/use-purchase-mutations';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { can } from '@/auth/permissions';
import React, { useState } from 'react';
import { PurchaseItem, PurchaseExpense } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/Toast';
import { 
  ArrowLeft, PlusCircle, Trash2, Truck, Layers, 
  FileText, CheckCircle2, Paperclip, Eye, AlertCircle 
} from 'lucide-react';

export const NewPurchase: React.FC = () => {
  const { currentUser } = useSession();
  const { data: vendors = [] } = useVendorsQuery();
  const { data: marks = [] } = useMarksQuery();
  const createPurchaseMutation = useCreatePurchaseMutation();
  const createPurchase = (data: Parameters<typeof createPurchaseMutation.mutateAsync>[0]) => createPurchaseMutation.mutateAsync(data);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Preselected vendor from query
  const defaultVendorId = searchParams?.get('vendorId') || (vendors[0]?.id || '');

  // Form State
  const [vendorId, setVendorId] = useState(defaultVendorId);
  const [billNumber, setBillNumber] = useState(`PUR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lotNumber, setLotNumber] = useState(`LOT ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`);
  const [notes, setNotes] = useState('');
  const [attachmentName, setAttachmentName] = useState('Consignment_Receipt.pdf');

  // Multi-Mark Items State
  const [items, setItems] = useState<PurchaseItem[]>([
    {
      id: 'pi-' + Date.now(),
      markCode: 'AA',
      bags: 100,
      weightKg: 5200,
      ratePerKg: 47.00,
      totalAmount: 244400
    },
    {
      id: 'pi-' + (Date.now() + 1),
      markCode: 'J',
      bags: 80,
      weightKg: 4100,
      ratePerKg: 44.00,
      totalAmount: 180400
    }
  ]);

  // Consignment Expenses State
  const [expenses, setExpenses] = useState<PurchaseExpense[]>([
    { id: 'pe-1', type: 'FREIGHT', amount: 8500, description: 'Direct truck transport' },
    { id: 'pe-2', type: 'HAMALI', amount: 1800, description: 'Unloading charges' }
  ]);

  // Review step modal / screen toggle
  const [isReviewing, setIsReviewing] = useState(false);

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
  const updateItem = (index: number, field: keyof PurchaseItem, val: any) => {
    setItems(prev => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: val };
      // Recalculate amount if weight or rate changes
      const weight = field === 'weightKg' ? Number(val) : item.weightKg;
      const rate = field === 'ratePerKg' ? Number(val) : item.ratePerKg;
      item.totalAmount = Math.round(weight * rate);
      copy[index] = item;
      return copy;
    });
  };

  const addItem = () => {
    const availableMark = marks.find(m => !items.some(i => i.markCode === m.code)) || marks[0];
    const newItem: PurchaseItem = {
      id: 'pi-' + Date.now(),
      markCode: availableMark?.code || 'K',
      bags: 50,
      weightKg: 2500,
      ratePerKg: availableMark?.defaultPurchaseRate || 40.00,
      totalAmount: 2500 * (availableMark?.defaultPurchaseRate || 40.00)
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      toast({ type: 'error', title: 'Cannot Remove', message: 'At least one graded mark is required' });
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateExpense = (index: number, field: keyof PurchaseExpense, val: any) => {
    setExpenses(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: field === 'amount' ? Number(val) : val };
      return copy;
    });
  };

  const addExpense = () => {
    setExpenses(prev => [...prev, {
      id: 'pe-' + Date.now(),
      type: 'OTHER',
      amount: 1000,
      description: 'Mandi charges'
    }]);
  };

  const removeExpense = (index: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== index));
  };

  const totalBags = items.reduce((acc, i) => acc + Number(i.bags || 0), 0);
  const totalWeightKg = items.reduce((acc, i) => acc + Number(i.weightKg || 0), 0);
  const grossAmount = items.reduce((acc, i) => acc + Number(i.totalAmount || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const netAmount = grossAmount + totalExpenses;

  const selectedVendor = vendors.find(v => v.id === vendorId);

  const handleConfirm = async () => {
    if (!selectedVendor) {
      toast({ type: 'error', title: 'Vendor Required', message: 'Please select a consignment supplier' });
      return;
    }

    const created = await createPurchase({
      billNumber,
      vendorId: selectedVendor.id,
      vendorName: selectedVendor.name,
      date,
      lotNumber: lotNumber.trim().toUpperCase(),
      items,
      expenses,
      grossAmount,
      totalExpenses,
      netAmount,
      notes,
      attachmentName,
      attachmentUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80'
    });

    toast({
      type: 'success',
      title: 'Consignment Posted',
      message: `${lotNumber} created with ${totalBags} bags (${totalWeightKg} KG). Stock updated!`
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
              Universal multi-mark arrival: Vendor → Bill → Lot → Multiple Grades → Expenses → Yard Stock
            </p>
          </div>
        </div>

        {isReviewing ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setIsReviewing(false)}>
              Edit Parameters
            </Button>
            <Button variant="primary" onClick={handleConfirm} icon={<CheckCircle2 className="w-4 h-4" />}>
              Confirm & Post In Stock
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
                label="Arrival Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <Input
                label="Assigned Lot Designation"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="e.g. LOT AP"
                helperText="Identifies this stock on floor"
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
                  <span>2. Multi-Mark Onion Quality Breakdown</span>
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Trucks typically transport multiple graded qualities (AA, J, K, etc.) with individual rates.
                </p>
              </div>

              <Button variant="secondary" size="sm" icon={<PlusCircle className="w-3.5 h-3.5" />} onClick={addItem}>
                Add Quality Mark
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className="p-4 rounded-2xl bg-surface-container-low flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 w-full">
                    <Select
                      label="Quality Mark"
                      value={item.markCode}
                      onChange={(e) => {
                        const m = marks.find(mk => mk.code === e.target.value);
                        updateItem(index, 'markCode', e.target.value);
                        if (m) updateItem(index, 'ratePerKg', m.defaultPurchaseRate);
                      }}
                      options={marks.map(m => ({ value: m.code, label: `Grade ${m.code} (${m.name})` }))}
                    />

                    <Input
                      label="Bag Count"
                      type="number"
                      value={item.bags}
                      onChange={(e) => updateItem(index, 'bags', Number(e.target.value))}
                      suffixText="Bags"
                    />

                    <Input
                      label="Total Weight"
                      type="number"
                      value={item.weightKg}
                      onChange={(e) => updateItem(index, 'weightKg', Number(e.target.value))}
                      suffixText="KG"
                    />

                    <Input
                      label="Purchase Rate"
                      type="number"
                      step="0.5"
                      value={item.ratePerKg}
                      onChange={(e) => updateItem(index, 'ratePerKg', Number(e.target.value))}
                      prefixText="₹"
                      suffixText="/KG"
                    />
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-44 pt-2 md:pt-0">
                    <div className="text-right">
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase">Subtotal</span>
                      <div className="text-sm font-extrabold font-display text-on-surface">
                        ₹{item.totalAmount.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-danger hover:bg-danger-container/50 rounded-xl transition-colors"
                      title="Remove grade"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

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
                  <span>3. Consignment & Inward Freight Expenses</span>
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Hamali, truck transport, and APMC cess added directly to consignment landing value.
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
                  className="p-3.5 rounded-2xl bg-surface-container-low flex items-center gap-3"
                >
                  <Select
                    label="Expense Type"
                    value={expense.type}
                    onChange={(e) => updateExpense(index, 'type', e.target.value as any)}
                    options={[
                      { value: 'FREIGHT', label: 'Freight (Truck / Tempo)' },
                      { value: 'HAMALI', label: 'Hamali (Unloading Labor)' },
                      { value: 'MANDI_TAX', label: 'APMC Mandi Cess / Tax' },
                      { value: 'COMMISSION', label: 'Broker Commission' },
                      { value: 'OTHER', label: 'Other Operational Fee' }
                    ]}
                  />

                  <div className="flex-1">
                    <Input
                      label="Description / Truck Memo"
                      value={expense.description}
                      onChange={(e) => updateExpense(index, 'description', e.target.value)}
                    />
                  </div>

                  <div className="w-32">
                    <Input
                      label="Amount (₹)"
                      type="number"
                      value={expense.amount}
                      onChange={(e) => updateExpense(index, 'amount', e.target.value)}
                      prefixText="₹"
                    />
                  </div>

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
              <span>Inward Freight & Hamali Total</span>
              <span className="font-extrabold font-display">₹{totalExpenses.toLocaleString('en-IN')}</span>
            </div>
          </Card>

          {/* Step 4: Attachment & Operational Notes */}
          <Card variant="lowest">
            <h3 className="text-base font-bold font-display text-on-surface mb-3 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-primary" />
              <span>4. Vendor Bill Attachment & Yard Notes</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-surface-container-low flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-surface-container-highest text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-on-surface block">{attachmentName}</span>
                    <span className="text-[10px] text-on-surface-variant">Vendor physical weighbridge scan attached</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toast({ type: 'info', title: 'Attachment', message: 'Attachment viewer opened' })}>
                  Preview
                </Button>
              </div>

              <Input
                label="Notes / Consignment Remarks"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Lasalgaon red onion, dry quality, minimal tare."
              />
            </div>
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
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">Supplier: {selectedVendor?.name} ({selectedVendor?.mandiCity}) • Date: {date}</p>
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
                        <td className="py-3 px-4 font-bold text-primary">Grade {item.markCode}</td>
                        <td className="py-3 px-4 font-semibold">{item.bags} bags</td>
                        <td className="py-3 px-4 font-semibold">{item.weightKg.toLocaleString('en-IN')} KG</td>
                        <td className="py-3 px-4 text-on-surface-variant">{(item.weightKg / item.bags).toFixed(1)} KG/bag</td>
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
                <h4 className="text-sm font-bold font-display text-on-surface mb-2">Freight & Incidental Expenses</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {expenses.map(e => (
                    <div key={e.id} className="p-3 rounded-xl bg-surface-container-low flex justify-between">
                      <span className="text-on-surface-variant">{e.type}: {e.description}</span>
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
                Post Purchase & Update Floor Stock
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
