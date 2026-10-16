# VENDORS & CUSTOMERS: Terminology Simplification Plan
**Date:** October 16, 2026  
**Owner Request:** Simplify confusing accounting/trading jargon to just two concepts:
- **VENDORS** = People/farmers/suppliers I BUY stock from  
- **CUSTOMERS** = People I SELL stock to

**Status:** PLAN ONLY - NO CODE CHANGES YET

---

## 1. TERMINOLOGY INVENTORY

### 1.1 Current Terms Found (Before Simplification)

| Confusing Term | Where It Appears | Should Become | Notes |
|----------------|------------------|---------------|-------|
| **Wholesale Customers** | Customer list page title | **Customers** | Line 53 in CustomerList.tsx |
| **Merchant parties** | Customer list subtitle | **customers** or remove | Line 56 in CustomerList.tsx |
| **Wholesale customer** | Customer form radio button | **Business customer** | Line 139 in CustomerFormModal.tsx (vs "Walk-in customer") |
| **Trading Party / Firm Name** | Customer form field label | **Customer Name / Business Name** | Line 149 in CustomerFormModal.tsx |
| **Party Ledger (Khata)** | Customer detail tab | **Customer Statement** or **Customer Account** | Line 164 in CustomerDetails.tsx |
| **Party** (generic) | Search boxes, payment forms | **Customer** | Multiple files |
| **Wholesale Mandi Account** | Customer details subtitle | **Mandi Customer** | Line 80 in CustomerDetails.tsx |
| **Wholesale parties** | Dashboard KPI hint | **customers** | Line 140 in OwnerDashboard.tsx |
| **Ledger** (standalone) | Multiple places | **Statement** or **Account History** | See 1.2 below |
| **Merchant accounts** | Outstanding page subtitle | **customer accounts** | Line 33 in CustomerOutstandingList.tsx |
| **Supplier** | Not found in UI (may be in comments) | **Vendor** (already correct) | N/A |
| **Farmer** | Not found in UI | **Vendor** | N/A |
| **Consignor** | Not found in UI | **Vendor** | N/A |
| **Wholesale rates** | Settings, purchase forms | **Trade rates** or just **Rates** | Multiple files |
| **APMC wholesale...** | Invoice header, login subtitle | **APMC Mandi...** or remove "wholesale" | DigitalBill.tsx, Login.tsx |

### 1.2 "Ledger" Term Analysis

**Problem:** "Ledger" is accounting jargon. Owner wants simpler terms.

| Current Usage | File | Proposed Replacement |
|--------------|------|---------------------|
| "Customer Outstanding Ledger Balances" (page title) | CustomerOutstandingList.tsx line 30 | "Customer Balances" |
| "Customers & Ledger" (nav menu) | Sidebar.tsx line 50 | "Customers" |
| "Party Ledger (Khata)" (customer detail tab) | CustomerDetails.tsx line 164 | "Account Statement" |
| "Account Statement & Running Ledger" (section header) | CustomerDetails.tsx line 199 | "Transaction History" |
| "Standard APMC double-entry debit/credit ledger" (description) | CustomerDetails.tsx line 200 | "Sales, payments, and balance" |
| "Print Ledger" (button) | CustomerDetails.tsx line 189 | "Print Statement" |
| "View Customer Ledgers" (settings permission) | SettingsHub.tsx line 515 | "View Customer Statements" |
| "dynamic ledgers" (sidebar tagline) | Sidebar.tsx line 133 | "live balances" or remove |
| "credit ledgers" (app description metadata) | layout.page.tsx line 23 | "credit tracking" |
| CustomerLedgerEntry (data type) | types/index.ts | Keep (DB/code name) |
| useLedgerQuery (hook name) | use-customers-query.ts | Keep (code name) |

**Decision:** Replace "Ledger" in ALL user-facing text, but KEEP internal code/type names (CustomerLedgerEntry, useLedgerQuery) to avoid breaking changes.

### 1.3 Navigation Menu (Before → After)

| Current (Sidebar.tsx) | Proposed New Label |
|----------------------|-------------------|
| Owner Dashboard | ✅ Keep (clear) |
| New Sale | ✅ Keep (clear) |
| Sales & Weighment | **Sales & Invoices** |
| **Customers & Ledger** | **Customers** |
| **Payments & Collections** | **Payments** (or "Customer Payments") |
| Purchases | ✅ Keep (clear) |
| Lot Breakdown | **Lot Details** or **Stock Lots** |
| Stock & Movements | ✅ Keep (clear) |
| **Vendors & Payables** | **Vendors** |
| Approvals | ✅ Keep (clear) |
| Reports & Analytics | **Reports** (shorter) |
| Audit Timeline | ✅ Keep (clear) |
| Settings & Masters | **Settings** |

### 1.4 Page Titles (Before → After)

| Page | Current Title | Proposed Title |
|------|--------------|----------------|
| /customers | "Wholesale Customers" | "Customers" |
| /customers/[id] | (Customer name with "Wholesale Mandi Account") | (Customer name only, or add "Customer" badge) |
| /customers/[id]/ledger | "Party Ledger (Khata)" tab | "Account Statement" tab |
| /payments | "Payments & Collections" | "Customer Payments" |
| /payments/outstanding | "Customer Outstanding Ledger Balances" | "Customer Balances" |
| /payments/new | "Credit collection receipt • Dynamically updates ledger..." | "Record customer payment..." |
| /payments/receipt/[id] | "Party Particulars" section | "Customer Details" section |
| /sales/new | "Floor Weighment & Sale" → "Payment & Settlement" → "Confirm Wholesale Sale Bill" | Keep first two, change last to "Confirm Sale Invoice" |
| /vendors | "Vendors & Payables" implied | "Vendors" |
| /purchases | "Purchases" (already clear) | ✅ Keep |

