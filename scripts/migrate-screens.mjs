import fs from 'fs';
import path from 'path';

const root = process.cwd();

const files = {
  'src/features/auth/Login.tsx': 'src/pages/Auth/Login/Login.tsx',
  'src/features/auth/ForgotPassword.tsx': 'src/pages/Auth/ForgotPassword/ForgotPassword.tsx',
  'src/features/auth/ResetPassword.tsx': 'src/pages/Auth/ResetPassword/ResetPassword.tsx',
  'src/features/auth/ChangePassword.tsx': 'src/pages/Auth/ChangePassword/ChangePassword.tsx',
  'src/features/auth/UserProfile.tsx': 'src/pages/Auth/UserProfile/UserProfile.tsx',
  'src/features/dashboard/OwnerDashboard.tsx': 'src/pages/Dashboard/OwnerDashboard/OwnerDashboard.tsx',
  'src/features/dashboard/ManagerDashboard.tsx': 'src/pages/Dashboard/ManagerDashboard/ManagerDashboard.tsx',
  'src/features/dashboard/SalespersonHome.tsx': 'src/pages/Dashboard/SalespersonHome/SalespersonHome.tsx',
  'src/features/customers/CustomerList.tsx': 'src/pages/Customers/CustomerList/CustomerList.tsx',
  'src/features/customers/CustomerDetails.tsx': 'src/pages/Customers/CustomerDetails/CustomerDetails.tsx',
  'src/features/customers/CustomerFormModal.tsx': 'src/pages/Customers/CustomerFormModal/CustomerFormModal.tsx',
  'src/features/vendors/VendorList.tsx': 'src/pages/Vendors/VendorList/VendorList.tsx',
  'src/features/vendors/VendorDetails.tsx': 'src/pages/Vendors/VendorDetails/VendorDetails.tsx',
  'src/features/vendors/VendorFormModal.tsx': 'src/pages/Vendors/VendorFormModal/VendorFormModal.tsx',
  'src/features/purchases/PurchaseList.tsx': 'src/pages/Purchases/PurchaseList/PurchaseList.tsx',
  'src/features/purchases/NewPurchase.tsx': 'src/pages/Purchases/NewPurchase/NewPurchase.tsx',
  'src/features/purchases/PurchaseDetails.tsx': 'src/pages/Purchases/PurchaseDetails/PurchaseDetails.tsx',
  'src/features/lots/LotList.tsx': 'src/pages/Lots/LotList/LotList.tsx',
  'src/features/lots/LotDetails.tsx': 'src/pages/Lots/LotDetails/LotDetails.tsx',
  'src/features/stock/StockOverview.tsx': 'src/pages/Stock/StockOverview/StockOverview.tsx',
  'src/features/sales/SalesList.tsx': 'src/pages/Sales/SalesList/SalesList.tsx',
  'src/features/sales/NewSaleWorkflow.tsx': 'src/pages/Sales/NewSaleWorkflow/NewSaleWorkflow.tsx',
  'src/features/sales/SaleDetails.tsx': 'src/pages/Sales/SaleDetails/SaleDetails.tsx',
  'src/features/sales/DigitalBill.tsx': 'src/pages/Sales/DigitalBill/DigitalBill.tsx',
  'src/features/sales/TodaysSales.tsx': 'src/pages/Sales/TodaysSales/TodaysSales.tsx',
  'src/features/payments/PaymentEntry.tsx': 'src/pages/Payments/PaymentEntry/PaymentEntry.tsx',
  'src/features/payments/PaymentHistory.tsx': 'src/pages/Payments/PaymentHistory/PaymentHistory.tsx',
  'src/features/payments/PaymentReceipt.tsx': 'src/pages/Payments/PaymentReceipt/PaymentReceipt.tsx',
  'src/features/payments/CustomerOutstandingList.tsx': 'src/pages/Payments/CustomerOutstandingList/CustomerOutstandingList.tsx',
  'src/features/approvals/ApprovalsHub.tsx': 'src/pages/Approvals/ApprovalsHub/ApprovalsHub.tsx',
  'src/features/audit/AuditHistory.tsx': 'src/pages/Audit/AuditHistory/AuditHistory.tsx',
  'src/features/reports/ReportsHub.tsx': 'src/pages/Reports/ReportsHub/ReportsHub.tsx',
  'src/features/settings/SettingsHub.tsx': 'src/pages/Settings/SettingsHub/SettingsHub.tsx',
};

