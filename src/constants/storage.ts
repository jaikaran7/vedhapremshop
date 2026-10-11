export const STORAGE_PREFIX = 'vedhaprem_mandi_';

export const STORAGE_KEYS = {
  currentUser: `${STORAGE_PREFIX}current_user`,
  customers: `${STORAGE_PREFIX}customers`,
  vendors: `${STORAGE_PREFIX}vendors`,
  lots: `${STORAGE_PREFIX}lots`,
  marks: `${STORAGE_PREFIX}marks`,
  purchases: `${STORAGE_PREFIX}purchases`,
  sales: `${STORAGE_PREFIX}sales`,
  payments: `${STORAGE_PREFIX}payments`,
  expenses: `${STORAGE_PREFIX}expenses`,
  cashAccounts: `${STORAGE_PREFIX}cash_accounts`,
  expenseCategories: `${STORAGE_PREFIX}expense_categories`,
  stockMovements: `${STORAGE_PREFIX}stock_movements`,
  approvals: `${STORAGE_PREFIX}approvals`,
  saleCharges: `${STORAGE_PREFIX}sale_charges`,
  auditLogs: `${STORAGE_PREFIX}audit_logs`,
  ledger: `${STORAGE_PREFIX}ledger`,
} as const;
