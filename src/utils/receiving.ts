import type {
  CostingSettings,
  Lot,
  Mark,
  Purchase,
  PurchaseExpense,
  ReceivingAllocationChoice,
  ReceivingBagWeight,
  ReceivingExpenseEntry,
  ReceivingGroup,
  ReceivingIssue,
  SellingMarginComponent,
} from '@/types';
import {
  calculatePreliminarySellingRate,
  calculateSellingRate,
  captureRateSnapshot,
  normalizeVendorRate,
} from '@/utils/costing';

const WEIGHT_TOLERANCE_KG = 0.05;

const LEGACY_EXPENSE_LABELS: Record<PurchaseExpense['type'], string> = {
  FREIGHT: 'Freight',
  HAMALI: 'Hamali',
  MANDI_TAX: 'Mandi tax',
  COMMISSION: 'Commission',
  OTHER: 'Other',
};

export function purchaseExpenseLabel(expense: PurchaseExpense): string {
  return expense.expenseTypeName || LEGACY_EXPENSE_LABELS[expense.type] || expense.type;
}

export function isPendingReceipt(purchase: Pick<Purchase, 'receiptStatus'>): boolean {
  return purchase.receiptStatus === 'PENDING_RECEIPT';
}

export function parseBagWeights(raw: string): ReceivingBagWeight[] {
  return raw
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => ({ bagNumber: index + 1, weightKg: Number(part) }))
    .filter((bag) => Number.isFinite(bag.weightKg) && bag.weightKg > 0);
}

export function formatBagWeights(weights: ReceivingBagWeight[]): string {
  return weights.map((bag) => String(bag.weightKg)).join(', ');
}

export interface ReceivingDraftGroup {
  id: string;
  markCode: string;
  fromVendorBill: boolean;
  expectedBags: number;
  expectedWeightKg: number;
  receivedBags: number;
  acceptedBags: number;
  defectiveBags: number;
  receivedWeightKg: number;
  originalPurchaseRate: number;
  revisedSellingRate: number | null;
  overrideReason: string;
  remarks: string;
  bagWeights: ReceivingBagWeight[];
}

export interface ReceivingDraft {
  expenses: ReceivingExpenseEntry[];
  groups: ReceivingDraftGroup[];
}

function positive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function bagWeightTotal(weights: ReceivingBagWeight[]): number {
  return weights.reduce((sum, bag) => sum + bag.weightKg, 0);
}

export function resolvedReceivedWeight(group: Pick<ReceivingDraftGroup, 'receivedWeightKg' | 'bagWeights'>): {
  weightKg: number | null;
  warning: string | null;
} {
  if (group.bagWeights.length > 0) {
    const total = bagWeightTotal(group.bagWeights);
    if (group.receivedWeightKg > 0 && Math.abs(total - group.receivedWeightKg) > WEIGHT_TOLERANCE_KG) {
      return {
        weightKg: total,
        warning: `Bag weights total ${total.toFixed(2)} kg, which does not match the entered received weight of ${group.receivedWeightKg.toFixed(2)} kg.`,
      };
    }
    return { weightKg: total, warning: null };
  }
  if (group.receivedWeightKg > 0) return { weightKg: group.receivedWeightKg, warning: null };
  return { weightKg: null, warning: null };
}