### 1.5 Form Labels & Buttons

| Current Label | File | Proposed |
|--------------|------|----------|
| "Select Wholesale Customer / Party" | PaymentEntry.tsx line 92 | "Select Customer" |
| "Wholesale Selling Rate" | NewSaleWorkflow.tsx line 807 | "Selling Rate" or "Sale Rate" |
| "Trading Party / Firm Name" | CustomerFormModal.tsx line 149 | "Business Name" |
| "Standard APMC wholesale rates per kilogram" | SalespersonHome.tsx line 137 | "Current selling rates per KG" |
| "Set baseline wholesale selling rates..." | SettingsHub.tsx line 324 | "Set default selling rates..." |
| "Wholesale Shop Trade Name" | SettingsHub.tsx line 203 | "Shop Name" or "Business Name" |

### 1.6 Empty States & Helper Text

| Current Text | File | Proposed |
|-------------|------|----------|
| "Try clearing your search or add a new merchant party." | CustomerList.tsx line 121 | "Try clearing your search or add a new customer." |
| "Tap a regular party to launch new sale directly" | SalespersonHome.tsx line 98 | "Tap a customer to create a sale" |
| "Standard APMC double-entry debit/credit ledger" | CustomerDetails.tsx line 200 | "All sales, payments, and running balance" |
| "Wholesale buyers in the APMC yard operate on rolling settlements..." | CustomerDetails.tsx line 359 | Keep or simplify to "Follow up with customer after X days..." |
| "No ledger transactions recorded yet." | CustomerDetails.tsx line 226 | "No transactions recorded yet." |

### 1.7 Toasts & Notifications

| Current | Proposed |
|---------|----------|
| "Database refreshed to initial wholesale state" | "Database refreshed to demo state" |
| "Wholesale purchase rates, vendor costs, and margins are hidden..." | "Vendor purchase rates and costs are hidden..." |

### 1.8 Receipts & Invoices

| Document Section | Current | Proposed |
|-----------------|---------|----------|
| Invoice header | "APMC WHOLESALE MANDI TAX INVOICE" | "APMC MANDI TAX INVOICE" or "TAX INVOICE" |
| Invoice customer section | "Billed To (Buyer Party):" | "Billed To:" or "Customer:" |
| Receipt customer section | "Party Particulars" | "Customer Details" |

### 1.9 URLs / Routes

**All routes already use `/customers` and `/vendors` — NO CHANGES NEEDED!**

| Route | Status |
|-------|--------|
| `/customers` | ✅ Already correct |
| `/customers/[id]` | ✅ Already correct |
| `/customers/[id]/ledger` | ✅ Keep route, just change page content labels |
| `/vendors` | ✅ Already correct |
| `/vendors/[id]` | ✅ Already correct |
| `/payments/*` | ✅ Keep (payments can refer to customers without being confusing) |
| `/purchases/*` | ✅ Keep (purchases can refer to vendors without being confusing) |

### 1.10 Data Model / Database

**CURRENT STATE:**
```typescript
// types/index.ts
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
  kind?: CustomerKind; // 'WHOLESALE' | 'REGULAR'
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

export interface CustomerLedgerEntry {
  id: string;
  date: string;
  customerId: string;
  type: 'SALE' | 'PAYMENT' | 'OPENING' | 'ADJUSTMENT';
  referenceNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}
```

**RECOMMENDATION:** Keep all type names, interface names, and DB column names AS-IS. Only change UI labels.

**Why:**
- `Customer` and `Vendor` types are already correct
- `CustomerLedgerEntry` is internal code name (users never see this)
- Changing type/interface names risks breaking entire codebase
- Mock data in `seed.ts` and `mock-repository.ts` would need updates
- API endpoints may be named after types

**Only potential DB change:** Consider renaming `Customer.kind` enum values:
- Current: `'WHOLESALE' | 'REGULAR'`
- Proposed: `'BUSINESS' | 'WALKIN'` or just remove the distinction entirely

---

## 2. PROPOSED NEW NAVIGATION & PAGE STRUCTURE

### 2.1 New Main Navigation (Sidebar)

**For Owner / Manager:**
```
📊 Dashboard
   ↳ Owner Dashboard (or Manager Dashboard)

💰 SALES
   ↳ New Sale
   ↳ Sales & Invoices
   ↳ Today's Sales (salesperson only)

👥 PEOPLE
   ↳ Customers
   ↳ Vendors

💵 MONEY
   ↳ Customer Payments
   ↳ Vendor Payments (future - not built yet)
   ↳ Expenses

📦 STOCK
   ↳ Stock & Movements
   ↳ Stock Lots
   ↳ Purchases (receiving stock from vendors)

✅ WORKFLOW
   ↳ Approvals

📈 REPORTS
   ↳ Reports

🔧 ADMIN
   ↳ Audit Timeline
   ↳ Settings
```

