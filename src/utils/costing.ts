import type {
  CostExpenseLine,
  CostingExpenseKind,
  CostingExpenseType,
  CostingSettings,
  ExpenseAllocation,
  ExpenseAmountBasis,
  MasterStatus,
  RateRoundingRule,
  RateSettingSnapshot,
  SellingMarginComponent,
  VendorRateRecord,
  VendorRateUnit,
} from '@/types';
import { requireMasterName } from '@/utils/products';

export class UnsupportedCostingFormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedCostingFormulaError';
  }
}

export const DEFAULT_COSTING_SETTINGS: CostingSettings = {
  defaultSellingMarginPerKg: 6,
  roundingRule: 'CEIL_WHOLE_RUPEE',
};

export interface SellingRateBreakdown {
  costBaselinePerKg: number;
  defaultMarginPerKg: number;
  additionalPerKgMargins: { id: string; name: string; perKg: number }[];
  additionalMarginPerKg: number;
  preliminarySellingRatePerKg: number;
  finalSellingRatePerKg: number;
}

export interface LandedCostBreakdown {
  normalizedVendorPurchaseRatePerKg: number;
  purchaseExpensesPayableToVendor: CostExpenseLine[];
  stockReceivingExpenses: CostExpenseLine[];
  allocatedPurchaseExpensePerKg: number;
  allocatedReceivingExpensePerKg: number;
  allocatedLandedCostPerKg: number;
}

export interface FinalSellingRate extends SellingRateBreakdown, LandedCostBreakdown {}