function allocationSharePerKg(
  expense: ReceivingExpenseEntry,
  group: { id: string; markCode: string; receivedBags: number; receivedWeightKg: number },
  groups: { id: string; markCode: string; receivedBags: number; receivedWeightKg: number }[],
): { perKg: number; warning: string | null } {
  const amount = Number(expense.amount) || 0;
  if (amount < 0 || !Number.isFinite(amount)) {
    return { perKg: 0, warning: `${expense.expenseTypeName} has an invalid amount.` };
  }
  if (amount === 0) return { perKg: 0, warning: null };

  if (expense.allocation.method === 'BY_RECEIVED_KG') {
    const eligible = groups.reduce((sum, item) => sum + positive(item.receivedWeightKg), 0);
    if (eligible <= 0) {
      return { perKg: 0, warning: `${expense.expenseTypeName} cannot be spread by kilograms because received weight is missing.` };
    }
    if (group.receivedWeightKg <= 0) {
      return { perKg: 0, warning: `${group.markCode} has no received weight, so ${expense.expenseTypeName} cannot be applied per kg.` };
    }
    return { perKg: amount / eligible, warning: null };
  }

  if (expense.allocation.method === 'BY_RECEIVED_BAGS') {
    const bags = groups.reduce((sum, item) => sum + positive(item.receivedBags), 0);
    if (bags <= 0) {
      return { perKg: 0, warning: `${expense.expenseTypeName} cannot be spread by bags because received bags are missing.` };
    }
    if (group.receivedBags <= 0) return { perKg: 0, warning: null };
    if (group.receivedWeightKg <= 0) {
      return { perKg: 0, warning: `${group.markCode} has received bags but no weight, so ${expense.expenseTypeName} cannot be stated per kg.` };
    }
    const share = amount * (group.receivedBags / bags);
    return { perKg: share / group.receivedWeightKg, warning: null };
  }

  if (expense.allocation.groupId !== group.id) return { perKg: 0, warning: null };
  if (group.receivedWeightKg <= 0) {
    return { perKg: 0, warning: `${expense.expenseTypeName} is assigned to ${group.markCode}, which has no received weight.` };
  }
  return { perKg: amount / group.receivedWeightKg, warning: null };
}

export function draftGroupsFromPurchase(
  purchase: Purchase,
): ReceivingDraftGroup[] {
  return purchase.items.map((item) => ({
    id: item.id,
    markCode: item.markCode,
    fromVendorBill: true,
    expectedBags: item.bags,
    expectedWeightKg: item.weightKg,
    receivedBags: item.bags,
    acceptedBags: item.bags,
    defectiveBags: 0,
    receivedWeightKg: item.weightKg,
    originalPurchaseRate: item.ratePerKg,
    revisedSellingRate: null,
    overrideReason: '',
    remarks: '',
    bagWeights: [],
  }));
}

export function preliminaryRateFor(
  originalPurchaseRate: number,
  settings: CostingSettings,
  margins: readonly SellingMarginComponent[],
): number | null {
  if (!Number.isFinite(originalPurchaseRate) || originalPurchaseRate < 0) return null;
  return calculatePreliminarySellingRate({
    normalizedVendorPurchaseRatePerKg: originalPurchaseRate,
    settings,
    additionalMargins: margins,
  }).preliminarySellingRatePerKg;
}

