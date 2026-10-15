'use client';

import { useSession } from '@/store/session/session-provider';
import { usePurchasesQuery } from '@/hooks/queries/use-purchases-query';
import {
  useCostingExpenseTypesQuery,
  useCostingSettingsQuery,
  useSellingMarginComponentsQuery,
} from '@/hooks/queries/use-directory-query';
import { useReceiveConsignmentMutation } from '@/hooks/mutations/use-purchase-mutations';
import { useRouteId } from '@/hooks/shared/use-route-id';
import { can } from '@/auth/permissions';
import { purchaseExpenseLabel, isPendingReceipt } from '@/utils/receiving';
import {
  appliedSellingRate,
  defaultReceivingAllocation,
  draftGroupsFromPurchase,
  evaluateReceiving,
  parseBagWeights,
  preliminaryRateFor,
  type ReceivingDraft,
  type ReceivingDraftGroup,
} from '@/utils/receiving';
import type { CostingSettings, ReceivingExpenseEntry, SellingMarginComponent } from '@/types';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberField } from '@/components/ui/NumberField';
import { Select } from '@/components/ui/Select';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, CheckCircle2, Pencil } from 'lucide-react';

type InspectionEdit = {
  id: string;
  isNew: boolean;
  fromVendorBill: boolean;
  expectedBags: number;
  expectedWeightKg: number;
  markCode: string;
  receivedBags: string;
  acceptedBags: string;
  defectiveBags: string;
  receivedWeightKg: string;
  originalPurchaseRate: string;
  revisedSellingRate: string;
  overrideReason: string;
  remarks: string;
};