const fieldLines = {
  companySettings: {
    imp: `import { useCompanyQuery } from '@/hooks/queries/use-directory-query';`,
    line: `const { data: companySettings } = useCompanyQuery();`,
  },
  users: {
    imp: `import { useUsersQuery } from '@/hooks/queries/use-directory-query';`,
    line: `const { data: users = [] } = useUsersQuery();`,
  },
  customers: {
    imp: `import { useCustomersQuery } from '@/hooks/queries/use-customers-query';`,
    line: `const { data: customers = [] } = useCustomersQuery();`,
  },
  vendors: {
    imp: `import { useVendorsQuery } from '@/hooks/queries/use-vendors-query';`,
    line: `const { data: vendors = [] } = useVendorsQuery();`,
  },
  marks: {
    imp: `import { useMarksQuery } from '@/hooks/queries/use-directory-query';`,
    line: `const { data: marks = [] } = useMarksQuery();`,
  },
  lots: {
    imp: `import { useLotsQuery } from '@/hooks/queries/use-lots-query';`,
    line: `const { data: lots = [] } = useLotsQuery();`,
  },
  purchases: {
    imp: `import { usePurchasesQuery } from '@/hooks/queries/use-purchases-query';`,
    line: `const { data: purchases = [] } = usePurchasesQuery();`,
  },
  sales: {
    imp: `import { useSalesQuery } from '@/hooks/queries/use-sales-query';`,
    line: `const { data: sales = [] } = useSalesQuery();`,
  },
  payments: {
    imp: `import { usePaymentsQuery } from '@/hooks/queries/use-payments-query';`,
    line: `const { data: payments = [] } = usePaymentsQuery();`,
  },
  stockMovements: {
    imp: `import { useStockQuery } from '@/hooks/queries/use-stock-query';`,
    line: `const { data: stockMovements = [] } = useStockQuery();`,
  },
  approvals: {
    imp: `import { useApprovalsQuery } from '@/hooks/queries/use-approvals-query';`,
    line: `const { data: approvals = [] } = useApprovalsQuery();`,
  },
  auditLogs: {
    imp: `import { useAuditQuery } from '@/hooks/queries/use-directory-query';`,
    line: `const { data: auditLogs = [] } = useAuditQuery();`,
  },
  ledgerEntries: {
    imp: `import { useLedgerQuery } from '@/hooks/queries/use-customers-query';`,
    line: `const { data: ledgerEntries = [] } = useLedgerQuery();`,
  },
  addCustomer: {
    imp: `import { useCreateCustomerMutation } from '@/hooks/mutations/use-customer-mutations';`,
    line: `const addCustomerMutation = useCreateCustomerMutation();\n  const addCustomer = (data: Parameters<typeof addCustomerMutation.mutate>[0]) => addCustomerMutation.mutate(data);`,
  },
  updateCustomer: {
    imp: `import { useUpdateCustomerMutation } from '@/hooks/mutations/use-customer-mutations';`,
    line: `const updateCustomerMutation = useUpdateCustomerMutation();\n  const updateCustomer = (id: string, input: Parameters<typeof updateCustomerMutation.mutate>[0]['input']) => updateCustomerMutation.mutate({ id, input });`,
  },
  deleteCustomer: {
    imp: `import { useDeleteCustomerMutation } from '@/hooks/mutations/use-customer-mutations';`,
    line: `const deleteCustomerMutation = useDeleteCustomerMutation();\n  const deleteCustomer = (id: string) => deleteCustomerMutation.mutate(id);`,
  },
  addVendor: {
    imp: `import { useCreateVendorMutation } from '@/hooks/mutations/use-vendor-mutations';`,
    line: `const addVendorMutation = useCreateVendorMutation();\n  const addVendor = (data: Parameters<typeof addVendorMutation.mutate>[0]) => addVendorMutation.mutate(data);`,
  },
  updateVendor: {
    imp: `import { useUpdateVendorMutation } from '@/hooks/mutations/use-vendor-mutations';`,
    line: `const updateVendorMutation = useUpdateVendorMutation();\n  const updateVendor = (id: string, input: Parameters<typeof updateVendorMutation.mutate>[0]['input']) => updateVendorMutation.mutate({ id, input });`,
  },
  addMark: {
    imp: `import { useCreateMarkMutation } from '@/hooks/mutations/use-settings-mutations';`,
    line: `const addMarkMutation = useCreateMarkMutation();\n  const addMark = (data: Parameters<typeof addMarkMutation.mutate>[0]) => addMarkMutation.mutate(data);`,
  },
  updateMark: {
    imp: `import { useUpdateMarkMutation } from '@/hooks/mutations/use-settings-mutations';`,
    line: `const updateMarkMutation = useUpdateMarkMutation();\n  const updateMark = (id: string, input: Parameters<typeof updateMarkMutation.mutate>[0]['input']) => updateMarkMutation.mutate({ id, input });`,
  },
  updateCompanySettings: {
    imp: `import { useUpdateCompanyMutation } from '@/hooks/mutations/use-settings-mutations';`,
    line: `const updateCompanyMutation = useUpdateCompanyMutation();\n  const updateCompanySettings = (settings: Parameters<typeof updateCompanyMutation.mutate>[0]) => updateCompanyMutation.mutate(settings);`,
  },
  resetToDefault: {
    imp: `import { useResetDemoMutation } from '@/hooks/mutations/use-settings-mutations';`,
    line: `const resetDemoMutation = useResetDemoMutation();\n  const resetToDefault = () => resetDemoMutation.mutate();`,
  },
  createPurchase: {
    imp: `import { useCreatePurchaseMutation } from '@/hooks/mutations/use-purchase-mutations';`,
    line: `const createPurchaseMutation = useCreatePurchaseMutation();\n  const createPurchase = (data: Parameters<typeof createPurchaseMutation.mutateAsync>[0]) => createPurchaseMutation.mutateAsync(data);`,
  },
  createSale: {
    imp: `import { useCreateSaleMutation } from '@/hooks/mutations/use-sale-mutations';`,
    line: `const createSaleMutation = useCreateSaleMutation();\n  const createSale = (data: Parameters<typeof createSaleMutation.mutateAsync>[0]) => createSaleMutation.mutateAsync(data);`,
  },
  requestSaleEdit: {
    imp: `import { useRequestSaleEditMutation } from '@/hooks/mutations/use-sale-mutations';`,
    line: `const requestSaleEditMutation = useRequestSaleEditMutation();\n  const requestSaleEdit = (saleId: string, requestedData: unknown, reason: string) => requestSaleEditMutation.mutate({ saleId, requestedData, reason });`,
  },
  recordPayment: {
    imp: `import { useRecordPaymentMutation } from '@/hooks/mutations/use-payment-mutations';`,
    line: `const recordPaymentMutation = useRecordPaymentMutation();\n  const recordPayment = (data: Parameters<typeof recordPaymentMutation.mutateAsync>[0]) => recordPaymentMutation.mutateAsync(data);`,
  },
  processApproval: {
    imp: `import { useProcessApprovalMutation } from '@/hooks/mutations/use-approval-mutations';`,
    line: `const processApprovalMutation = useProcessApprovalMutation();\n  const processApproval = (approvalId: string, action: 'APPROVE' | 'REJECT', notes?: string) => processApprovalMutation.mutate({ approvalId, action, notes });`,
  },
  createStockAdjustment: {
    imp: `import { useCreateStockAdjustmentMutation } from '@/hooks/mutations/use-stock-mutations';`,
    line: `const createStockAdjustmentMutation = useCreateStockAdjustmentMutation();\n  const createStockAdjustment = (data: Parameters<typeof createStockAdjustmentMutation.mutate>[0]) => createStockAdjustmentMutation.mutate(data);`,
  },
  addOpeningStock: {
    imp: `import { useAddOpeningStockMutation } from '@/hooks/mutations/use-stock-mutations';`,
    line: `const addOpeningStockMutation = useAddOpeningStockMutation();\n  const addOpeningStock = (lotNumber: string, markCode: string, bags: number, weightKg: number) => addOpeningStockMutation.mutate({ lotNumber, markCode, bags, weightKg });`,
  },
};