export function evaluateReceiving(input: {
  draft: ReceivingDraft;
  settings: CostingSettings;
  margins: readonly SellingMarginComponent[];
}): { groups: ReceivingGroup[]; issues: ReceivingIssue[] } {
  const issues: ReceivingIssue[] = [];
  const measured = input.draft.groups.map((group) => {
    const resolved = resolvedReceivedWeight(group);
    return {
      id: group.id,
      markCode: group.markCode.trim() || 'Unnamed',
      receivedBags: positive(group.receivedBags),
      receivedWeightKg: resolved.weightKg ?? 0,
    };
  });

  const seenMarks = new Map<string, number>();
  const groups = input.draft.groups.map((group) => {
    const markCode = group.markCode.trim().toUpperCase();
    const warnings: string[] = [];
    if (!markCode) warnings.push('A mark code is required.');
    seenMarks.set(markCode, (seenMarks.get(markCode) ?? 0) + 1);
    const resolved = resolvedReceivedWeight(group);
    if (resolved.warning) warnings.push(resolved.warning);
    const receivedWeightKg = resolved.weightKg;
    const allocationInput = {
      id: group.id,
      markCode: markCode || 'Unnamed',
      receivedBags: positive(group.receivedBags),
      receivedWeightKg: receivedWeightKg ?? 0,
    };
    const active = positive(group.receivedBags) > 0 || positive(group.acceptedBags) > 0;
    const shares = active
      ? input.draft.expenses.map((expense) => allocationSharePerKg(expense, allocationInput, measured))
      : [];
    shares.forEach((share) => {
      if (share.warning) warnings.push(share.warning);
    });
    const allocatedReceivingCostPerKg = !active
      ? 0
      : shares.some((share) => share.warning)
        ? null
        : shares.reduce((sum, share) => sum + share.perKg, 0);
    const preliminary = preliminaryRateFor(group.originalPurchaseRate, input.settings, input.margins);
    let landedCostPerKg: number | null = null;
    let calculatedFinalRate: number | null = null;
    let rateSnapshot = undefined as ReceivingGroup['rateSnapshot'];
    const needsRate = positive(group.acceptedBags) > 0 || positive(group.receivedBags) > 0;
    if (!Number.isFinite(group.originalPurchaseRate) || group.originalPurchaseRate < 0) {
      warnings.push(`${markCode || 'This group'} has no original purchase rate.`);
    } else if (needsRate && allocatedReceivingCostPerKg == null) {
      warnings.push(`${markCode} needs a received weight before a final rate can be calculated.`);
    } else if (Number.isFinite(group.originalPurchaseRate) && allocatedReceivingCostPerKg != null) {
      landedCostPerKg = group.originalPurchaseRate + allocatedReceivingCostPerKg;
      const selling = calculateSellingRate({
        costBaselinePerKg: landedCostPerKg,
        defaultMarginPerKg: input.settings.defaultSellingMarginPerKg,
        additionalMargins: input.margins,
        roundingRule: input.settings.roundingRule,
      });
      calculatedFinalRate = selling.finalSellingRatePerKg;
      const weightForSnapshot = receivedWeightKg && receivedWeightKg > 0 ? receivedWeightKg : 1;
      const allocatedAmount = allocatedReceivingCostPerKg * (receivedWeightKg ?? 0);
      rateSnapshot = captureRateSnapshot({
        vendorRate: normalizeVendorRate(group.originalPurchaseRate, 'PER_KG'),
        purchaseExpenses: [],
        stockReceivingExpenses: allocatedAmount > 0 ? [{
          id: `alloc-${group.id}`,
          expenseTypeId: 'allocated-receiving',
          expenseTypeName: 'Allocated receiving cost',
          kind: 'STOCK_RECEIVING',
          basis: 'FIXED_TOTAL',
          amount: allocatedAmount,
        }] : [],
        purchaseExpenseAllocation: { method: 'UNALLOCATED' },
        receivingExpenseAllocation: allocatedAmount > 0
          ? { method: 'SPREAD_FIXED_TOTAL_PER_KG', totalWeightKg: weightForSnapshot }
          : { method: 'UNALLOCATED' },
        settings: input.settings,
        additionalMargins: input.margins,
      });
    }

    let acceptedWeightKg: number | null = null;
    if (positive(group.acceptedBags) === 0) {
      acceptedWeightKg = 0;
    } else if (receivedWeightKg == null || positive(group.receivedBags) === 0) {
      warnings.push(`${markCode || 'A group'} has accepted bags but no received weight to post.`);
    } else {
      acceptedWeightKg = receivedWeightKg * (positive(group.acceptedBags) / positive(group.receivedBags));
    }

    if (group.revisedSellingRate != null && group.revisedSellingRate !== calculatedFinalRate && !group.overrideReason.trim()) {
      warnings.push(`${markCode} has a manual selling rate without a reason.`);
    }

    const uniqueWarnings = [...new Set(warnings)];
    uniqueWarnings.forEach((message) => issues.push({ blocking: true, message }));
    if (group.expectedBags !== group.receivedBags) {
      issues.push({
        blocking: false,
        message: `${markCode}: expected ${group.expectedBags} bags, received ${group.receivedBags}.`,
      });
    }
    if (group.acceptedBags + group.defectiveBags !== group.receivedBags) {
      issues.push({
        blocking: false,
        message: `${markCode}: accepted ${group.acceptedBags} plus defective ${group.defectiveBags} does not equal received ${group.receivedBags}.`,
      });
    }
    if (group.expectedWeightKg > 0 && receivedWeightKg != null && Math.abs(group.expectedWeightKg - receivedWeightKg) > WEIGHT_TOLERANCE_KG) {
      issues.push({
        blocking: false,
        message: `${markCode}: expected ${group.expectedWeightKg.toLocaleString('en-IN')} kg, received ${receivedWeightKg.toFixed(2)} kg.`,
      });
    }

    return {
      id: group.id,
      markCode,
      fromVendorBill: group.fromVendorBill,
      expectedBags: group.expectedBags,
      expectedWeightKg: group.expectedWeightKg,
      receivedBags: group.receivedBags,
      acceptedBags: group.acceptedBags,
      defectiveBags: group.defectiveBags,
      receivedWeightKg: receivedWeightKg ?? group.receivedWeightKg,
      acceptedWeightKg,
      originalPurchaseRate: group.originalPurchaseRate,
      preliminarySellingRate: preliminary,
      allocatedReceivingCostPerKg,
      landedCostPerKg,
      calculatedFinalRate,
      revisedSellingRate: group.revisedSellingRate,
      overrideReason: group.overrideReason,
      remarks: group.remarks,
      bagWeights: group.bagWeights,
      calculationWarning: uniqueWarnings[0] ?? null,
      rateSnapshot,
    } satisfies ReceivingGroup;
  });

  seenMarks.forEach((count, markCode) => {
    if (markCode && count > 1) {
      issues.push({ blocking: true, message: `${markCode} is used on more than one group. Give each priced group its own mark.` });
    }
  });

  return { groups, issues };
}