**Grouping explanation:**
- **SALES:** Everything related to selling to customers
- **PEOPLE:** Customer and vendor directories
- **MONEY:** All payment/collection/expense tracking
- **STOCK:** Inventory, lots, receiving
- **WORKFLOW:** Approvals, reconciliation
- **REPORTS:** Business intelligence
- **ADMIN:** System management

**Alternative (Flatter - current structure, just relabeled):**
```
📊 Dashboard
➕ New Sale
🛒 Sales & Invoices
👥 Customers
💳 Customer Payments
📥 Purchases (from Vendors)
🏢 Vendors
📦 Stock & Movements
📋 Stock Lots
✅ Approvals
📊 Reports
⏰ Audit Timeline
⚙️ Settings
```

### 2.2 Page Structure Changes

#### **Customers Page** (`/customers`)
**Before:**
- Title: "Wholesale Customers"
- Subtitle: "X registered merchant parties • Total outstanding portfolio: ₹Y"
- Search: "Search party name, customer code, or market location..."

**After:**
- Title: "Customers"
- Subtitle: "X customers • Total outstanding: ₹Y"
- Search: "Search customer name, code, or location..."
- Tabs/Filters:
  - All Customers (default)
  - Business Customers (formerly "wholesale")
  - Walk-in Customers (formerly "regular")
  - With Outstanding Balance
  - Active / Blocked status filter

#### **Customer Detail Page** (`/customers/[id]`)
**Before:**
- Tabs: "Party Ledger (Khata)" | "Bills & Invoices" | "Payment History" | "Credit Ageing"
- Section: "Account Statement & Running Ledger" with "Standard APMC double-entry debit/credit ledger"
- Button: "Print Ledger"

**After:**
- Tabs: "Account Statement" | "Sales History" | "Payment History" | "Credit Ageing"
- Section: "Transaction History" with "All sales, payments, and running balance"
- Button: "Print Statement" or "Export Statement"

#### **Vendors Page** (`/vendors`)
**Before:**
- Title: "Vendors & Payables" (implied)
- Subtitle: "X active source partners • Total outstanding payable: ₹Y"

**After:**
- Title: "Vendors"
- Subtitle: "X vendors • Total payable: ₹Y"
- Note: Currently vendors are simpler than customers (no ledger/statement page), just list + detail

#### **Vendor Detail Page** (`/vendors/[id]`)
**Before:**
- Shows: Total purchases, Payable amount, Purchase history, Lot breakdown

**After:**
- Add future feature: "Vendor Statement" tab (like customer statement) showing:
  - Purchases (debit to vendor)
  - Payments to vendor (credit)
  - Running payable balance
- Currently NOT BUILT - vendors only have summary, no detailed transaction ledger

#### **Payments Page** (`/payments`)
**Before:**
- Nav label: "Payments & Collections"
- Implied this is for customers only

**After:**
- Nav label: "Customer Payments" (explicit)
- Future: Add "Vendor Payments" page separately (NOT CURRENTLY IMPLEMENTED)
- Clarify: "Expenses" are business expenses (scale fees, loading, etc.), not vendor payments

#### **Outstanding/Balances Page** (`/payments/outstanding`)
**Before:**
- Title: "Customer Outstanding Ledger Balances"
- Subtitle: "Total wholesale receivables: ₹X across Y merchant accounts"

**After:**
- Title: "Customer Balances"
- Subtitle: "Total receivables: ₹X from Y customers"

#### **Payment Entry Page** (`/payments/new`)
**Before:**
- Label: "Select Wholesale Customer / Party"
- Description: "Credit collection receipt • Dynamically updates ledger & outstanding"

**After:**
- Label: "Select Customer"
- Description: "Record customer payment and update balance"

#### **Sales New Page** (`/sales/new`)
**Before:**
- Step headers: "Floor Weighment & Sale" → "Payment & Settlement" → "Confirm Wholesale Sale Bill"

**After:**
- Step headers: "Weighment & Sale" → "Payment & Settlement" → "Confirm Sale Invoice"
- Remove "wholesale" and "floor" (implied by context)

### 2.3 Where "Ledger" Becomes "Statement" or "Account History"

| Old Term | New Term | Context |
|----------|----------|---------|
| Party Ledger (Khata) | Account Statement | Customer detail tab |
| Account Statement & Running Ledger | Transaction History | Customer detail section header |
| Print Ledger | Print Statement | Button |
| Customers & Ledger | Customers | Nav menu |
| View Customer Ledgers | View Customer Statements | Settings permission list |
| Customer Outstanding Ledger Balances | Customer Balances | Page title |
| Dynamically updates ledger | Updates account balance | Payment form description |

**"Khata" note:** Kept in parentheses "(Khata)" for Hindi/Marathi-speaking users who know this term. Can be removed if owner prefers pure English.

---

## 3. VENDOR ENTITY STATUS

### 3.1 Current State: Vendors EXIST ✅

**Vendor entity is ALREADY FULLY IMPLEMENTED:**

```typescript
// types/index.ts line 33-45
export interface Vendor {
  id: string;
  code: string;          // e.g., "VEN-001"
  name: string;          // e.g., "Murade Traders"
  phone: string;
  email?: string;
  address: string;
  mandiCity: string;     // e.g., "Lasalgaon (Nashik)"
  totalPurchases: number; // Cumulative purchase value
  payableAmount: number;  // Outstanding payable (opposite of customer outstanding)
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}
```

