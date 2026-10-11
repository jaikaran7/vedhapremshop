import { STORAGE_KEYS } from '@/constants/storage';
import { getActor } from '@/store/session/actor';
import type {
  ApprovalRequest,
  AuditLog,
  CashAccount,
  CollectionAllocation,
  CollectionCategoryId,
  CompanySettings,
  Customer,
  SaleChargeSettings,
  CustomerLedgerEntry,
  Expense,
  ExpenseCategory,
  Lot,
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
import { roundMoney } from '@/utils/settlement';
import { calculateSaleCharges, countSaleBags, DEFAULT_SALE_CHARGE_SETTINGS } from '@/utils/sale-charges';
import { allocatePayment, validateExpense } from '@/utils/collection-ledger';
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
}

export interface NewExpenseCategoryInput {
  name: string;
  trackingCategory: CollectionCategoryId | null;
}

interface MandiSnapshot {
  users: User[];
  company: CompanySettings;
  saleCharges: SaleChargeSettings;
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

class MockRepository {
  private state: MandiSnapshot;

  constructor() {
    this.state = {
      users: SEED_USERS,
      company: readStored(STORAGE_KEYS.currentUser + '_unused', SEED_COMPANY),
      saleCharges: readStored(STORAGE_KEYS.saleCharges, DEFAULT_SALE_CHARGE_SETTINGS),
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
    writeStored(STORAGE_KEYS.auditLogs, this.state.auditLogs);
    writeStored(STORAGE_KEYS.ledger, this.state.ledgerEntries);
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
  listCustomers() { return this.state.customers; }
  getCustomer(id: string) { return this.state.customers.find((c) => c.id === id) ?? null; }
  listVendors() { return this.state.vendors; }
  getVendor(id: string) { return this.state.vendors.find((v) => v.id === id) ?? null; }
  listMarks() { return this.state.marks; }
  listLots() { return this.state.lots; }
  getLot(id: string) { return this.state.lots.find((l) => l.id === id) ?? null; }
  listPurchases() { return this.state.purchases; }
  getPurchase(id: string) { return this.state.purchases.find((p) => p.id === id) ?? null; }
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

  createPurchase(data: Omit<Purchase, 'id' | 'createdAt'>): Purchase {
    const purchaseId = 'pur-' + Date.now();
    const purchase: Purchase = { ...data, id: purchaseId, createdAt: new Date().toISOString() };
    this.state.purchases = [purchase, ...this.state.purchases];

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

  createSale(data: Omit<Sale, 'id' | 'billNumber' | 'createdAt'>): Sale {
    const saleId = 'sale-' + Date.now();
    const billNumber = `VPN-INV-${1080 + this.state.sales.length + 1}`;
    const sale: Sale = { ...data, id: saleId, billNumber, createdAt: new Date().toISOString() };
    this.state.sales = [sale, ...this.state.sales];

    this.state.lots = this.state.lots.map((lot) => {
      let lotModified = false;
      let bagsDeducted = 0;
      let weightDeducted = 0;
      const updatedMarks = lot.marks.map((m) => {
        const matchingItems = data.items.filter(
          (item) =>
            item.lotNumber.toUpperCase() === lot.lotNumber.toUpperCase() &&
            item.markCode.toUpperCase() === m.markCode.toUpperCase()
        );
        if (matchingItems.length === 0) return m;
        lotModified = true;
        const itemsBags = matchingItems.reduce((acc, i) => acc + i.bags, 0);
        const itemsWeight = matchingItems.reduce((acc, i) => acc + i.weightKg, 0);
        bagsDeducted += itemsBags;
        weightDeducted += itemsWeight;
        return {
          ...m,
          remainingBags: Math.max(0, m.remainingBags - itemsBags),
          remainingWeightKg: Math.max(0, m.remainingWeightKg - itemsWeight),
        };
      });
      if (!lotModified) return lot;
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
    this.state = {
      users: SEED_USERS,
      company: SEED_COMPANY,
      customers: SEED_CUSTOMERS,
      vendors: SEED_VENDORS,
      marks: SEED_MARKS,
      lots: SEED_LOTS,
      purchases: SEED_PURCHASES,
      saleCharges: DEFAULT_SALE_CHARGE_SETTINGS,
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
