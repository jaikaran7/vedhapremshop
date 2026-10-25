import { STORAGE_KEYS } from '@/constants/storage';
import { getActor } from '@/store/session/actor';
import type {
  CashBook,
  DailyCollections,
  PurchaseRevision,
  VendorLedger,
  ApprovalRequest,
  AuditLog,
  CashAccount,
  CollectionAllocation,
  CollectionCategoryId,
  CompanySettings,
  CostingExpenseKind,
  CostingExpenseType,
  CostingSettings,
  Customer,
  MasterStatus,
  Product,
  RateSettingSnapshot,
  SaleChargeSettings,
  SellingMarginComponent,
  CustomerLedgerEntry,
  Expense,
  ExpenseCategory,
  Lot,
  LotMarkBreakdown,
  Mark,
  Payment,
  PaymentMethod,
  Purchase,
  Sale,
  StockAdjustment,
  StockMovement,
  User,
  Vendor,
} from '@/types';
import { outstandingAfterPayment } from '@/utils/trading';
import { buildCashBook, buildDailyCollections } from '@/utils/cash-book';
import { diffBill, type BillSnapshotInput } from '@/utils/purchase-diff';
import { settleBills, vendorPosition } from '@/utils/vendor-ledger';
import { roundMoney } from '@/utils/settlement';
import { calculateSaleCharges, countSaleBags, DEFAULT_SALE_CHARGE_SETTINGS } from '@/utils/sale-charges';
import {
  addCostingExpenseType as appendCostingExpenseType,
  addSellingMarginComponent as appendSellingMarginComponent,
  attachFinalizedRateSnapshot,
  replaceCostingSettings,
  sanitizeCostingSettings,
  updateCostingExpenseType as patchCostingExpenseType,
  updateSellingMarginComponent as patchSellingMarginComponent,
} from '@/utils/costing';
import { addProduct as appendProduct, resolveSaleProduct, saleProductSnapshot, updateProduct as patchProduct } from '@/utils/products';
import { appliedSellingRate, evaluateReceiving, takenInspectionQuantity, type ReceivingDraft } from '@/utils/receiving';
import {
  SEED_COSTING_EXPENSE_TYPES,
  SEED_COSTING_SETTINGS,
  SEED_PRODUCTS,
  SEED_SELLING_MARGIN_COMPONENTS,
} from '@/data/costing-seed';
import { allocatePayment, isVendorPaymentCategory, validateExpense } from '@/utils/collection-ledger';
import {
  SEED_APPROVALS,
  SEED_AUDIT_LOGS,
  SEED_CASH_ACCOUNTS,
  SEED_COMPANY,
  SEED_CUSTOMERS,
  SEED_EXPENSE_CATEGORIES,
  SEED_EXPENSES,
  SEED_LEDGER_ENTRIES,
  SEED_LOTS,
  SEED_MARKS,
  SEED_PAYMENTS,
  SEED_PURCHASES,
  SEED_SALES,
  SEED_STOCK_MOVEMENTS,
  SEED_USERS,
  SEED_VENDORS,
} from '@/data/seed';

export interface RecordPaymentInput {
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  allocation?: CollectionAllocation;
}

export interface RecordExpenseInput {
  categoryId: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  accountId: string;
  reference?: string;
  trackingCategory?: CollectionCategoryId | null;
  /** Required for Purchase Payments: the vendor being paid. */
  vendorId?: string;
}

export interface NewExpenseCategoryInput {
  name: string;
  trackingCategory: CollectionCategoryId | null;
}

interface MandiSnapshot {
  users: User[];
  company: CompanySettings;
  saleCharges: SaleChargeSettings;
  costingSettings: CostingSettings;
  products: Product[];
  costingExpenseTypes: CostingExpenseType[];
  sellingMarginComponents: SellingMarginComponent[];
  customers: Customer[];
  vendors: Vendor[];
  marks: Mark[];
  lots: Lot[];
  purchases: Purchase[];
  sales: Sale[];
  payments: Payment[];
  expenses: Expense[];
  cashAccounts: CashAccount[];
  expenseCategories: ExpenseCategory[];
  stockMovements: StockMovement[];
  stockAdjustments: StockAdjustment[];
  approvals: ApprovalRequest[];
  auditLogs: AuditLog[];
  ledgerEntries: CustomerLedgerEntry[];
}

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function nextMasterId(prefix: string, items: { id: string }[]): string {
  const used = new Set(items.map((item) => item.id));
  let sequence = items.length + 1;
  while (used.has(`${prefix}-${sequence}`)) sequence += 1;
  return `${prefix}-${sequence}`;
}

class MockRepository {
  private state: MandiSnapshot;

  constructor() {
    this.state = {
      users: SEED_USERS,
      company: readStored(STORAGE_KEYS.currentUser + '_unused', SEED_COMPANY),
      saleCharges: readStored(STORAGE_KEYS.saleCharges, DEFAULT_SALE_CHARGE_SETTINGS),
      costingSettings: sanitizeCostingSettings(readStored(STORAGE_KEYS.costingSettings, SEED_COSTING_SETTINGS)),
      products: readStored(STORAGE_KEYS.products, SEED_PRODUCTS),
      costingExpenseTypes: readStored(STORAGE_KEYS.costingExpenseTypes, SEED_COSTING_EXPENSE_TYPES),
      sellingMarginComponents: readStored(STORAGE_KEYS.sellingMarginComponents, SEED_SELLING_MARGIN_COMPONENTS),
      customers: readStored(STORAGE_KEYS.customers, SEED_CUSTOMERS),
      vendors: readStored(STORAGE_KEYS.vendors, SEED_VENDORS),
      marks: readStored(STORAGE_KEYS.marks, SEED_MARKS),
      lots: readStored(STORAGE_KEYS.lots, SEED_LOTS),
      purchases: readStored(STORAGE_KEYS.purchases, SEED_PURCHASES),
      sales: readStored(STORAGE_KEYS.sales, SEED_SALES),
      payments: readStored(STORAGE_KEYS.payments, SEED_PAYMENTS),
      expenses: readStored(STORAGE_KEYS.expenses, SEED_EXPENSES),
      cashAccounts: readStored(STORAGE_KEYS.cashAccounts, SEED_CASH_ACCOUNTS),
      expenseCategories: readStored(STORAGE_KEYS.expenseCategories, SEED_EXPENSE_CATEGORIES),
      stockMovements: readStored(STORAGE_KEYS.stockMovements, SEED_STOCK_MOVEMENTS),
      stockAdjustments: [],
      approvals: readStored(STORAGE_KEYS.approvals, SEED_APPROVALS),
      auditLogs: readStored(STORAGE_KEYS.auditLogs, SEED_AUDIT_LOGS),
      ledgerEntries: readStored(STORAGE_KEYS.ledger, SEED_LEDGER_ENTRIES),
    };
    this.state.company = SEED_COMPANY;
    this.state.saleCharges = {
      ...DEFAULT_SALE_CHARGE_SETTINGS,
      ...this.state.saleCharges,
    };
    this.state.costingSettings = sanitizeCostingSettings(this.state.costingSettings);
    if (!Array.isArray(this.state.products) || this.state.products.length === 0) {
      this.state.products = SEED_PRODUCTS;
    }
    if (!Array.isArray(this.state.costingExpenseTypes) || this.state.costingExpenseTypes.length === 0) {
      this.state.costingExpenseTypes = SEED_COSTING_EXPENSE_TYPES;
    }
    if (!Array.isArray(this.state.sellingMarginComponents)) {
      this.state.sellingMarginComponents = SEED_SELLING_MARGIN_COMPONENTS;
    }
  }

