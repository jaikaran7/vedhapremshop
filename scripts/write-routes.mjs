import fs from 'fs';
import path from 'path';

const root = process.cwd();

const routes = [
  ['src/app/(auth)/login/page.page.tsx', 'Login', '@/pages/Auth/Login/Login'],
  ['src/app/(auth)/forgot-password/page.page.tsx', 'ForgotPassword', '@/pages/Auth/ForgotPassword/ForgotPassword'],
  ['src/app/(auth)/reset-password/page.page.tsx', 'ResetPassword', '@/pages/Auth/ResetPassword/ResetPassword'],
  ['src/app/(auth)/change-password/page.page.tsx', 'ChangePasswordPage', '@/pages/Auth/ChangePassword/ChangePasswordPage'],
  ['src/app/(dashboard)/profile/page.page.tsx', 'UserProfile', '@/pages/Auth/UserProfile/UserProfile'],
  ['src/app/(dashboard)/dashboard/owner/page.page.tsx', 'OwnerDashboard', '@/pages/Dashboard/OwnerDashboard/OwnerDashboard'],
  ['src/app/(dashboard)/dashboard/manager/page.page.tsx', 'ManagerDashboard', '@/pages/Dashboard/ManagerDashboard/ManagerDashboard'],
  ['src/app/(dashboard)/salesperson-home/page.page.tsx', 'SalespersonHome', '@/pages/Dashboard/SalespersonHome/SalespersonHome'],
  ['src/app/(dashboard)/customers/page.page.tsx', 'CustomerList', '@/pages/Customers/CustomerList/CustomerList'],
  ['src/app/(dashboard)/customers/[id]/page.page.tsx', 'CustomerDetails', '@/pages/Customers/CustomerDetails/CustomerDetails'],
  ['src/app/(dashboard)/customers/[id]/ledger/page.page.tsx', 'CustomerDetails', '@/pages/Customers/CustomerDetails/CustomerDetails'],
  ['src/app/(dashboard)/vendors/page.page.tsx', 'VendorList', '@/pages/Vendors/VendorList/VendorList'],
  ['src/app/(dashboard)/vendors/[id]/page.page.tsx', 'VendorDetails', '@/pages/Vendors/VendorDetails/VendorDetails'],
  ['src/app/(dashboard)/purchases/page.page.tsx', 'PurchaseList', '@/pages/Purchases/PurchaseList/PurchaseList'],
  ['src/app/(dashboard)/purchases/new/page.page.tsx', 'NewPurchase', '@/pages/Purchases/NewPurchase/NewPurchase', true],
  ['src/app/(dashboard)/purchases/[id]/page.page.tsx', 'PurchaseDetails', '@/pages/Purchases/PurchaseDetails/PurchaseDetails'],
  ['src/app/(dashboard)/lots/page.page.tsx', 'LotList', '@/pages/Lots/LotList/LotList'],
  ['src/app/(dashboard)/lots/[id]/page.page.tsx', 'LotDetails', '@/pages/Lots/LotDetails/LotDetails'],
  ['src/app/(dashboard)/stock/page.page.tsx', 'StockOverview', '@/pages/Stock/StockOverview/StockOverview'],
  ['src/app/(dashboard)/sales/page.page.tsx', 'SalesList', '@/pages/Sales/SalesList/SalesList'],
  ['src/app/(dashboard)/sales/new/page.page.tsx', 'NewSaleWorkflow', '@/pages/Sales/NewSaleWorkflow/NewSaleWorkflow', true],
  ['src/app/(dashboard)/sales/todays/page.page.tsx', 'TodaysSales', '@/pages/Sales/TodaysSales/TodaysSales'],
  ['src/app/(dashboard)/sales/[id]/page.page.tsx', 'SaleDetails', '@/pages/Sales/SaleDetails/SaleDetails'],
  ['src/app/(dashboard)/sales/[id]/bill/page.page.tsx', 'DigitalBill', '@/pages/Sales/DigitalBill/DigitalBill'],
  ['src/app/(dashboard)/payments/page.page.tsx', 'PaymentHistory', '@/pages/Payments/PaymentHistory/PaymentHistory'],
  ['src/app/(dashboard)/payments/new/page.page.tsx', 'PaymentEntry', '@/pages/Payments/PaymentEntry/PaymentEntry', true],
  ['src/app/(dashboard)/payments/outstanding/page.page.tsx', 'CustomerOutstandingList', '@/pages/Payments/CustomerOutstandingList/CustomerOutstandingList'],
  ['src/app/(dashboard)/payments/receipt/page.page.tsx', 'PaymentReceipt', '@/pages/Payments/PaymentReceipt/PaymentReceipt'],
  ['src/app/(dashboard)/payments/receipt/[id]/page.page.tsx', 'PaymentReceipt', '@/pages/Payments/PaymentReceipt/PaymentReceipt'],
  ['src/app/(dashboard)/approvals/page.page.tsx', 'ApprovalsHub', '@/pages/Approvals/ApprovalsHub/ApprovalsHub'],
  ['src/app/(dashboard)/approvals/[id]/page.page.tsx', 'ApprovalsHub', '@/pages/Approvals/ApprovalsHub/ApprovalsHub'],
  ['src/app/(dashboard)/audit/page.page.tsx', 'AuditHistory', '@/pages/Audit/AuditHistory/AuditHistory'],
  ['src/app/(dashboard)/reports/page.page.tsx', 'ReportsHub', '@/pages/Reports/ReportsHub/ReportsHub'],
  ['src/app/(dashboard)/reports/[reportType]/page.page.tsx', 'ReportsHub', '@/pages/Reports/ReportsHub/ReportsHub'],
  ['src/app/(dashboard)/settings/page.page.tsx', 'SettingsHub', '@/pages/Settings/SettingsHub/SettingsHub'],
];

for (const [file, name, from, suspense] of routes) {
  const body = suspense
    ? `import { Suspense } from 'react';
import { ${name} } from '${from}';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-surface" />}>
      <${name} />
    </Suspense>
  );
}
`
    : `import { ${name} } from '${from}';

export default function Page() {
  return <${name} />;
}
`;
  const dest = path.join(root, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, body);
}

console.log('routes', routes.length);