function countDraft(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

function decimalDraft(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const [whole, fraction] = cleaned.split('.');
  const nextWhole = (whole || '').replace(/^0+(?=\d)/, '');
  if (fraction === undefined) return nextWhole;
  return `${nextWhole || '0'}.${fraction.replace(/\./g, '')}`;
}

export const ReceiveLot: React.FC = () => {
  const id = useRouteId();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useSession();
  const { data: purchases = [] } = usePurchasesQuery();
  const { data: settings } = useCostingSettingsQuery();
  const { data: margins = [] } = useSellingMarginComponentsQuery();
  const { data: expenseTypes = [] } = useCostingExpenseTypesQuery();
  const receiveMutation = useReceiveConsignmentMutation();
  const purchase = purchases.find((item) => item.id === id);
  const receivingTypes = expenseTypes.filter((type) => type.kind === 'STOCK_RECEIVING' && type.status === 'ACTIVE');

  const [groups, setGroups] = useState<ReceivingDraftGroup[] | null>(null);
  const [expenses, setExpenses] = useState<ReceivingExpenseEntry[] | null>(null);
  const [bagText, setBagText] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'entry' | 'review'>('entry');
  const [calculated, setCalculated] = useState(false);
  const [inspectionEdit, setInspectionEdit] = useState<InspectionEdit | null>(null);

  if (!can(currentUser.role, 'viewPurchaseCost')) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Restricted Floor Area</h3>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/salesperson-home')}>Back to Floor</Button>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl font-bold font-display">Consignment not found</h3>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/purchases')}>Return to Purchases</Button>
      </div>
    );
  }

  if (purchase.receiving?.stockPosted) {
    return <ReceivedSummary purchaseId={purchase.id} onBack={() => router.push(`/purchases/${purchase.id}`)} />;
  }

  if (!isPendingReceipt(purchase)) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <h3 className="text-xl font-bold font-display">Already in stock</h3>
        <p className="text-xs text-on-surface-variant mt-2">This bill was posted before lot receiving. Its stock and vendor rates are unchanged.</p>
        <Button variant="primary" className="mt-4" onClick={() => router.push(`/purchases/${purchase.id}`)}>View bill</Button>
      </div>
    );
  }

  const readyGroups = groups ?? draftGroupsFromPurchase(purchase);
  const readyExpenses = expenses ?? [];
  const draft = withBagText(readyGroups, readyExpenses, bagText);
  const activeMargins = margins.filter((component) => component.status === 'ACTIVE');

  const openInspection = (group?: ReceivingDraftGroup) => {
    if (!group) {
      setInspectionEdit({
        id: 'rg-' + Date.now(),
        isNew: true,
        fromVendorBill: false,
        expectedBags: 0,
        expectedWeightKg: 0,
        markCode: '',
        receivedBags: '',
        acceptedBags: '',
        defectiveBags: '',
        receivedWeightKg: '',
        originalPurchaseRate: '',
        revisedSellingRate: '',
        overrideReason: '',
        remarks: '',
      });
      return;
    }
    setInspectionEdit({
      id: group.id,
      isNew: false,
      fromVendorBill: group.fromVendorBill,
      expectedBags: group.expectedBags,
      expectedWeightKg: group.expectedWeightKg,
      markCode: group.markCode,
      receivedBags: group.receivedBags ? String(group.receivedBags) : '',
      acceptedBags: group.acceptedBags ? String(group.acceptedBags) : '',
      defectiveBags: group.defectiveBags ? String(group.defectiveBags) : '',
      receivedWeightKg: group.receivedWeightKg ? String(group.receivedWeightKg) : '',
      originalPurchaseRate: group.originalPurchaseRate ? String(group.originalPurchaseRate) : '',
      revisedSellingRate: group.revisedSellingRate == null ? '' : String(group.revisedSellingRate),
      overrideReason: group.overrideReason,
      remarks: group.remarks,
    });
  };

  const saveInspection = () => {
    if (!inspectionEdit) return;
    const markCode = inspectionEdit.markCode.trim().toUpperCase();
    const receivedBags = Number(inspectionEdit.receivedBags || 0);
    const acceptedBags = Number(inspectionEdit.acceptedBags || 0);
    const defectiveBags = Number(inspectionEdit.defectiveBags || 0);
    const receivedWeightKg = Number(inspectionEdit.receivedWeightKg || 0);
    const originalPurchaseRate = Number(inspectionEdit.originalPurchaseRate || 0);
    const revisedRaw = inspectionEdit.revisedSellingRate.trim();
    if (!markCode || receivedBags <= 0 || receivedWeightKg <= 0 || !Number.isFinite(originalPurchaseRate) || originalPurchaseRate < 0) {
      toast({ type: 'error', title: 'Check this mark', message: 'Enter the mark, received bags, weight, and purchase rate.' });
      return;
    }
    const existing = readyGroups.find((group) => group.id === inspectionEdit.id);
    const next: ReceivingDraftGroup = {
      id: inspectionEdit.id,
      markCode,
      fromVendorBill: inspectionEdit.fromVendorBill,
      expectedBags: inspectionEdit.isNew ? receivedBags : inspectionEdit.expectedBags,
      expectedWeightKg: inspectionEdit.isNew ? receivedWeightKg : inspectionEdit.expectedWeightKg,
      receivedBags,
      acceptedBags,
      defectiveBags,
      receivedWeightKg,
      originalPurchaseRate,
      revisedSellingRate: revisedRaw === '' ? null : Number(revisedRaw),
      overrideReason: inspectionEdit.overrideReason,
      remarks: inspectionEdit.remarks,
      bagWeights: existing?.bagWeights ?? [],
    };
    setCalculated(false);
    setGroups(inspectionEdit.isNew ? [...readyGroups, next] : readyGroups.map((group) => group.id === next.id ? next : group));
    setInspectionEdit(null);
  };

  const calculate = () => {
    const next = evaluateReceiving({ draft, settings, margins: activeMargins });
    setGroups(draft.groups);
    setExpenses(draft.expenses);
    setCalculated(true);
    if (next.issues.some((issue) => issue.blocking)) {
      toast({ type: 'error', title: 'Rates incomplete', message: next.issues.find((issue) => issue.blocking)?.message ?? 'Check the receiving table.' });
      return;
    }
    toast({ type: 'success', title: 'Final rates calculated', message: 'Review the proposed rates, then post accepted stock once.' });
  };

  const openReview = () => {
    const next = evaluateReceiving({ draft, settings, margins: activeMargins });
    if (next.issues.some((issue) => issue.blocking)) {
      setCalculated(true);
      toast({ type: 'error', title: 'Cannot review yet', message: next.issues.find((issue) => issue.blocking)?.message ?? 'Resolve the receiving warnings.' });
      return;
    }
    setStep('review');
  };

  const confirm = async () => {
    try {
      const saved = await receiveMutation.mutateAsync({ id: purchase.id, draft });
      toast({
        type: 'success',
        title: 'Lot received',
        message: `${saved.lotNumber} accepted stock is on the floor. Vendor bill rates were not changed.`,
      });
      router.push(`/purchases/${purchase.id}`);
    } catch (error) {
      toast({ type: 'error', title: 'Receipt not posted', message: error instanceof Error ? error.message : 'The lot could not be received.' });
    }
  };

  const evaluation = calculated || step === 'review'
    ? evaluateReceiving({ draft, settings, margins: activeMargins })
    : null;
  const expectedBags = purchase.items.reduce((sum, item) => sum + item.bags, 0);
  const expectedWeight = purchase.items.reduce((sum, item) => sum + item.weightKg, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => step === 'review' ? setStep('entry') : router.push(`/purchases/${purchase.id}`)}
          className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface">Receive Lot</h1>
            <Chip label="Awaiting arrival" size="sm" variant="tertiary" />
          </div>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">
            {purchase.lotNumber} · {purchase.vendorName} · Bill {purchase.billNumber}
          </p>
        </div>
      </div>

      {step === 'entry' ? (
        <>
          <Card variant="lowest">
            <h3 className="text-base font-bold font-display text-on-surface">Consignment</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs">
              <Fact label="Internal ID" value={purchase.id} />
              <Fact label="Vendor" value={purchase.vendorName} />
              <Fact label="Vendor bill" value={purchase.billNumber} />
              <Fact label="Lot code" value={purchase.lotNumber} />
              <Fact label="Purchase date" value={purchase.date} />
              <Fact label="Expected arrival" value={purchase.expectedArrivalDate || 'Not set'} />
              <Fact label="Expected bags" value={String(expectedBags)} />
              <Fact label="Expected weight" value={`${expectedWeight.toLocaleString('en-IN')} kg`} />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase font-bold text-on-surface-variant">
                  <tr>
                    <th className="py-2 pr-3">Mark</th>
                    <th className="py-2 pr-3">Bags</th>
                    <th className="py-2 pr-3">Weight</th>
                    <th className="py-2 pr-3">Purchase rate</th>
                    <th className="py-2">Preliminary selling rate</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.items.map((item) => {
                    const preliminary = preliminaryRateFor(item.ratePerKg, settings, activeMargins);
                    return (
                      <tr key={item.id} className="border-t border-surface-container-low">
                        <td className="py-2 pr-3 font-bold text-primary">{item.markCode}</td>
                        <td className="py-2 pr-3">{item.bags}</td>
                        <td className="py-2 pr-3">{item.weightKg.toLocaleString('en-IN')} kg</td>
                        <td className="py-2 pr-3">₹{item.ratePerKg.toFixed(2)}</td>
                        <td className="py-2">{preliminary == null ? '—' : `₹${preliminary.toFixed(2)}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-3">
              Preliminary rate is the purchase rate plus the current ₹{settings.defaultSellingMarginPerKg}/kg margin and active per-kg extras. It is not rounded yet. Purchase expenses payable to the vendor are not included.
            </p>
          </Card>

          <Card variant="lowest" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold font-display text-on-surface">Receiving expenses</h3>
                <p className="text-xs text-on-surface-variant mt-1">Transport and yard costs stay separate from the vendor bill. Choose how each amount is allocated.</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const type = receivingTypes[0];
                  if (!type) {
                    toast({ type: 'error', title: 'No receiving types', message: 'Add a stock-receiving expense type in Settings.' });
                    return;
                  }
                  setCalculated(false);
                  setExpenses([...readyExpenses, {
                    id: 'rx-' + Date.now(),
                    expenseTypeId: type.id,
                    expenseTypeName: type.name,
                    description: '',
                    amount: 0,
                    remarks: '',
                    allocation: defaultReceivingAllocation(),
                  }]);
                }}
              >
                Add expense
              </Button>
            </div>
            {readyExpenses.length === 0 && <p className="text-xs text-on-surface-variant">No receiving expenses yet. Final rates will use the purchase rate plus margins only.</p>}
            {readyExpenses.map((expense, index) => (
              <div key={expense.id} className="rounded-2xl bg-surface-container-low p-4 grid grid-cols-1 lg:grid-cols-6 gap-3">
                <Select
                  label="Type"
                  value={expense.expenseTypeId}
                  onChange={(event) => {
                    const type = receivingTypes.find((item) => item.id === event.target.value);
                    setCalculated(false);
                    setExpenses(readyExpenses.map((item, itemIndex) => itemIndex === index ? {
                      ...item,
                      expenseTypeId: event.target.value,
                      expenseTypeName: type?.name ?? item.expenseTypeName,
                    } : item));
                  }}
                  options={receivingTypes.map((type) => ({ value: type.id, label: type.name }))}
                />
                <Input label="Description" value={expense.description} onChange={(event) => {
                  setCalculated(false);
                  setExpenses(readyExpenses.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item));
                }} />
                <NumberField label="Amount" prefixText="₹" value={expense.amount} onValueChange={(amount) => {
                  setCalculated(false);
                  setExpenses(readyExpenses.map((item, itemIndex) => itemIndex === index ? { ...item, amount } : item));
                }} />
                <Input label="Remarks" value={expense.remarks} onChange={(event) => {
                  setExpenses(readyExpenses.map((item, itemIndex) => itemIndex === index ? { ...item, remarks: event.target.value } : item));
                }} />
                <Select
                  label="Allocate"
                  value={expense.allocation.method}
                  onChange={(event) => {
                    const method = event.target.value as ReceivingExpenseEntry['allocation']['method'];
                    setCalculated(false);
                    setExpenses(readyExpenses.map((item, itemIndex) => itemIndex === index ? {
                      ...item,
                      allocation: method === 'ASSIGN_TO_GROUP'
                        ? { method, groupId: readyGroups[0]?.id ?? '' }
                        : { method },
                    } : item));
                  }}
                  options={[
                    { value: 'BY_RECEIVED_KG', label: 'By received kg' },
                    { value: 'BY_RECEIVED_BAGS', label: 'By received bags' },
                    { value: 'ASSIGN_TO_GROUP', label: 'Assign to a mark' },
                  ]}
                />
                {expense.allocation.method === 'ASSIGN_TO_GROUP' ? (
                  <Select
                    label="Mark group"
                    value={expense.allocation.groupId}
                    onChange={(event) => {
                      setCalculated(false);
                      setExpenses(readyExpenses.map((item, itemIndex) => itemIndex === index ? {
                        ...item,
                        allocation: { method: 'ASSIGN_TO_GROUP', groupId: event.target.value },
                      } : item));
                    }}
                    options={readyGroups.map((group) => ({ value: group.id, label: group.markCode || 'New mark' }))}
                  />
                ) : (
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setCalculated(false);
                      setExpenses(readyExpenses.filter((item) => item.id !== expense.id));
                    }}>Remove</Button>
                  </div>
                )}
              </div>
            ))}
          </Card>

          <Card variant="lowest" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold font-display text-on-surface">Physical inspection</h3>
                <p className="text-sm text-on-surface-variant mt-1">Click a row to change bags, cost, and the revised rate. Accepted and defective bags are both taken into stock.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openInspection()}>Add mark</Button>
                <Button variant="primary" onClick={calculate}>Calculate Final Rates</Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl bg-surface-container-low">
              <table className="w-full text-left text-base">
                <thead className="bg-surface-container text-sm uppercase font-bold text-on-surface-variant">
                  <tr>
                    {['Mark', 'Expected', 'Received', 'Accepted', 'Defective', 'Weight', 'Purchase rate', 'Preliminary', 'Revised rate', ''].map((heading) => (
                      <th key={heading} className="py-4 px-4 font-bold">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {readyGroups.map((group) => {
                    const preliminary = preliminaryRateFor(group.originalPurchaseRate, settings, activeMargins);
                    return (
                      <tr
                        key={group.id}
                        className="border-t border-surface-container-lowest odd:bg-surface-container-lowest cursor-pointer"
                        onClick={() => openInspection(group)}
                      >
                        <td className="py-5 px-4 text-lg font-bold text-primary">{group.markCode}</td>
                        <td className="py-5 px-4">{group.expectedBags}</td>
                        <td className="py-5 px-4 font-semibold">{group.receivedBags}</td>
                        <td className="py-5 px-4 font-semibold">{group.acceptedBags}</td>
                        <td className="py-5 px-4 font-semibold">{group.defectiveBags}</td>
                        <td className="py-5 px-4">{group.receivedWeightKg.toLocaleString('en-IN')} kg</td>
                        <td className="py-5 px-4">₹{group.originalPurchaseRate.toFixed(2)}</td>
                        <td className="py-5 px-4">{preliminary == null ? '—' : `₹${preliminary.toFixed(2)}`}</td>
                        <td className="py-5 px-4 font-bold">{group.revisedSellingRate == null ? '—' : `₹${group.revisedSellingRate.toFixed(2)}`}</td>
                        <td className="py-5 px-4 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center p-2 rounded-xl text-primary hover:bg-surface-container"
                            aria-label={`Edit ${group.markCode}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              openInspection(group);
                            }}
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {resultTable(evaluation, settings, activeMargins)}
            <div className="flex justify-end">
              <Button variant="primary" onClick={openReview} disabled={!calculated}>Review receipt</Button>
            </div>
          </Card>
        </>
      ) : (
        <ReviewStep
          purchaseExpenses={purchase.expenses.map((expense) => ({ label: purchaseExpenseLabel(expense), amount: expense.amount, description: expense.description }))}
          receivingExpenses={draft.expenses}
          evaluation={evaluateReceiving({ draft, settings, margins: activeMargins })}
          settings={settings}
          margins={activeMargins}
          pending={receiveMutation.isPending}
          onBack={() => setStep('entry')}
          onConfirm={confirm}
        />
      )}

      <Modal
        isOpen={inspectionEdit != null}
        onClose={() => setInspectionEdit(null)}
        title={inspectionEdit?.isNew ? 'Add mark' : `Edit ${inspectionEdit?.markCode || 'mark'}`}
        subtitle="Change the bags, the purchase rate, and the revised selling rate."
        maxWidth="xl"
      >
        {inspectionEdit && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="inspect-mark"
                label="Mark"
                value={inspectionEdit.markCode}
                onChange={(event) => setInspectionEdit({ ...inspectionEdit, markCode: event.target.value.toUpperCase() })}
              />
              <Input
                id="inspect-cost"
                label="Purchase rate"
                inputMode="decimal"
                prefixText="₹"
                suffixText="/KG"
                value={inspectionEdit.originalPurchaseRate}
                onChange={(event) => setInspectionEdit({ ...inspectionEdit, originalPurchaseRate: decimalDraft(event.target.value) })}
                placeholder="29"
              />
              <Input
                id="inspect-received"
                label="Received bags"
                inputMode="numeric"
                value={inspectionEdit.receivedBags}
                onChange={(event) => setInspectionEdit({ ...inspectionEdit, receivedBags: countDraft(event.target.value) })}
                placeholder="0"
              />
              <Input
                id="inspect-accepted"
                label="Accepted bags"
                inputMode="numeric"
                value={inspectionEdit.acceptedBags}
                onChange={(event) => setInspectionEdit({ ...inspectionEdit, acceptedBags: countDraft(event.target.value) })}
                placeholder="0"
              />
              <Input
                id="inspect-defective"
                label="Defective bags"
                inputMode="numeric"
                value={inspectionEdit.defectiveBags}
                onChange={(event) => setInspectionEdit({ ...inspectionEdit, defectiveBags: countDraft(event.target.value) })}
                placeholder="0"
              />
              <Input
                id="inspect-weight"
                label="Weight"
                inputMode="decimal"
                suffixText="KG"
                value={inspectionEdit.receivedWeightKg}
                onChange={(event) => setInspectionEdit({ ...inspectionEdit, receivedWeightKg: decimalDraft(event.target.value) })}
                placeholder="0"
              />
              <Input
                id="inspect-revised"
                label="Revised selling rate"
                inputMode="decimal"
                prefixText="₹"
                suffixText="/KG"
                value={inspectionEdit.revisedSellingRate}
                onChange={(event) => setInspectionEdit({ ...inspectionEdit, revisedSellingRate: decimalDraft(event.target.value) })}
                placeholder="Leave blank to use the calculated rate"
              />
              <Input
                id="inspect-reason"
                label="Reason for the revised rate"
                value={inspectionEdit.overrideReason}
                onChange={(event) => setInspectionEdit({ ...inspectionEdit, overrideReason: event.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setInspectionEdit(null)}>Cancel</Button>
              <Button variant="primary" onClick={saveInspection}>Save mark</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ReceivedSummary({ purchaseId, onBack }: { purchaseId: string; onBack: () => void }) {
  const { data: purchases = [] } = usePurchasesQuery();
  const purchase = purchases.find((item) => item.id === purchaseId);
  const receiving = purchase?.receiving;
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold font-display">Lot already received</h1>
      <p className="text-xs text-on-surface-variant">Stock was posted once on {receiving?.receivedAt ? new Date(receiving.receivedAt).toLocaleString('en-IN') : 'the receipt date'}. Refreshing this page does not post it again.</p>
      {receiving && resultTable({ groups: receiving.groups }, undefined, [])}
      <Button variant="primary" onClick={onBack}>Back to bill</Button>
    </div>
  );
}

function ReviewStep({
  purchaseExpenses,
  receivingExpenses,
  evaluation,
  settings,
  margins,
  pending,
  onBack,
  onConfirm,
}: {
  purchaseExpenses: { label: string; amount: number; description: string }[];
  receivingExpenses: ReceivingExpenseEntry[];
  evaluation: ReturnType<typeof evaluateReceiving>;
  settings: CostingSettings;
  margins: SellingMarginComponent[];
  pending: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const receivedBags = evaluation.groups.reduce((sum, group) => sum + group.receivedBags, 0);
  const acceptedBags = evaluation.groups.reduce((sum, group) => sum + group.acceptedBags, 0);
  const defectiveBags = evaluation.groups.reduce((sum, group) => sum + group.defectiveBags, 0);
  const expectedBags = evaluation.groups.reduce((sum, group) => sum + group.expectedBags, 0);
  const expectedWeight = evaluation.groups.reduce((sum, group) => sum + group.expectedWeightKg, 0);
  const receivedWeight = evaluation.groups.reduce((sum, group) => sum + group.receivedWeightKg, 0);
  return (
    <Card variant="lowest" className="space-y-5">
      <div>
        <h3 className="text-base font-bold font-display text-on-surface">Review before posting stock</h3>
        <p className="text-sm text-on-surface-variant mt-1">Accepted and defective bags are taken into stock once. The vendor bill and its payable stay as entered.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <Fact label="Expected bags" value={String(expectedBags)} />
        <Fact label="Received bags" value={String(receivedBags)} />
        <Fact label="Accepted bags" value={String(acceptedBags)} />
        <Fact label="Defective bags" value={String(defectiveBags)} />
        <Fact label="Expected weight" value={`${expectedWeight.toLocaleString('en-IN')} kg`} />
        <Fact label="Received weight" value={`${receivedWeight.toLocaleString('en-IN')} kg`} />
      </div>
      <div>
        <h4 className="text-sm font-bold font-display">Purchase expenses payable to the vendor</h4>
        {purchaseExpenses.length === 0 ? <p className="text-xs text-on-surface-variant mt-1">None on the vendor bill.</p> : (
          <ul className="mt-2 space-y-1 text-xs">
            {purchaseExpenses.map((expense, index) => (
              <li key={index} className="flex justify-between rounded-xl bg-surface-container-low px-3 py-2">
                <span>{expense.label}{expense.description ? ` · ${expense.description}` : ''}</span>
                <span className="font-bold">₹{expense.amount.toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h4 className="text-sm font-bold font-display">Stock-receiving expenses</h4>
        {receivingExpenses.length === 0 ? <p className="text-xs text-on-surface-variant mt-1">None. Landed cost stays at the vendor purchase rate.</p> : (
          <ul className="mt-2 space-y-1 text-xs">
            {receivingExpenses.map((expense) => (
              <li key={expense.id} className="flex justify-between rounded-xl bg-surface-container-low px-3 py-2 gap-3">
                <span>{expense.expenseTypeName}{expense.description ? ` · ${expense.description}` : ''} · {allocationLabel(expense)}</span>
                <span className="font-bold">₹{expense.amount.toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {resultTable(evaluation, settings, margins)}
      {evaluation.issues.length > 0 && (
        <div className="rounded-2xl bg-tertiary-container text-tertiary-on-container p-4 text-xs space-y-1">
          {evaluation.issues.map((issue, index) => <p key={index}>{issue.blocking ? 'Blocked: ' : ''}{issue.message}</p>)}
        </div>
      )}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button variant="primary" onClick={onConfirm} disabled={pending || evaluation.issues.some((issue) => issue.blocking)} icon={<CheckCircle2 className="w-4 h-4" />}>
          Confirm receipt and post stock
        </Button>
      </div>
    </Card>
  );
}

function resultTable(
  evaluation: { groups: ReturnType<typeof evaluateReceiving>['groups'] } | null,
  settings: CostingSettings | undefined,
  margins: SellingMarginComponent[],
) {
  if (!evaluation) return null;
  const extra = margins
    .filter((component) => component.calculationType === 'PER_KG' && component.perKg != null)
    .reduce((sum, component) => sum + (component.perKg ?? 0), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs min-w-[980px]">
        <thead className="text-[10px] uppercase font-bold text-on-surface-variant">
          <tr>
            {['Mark', 'Purchase ₹/kg', 'Receiving ₹/kg', 'Landed ₹/kg', 'Default margin', 'Extra ₹/kg', 'Preliminary', 'Calculated final', 'Override', 'Applied rate'].map((heading) => (
              <th key={heading} className="py-2 pr-3">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {evaluation.groups.map((group) => {
            const applied = appliedSellingRate(group);
            return (
              <tr key={group.id} className="border-t border-surface-container-low">
                <td className="py-2 pr-3 font-bold text-primary">{group.markCode}</td>
                <td className="py-2 pr-3">₹{group.originalPurchaseRate.toFixed(2)}</td>
                <td className="py-2 pr-3">{money(group.allocatedReceivingCostPerKg)}</td>
                <td className="py-2 pr-3">{money(group.landedCostPerKg)}</td>
                <td className="py-2 pr-3">{settings ? `₹${settings.defaultSellingMarginPerKg.toFixed(2)}` : 'Saved'}</td>
                <td className="py-2 pr-3">₹{extra.toFixed(2)}</td>
                <td className="py-2 pr-3">{money(group.preliminarySellingRate)}</td>
                <td className="py-2 pr-3">{money(group.calculatedFinalRate)}</td>
                <td className="py-2 pr-3">{group.revisedSellingRate == null ? '—' : `₹${group.revisedSellingRate.toFixed(2)}`}</td>
                <td className="py-2 pr-3 font-bold">{money(applied)}{group.calculationWarning ? ` · ${group.calculationWarning}` : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function allocationLabel(expense: ReceivingExpenseEntry): string {
  if (expense.allocation.method === 'BY_RECEIVED_KG') return 'by received kg';
  if (expense.allocation.method === 'BY_RECEIVED_BAGS') return 'by received bags';
  return 'assigned to one mark';
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-container-low p-3">
      <span className="text-[10px] uppercase font-bold text-on-surface-variant">{label}</span>
      <div className="font-bold text-on-surface mt-1">{value}</div>
    </div>
  );
}

function money(value: number | null): string {
  return value == null ? '—' : `₹${value.toFixed(2)}`;
}

function withBagText(groups: ReceivingDraftGroup[], expenses: ReceivingExpenseEntry[], bagText: Record<string, string>): ReceivingDraft {
  return {
    expenses,
    groups: groups.map((group) => ({
      ...group,
      bagWeights: bagText[group.id] != null ? parseBagWeights(bagText[group.id]) : group.bagWeights,
    })),
  };
}