  private persist() {
    writeStored(STORAGE_KEYS.customers, this.state.customers);
    writeStored(STORAGE_KEYS.vendors, this.state.vendors);
    writeStored(STORAGE_KEYS.lots, this.state.lots);
    writeStored(STORAGE_KEYS.marks, this.state.marks);
    writeStored(STORAGE_KEYS.purchases, this.state.purchases);
    writeStored(STORAGE_KEYS.sales, this.state.sales);
    writeStored(STORAGE_KEYS.payments, this.state.payments);
    writeStored(STORAGE_KEYS.expenses, this.state.expenses);
    writeStored(STORAGE_KEYS.cashAccounts, this.state.cashAccounts);
    writeStored(STORAGE_KEYS.expenseCategories, this.state.expenseCategories);
    writeStored(STORAGE_KEYS.stockMovements, this.state.stockMovements);
    writeStored(STORAGE_KEYS.approvals, this.state.approvals);
    writeStored(STORAGE_KEYS.saleCharges, this.state.saleCharges);
    writeStored(STORAGE_KEYS.costingSettings, this.state.costingSettings);
    writeStored(STORAGE_KEYS.products, this.state.products);
    writeStored(STORAGE_KEYS.costingExpenseTypes, this.state.costingExpenseTypes);
    writeStored(STORAGE_KEYS.sellingMarginComponents, this.state.sellingMarginComponents);
    writeStored(STORAGE_KEYS.auditLogs, this.state.auditLogs);
    writeStored(STORAGE_KEYS.ledger, this.state.ledgerEntries);
    writeStored(STORAGE_KEYS.purchaseRevisions, this.revisions);
  }

