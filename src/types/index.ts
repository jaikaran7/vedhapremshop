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

export type CustomerKind = 'WHOLESALE' | 'REGULAR';

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
  /** Money paid in advance (more than was owed); used automatically on the next bills. */
  advanceAmount?: number;
  /** Walk-in buyers are regular. Missing kind on older records means wholesale. */
  kind?: CustomerKind;
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
  /** Sum of vendor bills entered in the system. Not sent to a salesperson. */
  totalPurchases: number;
  /** Still owed: previousDue + newDue. Not sent to a salesperson. */
  payableAmount: number;
  /** Owed before the system was used (Owner sets it). */
  openingBalance?: number;
  /** Old dues still unpaid. Payments clear these first. */
  previousDue?: number;
  /** Unpaid part of the bills entered in the system. */
  newDue?: number;
  /** Paid beyond everything owed; the next bill uses it automatically. */
  advanceAmount?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface VendorLedgerBill {
  id: string;
  billNumber: string;
  date: string;
  lotNumber: string;
  receiptStatus: 'PENDING_RECEIPT' | 'RECEIVED';
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
}

export interface VendorLedgerPayment {
  id: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  accountName: string;
  reference?: string;
  receiptNumber?: string;
  nextPaymentDate?: string;
  recordedBy: string;
  createdAt: string;
}

/** Account statement for one vendor: previous due, each bill and how much of it is paid, every payment, any advance. */
export interface VendorLedger {
  vendor: Vendor;
  totalPurchases: number;
  openingBalance: number;
  previousDue: number;
  newDue: number;
  advanceAmount: number;
  payableAmount: number;
  bills: VendorLedgerBill[];
  payments: VendorLedgerPayment[];
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
  /** Applied selling rate saved when this mark was received. Settings changes must not replace it. */
  finalizedSellingRate?: number;
  calculatedSellingRate?: number;
  sellingRateOverride?: number | null;
  sellingRateOverrideReason?: string;
}

export interface Lot {
  id: string;
  lotNumber: string; // e.g. 'LOT AP', 'LOT CV', 'LOT TC'
  /** Set when the consignment is not the default onion stock. */
  productId?: string;
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
  /** Legacy bills keep FREIGHT, HAMALI, or MANDI_TAX. New bills also store the settings master. */
  type: 'FREIGHT' | 'HAMALI' | 'MANDI_TAX' | 'COMMISSION' | 'OTHER';
  expenseTypeId?: string;
  expenseTypeName?: string;
  amount: number;
  description: string;
  remarks?: string;
}

export type PurchaseReceiptStatus = 'PENDING_RECEIPT' | 'RECEIVED';

export type ReceivingAllocationChoice =
  | { method: 'BY_RECEIVED_KG' }
  | { method: 'BY_RECEIVED_BAGS' }
  | { method: 'ASSIGN_TO_GROUP'; groupId: string };

/** How a receiving-expense amount is entered. A fixed total is not a rate, and a rate is not a pool. */
export type ReceivingAmountBasis = 'FIXED_TOTAL' | 'PER_BAG' | 'PER_KG';

export interface ReceivingExpenseEntry {
  id: string;
  expenseTypeId: string;
  expenseTypeName: string;
  description: string;
  amount: number;
  /** Missing on drafts saved before per-unit rates. Those amounts are fixed totals. */
  amountBasis?: ReceivingAmountBasis;
  remarks: string;
  allocation: ReceivingAllocationChoice;
}

export interface ReceivingBagWeight {
  bagNumber: number;
  weightKg: number;
}

export interface ReceivingGroup {
  id: string;
  markCode: string;
  fromVendorBill: boolean;
  expectedBags: number;
  expectedWeightKg: number;
  receivedBags: number;
  acceptedBags: number;
  defectiveBags: number;
  receivedWeightKg: number;
  acceptedWeightKg: number | null;
  originalPurchaseRate: number;
  preliminarySellingRate: number | null;
  allocatedReceivingCostPerKg: number | null;
  landedCostPerKg: number | null;
  calculatedFinalRate: number | null;
  /** Commission added for this mark: its override, else the lot override, else the settings default. */
  appliedMarginPerKg?: number | null;
  revisedSellingRate: number | null;
  overrideReason: string;
  remarks: string;
  bagWeights: ReceivingBagWeight[];
  calculationWarning: string | null;
  rateSnapshot?: RateSettingSnapshot;
}

