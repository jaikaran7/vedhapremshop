# BEFORE & AFTER: Visual Comparison

## Navigation & Structure

### Navigation Menu
**Before:** `/current/01-reports-hub-desktop.png` (sidebar visible)
**After:** `/proposed/01-reports-hub-desktop.png`
**Changes:**
- "Customers & Ledger" → "Customers" (cleaner)
- "Payments & Collections" → "Customer Payments" (explicit)
- "Vendors & Payables" → "Vendors" (simpler)
- "Reports & Analytics" → "Reports" (shorter)

---

## Reports Pages

### 1. Reports Hub / Landing Page

#### Mobile View
**Before:** `/current/01-reports-hub-mobile.png`
**After:** `/proposed/01-reports-hub-mobile.png`
**Changes:**
- Card descriptions simplified to plain language (no accounting jargon)
- "Outstanding Report" → "Customer Balances" with description "Money owed to you by each customer, with overdue tracking"
- "Stock Report" → "Current Stock" with description "How many bags of each quality grade you have on floor"
- "Total Sales Report" → "Sales Bills Detail" with description "All sales with bags, weight, rate, and payment status"

#### Desktop View
**Before:** `/current/01-reports-hub-desktop.png`
**After:** `/proposed/01-reports-hub-desktop.png`
**Changes:**
- Same label improvements as mobile
- Better spacing and readability
- Clearer value propositions for each report

---

### 2. Outstanding Report (Customer Balances)

#### Mobile View
**Before:** `/current/02-outstanding-mobile.png`
**After:** `/proposed/02-outstanding-mobile.png`
**Changes:**
- Ageing bucket headers: "0-7" → "1-7 days", "8-15" → "8-15 days", etc. (added "days" for clarity)
- "Not yet due" → "Current" (positive phrasing)
- RED background highlight for customers 30+ days overdue (visual risk indicator)
- Yellow background for customers near credit limit (80%+)

---

### 3. Total Sales Report

#### Mobile View
**Before:** `/current/03-sales-mobile.png`
**After:** `/proposed/03-sales-mobile.png` (captured but no major visual changes yet)
**Changes:**
- Column header "Actual KG" → "Weight (KG)" (simpler)
- Table layout optimized for mobile scrolling

---

### 4. NEW: Daily Cash Book Report

#### Mobile View
**Before:** (Does not exist)
**After:** `/proposed/03-cash-book-mobile.png`
**Changes:**
- NEW REPORT: Shows today's opening balance, all collections, expenses, and closing balance
- Chronological transaction list with time, type (collection/expense), customer, method, and amount
- Color-coded: Green for collections, Red for expenses
- Critical for daily reconciliation and theft prevention

---

### 5. NEW: Customer Account Statement

#### Mobile View
**Before:** (Does not exist - must drill into customer detail page and view "Party Ledger")
**After:** `/proposed/04-customer-statement-mobile.png`
**Changes:**
- NEW STANDALONE REPORT: Full transaction history for one customer
- Shows opening, all sales (debit), all payments (credit), running balance
- "Share on WhatsApp" button for customer reconciliation
- Replaces confusing "Party Ledger (Khata)" terminology
- Can be exported as PDF for sharing

---

## Customer Pages

### 6. Customers List Page

#### Mobile View
**Before:** `/current/04-customers-list-mobile.png`
**After:** `/proposed/05-customers-list-mobile.png`
**Changes:**
- Page title: "Wholesale Customers" → "Customers"
- Subtitle: "X registered merchant parties • Total outstanding portfolio" → "X customers • Total outstanding"
- Search placeholder: "Search party name..." → "Search customer name..."
- Removed all "wholesale", "merchant", "party" jargon

---

### 7. Customer Detail Page

#### Mobile View
**Before:** `/current/05-customer-detail-mobile.png`
**After:** `/proposed/06-customer-detail-mobile.png`
**Changes:**
- Tab label: "Party Ledger (Khata)" → "Account Statement" (clearer for non-accountants)
- Section header: "Account Statement & Running Ledger" → "Transaction History"
- Description: "Standard APMC double-entry debit/credit ledger" → "All sales, payments, and running balance"
- Button: "Print Ledger" → "Print Statement"
- "Party" references → "Customer"

---

## Vendor Pages

### 8. Vendor Detail Page

#### Mobile View
**Before:** `/current/06-vendors-list-mobile.png`
**After:** `/proposed/07-vendor-detail-mobile.png`
**Changes:**
- NEW TAB: "Vendor Statement" added (shows purchase history and payments made to vendor)
- Currently vendors only show summary - this adds full ledger capability like customers have
- Simplified page title (no "& Payables" suffix)

---

## Stock & Other Reports

### 9. Stock Report