  private logAudit(action: string, entity: string, entityId: string, details: string, approver?: string) {
    const actor = getActor();
    const entry: AuditLog = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action,
      entity,
      entityId,
      details,
      approver,
    };
    this.state.auditLogs = [entry, ...this.state.auditLogs];
  }

  listUsers() { return this.state.users; }
  getCompany() { return this.state.company; }
  getSaleChargeSettings() { return this.state.saleCharges; }
  getCostingSettings() { return this.state.costingSettings; }
  listProducts() { return this.state.products; }
  listCostingExpenseTypes() { return this.state.costingExpenseTypes; }
  listSellingMarginComponents() { return this.state.sellingMarginComponents; }
  listCustomers() { return this.state.customers; }
  getCustomer(id: string) { return this.state.customers.find((c) => c.id === id) ?? null; }
  /** What we owe a vendor is derived, exactly as on the server: opening balance + bills − payments (see utils/vendor-ledger). */
  private vendorWithMoney(v: Vendor): Vendor {
    const billed = this.state.purchases.filter((p) => p.vendorId === v.id).reduce((t, p) => t + Math.round(p.netAmount * 100), 0);
    const paid = this.state.expenses.filter((e) => e.vendorId === v.id).reduce((t, e) => t + Math.round(e.amount * 100), 0);
    const opening = Math.round((v.openingBalance ?? 0) * 100);
    const position = vendorPosition(opening, billed, paid);
    return {
      ...v, totalPurchases: billed / 100, openingBalance: opening / 100, previousDue: position.previousDuePaise / 100,
      newDue: position.newDuePaise / 100, advanceAmount: position.advancePaise / 100, payableAmount: position.payablePaise / 100,
    };
  }

  listVendors() { return this.state.vendors.map((v) => this.vendorWithMoney(v)); }
  getVendor(id: string) {
    const vendor = this.state.vendors.find((v) => v.id === id);
    return vendor ? this.vendorWithMoney(vendor) : null;
  }

  getVendorLedger(id: string): VendorLedger | null {
    const vendor = this.getVendor(id);
    if (!vendor) return null;
    const bills = this.state.purchases.filter((p) => p.vendorId === id).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    const payments = this.state.expenses.filter((e) => e.vendorId === id).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    const paid = payments.reduce((t, e) => t + Math.round(e.amount * 100), 0);
    const settled = new Map(settleBills(Math.round((vendor.openingBalance ?? 0) * 100), bills.map((b) => ({ id: b.id, netPaise: Math.round(b.netAmount * 100) })), paid).map((s) => [s.id, s]));
    return {
      vendor, totalPurchases: vendor.totalPurchases, openingBalance: vendor.openingBalance ?? 0, previousDue: vendor.previousDue ?? 0,
      newDue: vendor.newDue ?? 0, advanceAmount: vendor.advanceAmount ?? 0, payableAmount: vendor.payableAmount,
      bills: bills.map((b) => {
        const s = settled.get(b.id)!;
        return { id: b.id, billNumber: b.billNumber, date: b.date, lotNumber: b.lotNumber, receiptStatus: b.receiptStatus === 'PENDING_RECEIPT' ? 'PENDING_RECEIPT' as const : 'RECEIVED' as const,
          netAmount: b.netAmount, paidAmount: s.paidPaise / 100, balanceAmount: s.balancePaise / 100, status: s.status };
      }),
      payments: payments.map((e) => ({ id: e.id, date: e.date, amount: e.amount, paymentMethod: e.paymentMethod, accountName: e.accountName, reference: e.reference, recordedBy: e.recordedBy, createdAt: e.createdAt })),
    };
  }
  listMarks() { return this.state.marks; }
  listLots() { return this.state.lots; }
  getLot(id: string) { return this.state.lots.find((l) => l.id === id) ?? null; }
  listPurchases() { return this.state.purchases.map((p) => ({ ...p, revisionCount: this.revisions.filter((r) => r.purchaseId === p.id).length })); }
  getPurchase(id: string) { return this.listPurchases().find((p) => p.id === id) ?? null; }
  listSales() { return this.state.sales; }
  getSale(id: string) { return this.state.sales.find((s) => s.id === id) ?? null; }
  listPayments() { return this.state.payments; }
  getPayment(id: string) { return this.state.payments.find((p) => p.id === id) ?? null; }
  listExpenses() { return this.state.expenses; }
  listCashAccounts() { return this.state.cashAccounts; }
  listExpenseCategories() { return this.state.expenseCategories; }
  listStockMovements() { return this.state.stockMovements; }
  listStockAdjustments() { return this.state.stockAdjustments; }
  listApprovals() { return this.state.approvals; }
  getApproval(id: string) { return this.state.approvals.find((a) => a.id === id) ?? null; }
  listAuditLogs() { return this.state.auditLogs; }
  listLedger() { return this.state.ledgerEntries; }

  updateCompany(settings: CompanySettings) {
    this.state.company = settings;
    this.logAudit('UPDATE_SETTINGS', 'COMPANY', 'CONFIG', 'Updated wholesale company details');
    this.persist();
    return settings;
  }

  updateSaleChargeSettings(settings: SaleChargeSettings) {
    if (settings.amaliPerBag < 0 || settings.marketFeePerBag < 0 || !Number.isFinite(settings.amaliPerBag) || !Number.isFinite(settings.marketFeePerBag)) {
      throw new Error('Sale charges must be valid non-negative amounts');
    }
    this.state.saleCharges = {
      amaliPerBag: roundMoney(settings.amaliPerBag),
      marketFeePerBag: roundMoney(settings.marketFeePerBag),
      amaliEnabled: settings.amaliEnabled,
      marketFeeEnabled: settings.marketFeeEnabled,
    };
    this.logAudit('UPDATE_SETTINGS', 'SALE_CHARGES', 'CONFIG', 'Updated Amali and market fee settings for new sales');
    this.persist();
    return this.state.saleCharges;
  }

  updateCostingSettings(settings: CostingSettings) {
    this.state.costingSettings = replaceCostingSettings(settings);
    this.logAudit('UPDATE_SETTINGS', 'COSTING', 'CONFIG', 'Updated default selling margin for new rate calculations');
    this.persist();
    return this.state.costingSettings;
  }

  addProduct(input: { name: string }) {
    const id = nextMasterId('prod', this.state.products);
    this.state.products = appendProduct(this.state.products, { id, name: input.name });
    const created = this.state.products.find((product) => product.id === id);
    if (!created) throw new Error('Product could not be saved');
    this.logAudit('CREATE_PRODUCT', 'PRODUCT', id, `Added product ${created.name}`);
    this.persist();
    return created;
  }

  updateProduct(id: string, patch: { name?: string; status?: MasterStatus }) {
    this.state.products = patchProduct(this.state.products, id, patch);
    this.logAudit('UPDATE_PRODUCT', 'PRODUCT', id, 'Updated product master without rewriting saved sales');
    this.persist();
    return this.state.products.find((product) => product.id === id) ?? null;
  }

  addCostingExpenseType(input: { name: string; kind: CostingExpenseKind }) {
    const id = nextMasterId('cet', this.state.costingExpenseTypes);
    this.state.costingExpenseTypes = appendCostingExpenseType(this.state.costingExpenseTypes, { id, ...input });
    const created = this.state.costingExpenseTypes.find((type) => type.id === id);
    if (!created) throw new Error('Expense type could not be saved');
    this.logAudit('CREATE_EXPENSE_TYPE', 'COSTING_EXPENSE', id, `Added ${created.kind} expense ${created.name}`);
    this.persist();
    return created;
  }

  updateCostingExpenseType(id: string, patch: { name?: string; status?: MasterStatus }) {
    this.state.costingExpenseTypes = patchCostingExpenseType(this.state.costingExpenseTypes, id, patch);
    this.logAudit('UPDATE_EXPENSE_TYPE', 'COSTING_EXPENSE', id, 'Updated expense type without rewriting saved lines');
    this.persist();
    return this.state.costingExpenseTypes.find((type) => type.id === id) ?? null;
  }

  addSellingMarginComponent(input: { name: string; perKg: number }) {
    const id = nextMasterId('mar', this.state.sellingMarginComponents);
    this.state.sellingMarginComponents = appendSellingMarginComponent(this.state.sellingMarginComponents, { id, ...input });
    const created = this.state.sellingMarginComponents.find((component) => component.id === id);
    if (!created) throw new Error('Margin component could not be saved');
    this.logAudit('CREATE_MARGIN', 'SELLING_MARGIN', id, `Added per-kg margin ${created.name}`);
    this.persist();
    return created;
  }

  updateSellingMarginComponent(id: string, patch: { name?: string; perKg?: number; status?: MasterStatus }) {
    this.state.sellingMarginComponents = patchSellingMarginComponent(this.state.sellingMarginComponents, id, patch);
    this.logAudit('UPDATE_MARGIN', 'SELLING_MARGIN', id, 'Updated selling margin without rewriting finalized rates');
    this.persist();
    return this.state.sellingMarginComponents.find((component) => component.id === id) ?? null;
  }

  savePurchaseRateSnapshot(purchaseId: string, snapshot: RateSettingSnapshot) {
    const purchase = this.state.purchases.find((item) => item.id === purchaseId);
    if (!purchase) return null;
    const next = attachFinalizedRateSnapshot(purchase, snapshot);
    if (next === purchase) return purchase;
    this.state.purchases = this.state.purchases.map((item) => (item.id === purchaseId ? next : item));
    this.logAudit('FINALIZE_RATE', 'PURCHASE', purchaseId, 'Saved selling-rate snapshot');
    this.persist();
    return next;
  }

  addCustomer(data: Omit<Customer, 'id' | 'code' | 'createdAt' | 'outstandingAmount'>): Customer {
    const newId = 'c-' + (this.state.customers.length + 1);
    const newCode = `CUST-${String(this.state.customers.length + 1).padStart(3, '0')}`;
    const customer: Customer = {
      ...data,
      id: newId,
      code: newCode,
      outstandingAmount: 0,
      createdAt: new Date().toISOString(),
    };
    this.state.customers = [...this.state.customers, customer];
    this.logAudit('CREATE_CUSTOMER', 'CUSTOMER', newId, `Created customer ${customer.name} (${newCode})`);
    this.persist();
    return customer;
  }

  updateCustomer(id: string, data: Partial<Customer>) {
    this.state.customers = this.state.customers.map((c) => (c.id === id ? { ...c, ...data } : c));
    this.logAudit('UPDATE_CUSTOMER', 'CUSTOMER', id, 'Updated customer profile');
    this.persist();
  }

  deleteCustomer(id: string) {
    const cust = this.state.customers.find((c) => c.id === id);
    if (!cust) return;
    this.state.customers = this.state.customers.filter((c) => c.id !== id);
    this.logAudit('DELETE_CUSTOMER', 'CUSTOMER', id, `Removed customer ${cust.name}`);
    this.persist();
  }

  addVendor(data: Omit<Vendor, 'id' | 'code' | 'createdAt' | 'totalPurchases' | 'payableAmount'>): Vendor {
    const newId = 'v-' + (this.state.vendors.length + 1);
    const newCode = `VEN-${String(this.state.vendors.length + 1).padStart(3, '0')}`;
    const vendor: Vendor = {
      ...data,
      id: newId,
      code: newCode,
      totalPurchases: 0,
      payableAmount: 0,
      createdAt: new Date().toISOString(),
    };
    this.state.vendors = [...this.state.vendors, vendor];
    this.logAudit('CREATE_VENDOR', 'VENDOR', newId, `Created vendor ${vendor.name} (${newCode})`);
    this.persist();
    return vendor;
  }

  updateVendor(id: string, data: Partial<Vendor>) {
    this.state.vendors = this.state.vendors.map((v) => (v.id === id ? { ...v, ...data } : v));
    this.logAudit('UPDATE_VENDOR', 'VENDOR', id, 'Updated vendor details');
    this.persist();
  }

  addMark(data: Omit<Mark, 'id'>) {
    const mark: Mark = { ...data, id: 'm-' + (this.state.marks.length + 1) };
    this.state.marks = [...this.state.marks, mark];
    this.logAudit('CREATE_MARK', 'MARK', mark.id, `Created onion quality mark ${mark.code}`);
    this.persist();
    return mark;
  }

  updateMark(id: string, data: Partial<Mark>) {
    this.state.marks = this.state.marks.map((m) => (m.id === id ? { ...m, ...data } : m));
    this.logAudit('UPDATE_MARK', 'MARK', id, 'Updated onion quality mark settings');
    this.persist();
  }

  private revisions: PurchaseRevision[] = readStored<PurchaseRevision[]>(STORAGE_KEYS.purchaseRevisions, []);

  listPurchaseRevisions(purchaseId: string): PurchaseRevision[] {
    return this.revisions.filter((r) => r.purchaseId === purchaseId).sort((a, b) => b.revisionNo - a.revisionNo);
  }

  private billSnapshot(p: Pick<Purchase, 'billNumber' | 'vendorId' | 'productId' | 'date' | 'expectedArrivalDate' | 'lotNumber' | 'notes' | 'items' | 'expenses' | 'grossAmount' | 'totalExpenses' | 'netAmount'>): BillSnapshotInput {
    return {
      billNumber: p.billNumber, vendorName: this.state.vendors.find((v) => v.id === p.vendorId)?.name ?? '', productName: this.state.products.find((x) => x.id === p.productId)?.name ?? 'Onions',
      date: p.date, expectedArrivalDate: p.expectedArrivalDate ?? null, lotNumber: p.lotNumber, notes: p.notes ?? '',
      items: p.items.map(({ markCode, bags, weightKg, ratePerKg, totalAmount }) => ({ markCode, bags, weightKg, ratePerKg, totalAmount })),
      expenses: p.expenses.map((e) => ({ name: e.expenseTypeName || e.type, amount: e.amount })),
      grossAmount: p.grossAmount, totalExpenses: p.totalExpenses, netAmount: p.netAmount,
    };
  }

  /** Same rules as the server: anything before receipt; after receipt only rates and charges. The previous version is kept. */
  updatePurchase(id: string, data: Omit<Purchase, 'id' | 'createdAt'> & { reason: string }): Purchase {
    const current = this.state.purchases.find((p) => p.id === id);
    if (!current) throw new Error('Purchase not found');
    const received = current.receiptStatus !== 'PENDING_RECEIPT';
    const items = data.items.map((item) => ({ ...item, markCode: item.markCode.trim().toUpperCase(), totalAmount: Math.round(item.weightKg * item.ratePerKg) }));
    if (received) {
      const fixed = 'This lot is already received, so what arrived cannot change here. Fix quantities with a stock adjustment; rates and charges can still be corrected.';
      const same = data.vendorId === current.vendorId && (data.productId ?? '') === (current.productId ?? '') && data.lotNumber.toUpperCase() === current.lotNumber.toUpperCase()
        && items.length === current.items.length
        && items.every((i) => current.items.some((c) => c.id === i.id && c.markCode === i.markCode && c.bags === i.bags && c.weightKg === i.weightKg));
      if (!same) throw new Error(fixed);
    }
    const duplicate = this.state.purchases.find((p) => p.id !== id && p.vendorId === data.vendorId && p.billNumber === data.billNumber.trim());
    if (duplicate) throw new Error(`Bill ${data.billNumber.trim()} is already recorded for this vendor.`);
    const grossAmount = items.reduce((t, i) => t + i.totalAmount, 0);
    const totalExpenses = data.expenses.reduce((t, e) => t + e.amount, 0);
    const vendor = this.state.vendors.find((v) => v.id === data.vendorId);
    const next: Purchase = {
      ...current, billNumber: data.billNumber.trim(), vendorId: data.vendorId, vendorName: vendor?.name ?? current.vendorName, productId: data.productId, productName: data.productName ?? current.productName,
      date: data.date, expectedArrivalDate: data.expectedArrivalDate, lotNumber: data.lotNumber.trim().toUpperCase(), notes: data.notes, items, expenses: data.expenses,
      grossAmount, totalExpenses, netAmount: grossAmount + totalExpenses,
    };
    const changes = diffBill(this.billSnapshot(current), this.billSnapshot(next));
    if (changes.length === 0) return current;
    this.state.purchases = this.state.purchases.map((p) => (p.id === id ? next : p));
    if (received) {
      for (const item of items) {
        const old = current.items.find((c) => c.id === item.id);
        if (!old || old.ratePerKg === item.ratePerKg) continue;
        this.state.lots = this.state.lots.map((lot) => (lot.purchaseBillId === id
          ? { ...lot, marks: lot.marks.map((m) => (m.markCode === item.markCode ? { ...m, purchaseRate: item.ratePerKg } : m)) }
          : lot));
      }
    }
    const actor = getActor();
    this.revisions = [...this.revisions, {
      id: 'rev-' + Date.now(), purchaseId: id, revisionNo: this.listPurchaseRevisions(id).length + 1, editedBy: actor.name, editedByRole: actor.role,
      reason: data.reason.trim(), changes, createdAt: new Date().toISOString(),
    }];
    this.logAudit('EDIT_PURCHASE', 'PURCHASE', id, `Vendor bill ${next.billNumber} corrected (${changes.map((c) => c.label).join(', ')}): ${data.reason.trim()}`);
    this.persist();
    return { ...next, revisionCount: this.listPurchaseRevisions(id).length };
  }

  getCashBook(date: string): CashBook {
    return buildCashBook({ accounts: this.state.cashAccounts, payments: this.state.payments, expenses: this.state.expenses, date });
  }

  getDailyCollections(date: string): DailyCollections {
    return buildDailyCollections(this.state.payments, date);
  }

  setAccountOpening(id: string, openingBalance: number, openingDate: string) {
    const account = this.state.cashAccounts.find((a) => a.id === id);
    if (!account) throw new Error('Account not found');
    this.state.cashAccounts = this.state.cashAccounts.map((a) => (a.id === id ? { ...a, openingBalance, openingDate } : a));
    this.logAudit('SET_ACCOUNT_OPENING', 'ACCOUNT', id, `${account.name} opening balance set to ₹${openingBalance.toLocaleString('en-IN')} from ${openingDate}`);
    this.persist();
    return this.state.cashAccounts.find((a) => a.id === id)!;
  }

  createPurchase(data: Omit<Purchase, 'id' | 'createdAt'>): Purchase {
    const purchaseId = 'pur-' + Date.now();
    const pending = (data.receiptStatus ?? 'PENDING_RECEIPT') !== 'RECEIVED';
    const purchase: Purchase = {
      ...data,
      id: purchaseId,
      createdAt: new Date().toISOString(),
      receiptStatus: pending ? 'PENDING_RECEIPT' : 'RECEIVED',
    };
    this.state.purchases = [purchase, ...this.state.purchases];

    if (pending) {
      this.state.vendors = this.state.vendors.map((v) =>
        v.id === data.vendorId
          ? {
              ...v,
              totalPurchases: v.totalPurchases + data.netAmount,
              payableAmount: v.payableAmount + data.netAmount,
            }
          : v
      );
      this.logAudit(
        'CREATE_PURCHASE',
        'PURCHASE',
        purchaseId,
        `Vendor bill ${data.billNumber} saved for ${data.lotNumber}. Awaiting physical receipt.`
      );
      this.persist();
      return purchase;
    }

    const totalBags = data.items.reduce((sum, item) => sum + item.bags, 0);
    const totalWeightKg = data.items.reduce((sum, item) => sum + item.weightKg, 0);
    const existingIndex = this.state.lots.findIndex(
      (l) => l.lotNumber.toUpperCase() === data.lotNumber.toUpperCase()
    );

    if (existingIndex >= 0) {
      const existing = this.state.lots[existingIndex];
      const updatedMarks = existing.marks.map((m) => ({ ...m }));
      data.items.forEach((item) => {
        const mIndex = updatedMarks.findIndex((m) => m.markCode === item.markCode);
        if (mIndex >= 0) {
          updatedMarks[mIndex] = {
            ...updatedMarks[mIndex],
            initialBags: updatedMarks[mIndex].initialBags + item.bags,
            initialWeightKg: updatedMarks[mIndex].initialWeightKg + item.weightKg,
            remainingBags: updatedMarks[mIndex].remainingBags + item.bags,
            remainingWeightKg: updatedMarks[mIndex].remainingWeightKg + item.weightKg,
          };
        } else {
          updatedMarks.push({
            markCode: item.markCode,
            initialBags: item.bags,
            initialWeightKg: item.weightKg,
            remainingBags: item.bags,
            remainingWeightKg: item.weightKg,
            purchaseRate: item.ratePerKg,
          });
        }
      });
      const updatedLot: Lot = {
        ...existing,
        productId: existing.productId ?? data.productId,
        totalBags: existing.totalBags + totalBags,
        totalWeightKg: existing.totalWeightKg + totalWeightKg,
        remainingBags: existing.remainingBags + totalBags,
        remainingWeightKg: existing.remainingWeightKg + totalWeightKg,
        marks: updatedMarks,
      };
      this.state.lots = this.state.lots.map((lot, index) => (index === existingIndex ? updatedLot : lot));
    } else {
      const newLot: Lot = {
        id: 'lot-' + Date.now(),
        lotNumber: data.lotNumber,
        productId: data.productId,
        vendorId: data.vendorId,
        vendorName: data.vendorName,
        purchaseBillId: purchaseId,
        purchaseBillNo: data.billNumber,
        arrivalDate: data.date,
        status: 'ACTIVE',
        totalBags,
        totalWeightKg,
        remainingBags: totalBags,
        remainingWeightKg: totalWeightKg,
        marks: data.items.map((item) => ({
          markCode: item.markCode,
          initialBags: item.bags,
          initialWeightKg: item.weightKg,
          remainingBags: item.bags,
          remainingWeightKg: item.weightKg,
          purchaseRate: item.ratePerKg,
        })),
        notes: data.notes,
      };
      this.state.lots = [newLot, ...this.state.lots];
    }

    const movements: StockMovement[] = data.items.map((item) => ({
      id: 'sm-' + Math.random().toString(36).substr(2, 9),
      date: data.date,
      type: 'PURCHASE_IN',
      referenceId: purchaseId,
      referenceType: 'PURCHASE',
      lotNumber: data.lotNumber,
      markCode: item.markCode,
      bags: item.bags,
      weightKg: item.weightKg,
      balanceBagsAfter: item.bags,
      balanceWeightKgAfter: item.weightKg,
      reason: `Purchase consignment bill ${data.billNumber} from ${data.vendorName}`,
      performedBy: getActor().name,
    }));
    this.state.stockMovements = [...movements, ...this.state.stockMovements];

    this.state.vendors = this.state.vendors.map((v) =>
      v.id === data.vendorId
        ? {
            ...v,
            totalPurchases: v.totalPurchases + data.netAmount,
            payableAmount: v.payableAmount + data.netAmount,
          }
        : v
    );

    this.logAudit(
      'CREATE_PURCHASE',
      'PURCHASE',
      purchaseId,
      `Purchase ${data.billNumber} recorded: ₹${data.netAmount.toLocaleString('en-IN')}`
    );
    this.persist();
    return purchase;
  }

  receiveConsignment(purchaseId: string, draft: ReceivingDraft): Purchase {
    const purchase = this.state.purchases.find((item) => item.id === purchaseId);
    if (!purchase) throw new Error('Consignment not found');
    if (purchase.receiving?.stockPosted) return purchase;
    if (purchase.receiptStatus !== 'PENDING_RECEIPT') {
      throw new Error('This consignment is already in stock');
    }
    const evaluated = evaluateReceiving({
      draft,
      settings: this.state.costingSettings,
      margins: this.state.sellingMarginComponents,
    });
    const blocking = evaluated.issues.filter((issue) => issue.blocking);
    if (blocking.length > 0) throw new Error(blocking[0].message);

    const accepted = evaluated.groups.flatMap((group) => {
      const taken = takenInspectionQuantity(group);
      return taken.bags > 0 && taken.weightKg > 0 ? [{ group, taken }] : [];
    });
    const totalBags = accepted.reduce((sum, item) => sum + item.taken.bags, 0);
    const totalWeightKg = accepted.reduce((sum, item) => sum + item.taken.weightKg, 0);
    const existingIndex = this.state.lots.findIndex(
      (lot) => lot.lotNumber.toUpperCase() === purchase.lotNumber.toUpperCase()
    );

    const marksForGroups = (existing: LotMarkBreakdown[] = []): LotMarkBreakdown[] => {
      const updated = existing.map((mark) => ({ ...mark }));
      accepted.forEach(({ group, taken }) => {
        const weight = taken.weightKg;
        const applied = appliedSellingRate(group);
        const index = updated.findIndex((mark) => mark.markCode.toUpperCase() === group.markCode.toUpperCase());
        if (index >= 0) {
          updated[index] = {
            ...updated[index],
            initialBags: updated[index].initialBags + taken.bags,
            initialWeightKg: updated[index].initialWeightKg + weight,
            remainingBags: updated[index].remainingBags + taken.bags,
            remainingWeightKg: updated[index].remainingWeightKg + weight,
            finalizedSellingRate: applied ?? updated[index].finalizedSellingRate,
            calculatedSellingRate: group.calculatedFinalRate ?? updated[index].calculatedSellingRate,
            sellingRateOverride: group.revisedSellingRate,
            sellingRateOverrideReason: group.overrideReason,
          };
          return;
        }
        updated.push({
          markCode: group.markCode,
          initialBags: taken.bags,
          initialWeightKg: weight,
          remainingBags: taken.bags,
          remainingWeightKg: weight,
          purchaseRate: group.originalPurchaseRate,
          finalizedSellingRate: applied ?? undefined,
          calculatedSellingRate: group.calculatedFinalRate ?? undefined,
          sellingRateOverride: group.revisedSellingRate,
          sellingRateOverrideReason: group.overrideReason,
        });
      });
      return updated;
    };

    if (existingIndex >= 0) {
      const existing = this.state.lots[existingIndex];
      const marks = marksForGroups(existing.marks);
      this.state.lots = this.state.lots.map((lot, index) => index === existingIndex ? {
        ...existing,
        productId: existing.productId ?? purchase.productId,
        totalBags: existing.totalBags + totalBags,
        totalWeightKg: existing.totalWeightKg + totalWeightKg,
        remainingBags: existing.remainingBags + totalBags,
        remainingWeightKg: existing.remainingWeightKg + totalWeightKg,
        status: 'ACTIVE',
        marks,
      } : lot);
    } else if (totalBags > 0) {
      this.state.lots = [{
        id: 'lot-' + Date.now(),
        lotNumber: purchase.lotNumber,
        productId: purchase.productId,
        vendorId: purchase.vendorId,
        vendorName: purchase.vendorName,
        purchaseBillId: purchase.id,
        purchaseBillNo: purchase.billNumber,
        arrivalDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        totalBags,
        totalWeightKg,
        remainingBags: totalBags,
        remainingWeightKg: totalWeightKg,
        marks: marksForGroups(),
        notes: purchase.notes,
      }, ...this.state.lots];
    }

    const lotAfter = this.state.lots.find((lot) => lot.lotNumber.toUpperCase() === purchase.lotNumber.toUpperCase());
    const movements: StockMovement[] = accepted.map(({ group, taken }) => {
      const mark = lotAfter?.marks.find((item) => item.markCode.toUpperCase() === group.markCode.toUpperCase());
      return {
        id: 'sm-' + Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0],
        type: 'PURCHASE_IN' as const,
        referenceId: purchase.id,
        referenceType: 'PURCHASE' as const,
        lotNumber: purchase.lotNumber,
        markCode: group.markCode,
        bags: taken.bags,
        weightKg: taken.weightKg,
        balanceBagsAfter: mark?.remainingBags ?? taken.bags,
        balanceWeightKgAfter: mark?.remainingWeightKg ?? taken.weightKg,
        reason: `Received ${purchase.lotNumber} from ${purchase.vendorName}`,
        performedBy: getActor().name,
      };
    });
    this.state.stockMovements = [...movements, ...this.state.stockMovements];

    const received: Purchase = {
      ...purchase,
      receiptStatus: 'RECEIVED',
      receiving: {
        receivedAt: new Date().toISOString(),
        stockPosted: true,
        expenses: draft.expenses,
        groups: evaluated.groups,
        issues: evaluated.issues,
      },
    };
    this.state.purchases = this.state.purchases.map((item) => item.id === purchaseId ? received : item);
    this.logAudit('RECEIVE_LOT', 'PURCHASE', purchaseId, `Received ${purchase.lotNumber}: ${totalBags} bags posted once, including accepted and defective`);
    this.persist();
    return received;
  }

  createSale(data: Omit<Sale, 'id' | 'billNumber' | 'createdAt'>): Sale {
    const saleId = 'sale-' + Date.now();
    const billNumber = `VPN-INV-${1080 + this.state.sales.length + 1}`;
    const product = resolveSaleProduct(this.state.products, data.productId);
    const productSnapshot = data.productName?.trim()
      ? { productId: product.id, productName: data.productName.trim() }
      : saleProductSnapshot(product);
    const sale: Sale = {
      ...data,
      ...productSnapshot,
      id: saleId,
      billNumber,
      createdAt: new Date().toISOString(),
    };
    this.state.sales = [sale, ...this.state.sales];

    this.state.lots = this.state.lots.map((lot) => {
      const updatedMarks = lot.marks.map((mark) => ({ ...mark }));
      const soldCodes = [...new Set(
        data.items
          .filter((item) => item.lotNumber.toUpperCase() === lot.lotNumber.toUpperCase())
          .map((item) => item.markCode.toUpperCase()),
      )];
      if (soldCodes.length === 0) return lot;
      let bagsDeducted = 0;
      let weightDeducted = 0;
      for (const code of soldCodes) {
        const matchingItems = data.items.filter(
          (item) => item.lotNumber.toUpperCase() === lot.lotNumber.toUpperCase() && item.markCode.toUpperCase() === code,
        );
        let bagsLeft = matchingItems.reduce((acc, item) => acc + item.bags, 0);
        let weightLeft = matchingItems.reduce((acc, item) => acc + item.weightKg, 0);
        bagsDeducted += bagsLeft;
        weightDeducted += weightLeft;
        for (let index = 0; index < updatedMarks.length && (bagsLeft > 0 || weightLeft > 0); index += 1) {
          if (updatedMarks[index].markCode.toUpperCase() !== code) continue;
          const takeBags = Math.min(updatedMarks[index].remainingBags, bagsLeft);
          const takeWeight = Math.min(updatedMarks[index].remainingWeightKg, weightLeft);
          bagsLeft -= takeBags;
          weightLeft -= takeWeight;
          updatedMarks[index] = {
            ...updatedMarks[index],
            remainingBags: updatedMarks[index].remainingBags - takeBags,
            remainingWeightKg: Math.max(0, updatedMarks[index].remainingWeightKg - takeWeight),
          };
        }
      }
      const newRemainingBags = Math.max(0, lot.remainingBags - bagsDeducted);
      return {
        ...lot,
        remainingBags: newRemainingBags,
        remainingWeightKg: Math.max(0, lot.remainingWeightKg - weightDeducted),
        status: newRemainingBags === 0 ? 'EXHAUSTED' : lot.status,
        marks: updatedMarks,
      };
    });

    const movements: StockMovement[] = data.items.map((item) => ({
      id: 'sm-' + Math.random().toString(36).substr(2, 9),
      date: data.date,
      type: 'SALE_OUT',
      referenceId: saleId,
      referenceType: 'SALE',
      lotNumber: item.lotNumber,
      markCode: item.markCode,
      bags: item.bags,
      weightKg: item.weightKg,
      balanceBagsAfter: 0,
      balanceWeightKgAfter: 0,
      reason: `Dispatched for bill ${billNumber} to ${data.customerName}`,
      performedBy: getActor().name,
    }));
    this.state.stockMovements = [...movements, ...this.state.stockMovements];

    const tenders = (data.tenders ?? []).filter((tender) => roundMoney(tender.amount) > 0);
    if (data.tenders) {
      sale.paidAmount = roundMoney(tenders.reduce((sum, tender) => sum + tender.amount, 0));
      sale.balanceDue = roundMoney(data.totalAmount - sale.paidAmount);
      sale.tenders = tenders;
    }
    this.state.customers = this.state.customers.map((customer) => {
      if (customer.id !== data.customerId) return customer;
      let outstanding = roundMoney(customer.outstandingAmount + data.totalAmount);
      const saleLedger: CustomerLedgerEntry = {
        id: 'led-' + Date.now() + Math.random().toString(36).substr(2, 4),
        date: data.date,
        customerId: customer.id,
        type: 'SALE',
        referenceNo: billNumber,
        description: `Onion Sale: ${data.totalBags} bags (${data.totalWeightKg} KG)`,
        debit: roundMoney(data.totalAmount),
        credit: 0,
        balance: outstanding,
      };
      const paymentLedgers: CustomerLedgerEntry[] = [];
      const receiptStart = this.state.payments.length;
      tenders.forEach((tender, index) => {
        const amount = roundMoney(tender.amount);
        const previousOutstanding = outstanding;
        outstanding = roundMoney(outstanding - amount);
        const receiptNumber = `VPN-REC-${500 + receiptStart + index + 1}`;
        const draft: Payment = {
          id: `pay-${Date.now()}-${index}`,
          receiptNumber,
          customerId: customer.id,
          customerName: customer.name,
          date: data.date,
          time: data.time,
          amount,
          paymentMethod: tender.method,
          referenceNumber: billNumber,
          previousOutstanding,
          newOutstanding: outstanding,
          notes: `Collected against ${billNumber}`,
          recordedBy: getActor().name,
          createdAt: new Date().toISOString(),
        };
        const payment: Payment = {
          ...draft,
          allocation: allocatePayment(draft, this.state.payments, this.state.sales),
        };
        this.state.payments = [payment, ...this.state.payments];
        paymentLedgers.push({
          id: `led-${Date.now()}-${index}`,
          date: data.date,
          customerId: customer.id,
          type: 'PAYMENT',
          referenceNo: receiptNumber,
          description: `Payment received via ${tender.method} against ${billNumber}`,
          debit: 0,
          credit: amount,
          balance: outstanding,
        });
      });
      this.state.ledgerEntries = [...this.state.ledgerEntries, saleLedger, ...paymentLedgers];
      return { ...customer, outstandingAmount: outstanding };
    });

    this.logAudit(
      'CREATE_SALE',
      'SALE',
      saleId,
      `Sale ${billNumber} created for ${data.customerName}: ₹${data.totalAmount.toLocaleString('en-IN')}`
    );
    this.persist();
    return sale;
  }

  recordPayment(data: RecordPaymentInput): Payment {
    const cust = this.state.customers.find((c) => c.id === data.customerId);
    const prevOutstanding = cust ? cust.outstandingAmount : 0;
    const newOutstanding = outstandingAfterPayment(prevOutstanding, data.amount);
    const receiptNumber = `VPN-REC-${500 + this.state.payments.length + 1}`;
    const now = new Date();
    const draft: Payment = {
      id: 'pay-' + Date.now(),
      receiptNumber,
      customerId: data.customerId,
      customerName: cust ? cust.name : 'Unknown Customer',
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      allocation: data.allocation,
      previousOutstanding: prevOutstanding,
      newOutstanding,
      notes: data.notes,
      recordedBy: getActor().name,
      createdAt: now.toISOString(),
    };
    const payment: Payment = {
      ...draft,
      allocation: allocatePayment(draft, this.state.payments, this.state.sales),
    };
    this.state.payments = [payment, ...this.state.payments];
    this.state.customers = this.state.customers.map((c) =>
      c.id === data.customerId ? { ...c, outstandingAmount: newOutstanding } : c
    );
    const ledgerEntry: CustomerLedgerEntry = {
      id: 'led-' + Date.now(),
      date: payment.date,
      customerId: data.customerId,
      type: 'PAYMENT',
      referenceNo: receiptNumber,
      description: `Payment received via ${data.paymentMethod}${data.referenceNumber ? ` (${data.referenceNumber})` : ''}`,
      debit: 0,
      credit: data.amount,
      balance: newOutstanding,
    };
    this.state.ledgerEntries = [...this.state.ledgerEntries, ledgerEntry];
    this.logAudit(
      'RECORD_PAYMENT',
      'PAYMENT',
      payment.id,
      `Payment ${receiptNumber} of ₹${data.amount.toLocaleString('en-IN')} from ${payment.customerName}`
    );
    this.persist();
    return payment;
  }

  addExpenseCategory(data: NewExpenseCategoryInput): ExpenseCategory {
    const name = data.name.trim();
    if (!name) throw new Error('Enter a category name');
    const existing = this.state.expenseCategories.find((category) => category.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const created: ExpenseCategory = {
      id: 'exp-' + Date.now(),
      name,
      trackingCategory: data.trackingCategory,
    };
    this.state.expenseCategories = [...this.state.expenseCategories, created];
    this.persist();
    return created;
  }

  recordExpense(data: RecordExpenseInput): Expense {
    const message = validateExpense(data);
    if (message) throw new Error(message);
    const category = this.state.expenseCategories.find((item) => item.id === data.categoryId);
    if (!category) throw new Error('Choose an expense category');
    const account = this.state.cashAccounts.find((item) => item.id === data.accountId);
    if (!account) throw new Error('Choose the account the expense was paid from');
    const vendor = isVendorPaymentCategory(category) ? this.getVendor(data.vendorId ?? '') ?? undefined : undefined;
    if (isVendorPaymentCategory(category)) {
      if (!vendor) throw new Error('Choose the vendor this payment is for');
      // Paying more than is owed is an advance with the vendor; what is owed is derived (vendorWithMoney).
    }
    const expense: Expense = {
      id: 'ex-' + Date.now(),
      categoryId: category.id,
      categoryName: category.name,
      trackingCategory: data.trackingCategory === undefined ? category.trackingCategory : data.trackingCategory,
      amount: roundMoney(data.amount),
      date: data.date,
      paymentMethod: data.paymentMethod,
      accountId: account.id,
      accountName: account.name,
      reference: data.reference?.trim() || undefined,
      ...(vendor && { vendorId: vendor.id, vendorName: vendor.name }),
      recordedBy: getActor().name,
      createdAt: new Date().toISOString(),
    };
    this.state.expenses = [expense, ...this.state.expenses];
    this.logAudit(
      'RECORD_EXPENSE',
      'EXPENSE',
      expense.id,
      `Expense ${category.name} of ₹${expense.amount.toLocaleString('en-IN')} paid from ${account.name}`
    );
    this.persist();
    return expense;
  }

  noteSaleCorrection(saleId: string, note: string) {
    const targetSale = this.state.sales.find((s) => s.id === saleId);
    if (!targetSale) return;
    const trimmed = note.trim();
    if (!trimmed) return;
    this.logAudit(
      'SALE_CORRECTION_NOTED',
      'SALE',
      saleId,
      `Correction noted for ${targetSale.billNumber}: ${trimmed}`,
    );
    this.persist();
  }

  requestSaleEdit(saleId: string, requestedData: any, reason: string) {
    const targetSale = this.state.sales.find((s) => s.id === saleId);
    if (!targetSale) return;
    const actor = getActor();
    const approval: ApprovalRequest = {
      id: 'app-' + Date.now(),
      entityType: 'SALE',
      entityId: saleId,
      referenceNo: targetSale.billNumber,
      requestedBy: actor.name,
      requestedByRole: actor.role,
      requestedAt: new Date().toISOString(),
      reason,
      status: 'PENDING',
      originalData: {
        totalWeightKg: targetSale.totalWeightKg,
        totalAmount: targetSale.totalAmount,
        items: targetSale.items,
      },
      requestedData,
    };
    this.state.approvals = [approval, ...this.state.approvals];
    this.logAudit('EDIT_REQUESTED', 'SALE', saleId, `Edit requested for ${targetSale.billNumber}: ${reason}`);
    this.persist();
  }

  processApproval(approvalId: string, action: 'APPROVE' | 'REJECT', notes?: string) {
    const app = this.state.approvals.find((a) => a.id === approvalId);
    if (!app) return;
    const actor = getActor();

    if (action === 'APPROVE') {
      if (app.entityType === 'SALE') {
        const sale = this.state.sales.find((s) => s.id === app.entityId);
        if (sale && app.requestedData) {
          const updatedSale: Sale = {
            ...sale,
            totalWeightKg: app.requestedData.totalWeightKg ?? sale.totalWeightKg,
            totalAmount: app.requestedData.totalAmount ?? sale.totalAmount,
            balanceDue: app.requestedData.balanceDue ?? (app.requestedData.totalAmount ?? sale.totalAmount),
            notes: (sale.notes ? sale.notes + ' | ' : '') + `Approved amendment: ${app.reason}`,
          };
          this.state.sales = this.state.sales.map((s) => (s.id === sale.id ? updatedSale : s));
          const diff = (app.requestedData.totalAmount ?? sale.totalAmount) - sale.totalAmount;
          if (diff !== 0 && (sale.paymentType === 'CREDIT' || sale.paymentType === 'PARTIAL' || sale.balanceDue > 0)) {
            this.state.customers = this.state.customers.map((c) => {
              if (c.id !== sale.customerId) return c;
              const newBal = c.outstandingAmount + diff;
              const ledgerAdj: CustomerLedgerEntry = {
                id: 'led-' + Date.now(),
                date: new Date().toISOString().split('T')[0],
                customerId: c.id,
                type: 'SALE',
                referenceNo: sale.billNumber + '-ADJ',
                description: `Approved amendment adjustment: ${app.reason}`,
                debit: diff > 0 ? diff : 0,
                credit: diff < 0 ? Math.abs(diff) : 0,
                balance: newBal,
              };
              this.state.ledgerEntries = [...this.state.ledgerEntries, ledgerAdj];
              return { ...c, outstandingAmount: newBal };
            });
          }
        }
      }
      this.state.approvals = this.state.approvals.map((a) =>
        a.id === approvalId
          ? {
              ...a,
              status: 'APPROVED',
              reviewedBy: actor.name,
              reviewedAt: new Date().toISOString(),
              reviewNotes: notes,
            }
          : a
      );
      this.logAudit('APPROVAL_ACCEPTED', app.entityType, app.entityId, `Approved change for ${app.referenceNo}`, actor.name);
    } else {
      this.state.approvals = this.state.approvals.map((a) =>
        a.id === approvalId
          ? {
              ...a,
              status: 'REJECTED',
              reviewedBy: actor.name,
              reviewedAt: new Date().toISOString(),
              reviewNotes: notes || 'Rejected by management',
            }
          : a
      );
      this.logAudit(
        'APPROVAL_REJECTED',
        app.entityType,
        app.entityId,
        `Rejected change for ${app.referenceNo}: ${notes || 'No reason provided'}`,
        actor.name
      );
    }
    this.persist();
  }

  createStockAdjustment(data: Omit<StockAdjustment, 'id' | 'status' | 'createdAt'>) {
    const actor = getActor();
    const adj: StockAdjustment = {
      ...data,
      id: 'adj-' + Date.now(),
      status: 'APPROVED',
      approvedBy: actor.name,
      createdAt: new Date().toISOString(),
    };
    this.state.stockAdjustments = [adj, ...this.state.stockAdjustments];
    const sign = data.type === 'ADD' ? 1 : -1;
    this.state.lots = this.state.lots.map((l) => {
      if (l.lotNumber.toUpperCase() !== data.lotNumber.toUpperCase()) return l;
      const marks = l.marks.map((m) => {
        if (m.markCode.toUpperCase() !== data.markCode.toUpperCase()) return m;
        return {
          ...m,
          remainingBags: Math.max(0, m.remainingBags + data.bags * sign),
          remainingWeightKg: Math.max(0, m.remainingWeightKg + data.weightKg * sign),
        };
      });
      return {
        ...l,
        remainingBags: Math.max(0, l.remainingBags + data.bags * sign),
        remainingWeightKg: Math.max(0, l.remainingWeightKg + data.weightKg * sign),
        marks,
      };
    });
    const movement: StockMovement = {
      id: 'sm-' + Date.now(),
      date: data.date,
      type: data.type === 'ADD' ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_SUB',
      referenceId: adj.id,
      referenceType: 'ADJUSTMENT',
      lotNumber: data.lotNumber,
      markCode: data.markCode,
      bags: data.bags,
      weightKg: data.weightKg,
      balanceBagsAfter: 0,
      balanceWeightKgAfter: 0,
      reason: data.reason,
      performedBy: actor.name,
    };
    this.state.stockMovements = [movement, ...this.state.stockMovements];
    this.logAudit(
      'STOCK_ADJUSTMENT',
      'STOCK',
      adj.id,
      `Stock ${data.type}: ${data.bags} bags (${data.weightKg} KG) on ${data.lotNumber} [${data.markCode}]`
    );
    this.persist();
    return adj;
  }

  addOpeningStock(lotNumber: string, markCode: string, bags: number, weightKg: number) {
    return this.createStockAdjustment({
      date: new Date().toISOString().split('T')[0],
      lotNumber,
      markCode,
      type: 'ADD',
      bags,
      weightKg,
      reason: 'Physical opening stock reconciliation',
    });
  }

  switchRoleAudit(role: string) {
    const actor = getActor();
    this.logAudit('ROLE_SWITCH', 'USER', actor.id, `User active persona switched to ${role}`);
    this.persist();
  }

  resetToDefault() {
    if (typeof window !== 'undefined') localStorage.clear();
    this.revisions = [];
    this.state = {
      users: SEED_USERS,
      company: SEED_COMPANY,
      customers: SEED_CUSTOMERS,
      vendors: SEED_VENDORS,
      marks: SEED_MARKS,
      lots: SEED_LOTS,
      purchases: SEED_PURCHASES,
      saleCharges: DEFAULT_SALE_CHARGE_SETTINGS,
      costingSettings: SEED_COSTING_SETTINGS,
      products: SEED_PRODUCTS,
      costingExpenseTypes: SEED_COSTING_EXPENSE_TYPES,
      sellingMarginComponents: SEED_SELLING_MARGIN_COMPONENTS,
      sales: SEED_SALES,
      payments: SEED_PAYMENTS,
      expenses: SEED_EXPENSES,
      cashAccounts: SEED_CASH_ACCOUNTS,
      expenseCategories: SEED_EXPENSE_CATEGORIES,
      stockMovements: SEED_STOCK_MOVEMENTS,
      stockAdjustments: [],
      approvals: SEED_APPROVALS,
      auditLogs: SEED_AUDIT_LOGS,
      ledgerEntries: SEED_LEDGER_ENTRIES,
    };
    this.persist();
  }
}

export const mockRepository = new MockRepository();