**Seed data includes 2 vendors:**
- VEN-001: Murade Traders (Lasalgaon, Nashik)
- VEN-002: Local Supplier (Manchar, Pune Rural)

**Vendor pages exist:**
- `/vendors` → VendorList.tsx (list of vendors with payable amounts)
- `/vendors/[id]` → VendorDetails.tsx (vendor detail with purchase history)
- VendorFormModal.tsx (add/edit vendor)

**Vendors are linked to:**
- **Purchases:** Each purchase has `vendorId` and `vendorName`
- **Lots:** Each lot has `vendorId` and `vendorName` (source of stock)
- **Payments:** NOT YET LINKED — no vendor payment tracking currently

### 3.2 What's Missing: Vendor Ledger/Statement

**Gap:** Vendors have:
- ✅ List page showing total purchases and payable amount
- ✅ Detail page showing purchase history and associated lots
- ❌ NO transaction-by-transaction ledger like customers have
- ❌ NO payment-to-vendor tracking (only expense tracking exists)

**Customer Ledger Structure (for comparison):**
```typescript
export interface CustomerLedgerEntry {
  id: string;
  date: string;
  customerId: string;
  type: 'SALE' | 'PAYMENT' | 'OPENING' | 'ADJUSTMENT';
  referenceNo: string;   // Bill number or receipt number
  description: string;
  debit: number;         // Sales increase balance
  credit: number;        // Payments decrease balance
  balance: number;       // Running balance
}
```

**Needed for Vendors (NEW):**
```typescript
export interface VendorLedgerEntry {
  id: string;
  date: string;
  vendorId: string;
  type: 'PURCHASE' | 'PAYMENT' | 'OPENING' | 'ADJUSTMENT';
  referenceNo: string;   // Purchase bill or payment voucher
  description: string;
  credit: number;        // Purchases increase payable (credit to vendor)
  debit: number;         // Payments decrease payable (debit to vendor)
  balance: number;       // Running payable balance
}
```

**Why needed:**
- Owner may want to track when he paid vendors (not just total payable)
- Vendor statements for reconciliation (like customer statements)
- Ageing of vendor payables (how old are unpaid bills)

**Implementation complexity:**
- **Medium** — Similar structure to customer ledger
- Need to:
  1. Create `VendorLedgerEntry` type
  2. Add vendor payment recording UI (similar to customer payment entry)
  3. Add vendor statement view in VendorDetails.tsx
  4. Update `mock-repository.ts` to track vendor ledger
  5. Link purchases to vendor ledger (debit), payments to vendors (credit)

### 3.3 Vendor vs Customer: Key Differences

| Aspect | Customer | Vendor | Notes |
|--------|----------|--------|-------|
| **Direction** | I sell TO them | I buy FROM them | Opposite flows |
| **Money flow** | They owe ME | I owe THEM | Receivables vs Payables |
| **Balance terminology** | Outstanding (receivable) | Payable | Asset vs Liability |
| **Transactions** | Sales (DR), Payments received (CR) | Purchases (CR), Payments made (DR) | Opposite debit/credit |
| **Ledger type** | Customer Ledger (built ✅) | Vendor Ledger (NOT built ❌) | Missing feature |
| **Current UI** | Full statement with ageing | Only summary & purchase list | Asymmetric |

**Recommendation:** For now, keep vendors as-is (no ledger). If owner later requests vendor payment tracking, build VendorLedgerEntry similar to CustomerLedgerEntry.

---

## 4. IMPLEMENTATION APPROACH

### 4.1 Recommended: UI-Only Changes (Safest)

**Change:**
- All user-facing labels, titles, descriptions, buttons, placeholders, helper text
- Navigation menu labels
- Page titles and subtitles
- Form field labels
- Toast/notification messages
- Invoice/receipt section headers

**DO NOT change:**
- TypeScript type names (`Customer`, `Vendor`, `CustomerLedgerEntry`)
- Interface/enum names (`CustomerKind`)
- Function names (e.g., `useLedgerQuery`, `buildOutstandingReport`)
- API endpoint paths (if any — mock app uses client-side only)
- Database table names (if app uses real DB later)
- Mock data property names (`seed.ts`, `mock-repository.ts`)
- URL routes (already correct: `/customers`, `/vendors`)

**Why UI-only is safest:**
- TypeScript types are used in 50+ files
- Renaming types requires refactoring entire codebase
- High risk of introducing bugs
- Routes are already correct, no SEO impact
- Users never see code/type names
- Can be done incrementally (one page at a time)
- Easy to review changes (just search for visible text)

### 4.2 Optional: Enum Value Changes (Low Priority)

**Consider changing:**
```typescript
// Before
export type CustomerKind = 'WHOLESALE' | 'REGULAR';

// After
export type CustomerKind = 'BUSINESS' | 'WALKIN';
```

**Impact:**
- Mock data would need update (`seed.ts`: `kind: 'WHOLESALE'` → `kind: 'BUSINESS'`)
- Anywhere that checks `customer.kind === 'WHOLESALE'` needs update
- Low risk (only ~5 files reference this)

**Recommendation:** Do this AFTER UI changes are complete and tested. Not critical.

### 4.3 What About Database Column Names?