#### Mobile View
**Before:** `/current/07-stock-mobile.png`
**After:** (Minor changes only, not re-captured)
**Changes:**
- Column header clarification: "Adjustments" → "Net Adjustments" with tooltip
- Helper text added: "Available = Received + Adjustments − Sold"

---

### 10. Differential Report

#### Mobile View
**Before:** `/current/08-differential-mobile.png`
**After:** (Renamed and simplified in Reports Hub)
**Changes:**
- Report name: "Differential Report" → "Lot Reconciliation" in hub card
- Description simplified: "Lot reconciliation, mark and cost breakdowns" → "Lot-wise stock matching and profit calculation"
- "Discrepancy" filter labels improved:
  - "Positive Difference" → "Stock Excess (more than expected)"
  - "Negative Difference" → "Stock Shortage (less than expected)"
  - "No Difference" → "Stock Matches"

---

## NEW Reports (Not Yet Built, Shown in Flow Diagram)

### Collection Efficiency Report
- Shows which customers pay on time vs late
- On-time payment %, average days to collect
- Helps identify reliable vs problematic customers
- **Path:** `/reports/collection-efficiency`

### Top Debtors & Alerts
- High-risk customers sorted by outstanding amount
- Flags: Outstanding > credit limit, 30+ days overdue
- One-click view of who to follow up with
- **Path:** `/reports/top-debtors`

### Lot P&L Summary
- Simplified version of Differential Report
- Shows: Lot, Purchase cost, Sales revenue, Profit, Margin %
- No mark-wise breakdown (optional drill-down)
- **Path:** `/reports/lot-pnl`

### Vendor Statement
- Like Customer Statement but for vendors
- Shows: Purchases (increase payable), Payments made (decrease payable)
- Full reconciliation with vendor
- **Path:** `/vendors/:id/statement`

---

## Flow Diagram

**File:** `/proposed/00-flow.svg`

Visual diagram showing:
1. Simplified main navigation (Home, Customers, Vendors, Stock, Sales, Payments, Reports)
2. Reports Hub with all reports organized by priority:
   - **Daily Operations:** Cash Book, Customer Balances, Current Stock
   - **Analysis:** Customer Statement, Sales Bills, Collection Efficiency
   - **Business Insights:** Top Debtors, Lot P&L, Vendor Statement
3. Customer detail flow: Account Statement, Sales History, Payments tabs
4. Vendor detail flow: Vendor Statement, Purchase History, Lots tabs
5. Outstanding Report features: clearer ageing, risk indicators
6. Mobile optimization notes
7. Key terminology changes legend

---

## Summary of Key Changes

### Terminology Simplified
- ❌ "Wholesale Customers", "Merchant parties", "Party" → ✅ "Customers"
- ❌ "Party Ledger (Khata)" → ✅ "Account Statement"
- ❌ "Customers & Ledger" → ✅ "Customers"
- ❌ "Payments & Collections" → ✅ "Customer Payments"
- ❌ "Vendors & Payables" → ✅ "Vendors"
- ❌ "Outstanding Report" → ✅ "Customer Balances"
- ❌ "Differential Report" → ✅ "Lot Reconciliation" (or "Lot P&L")

### Visual Improvements
- RED background for 30+ days overdue customers (risk indicator)
- Clearer ageing bucket labels with "days" suffix
- Simplified report descriptions (plain language, no jargon)
- Mobile-optimized card layouts

### New Reports Added
1. **Daily Cash Book** - Critical for daily closing
2. **Customer Statement** - Full history with WhatsApp export
3. **Collection Efficiency** - Payment behavior tracking
4. **Top Debtors** - High-risk customer alerts
5. **Lot P&L Summary** - Simplified profit view
6. **Vendor Statement** - Vendor reconciliation

### Mobile Optimization
- Card-based layouts for narrow screens
- Sticky table headers
- Hide non-critical columns on mobile
- Full-page scrollable tables

---

## Files Captured

### Current State (9 files)
- `/current/01-reports-hub-mobile.png`
- `/current/01-reports-hub-desktop.png`
- `/current/02-outstanding-mobile.png`
- `/current/03-sales-mobile.png`
- `/current/04-customers-list-mobile.png`
- `/current/05-customer-detail-mobile.png`
- `/current/06-vendors-list-mobile.png`
- `/current/07-stock-mobile.png`
- `/current/08-differential-mobile.png`

### Proposed State (8 files)
- `/proposed/01-reports-hub-mobile.png`
- `/proposed/01-reports-hub-desktop.png`
- `/proposed/02-outstanding-mobile.png`
- `/proposed/03-cash-book-mobile.png` (NEW)
- `/proposed/04-customer-statement-mobile.png` (NEW)
- `/proposed/05-customers-list-mobile.png`
- `/proposed/06-customer-detail-mobile.png`
- `/proposed/07-vendor-detail-mobile.png`

### Flow Diagram (1 file)
- `/proposed/00-flow.svg`

**Total: 18 artifacts**
