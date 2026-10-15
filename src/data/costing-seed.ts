import type { CostingExpenseType, Product, SellingMarginComponent } from '@/types';
import { DEFAULT_COSTING_SETTINGS } from '@/utils/costing';
import { ONIONS_PRODUCT_CODE } from '@/utils/products';

export const SEED_COSTING_SETTINGS = DEFAULT_COSTING_SETTINGS;

export const SEED_PRODUCTS: Product[] = [
  { id: 'prod-onions', code: ONIONS_PRODUCT_CODE, name: 'Onions', status: 'ACTIVE' },
  { id: 'prod-garlic', code: 'GARLIC', name: 'Garlic', status: 'ACTIVE' },
  { id: 'prod-ginger', code: 'GINGER', name: 'Ginger', status: 'ACTIVE' },
];

export const CONSIGNMENT_CHARGE_NAMES = ['Scale', 'Term', 'Loading'] as const;

export const SEED_COSTING_EXPENSE_TYPES: CostingExpenseType[] = [
  { id: 'cet-scale', name: 'Scale', kind: 'PURCHASE', status: 'ACTIVE' },
  { id: 'cet-term', name: 'Term', kind: 'PURCHASE', status: 'ACTIVE' },
  { id: 'cet-loading-bill', name: 'Loading', kind: 'PURCHASE', status: 'ACTIVE' },
  { id: 'cet-commission', name: 'Commission', kind: 'PURCHASE', status: 'ACTIVE' },
  { id: 'cet-cess', name: 'Cess', kind: 'PURCHASE', status: 'ACTIVE' },
  { id: 'cet-other-purchase', name: 'Other Purchase Expense', kind: 'PURCHASE', status: 'ACTIVE' },
  { id: 'cet-transport', name: 'Transport', kind: 'STOCK_RECEIVING', status: 'ACTIVE' },
  { id: 'cet-loading', name: 'Loading/Unloading', kind: 'STOCK_RECEIVING', status: 'ACTIVE' },
  { id: 'cet-retail-commission', name: 'Retail Commission', kind: 'STOCK_RECEIVING', status: 'ACTIVE' },
  { id: 'cet-other-receiving', name: 'Other', kind: 'STOCK_RECEIVING', status: 'ACTIVE' },
];

export const SEED_SELLING_MARGIN_COMPONENTS: SellingMarginComponent[] = [];