**Current situation:**
- App uses mock data only (no real database)
- If owner deploys with a real DB later, column names would be:
  - `customers` table with `kind` column ('WHOLESALE'/'REGULAR')
  - `customer_ledger` table (if created)
  - `vendors` table
  - No vendor ledger table yet

**Recommendation:**
- If DB migration happens, use UI labels as column names:
  - `customer_kind` values: 'business'/'walkin' (lowercase)
  - Table `customer_statements` instead of `customer_ledger`
  - But keep `customers` and `vendors` (already clear)
- For now, keep mock data property names to match TypeScript types

### 4.4 Route Redirects (Not Needed)

**Good news:** All routes already use `/customers` and `/vendors` (not `/parties`, `/wholesale-customers`, etc.)

**No redirects required.** Routes are already owner-friendly.

---

## 5. RISKS & IMPACTS

### 5.1 Low-Risk Changes (Safe to Do)

✅ **UI text changes (labels, titles, descriptions):**
- Risk: **None** — only affects what user sees
- Impact: Immediate clarity improvement
- Testing: Manual review of each page

✅ **Navigation menu relabeling:**
- Risk: **None** — routes stay the same
- Impact: Users see simpler menu
- Testing: Check sidebar on all screen sizes

✅ **Empty state messages:**
- Risk: **None** — informational only
- Testing: Trigger empty states (no data) and check text

### 5.2 Medium-Risk Changes (Need Testing)

⚠️ **Form validation messages:**
- Risk: **Low** — if error messages reference old terms
- Impact: May show "Party not found" instead of "Customer not found"
- Testing: Try all error scenarios (invalid input, missing fields)

⚠️ **Search/filter functionality:**
- Risk: **Low** — if placeholder text doesn't match search logic
- Impact: User may be confused what search box searches
- Testing: Search by name, code, location on all list pages

⚠️ **Customer "kind" enum references:**
- Risk: **Low to Medium** — if logic checks `customer.kind === 'WHOLESALE'`
- Impact: Radio buttons, filters, defaults may break
- Testing: Add new customer with each kind, edit existing customers

### 5.3 Higher-Risk Changes (Avoid for Now)

❌ **TypeScript type renames:**
- Risk: **HIGH** — breaks all imports, may miss some files
- Impact: App won't compile until all references fixed
- Recommendation: **Don't do this.** Not worth the effort/risk.

❌ **Function/hook renames:**
- Risk: **Medium to High** — affects tests, other components
- Impact: Need to update all call sites
- Recommendation: **Don't do this.** Keep `useLedgerQuery()` as-is.

❌ **Mock data restructuring:**
- Risk: **Medium** — if seed data format changes
- Impact: Need to regenerate all test data
- Recommendation: **Only if doing enum value changes.** Otherwise keep as-is.

### 5.4 What Will Look Different (User Perspective)

**Pages that change the most:**
1. **Customers list page:** "Wholesale Customers" → "Customers", "merchant parties" → "customers"
2. **Customer detail page:** "Party Ledger (Khata)" → "Account Statement", "ledger" → "statement" everywhere
3. **Payment pages:** "Party" → "Customer" in all forms and lists
4. **Sales workflow:** Remove "wholesale" from "Wholesale Sale Bill" → "Sale Invoice"
5. **Navigation menu:** "Customers & Ledger" → "Customers", "Payments & Collections" → "Customer Payments"

**Pages that barely change:**
- Vendors pages (already simple: "Vendors" is clear, no "supplier/farmer/consignor" jargon found)
- Purchases pages (already clear: "Purchases" from vendors)
- Stock/Lots pages (no customer/vendor terminology)
- Reports pages (may have "merchant" in one place, easy fix)

**What stays the same:**
- All functionality (no feature additions/removals)
- All calculations (no logic changes)
- All routes/URLs
- All permissions/roles
- All workflows (add customer, record sale, etc.)

---

## 6. ESTIMATED EFFORT

### 6.1 Effort Breakdown by Component

| Component | Files to Change | Est. Hours | Priority |
|-----------|----------------|-----------|----------|
| **Navigation menu (Sidebar)** | 1 file | 0.5 hr | P0 (High visibility) |
| **Customer pages (List, Detail, Form)** | 3 files | 2 hrs | P0 (Most terminology here) |
| **Payment pages (Entry, Receipt, Outstanding)** | 3 files | 1.5 hrs | P0 (Customer-facing) |
| **Sales workflow (New Sale steps)** | 2 files | 1 hr | P1 |
| **Dashboard KPIs & cards** | 2 files (Owner, Salesperson) | 0.5 hr | P1 |
| **Settings page** | 1 file | 0.5 hr | P2 |
| **Invoices & Receipts (Digital Bill)** | 1 file | 0.5 hr | P1 (Customer sees this) |
| **Reports pages** | 3 files (Outstanding, Opening, ReportsHub) | 1 hr | P1 |
| **Login & Auth pages** | 1 file | 0.25 hr | P2 (Low priority) |
| **App metadata (title, description)** | 1 file (layout.page.tsx) | 0.25 hr | P2 |
| **Vendor pages** | 0 files | 0 hr | None needed (already clear) |
| **Search placeholders & empty states** | 8 files | 1 hr | P1 |
| **Helper text & descriptions** | 10 files | 1 hr | P1 |
| **Testing all pages manually** | All pages | 3 hrs | Critical |
| **Fixing bugs found in testing** | Unknown | 1-2 hrs | Contingency |
| **TOTAL** | ~40 files | **13-15 hrs** | |