function transform(content, dest) {
  const imports = new Set();
  content = content.replace(/import\s+\{[^}]+\}\s+from\s+'react-router-dom';\n/g, '');
  content = content.replace(/import\s+\{\s*useMandiStore\s*\}\s+from\s+'[^']+';\n/g, '');
  content = content.replaceAll("from '../../components/", "from '@/components/");
  content = content.replaceAll("from '../../types'", "from '@/types'");
  content = content.replaceAll("from './CustomerFormModal'", "from '@/pages/Customers/CustomerFormModal/CustomerFormModal'");
  content = content.replaceAll("from './VendorFormModal'", "from '@/pages/Vendors/VendorFormModal/VendorFormModal'");
  content = content.replaceAll("from './ChangePassword'", "from '@/pages/Auth/ChangePassword/ChangePassword'");

  content = content.replace(/const\s*\{([^}]*)\}\s*=\s*useMandiStore\(\);/, (_, inner) => {
    const names = inner.split(',').map((part) => part.trim()).filter(Boolean);
    const lines = [];
    const session = names.filter((name) => ['currentUser', 'switchRole', 'setCurrentUser'].includes(name));
    if (session.length) {
      imports.add(`import { useSession } from '@/store/session/session-provider';`);
      lines.push(`const { ${session.join(', ')} } = useSession();`);
    }
    for (const name of names) {
      if (session.includes(name)) continue;
      const spec = fieldLines[name];
      if (!spec) throw new Error(`Unmapped store field ${name} in ${dest}`);
      imports.add(spec.imp);
      lines.push(spec.line);
    }
    return lines.join('\n  ');
  });

  const needsRouter = content.includes('useNavigate(') || content.includes('navigate(');
  const needsSearch = content.includes('useSearchParams(');
  const needsId = content.includes('useParams');
  const needsLink = content.includes('<Link');

  if (needsRouter) imports.add(`import { useRouter } from 'next/navigation';`);
  if (needsSearch) imports.add(`import { useSearchParams } from 'next/navigation';`);
  if (needsId) imports.add(`import { useRouteId } from '@/hooks/shared/use-route-id';`);
  if (needsLink) imports.add(`import Link from 'next/link';`);

  content = content.replace(/const navigate = useNavigate\(\);\n\s*/g, 'const router = useRouter();\n  ');
  content = content.replaceAll('navigate(-1)', 'router.back()');
  content = content.replaceAll('navigate(', 'router.push(');
  content = content.replaceAll('const [searchParams] = useSearchParams();', 'const searchParams = useSearchParams();');
  content = content.replaceAll('const { id } = useParams<{ id: string }>();', 'const id = useRouteId();');
  content = content.replace(/<Link(\s)/g, '<Link$1');
  content = content.replaceAll(' to="', ' href="');
  content = content.replaceAll(' to={`', ' href={`');
  content = content.replaceAll(' to={', ' href={');

  if (!dest.includes('/Auth/')) {
    const before = content;
    content = content.replaceAll("currentUser.role !== 'SALESPERSON'", "can(currentUser.role, 'viewPurchaseCost')");
    content = content.replaceAll("currentUser.role === 'SALESPERSON'", "!can(currentUser.role, 'viewPurchaseCost')");
    content = content.replaceAll(
      "currentUser.role === 'OWNER' || currentUser.role === 'MANAGER'",
      "can(currentUser.role, 'reviewApprovals')"
    );
    if (content !== before) imports.add(`import { can } from '@/auth/permissions';`);
  }

  content = content.replaceAll('const created = createSale(', 'const created = await createSale(');
  content = content.replaceAll('const created = createPurchase(', 'const created = await createPurchase(');
  content = content.replaceAll('const created = recordPayment(', 'const created = await recordPayment(');
  if (content.includes('await create') || content.includes('await recordPayment')) {
    content = content.replace(
      /const (handleConfirmSale|handleConfirm|handleSubmit) = \(([^)]*)\) => \{/g,
      'const $1 = async ($2) => {'
    );
  }

  if (dest.endsWith('NewSaleWorkflow.tsx')) {
    content = content.replace(
      'const amount = Math.round(totalWeight * item.ratePerKg);',
      'const amount = saleLineAmount(totalWeight, item.ratePerKg);'
    );
    imports.add(`import { saleLineAmount } from '@/utils/trading';`);
  }

  if (dest.endsWith('Login.tsx')) {
    content = content.replace(
      `if (matched.role === 'SALESPERSON') {\n        router.push('/salesperson-home');\n      } else if (matched.role === 'MANAGER') {\n        router.push('/dashboard/manager');\n      } else {\n        router.push('/dashboard/owner');\n      }`,
      'router.push(homePath(matched.role));'
    );
    imports.add(`import { homePath } from '@/auth/permissions';`);
  }

  const importBlock = [...imports].join('\n');
  if (!content.startsWith("'use client'")) {
    content = `'use client';\n\n${importBlock}\n${content}`;
  }
  return content;
}

for (const [from, to] of Object.entries(files)) {
  const source = fs.readFileSync(path.join(root, from), 'utf8');
  const next = transform(source, to);
  const dest = path.join(root, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, next);
  console.log('wrote', to);
}
