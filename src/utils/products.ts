import type { MasterStatus, Product } from '@/types';

export const ONIONS_PRODUCT_CODE = 'ONIONS';

export function requireMasterName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name is required');
  return trimmed;
}

function duplicateName(items: { id: string; name: string }[], name: string, ignoreId?: string): boolean {
  const normalized = name.trim().toLowerCase();
  return items.some((item) => item.id !== ignoreId && item.name.trim().toLowerCase() === normalized);
}

export function lotProductLabel(
  lot: { productId?: string },
  products: Pick<Product, 'id' | 'code' | 'name'>[],
): string {
  const match = products.find((product) => lotBelongsToProduct(lot, product));
  return match?.name ?? 'Onions';
}

/** Older lots have no product id and are the onion stock already in the yard. */
export function lotBelongsToProduct(
  lot: { productId?: string },
  product: Pick<Product, 'id' | 'code'>,
): boolean {
  if (lot.productId) return lot.productId === product.id;
  return product.code === ONIONS_PRODUCT_CODE;
}

export function defaultSaleProduct(products: Product[]): Product {
  const onions = products.find((product) => product.code === ONIONS_PRODUCT_CODE && product.status === 'ACTIVE');
  if (onions) return onions;
  const active = products.find((product) => product.status === 'ACTIVE');
  if (!active) throw new Error('No active product is available');
  return active;
}

/** Explicit ids resolve even when inactive, so a saved sale still names its product. */
export function resolveSaleProduct(products: Product[], productId?: string | null): Product {
  if (productId) {
    const selected = products.find((product) => product.id === productId);
    if (!selected) throw new Error('Product not found');
    return selected;
  }
  return defaultSaleProduct(products);
}

export function saleProductSnapshot(product: Product): { productId: string; productName: string } {
  return { productId: product.id, productName: product.name };
}

export function addProduct(products: Product[], input: { id: string; name: string }): Product[] {
  const name = requireMasterName(input.name);
  if (duplicateName(products, name)) throw new Error(`${name} already exists`);
  return [...products, { id: input.id, name, code: productCode(products, name), status: 'ACTIVE' }];
}

export function updateProduct(
  products: Product[],
  id: string,
  patch: { name?: string; status?: MasterStatus },
): Product[] {
  const current = products.find((product) => product.id === id);
  if (!current) throw new Error('Product not found');
  const name = patch.name == null ? current.name : requireMasterName(patch.name);
  if (duplicateName(products, name, id)) throw new Error(`${name} already exists`);
  return products.map((product) => (
    product.id === id
      ? { ...product, name, status: patch.status ?? product.status, code: product.code }
      : product
  ));
}

function productCode(products: Product[], name: string): string {
  const base = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'PRODUCT';
  const used = new Set(products.map((product) => product.code));
  let code = base;
  let suffix = 2;
  while (used.has(code)) {
    code = `${base}_${suffix}`;
    suffix += 1;
  }
  return code;
}