### 6.2 Effort by Phase

**Phase 1: High-Visibility Changes (6 hours)**
- Navigation menu (Sidebar)
- Customer pages (List, Detail, Form)
- Payment pages (Entry, Outstanding)
- Sales invoice headers
- → Users immediately see simplified terms

**Phase 2: Secondary Pages (4 hours)**
- Dashboard cards
- Sales workflow steps
- Reports pages
- Digital bill details
- → All customer-facing text updated

**Phase 3: Polish & Edge Cases (3 hours)**
- Settings permissions
- Login page
- App metadata
- Helper text & tooltips
- Empty states
- → Last 10% of text

**Phase 4: Testing & Fixes (2-3 hours)**
- Manual walkthrough of all pages
- Test all forms (add/edit customer, vendor, payment)
- Test all filters & search boxes
- Check mobile responsive design
- Fix any missed text or broken functionality

**TOTAL: 15-16 hours of work**

### 6.3 Optional Future Work (Not in This Plan)

**Vendor Payment Tracking (if requested later):**
- Create VendorLedgerEntry type
- Build vendor payment entry UI
- Build vendor statement view
- Link purchases to vendor ledger
- **Effort:** ~20-30 hours

**Customer Kind Enum Rename (low priority):**
- Change 'WHOLESALE'/'REGULAR' to 'BUSINESS'/'WALKIN'
- Update seed data
- Update all comparisons
- **Effort:** ~2-3 hours

---

## 7. STEP-BY-STEP ROLLOUT PLAN

### 7.1 Phase 1: High-Visibility UI (Week 1)

**Step 1.1: Navigation Menu (30 minutes)**
- File: `src/components/layout/Sidebar/Sidebar.tsx`
- Changes:
  - Line 50: "Customers & Ledger" → "Customers"
  - Line 56: "Vendors & Payables" → "Vendors"
  - Line 51: "Payments & Collections" → "Customer Payments"
  - Line 63: "Reports & Analytics" → "Reports"
  - Line 65: "Settings & Masters" → "Settings"
  - Line 133: "dynamic ledgers" → "live balances"
- Test: Check sidebar on desktop & mobile, all user roles

**Step 1.2: Customer List Page (45 minutes)**
- File: `src/pages/Customers/CustomerList/CustomerList.tsx`
- Changes:
  - Line 53: "Wholesale Customers" → "Customers"
  - Line 56: "registered merchant parties" → "customers"
  - Line 85: "Search party name" → "Search customer name"
  - Line 121: "add a new merchant party" → "add a new customer"
  - Line 204: "Ledger" (button) → "Statement"
- Test: Search, add new customer, click through to detail

**Step 1.3: Customer Form (30 minutes)**
- File: `src/pages/Customers/CustomerFormModal/CustomerFormModal.tsx`
- Changes:
  - Line 139: "Wholesale customer" → "Business customer"
  - Line 149: "Trading Party / Firm Name" → "Business Name"
- Test: Add new business customer, add walk-in customer, edit existing

**Step 1.4: Customer Detail Page (1 hour)**
- File: `src/pages/Customers/CustomerDetails/CustomerDetails.tsx`
- Changes:
  - Line 36: "The party record" → "The customer record"
  - Line 80: "Wholesale Mandi Account" → "Mandi Customer"
  - Line 164: "Party Ledger (Khata)" → "Account Statement (Khata)"
  - Line 189: "Print Ledger" → "Print Statement"
  - Line 199: "Account Statement & Running Ledger" → "Transaction History"
  - Line 200: "Standard APMC double-entry debit/credit ledger" → "All sales, payments, and running balance"
  - Line 226: "No ledger transactions" → "No transactions"
  - Line 359: Keep or simplify long description
- Test: View customer, each tab, print button

**Step 1.5: Payment Entry Page (30 minutes)**
- File: `src/pages/Payments/PaymentEntry/PaymentEntry.tsx`
- Changes:
  - Line 84: "Credit collection receipt • Dynamically updates ledger & outstanding" → "Record customer payment and update balance"
  - Line 92: "Select Wholesale Customer / Party" → "Select Customer"
- Test: Record new payment, verify balance updates

**Step 1.6: Outstanding Page (30 minutes)**
- File: `src/pages/Payments/CustomerOutstandingList/CustomerOutstandingList.tsx`
- Changes:
  - Line 30: "Customer Outstanding Ledger Balances" → "Customer Balances"
  - Line 33: "Total wholesale receivables" → "Total receivables"
  - Line 33: "merchant accounts" → "customers"
  - Line 56: "Search party or account code" → "Search customer name or code"
  - Line 113: "Ledger →" → "Statement →"
- Test: View outstanding, search, click through to customer

**Step 1.7: Sales Invoice (30 minutes)**
- File: `src/pages/Sales/DigitalBill/DigitalBill.tsx`
- Changes:
  - Line 100: "APMC WHOLESALE MANDI TAX INVOICE" → "APMC MANDI TAX INVOICE"
  - Line 121: "Billed To (Buyer Party):" → "Billed To:"
- Test: View sample invoice, check PDF export

**CHECKPOINT:** Review all Phase 1 changes together. Do all pages look consistent?

### 7.2 Phase 2: Secondary Pages (Week 1-2)

