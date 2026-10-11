export type UserRole = 'OWNER' | 'MANAGER' | 'SALESPERSON';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  active: boolean;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  marketLocation: string;
  creditLimit: number;
  creditDays: number;
  outstandingAmount: number;
  status: 'ACTIVE' | 'BLOCKED' | 'PENDING';
  createdAt: string;
}

export interface Vendor {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  mandiCity: string;
  totalPurchases: number;
  payableAmount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Mark {
  id: string;
  code: string; // 'AA' | 'J' | 'K' | 'OK' | 'CV' | 'TC'
  name: string;
  description: string;
  defaultSellingRate: number;
  defaultPurchaseRate: number;
  qualityGrade: 'PREMIUM' | 'GRADE_1' | 'GRADE_2' | 'COMMERCIAL';
  colorTag?: string;
}

export interface LotMarkBreakdown {
  markCode: string;
  initialBags: number;
  initialWeightKg: number;
  remainingBags: number;
  remainingWeightKg: number;
  purchaseRate: number; // hidden from Salesperson
}

export interface Lot {
  id: string;
  lotNumber: string; // e.g. 'LOT AP', 'LOT CV', 'LOT TC'
  vendorId: string;
  vendorName: string;
  purchaseBillId: string;
  purchaseBillNo: string;
  arrivalDate: string;
  status: 'ACTIVE' | 'EXHAUSTED' | 'RESERVED';
  totalBags: number;
  totalWeightKg: number;
  remainingBags: number;
  remainingWeightKg: number;
  marks: LotMarkBreakdown[];
  notes?: string;
}

export interface PurchaseItem {
  id: string;
  markCode: string;
  bags: number;
  weightKg: number;
  ratePerKg: number; // canonical rate e.g. 47.00
  totalAmount: number;
}

export interface PurchaseExpense {
  id: string;
  type: 'FREIGHT' | 'HAMALI' | 'MANDI_TAX' | 'COMMISSION' | 'OTHER';
  amount: number;
  description: string;
}

export interface Purchase {
  id: string;
  billNumber: string;
  vendorId: string;
  vendorName: string;
  date: string;
  lotNumber: string;
  items: PurchaseItem[];
  expenses: PurchaseExpense[];
  grossAmount: number;
  totalExpenses: number;
  netAmount: number;
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'QR' | 'BANK_TRANSFER' | 'CARD' | 'OTHER' | 'CHEQUE';

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'CREDIT';

export type SalePaymentType = PaymentMethod | 'CREDIT' | 'PARTIAL' | 'SPLIT';

export interface SaleTender {
  method: PaymentMethod;
  amount: number;
}

export interface SaleItemBag {
  bagNumber: number;
  weightKg: number;
}

export interface SaleItem {
  id: string;
  markCode: string;
  lotNumber: string;
  bags: number;
  weightKg: number;
  ratePerKg: number; // canonical rate e.g. 69.00
  amount: number;
  bagWeights: SaleItemBag[];
}

/** Saved on each finalized invoice. Later setting changes must not rewrite it. */
export interface SaleChargeSnapshot {
  amaliPerBag: number;
  marketFeePerBag: number;
  amaliEnabled: boolean;
  marketFeeEnabled: boolean;
  bagCount: number;
  amaliAmount: number;
  marketFeeAmount: number;
  otherCharges: number;
  productSubtotal: number;
  totalAdditionalCharges: number;
  finalInvoiceAmount: number;
}

export interface SaleChargeSettings {
  amaliPerBag: number;
  marketFeePerBag: number;
  amaliEnabled: boolean;
  marketFeeEnabled: boolean;
}

export interface Sale {
  id: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  date: string;
  time: string;
  items: SaleItem[];
  totalBags: number;
  totalWeightKg: number;
  /** Product amount before Amali, market fee, and other charges. */
  productSubtotal?: number;
  /** Fee snapshot taken when the invoice was finalized. */
  charges?: SaleChargeSnapshot;
  /** Final invoice amount, including saved charges exactly once. */
  totalAmount: number;
  paymentType: SalePaymentType;
  paymentStatus?: PaymentStatus;
  tenders?: SaleTender[];
  creditDays?: number;
  dueDate?: string;
  paidAmount: number;
  balanceDue: number;
  status: 'CONFIRMED' | 'PENDING_APPROVAL' | 'CANCELLED';
  createdByUserId: string;
  createdByName: string;
  createdByRole: UserRole;
  notes?: string;
  createdAt: string;
}

/** Parts of one receipt. They sum to the receipt amount and are not counted again as expenses. */
export interface CollectionAllocation {
  onionSales: number;
  amali: number;
  otherProduct: number;
  marketFee: number;
  other: number;
}

export type CollectionCategoryId = 'ONION_SALES' | 'AMALI' | 'OTHER_PRODUCT' | 'MARKET_FEE' | 'OTHER';

export interface Payment {
  id: string;
  receiptNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  time: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  /** Saved when the receipt is recorded. Later setting changes must not rewrite it. */
  allocation?: CollectionAllocation;
  previousOutstanding: number;
  newOutstanding: number;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface CashAccount {
  id: string;
  name: string;
  kind: 'CASH' | 'BANK' | 'UPI';
  openingBalance: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  trackingCategory: CollectionCategoryId | null;
}

export interface Expense {
  id: string;
  categoryId: string;
  categoryName: string;
  trackingCategory: CollectionCategoryId | null;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  accountId: string;
  accountName: string;
  reference?: string;
  recordedBy: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  date: string;
  type: 'PURCHASE_IN' | 'SALE_OUT' | 'ADJUSTMENT_ADD' | 'ADJUSTMENT_SUB' | 'OPENING_STOCK';
  referenceId: string;
  referenceType: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'OPENING';
  lotNumber: string;
  markCode: string;
  bags: number;
  weightKg: number;
  balanceBagsAfter: number;
  balanceWeightKgAfter: number;
  reason?: string;
  performedBy: string;
}

export interface StockAdjustment {
  id: string;
  date: string;
  lotNumber: string;
  markCode: string;
  type: 'ADD' | 'REDUCE';
  bags: number;
  weightKg: number;
  reason: string;
  approvedBy?: string;
  status: 'APPROVED' | 'PENDING';
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  entityType: 'SALE' | 'STOCK_ADJUSTMENT' | 'CUSTOMER_CREDIT';
  entityId: string;
  referenceNo: string;
  requestedBy: string;
  requestedByRole: UserRole;
  requestedAt: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  originalData: any;
  requestedData: any;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  approver?: string;
}

export interface CustomerLedgerEntry {
  id: string;
  date: string;
  customerId: string;
  type: 'SALE' | 'PAYMENT' | 'OPENING';
  referenceNo: string;
  description: string;
  debit: number;   // increased outstanding (Sale)
  credit: number;  // decreased outstanding (Payment)
  balance: number; // running outstanding
}

export interface CompanySettings {
  shopName: string;
  mandiLicenseNo: string;
  gstNo: string;
  address: string;
  phone: string;
  altPhone: string;
  email: string;
  termsAndConditions: string;
  invoicePrefix: string;
  receiptPrefix: string;
}