function finiteAmount(amount: number, label: string): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} must be a non-negative finite amount`);
  }
  return amount;
}

/** Round only the finished selling rate. Exact whole rupees stay as they are. */
export function applyFinalRateRounding(rate: number, rule: RateRoundingRule): number {
  if (rule !== 'CEIL_WHOLE_RUPEE') {
    throw new UnsupportedCostingFormulaError('Only rounding upward to the next whole rupee is defined');
  }
  const amount = finiteAmount(rate, 'Selling rate');
  const paise = Math.round(amount * 100);
  if (paise % 100 === 0) return paise / 100;
  return Math.floor(paise / 100) + 1;
}

/**
 * Keeps the entered vendor rate and stores a separate ₹/kg figure.
 * Only an entered per-kg rate is normalized in this phase. Other units are not guessed.
 */
export function normalizeVendorRate(originalEnteredRate: number, unit: VendorRateUnit): VendorRateRecord {
  if (unit !== 'PER_KG') {
    throw new UnsupportedCostingFormulaError('Only a per-kg vendor rate can be normalized. Other units are not defined.');
  }
  const entered = finiteAmount(originalEnteredRate, 'Vendor rate');
  return {
    originalEnteredRate: entered,
    originalUnit: unit,
    normalizedRatePerKg: entered,
  };
}

/** Replaces the normalized ₹/kg figure and leaves the original vendor entry untouched. */
export function applyNormalizedVendorRate(record: VendorRateRecord, normalizedRatePerKg: number): VendorRateRecord {
  return {
    originalEnteredRate: record.originalEnteredRate,
    originalUnit: record.originalUnit,
    normalizedRatePerKg: finiteAmount(normalizedRatePerKg, 'Normalized vendor rate'),
  };
}

export function snapshotExpenseLine(
  type: CostingExpenseType,
  input: { id: string; basis: ExpenseAmountBasis; amount: number },
): CostExpenseLine {
  if (type.status !== 'ACTIVE') {
    throw new Error(`${type.name} is inactive and cannot be added to a new transaction`);
  }
  if (input.basis === 'PERCENT') {
    throw new UnsupportedCostingFormulaError('A percent expense has no defined base and cannot be recorded as a rupee amount');
  }
  return {
    id: input.id,
    expenseTypeId: type.id,
    expenseTypeName: type.name,
    kind: type.kind,
    basis: input.basis,
    amount: finiteAmount(input.amount, type.name),
  };
}

export function allocateExpensesPerKg(expenses: readonly CostExpenseLine[], allocation: ExpenseAllocation): number {
  if (allocation.method === 'UNALLOCATED' || expenses.length === 0) return 0;

  if (allocation.method === 'USE_ENTERED_PER_KG') {
    return expenses.reduce((sum, expense) => {
      if (expense.basis !== 'PER_KG') {
        throw new UnsupportedCostingFormulaError(
          `${expense.expenseTypeName} is a ${expense.basis === 'FIXED_TOTAL' ? 'fixed total' : expense.basis} and is not an entered per-kg expense`,
        );
      }
      return sum + finiteAmount(expense.amount, expense.expenseTypeName);
    }, 0);
  }

  if (allocation.method === 'SPREAD_FIXED_TOTAL_PER_KG') {
    if (!Number.isFinite(allocation.totalWeightKg) || allocation.totalWeightKg <= 0) {
      throw new Error('Spreading a fixed expense per kg requires a positive total weight');
    }
    const total = expenses.reduce((sum, expense) => {
      if (expense.basis !== 'FIXED_TOTAL') {
        throw new UnsupportedCostingFormulaError(
          `${expense.expenseTypeName} is not a fixed total. It is not spread per kg, and it is not a selling margin.`,
        );
      }
      return sum + finiteAmount(expense.amount, expense.expenseTypeName);
    }, 0);
    return total / allocation.totalWeightKg;
  }

  throw new UnsupportedCostingFormulaError('This expense allocation method is not defined');
}

function assertKind(expenses: readonly CostExpenseLine[], kind: CostingExpenseKind) {
  for (const expense of expenses) {
    if (expense.kind !== kind) {
      throw new Error(
        `${expense.expenseTypeName} is a ${expense.kind === 'PURCHASE' ? 'purchase' : 'stock-receiving'} expense and stays in that group`,
      );
    }
  }
}

export function landedCostPerKg(input: {
  normalizedVendorPurchaseRatePerKg: number;
  purchaseExpenses: readonly CostExpenseLine[];
  stockReceivingExpenses: readonly CostExpenseLine[];
  purchaseExpenseAllocation: ExpenseAllocation;
  receivingExpenseAllocation: ExpenseAllocation;
}): LandedCostBreakdown {
  assertKind(input.purchaseExpenses, 'PURCHASE');
  assertKind(input.stockReceivingExpenses, 'STOCK_RECEIVING');
  const normalizedVendorPurchaseRatePerKg = finiteAmount(input.normalizedVendorPurchaseRatePerKg, 'Normalized vendor rate');
  const allocatedPurchaseExpensePerKg = allocateExpensesPerKg(input.purchaseExpenses, input.purchaseExpenseAllocation);
  const allocatedReceivingExpensePerKg = allocateExpensesPerKg(input.stockReceivingExpenses, input.receivingExpenseAllocation);
  return {
    normalizedVendorPurchaseRatePerKg,
    purchaseExpensesPayableToVendor: [...input.purchaseExpenses],
    stockReceivingExpenses: [...input.stockReceivingExpenses],
    allocatedPurchaseExpensePerKg,
    allocatedReceivingExpensePerKg,
    allocatedLandedCostPerKg: normalizedVendorPurchaseRatePerKg + allocatedPurchaseExpensePerKg + allocatedReceivingExpensePerKg,
  };
}

export function calculateSellingRate(input: {
  costBaselinePerKg: number;
  defaultMarginPerKg: number;
  additionalMargins: readonly SellingMarginComponent[];
  roundingRule: RateRoundingRule;
}): SellingRateBreakdown {
  const costBaselinePerKg = finiteAmount(input.costBaselinePerKg, 'Cost baseline');
  const defaultMarginPerKg = finiteAmount(input.defaultMarginPerKg, 'Default selling margin');
  const additionalPerKgMargins = input.additionalMargins.flatMap((component) => {
    if (component.status === 'INACTIVE') return [];
    if (component.calculationType !== 'PER_KG') {
      throw new UnsupportedCostingFormulaError(
        `${component.name} uses ${component.calculationType}. That formula is not defined and is not treated as ₹/kg.`,
      );
    }
    if (component.perKg == null) {
      throw new Error(`${component.name} needs an explicit ₹/kg amount`);
    }
    return [{ id: component.id, name: component.name, perKg: finiteAmount(component.perKg, component.name) }];
  });
  const additionalMarginPerKg = additionalPerKgMargins.reduce((sum, component) => sum + component.perKg, 0);
  const preliminarySellingRatePerKg = costBaselinePerKg + defaultMarginPerKg + additionalMarginPerKg;
  return {
    costBaselinePerKg,
    defaultMarginPerKg,
    additionalPerKgMargins,
    additionalMarginPerKg,
    preliminarySellingRatePerKg,
    finalSellingRatePerKg: applyFinalRateRounding(preliminarySellingRatePerKg, input.roundingRule),
  };
}

/** Before receiving expenses are allocated, the baseline is the normalized vendor rate alone. */
export function calculatePreliminarySellingRate(input: {
  normalizedVendorPurchaseRatePerKg: number;
  settings: CostingSettings;
  additionalMargins: readonly SellingMarginComponent[];
}): SellingRateBreakdown {
  return calculateSellingRate({
    costBaselinePerKg: input.normalizedVendorPurchaseRatePerKg,
    defaultMarginPerKg: input.settings.defaultSellingMarginPerKg,
    additionalMargins: input.additionalMargins,
    roundingRule: input.settings.roundingRule,
  });
}

/**
 * Final rate after receiving. Purchase expenses and receiving expenses are allocated
 * only by the methods passed in. A fixed purchase expense is never turned into a margin.
 */
export function calculateFinalSellingRateAfterReceiving(input: {
  normalizedVendorPurchaseRatePerKg: number;
  purchaseExpenses: readonly CostExpenseLine[];
  stockReceivingExpenses: readonly CostExpenseLine[];
  purchaseExpenseAllocation: ExpenseAllocation;
  receivingExpenseAllocation: ExpenseAllocation;
  settings: CostingSettings;
  additionalMargins: readonly SellingMarginComponent[];
}): FinalSellingRate {
  const landed = landedCostPerKg(input);
  const selling = calculateSellingRate({
    costBaselinePerKg: landed.allocatedLandedCostPerKg,
    defaultMarginPerKg: input.settings.defaultSellingMarginPerKg,
    additionalMargins: input.additionalMargins,
    roundingRule: input.settings.roundingRule,
  });
  return { ...landed, ...selling };
}

export function captureRateSnapshot(input: {
  vendorRate: VendorRateRecord;
  purchaseExpenses: readonly CostExpenseLine[];
  stockReceivingExpenses: readonly CostExpenseLine[];
  purchaseExpenseAllocation: ExpenseAllocation;
  receivingExpenseAllocation: ExpenseAllocation;
  settings: CostingSettings;
  additionalMargins: readonly SellingMarginComponent[];
}): RateSettingSnapshot {
  const selling = calculateFinalSellingRateAfterReceiving({
    normalizedVendorPurchaseRatePerKg: input.vendorRate.normalizedRatePerKg,
    purchaseExpenses: input.purchaseExpenses,
    stockReceivingExpenses: input.stockReceivingExpenses,
    purchaseExpenseAllocation: input.purchaseExpenseAllocation,
    receivingExpenseAllocation: input.receivingExpenseAllocation,
    settings: input.settings,
    additionalMargins: input.additionalMargins,
  });
  return {
    defaultSellingMarginPerKg: selling.defaultMarginPerKg,
    roundingRule: input.settings.roundingRule,
    additionalMargins: selling.additionalPerKgMargins.map((component) => ({
      ...component,
      calculationType: 'PER_KG' as const,
    })),
    originalVendorEnteredRate: input.vendorRate.originalEnteredRate,
    originalVendorRateUnit: input.vendorRate.originalUnit,
    normalizedVendorPurchaseRatePerKg: input.vendorRate.normalizedRatePerKg,
    purchaseExpenses: selling.purchaseExpensesPayableToVendor,
    stockReceivingExpenses: selling.stockReceivingExpenses,
    purchaseExpenseAllocation: input.purchaseExpenseAllocation,
    receivingExpenseAllocation: input.receivingExpenseAllocation,
    allocatedPurchaseExpensePerKg: selling.allocatedPurchaseExpensePerKg,
    allocatedReceivingExpensePerKg: selling.allocatedReceivingExpensePerKg,
    allocatedLandedCostPerKg: selling.allocatedLandedCostPerKg,
    costBaselinePerKg: selling.costBaselinePerKg,
    preliminarySellingRatePerKg: selling.preliminarySellingRatePerKg,
    finalSellingRatePerKg: selling.finalSellingRatePerKg,
  };
}

/** A finalized snapshot is kept. A later settings change cannot overwrite it. */
export function attachFinalizedRateSnapshot<T extends { rateSnapshot?: RateSettingSnapshot }>(
  transaction: T,
  snapshot: RateSettingSnapshot,
): T {
  if (transaction.rateSnapshot) return transaction;
  return { ...transaction, rateSnapshot: snapshot };
}

export function replaceCostingSettings(next: CostingSettings): CostingSettings {
  if (next.roundingRule !== 'CEIL_WHOLE_RUPEE') {
    throw new UnsupportedCostingFormulaError('Only rounding upward to the next whole rupee is defined');
  }
  return {
    defaultSellingMarginPerKg: finiteAmount(next.defaultSellingMarginPerKg, 'Default selling margin'),
    roundingRule: next.roundingRule,
  };
}

export function sanitizeCostingSettings(value: Partial<CostingSettings> | null | undefined): CostingSettings {
  const margin = Number(value?.defaultSellingMarginPerKg);
  return {
    defaultSellingMarginPerKg: Number.isFinite(margin) && margin >= 0
      ? margin
      : DEFAULT_COSTING_SETTINGS.defaultSellingMarginPerKg,
    roundingRule: value?.roundingRule === 'CEIL_WHOLE_RUPEE'
      ? value.roundingRule
      : DEFAULT_COSTING_SETTINGS.roundingRule,
  };
}

function duplicateInKind(types: CostingExpenseType[], kind: CostingExpenseKind, name: string, ignoreId?: string): boolean {
  const normalized = name.trim().toLowerCase();
  return types.some((type) => (
    type.id !== ignoreId && type.kind === kind && type.name.trim().toLowerCase() === normalized
  ));
}

export function addCostingExpenseType(
  types: CostingExpenseType[],
  input: { id: string; name: string; kind: CostingExpenseKind },
): CostingExpenseType[] {
  const name = requireMasterName(input.name);
  if (duplicateInKind(types, input.kind, name)) throw new Error(`${name} already exists`);
  return [...types, { id: input.id, name, kind: input.kind, status: 'ACTIVE' }];
}

export function updateCostingExpenseType(
  types: CostingExpenseType[],
  id: string,
  patch: { name?: string; status?: MasterStatus },
): CostingExpenseType[] {
  const current = types.find((type) => type.id === id);
  if (!current) throw new Error('Expense type not found');
  const name = patch.name == null ? current.name : requireMasterName(patch.name);
  if (duplicateInKind(types, current.kind, name, id)) throw new Error(`${name} already exists`);
  return types.map((type) => (
    type.id === id
      ? { ...type, name, status: patch.status ?? type.status, kind: type.kind }
      : type
  ));
}

export function addSellingMarginComponent(
  components: SellingMarginComponent[],
  input: { id: string; name: string; perKg: number },
): SellingMarginComponent[] {
  const name = requireMasterName(input.name);
  if (components.some((component) => component.name.trim().toLowerCase() === name.toLowerCase())) {
    throw new Error(`${name} already exists`);
  }
  return [...components, {
    id: input.id,
    name,
    calculationType: 'PER_KG',
    perKg: finiteAmount(input.perKg, name),
    status: 'ACTIVE',
  }];
}

export function updateSellingMarginComponent(
  components: SellingMarginComponent[],
  id: string,
  patch: { name?: string; perKg?: number; status?: MasterStatus },
): SellingMarginComponent[] {
  const current = components.find((component) => component.id === id);
  if (!current) throw new Error('Margin component not found');
  const name = patch.name == null ? current.name : requireMasterName(patch.name);
  if (components.some((component) => component.id !== id && component.name.trim().toLowerCase() === name.toLowerCase())) {
    throw new Error(`${name} already exists`);
  }
  const perKg = patch.perKg == null ? current.perKg : finiteAmount(patch.perKg, name);
  return components.map((component) => (
    component.id === id
      ? { ...component, name, perKg, status: patch.status ?? component.status, calculationType: component.calculationType }
      : component
  ));
}