export interface ReceivingIssue {
  blocking: boolean;
  message: string;
}

export interface LotReceivingRecord {
  receivedAt: string;
  stockPosted: boolean;
  expenses: ReceivingExpenseEntry[];
  groups: ReceivingGroup[];
  issues: ReceivingIssue[];
}

export interface PurchaseRevisionChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

/** One correction to a vendor bill: who, why, and each field as previous → current. */
export interface PurchaseRevision {
  id: string;
  /** Set by the mock repository to find a bill's revisions; the API serves them under /purchases/:id/revisions. */
  purchaseId?: string;
  revisionNo: number;
  editedBy: string;
  editedByRole: UserRole;
  reason: string;
  changes: PurchaseRevisionChange[];
  createdAt: string;
}

export interface Purchase {
  id: string;
  billNumber: string;
  vendorId: string;
  vendorName: string;
  /** Product this consignment belongs to. Older bills without it are onion stock. */
  productId?: string;
  productName?: string;
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
  /** Missing on older bills, which were already in stock when receiving was added. */
  receiptStatus?: PurchaseReceiptStatus;
  /** Saved receiving inputs for a lot that has not been posted yet. */
  receivingDraft?: {
    expenses: ReceivingExpenseEntry[];
    groups: Array<{
      id: string;
      markCode: string;
      fromVendorBill?: boolean;
      expectedBags?: number;
      expectedWeightKg?: number;
      receivedBags: number;
      acceptedBags: number;
      defectiveBags: number;
      receivedWeightKg: number;
      originalPurchaseRate?: number;
      revisedSellingRate?: number | null;
      marginPerKg?: number | null;
      overrideReason?: string;
      remarks?: string;
      bagWeights?: ReceivingBagWeight[];
    }>;
    lotMarginPerKg?: number | null;
  };
  /** How many times the bill has been corrected. */
  revisionCount?: number;
  expectedArrivalDate?: string;
  /** Frozen when a selling rate is finalized. Later setting changes must not replace it. */
  rateSnapshot?: RateSettingSnapshot;
  receiving?: LotReceivingRecord;
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
  /** Optional GST/tax: the % typed (if any) and the amount added to the total. Missing on older bills. */
  taxPercent?: number | null;
  taxAmount?: number;
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
  /** Product master snapshot. Older invoices were onion sales and may omit this. */
  productId?: string;
  productName?: string;
  /** Set when this bill replaced another (edit = cancel and rebill). */
  replacesBillNumber?: string;
  replacedBySaleId?: string;
  replacedByBillNumber?: string;
  cancelReason?: string;
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
  /** RECEIPT, or REFUND (negative amount) when counter money is handed back. */
  kind?: 'RECEIPT' | 'REFUND';
  /** Part of the receipt not used yet: the customer's advance. */
  unallocatedAmount?: number;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface CashAccount {
  id: string;
  name: string;
  kind: 'CASH' | 'BANK' | 'UPI';
  /** Owner only: real money in the account at the start of `openingDate`. */
  openingBalance: number;
  openingDate?: string;
}

export interface CashBookAccount {
  id: string;
  name: string;
  kind: CashAccount['kind'];
  openingDate: string;
  beforeOpening: boolean;
  openingBalance: number;
  received: number;
  paidOut: number;
  closingBalance: number;
}

export interface CashBookEntry {
  id: string;
  type: 'Collection' | 'Expense' | 'Vendor payment';
  time: string;
  party: string;
  method: PaymentMethod;
  reference: string;
  /** Money in is positive, money out is negative. */
  amount: number;
  createdAt: string;
}

/** One day for every account: opening + received − paid out = closing, and the closing balance is the next day's opening. */
export interface CashBook {
  date: string;
  accounts: CashBookAccount[];
  totals: { openingBalance: number; received: number; paidOut: number; closingBalance: number };
  entries: CashBookEntry[];
}

/** What was collected on one day. Everyone can see this; balances are the Owner's alone. */
export interface DailyCollections {
  date: string;
  collected: number;
  byMethod: { method: PaymentMethod; amount: number; receipts: number }[];
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
  /** Set on a Purchase Payments expense: the vendor that was paid. It reduces what is owed to them. */
  vendorId?: string;
  vendorName?: string;
  nextPaymentDate?: string;
  receiptNumber?: string;
  remainingDue?: number;
  previousDue?: number;
  recordedBy: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  date: string;
  type: 'PURCHASE_IN' | 'SALE_OUT' | 'ADJUSTMENT_ADD' | 'ADJUSTMENT_SUB' | 'OPENING_STOCK' | 'SALE_REVERSAL';
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
  /** What the Owner is asked to approve (API only). */
  requestType?: 'BACKDATED_SALE' | 'SALE_CANCEL' | 'SALE_REBILL';
  requestLabel?: string;
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
  type: 'SALE' | 'PAYMENT' | 'OPENING' | 'ADJUSTMENT';
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
  inactivePurchaseDays: number;
  paymentAlertDays: number;
}

export type MasterStatus = 'ACTIVE' | 'INACTIVE';

export type CostingExpenseKind = 'PURCHASE' | 'STOCK_RECEIVING';

/** How an expense amount was entered. These bases are not interchangeable. */
export type ExpenseAmountBasis = 'FIXED_TOTAL' | 'PER_KG' | 'PERCENT';

/**
 * How a group of expenses may be turned into ₹/kg.
 * UNALLOCATED keeps the amounts as totals and does not change the rate.
 */
export type ExpenseAllocation =
  | { method: 'UNALLOCATED' }
  | { method: 'SPREAD_FIXED_TOTAL_PER_KG'; totalWeightKg: number }
  | { method: 'USE_ENTERED_PER_KG' };

/** Only PER_KG has a defined selling-rate formula in this phase. */
export type MarginCalculationType = 'PER_KG' | 'FIXED_AMOUNT' | 'PERCENT_OF_COST';

export type RateRoundingRule = 'CEIL_WHOLE_RUPEE';

export type VendorRateUnit = 'PER_KG';

export interface Product {
  id: string;
  code: string;
  name: string;
  status: MasterStatus;
}

export interface CostingExpenseType {
  id: string;
  name: string;
  kind: CostingExpenseKind;
  status: MasterStatus;
  /** Stock-receiving types say whether the entered amount is a total or a rate. */
  amountBasis?: ReceivingAmountBasis;
  defaultAllocation?: 'BY_RECEIVED_KG' | 'BY_RECEIVED_BAGS';
}

export interface SellingMarginComponent {
  id: string;
  name: string;
  calculationType: MarginCalculationType;
  /** Rupees per kg when calculationType is PER_KG. Not a fixed total or a percent. */
  perKg: number | null;
  status: MasterStatus;
}

export interface CostingSettings {
  defaultSellingMarginPerKg: number;
  roundingRule: RateRoundingRule;
}

export interface VendorRateRecord {
  /** Exactly what the vendor entered. Normalization must not replace this. */
  originalEnteredRate: number;
  originalUnit: VendorRateUnit;
  normalizedRatePerKg: number;
}

/** Expense line copied onto a transaction. Later master renames do not rewrite it. */
export interface CostExpenseLine {
  id: string;
  expenseTypeId: string;
  expenseTypeName: string;
  kind: CostingExpenseKind;
  basis: ExpenseAmountBasis;
  amount: number;
}

export interface AppliedPerKgMargin {
  id: string;
  name: string;
  perKg: number;
}

/** Rate decision stored on a finalized purchase. Settings edits must not replace it. */
export interface RateSettingSnapshot {
  defaultSellingMarginPerKg: number;
  roundingRule: RateRoundingRule;
  additionalMargins: Array<AppliedPerKgMargin & { calculationType: 'PER_KG' }>;
  originalVendorEnteredRate: number;
  originalVendorRateUnit: VendorRateUnit;
  normalizedVendorPurchaseRatePerKg: number;
  purchaseExpenses: CostExpenseLine[];
  stockReceivingExpenses: CostExpenseLine[];
  purchaseExpenseAllocation: ExpenseAllocation;
  receivingExpenseAllocation: ExpenseAllocation;
  allocatedPurchaseExpensePerKg: number;
  allocatedReceivingExpensePerKg: number;
  allocatedLandedCostPerKg: number;
  costBaselinePerKg: number;
  preliminarySellingRatePerKg: number;
  finalSellingRatePerKg: number;
  appliedMarginPerKg?: number;
}