export function takenInspectionQuantity(group: {
  acceptedBags: number;
  defectiveBags: number;
  receivedBags: number;
  receivedWeightKg: number;
}): { bags: number; weightKg: number } {
  const bags = Math.max(0, group.acceptedBags) + Math.max(0, group.defectiveBags);
  if (bags <= 0 || group.receivedWeightKg <= 0) return { bags: 0, weightKg: 0 };
  if (group.receivedBags > 0 && bags === group.receivedBags) {
    return { bags, weightKg: group.receivedWeightKg };
  }
  if (group.receivedBags > 0) {
    return { bags, weightKg: group.receivedWeightKg * (bags / group.receivedBags) };
  }
  return { bags, weightKg: group.receivedWeightKg };
}

export function appliedSellingRate(group: Pick<ReceivingGroup, 'revisedSellingRate' | 'calculatedFinalRate'>): number | null {
  if (group.revisedSellingRate != null && Number.isFinite(group.revisedSellingRate)) return group.revisedSellingRate;
  return group.calculatedFinalRate;
}

export function quotedSaleRate(
  lot: Lot | undefined,
  markCode: string,
  marks: Pick<Mark, 'code' | 'defaultSellingRate'>[],
): { ratePerKg: number; source: 'FINALIZED' | 'FLOOR' | 'MISSING'; message: string } {
  const lotMark = lot?.marks.find((mark) => mark.markCode.toUpperCase() === markCode.toUpperCase());
  if (lotMark?.finalizedSellingRate != null && Number.isFinite(lotMark.finalizedSellingRate)) {
    return {
      ratePerKg: lotMark.finalizedSellingRate,
      source: 'FINALIZED',
      message: lotMark.sellingRateOverride != null
        ? 'Finalized receiving rate, including the saved override. A change here applies to this bill only.'
        : 'Finalized receiving rate for this lot and mark. A change here applies to this bill only.',
    };
  }
  const master = marks.find((mark) => mark.code.toUpperCase() === markCode.toUpperCase());
  if (master) {
    return {
      ratePerKg: master.defaultSellingRate,
      source: 'FLOOR',
      message: 'No finalized receiving rate for this lot and mark. This is the daily floor rate and needs attention.',
    };
  }
  return {
    ratePerKg: 0,
    source: 'MISSING',
    message: 'No finalized receiving rate and no floor rate for this mark.',
  };
}

export function defaultReceivingAllocation(): ReceivingAllocationChoice {
  return { method: 'BY_RECEIVED_KG' };
}