**Step 2.1: Owner Dashboard (30 minutes)**
- File: `src/pages/Dashboard/OwnerDashboard/OwnerDashboard.tsx`
- Changes:
  - Line 140: "Across X wholesale parties" → "X customers"
- Test: View dashboard as Owner role

**Step 2.2: Salesperson Home (15 minutes)**
- File: `src/pages/Dashboard/SalespersonHome/SalespersonHome.tsx`
- Changes:
  - Line 98: "Tap a regular party to launch new sale" → "Tap a customer to create a sale"
  - Line 137: "Standard APMC wholesale rates per kilogram" → "Current selling rates per KG"
- Test: View as Salesperson role

**Step 2.3: New Sale Workflow (45 minutes)**
- File: `src/pages/Sales/NewSaleWorkflow/NewSaleWorkflow.tsx`
- Changes:
  - Line 569: "Confirm Wholesale Sale Bill" → "Confirm Sale Invoice"
  - Line 807: "Wholesale Selling Rate" → "Selling Rate"
- File: `src/pages/Sales/NewSaleWorkflow/CustomerSearch.tsx`
- Changes:
  - Line 89: "Wholesale customer" → "Business customer"
- Test: Complete full sale workflow (select customer, add items, payment, confirm)

**Step 2.4: Payment Receipt (15 minutes)**
- File: `src/pages/Payments/PaymentReceipt/PaymentReceipt.tsx`
- Changes:
  - Line 104: "Party Particulars" → "Customer Details"
- Test: View receipt details

**Step 2.5: Reports Pages (45 minutes)**
- File: `src/pages/Reports/ReportsHub/ReportsHub.tsx`
- Changes: (None needed — already says "customers")
- File: `src/pages/Reports/ReportsHub/OutstandingReport.tsx`
- Changes: (Already uses "customers")
- File: `src/pages/Reports/ReportsHub/OpeningBalancesReport.tsx`
- Changes: (Already clear)
- Test: View each report type

**Step 2.6: Collection Category (15 minutes)**
- File: `src/pages/Payments/CollectionCategory/CollectionCategory.tsx`
- Changes:
  - Line 69: "Customer / Party" → "Customer"
  - Line 81: "party" → "customer"
- Test: View collection breakdown

**CHECKPOINT:** Test all customer-facing workflows end-to-end.

### 7.3 Phase 3: Polish & Edge Cases (Week 2)

**Step 3.1: Settings Page (30 minutes)**
- File: `src/pages/Settings/SettingsHub/SettingsHub.tsx`
- Changes:
  - Line 142: "Database refreshed to initial wholesale state" → "Database refreshed to demo state"
  - Line 203: "Wholesale Shop Trade Name" → "Shop Name"
  - Line 324: "Set baseline wholesale selling rates" → "Set default selling rates"
  - Line 515: "View Customer Ledgers" → "View Customer Statements"
- Test: Each settings section, reset demo data

**Step 3.2: Auth Pages (15 minutes)**
- File: `src/pages/Auth/Login/Login.tsx`
- Changes:
  - Line 62: "Wholesale Onion Trading & Floor Management System" → "Onion Trading & Mandi Management System"
- File: `src/pages/Auth/UserProfile/UserProfile.tsx`
- Changes:
  - Line 168: "Wholesale purchase rates" → "Vendor purchase rates"
- Test: Login flow, view profile

**Step 3.3: App Metadata (15 minutes)**
- File: `src/app/layout.page.tsx`
- Changes:
  - Line 21: "Vedhaprem Mandi — Wholesale Onion Shop Management" → "Vedhaprem Mandi — Onion Shop Management"
  - Line 23: "wholesale onion trading" → "onion trading", "credit ledgers" → "credit tracking"
- Test: Check browser tab title, Google search results preview

**Step 3.4: Remaining Small Files (30 minutes)**
- File: `src/pages/Lots/LotDetails/LotDetails.tsx`
- Changes:
  - Line 114: "Standard 50kg wholesale mesh" → "Standard 50kg mesh"
- File: `src/pages/Purchases/PurchaseDetails/PurchaseDetails.tsx`
- Changes:
  - Line 147: "wholesale rates" → "rates"
- File: `src/components/layout/PageLayout/AppShell.tsx`
- Changes:
  - Line 128: "Parties" → "Customers" (breadcrumb or menu)
- Test: View each page

**CHECKPOINT:** Full app walkthrough as each user role (Owner, Manager, Salesperson).

### 7.4 Phase 4: Testing & Validation (Week 2)

**Step 4.1: Comprehensive Manual Testing (2 hours)**
- Test matrix:
  - Role: Owner, Manager, Salesperson
  - Device: Desktop, Tablet, Mobile
  - Actions: View, Create, Edit, Delete, Search, Filter, Export
- Pages to test:
  - [x] Customers list & detail
  - [x] Vendors list & detail
  - [x] Sales workflow (new sale)
  - [x] Payments (entry, receipt, outstanding)
  - [x] Dashboard (each role)
  - [x] Reports (each report type)
  - [x] Settings
  - [x] Login/logout
- Look for:
  - Old terms still showing ("party", "wholesale customer", "ledger")
  - Broken layout or cut-off text
  - Confusing labels or descriptions
  - Inconsistent terminology

**Step 4.2: Bug Fixes (1 hour)**
- Create list of issues found
- Prioritize by visibility (customer-facing vs internal)
- Fix each issue
- Re-test

**Step 4.3: Final Review (30 minutes)**
- Print/screenshot each main page
- Review side-by-side with old version
- Confirm all terminology is consistent
- Get owner approval

**DONE!** Deploy to production.

---

## 8. BEFORE → AFTER COMPARISON TABLE

### 8.1 Key Terminology Changes

| Old (Confusing) | New (Simple) | Why |
|-----------------|--------------|-----|
| Wholesale Customers | Customers | Redundant — all customers are "wholesale" in this app |
| Merchant parties | Customers | Accounting jargon |
| Party | Customer | Generic term is confusing |
| Trading Party | Business Customer | When distinguishing from walk-in |
| Party Ledger (Khata) | Account Statement | Ledger is accounting term |
| Account Statement & Running Ledger | Transaction History | Simpler, clearer |
| Ledger (standalone) | Statement or Account | Context-dependent |
| Print Ledger | Print Statement | Consistent with "statement" |
| Customers & Ledger | Customers | Redundant navigation |
| Payments & Collections | Customer Payments | Explicit ownership |
| Wholesale receivables | Receivables | Redundant |
| Merchant accounts | Customer accounts | Simpler |
| Wholesale customer / party | Customer | Removed slash confusion |
| Wholesale Selling Rate | Selling Rate | Implied by context |
| Wholesale Sale Bill | Sale Invoice | Standard term |
| Wholesale Shop Trade Name | Shop Name | Simpler |
| APMC WHOLESALE MANDI TAX INVOICE | APMC MANDI TAX INVOICE | Shorter, clear |
| Billed To (Buyer Party) | Billed To | Standard invoice term |
| Dynamic ledgers | Live balances | Clearer benefit |
| Credit ledgers | Credit tracking | Simpler |
| Vendors & Payables | Vendors | Payables are implied |
| Reports & Analytics | Reports | Shorter (no analytics features yet) |
| Settings & Masters | Settings | Shorter |

### 8.2 Navigation Comparison

| Before | After |
|--------|-------|
| Owner Dashboard | Owner Dashboard ✅ |
| New Sale | New Sale ✅ |
| Sales & Weighment | Sales & Invoices |
| **Customers & Ledger** | **Customers** |
| **Payments & Collections** | **Customer Payments** |
| Purchases | Purchases ✅ |
| Lot Breakdown | Lot Details |
| Stock & Movements | Stock & Movements ✅ |
| **Vendors & Payables** | **Vendors** |
| Approvals | Approvals ✅ |
| **Reports & Analytics** | **Reports** |
| Audit Timeline | Audit Timeline ✅ |
| **Settings & Masters** | **Settings** |

---

## 9. RISKS & MITIGATION

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Missed terminology in some page** | Medium | Low | Do grep search for all old terms before deployment |
| **User confusion from changed terms** | Low | Low | Terms are simpler, users will adapt quickly |
| **Inconsistent terminology across pages** | Medium | Medium | Use search-and-replace checklist, test all pages |
| **Broken functionality from text changes** | Low | High | Only change text, never logic. Test all forms. |
| **Mobile layout breaks with longer text** | Low | Low | Most new terms are shorter. Test mobile. |
| **Internationalization issues (Hindi/Telugu)** | Low | Low | Only English changes for now. Keep "(Khata)" hint. |
| **Old screenshots in documentation** | Medium | Low | Update screenshots after deployment |
| **TypeScript errors from typos** | Low | High | VSCode will catch typos in JSX. Review carefully. |

---

## 10. ROLLBACK PLAN

**If changes cause problems:**

1. **Immediate rollback:** Git revert the commit(s)
2. **Quick fix:** If only one page is broken, fix just that file
3. **Partial rollback:** Revert to Phase 1 only (navigation + customers), keep vendor pages unchanged

**Rollback is SAFE because:**
- Only UI text changes, no logic or data structure changes
- Routes unchanged (no 404 errors)
- No database migrations (mock data only)
- Each phase tested independently

---

## 11. SUCCESS CRITERIA

**Owner will consider this successful when:**
1. ✅ No mention of "party", "merchant", "wholesale customer" on any page
2. ✅ "Ledger" replaced with "Statement" or "Account" in all user-facing text
3. ✅ Navigation menu is clean and simple (Customers, Vendors, Payments)
4. ✅ All forms use "Customer" instead of "Party"
5. ✅ Invoice/receipt headers are simplified
6. ✅ App still works correctly (no broken features)
7. ✅ Terminology is consistent across entire app

---

## SUMMARY FOR OWNER

**What changes:**
- 🔄 Remove confusing terms: "wholesale customer", "party", "merchant"
- 🔄 Use simple words: just "Customer" and "Vendor"
- 🔄 Replace "Ledger" with "Statement" or "Account History" everywhere
- 🔄 Shorter navigation menu labels
- 🔄 Clearer form labels and page titles

**What stays the same:**
- ✅ All features work exactly as before
- ✅ All your data (customers, vendors, sales, payments)
- ✅ All routes/URLs (no broken links)
- ✅ All calculations and business logic
- ✅ Vendors already exist and work correctly

**Effort:** 15-16 hours over 2 weeks

**Risk:** Very low (only text changes, easy to test and rollback)

**Benefit:** Owner and staff will understand the app immediately without accounting training.

---

**END OF PLAN**
