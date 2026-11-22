import type { SaleItem } from '@/types';

/** "Onions" -> "Onion". Names that do not end in a plural s are left as they are ("Garlic", "Ginger"). */
function singular(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 3 && /[^s]s$/i.test(trimmed) ? trimmed.slice(0, -1) : trimmed;
}

/**
 * What the customer sees for each line of a bill: the product and a running number for that product
 * (Onion 1, Onion 2, Ginger 1), never the internal mark. Bills made before lines carried a product use the fallback.
 */
export function customerLineLabels(items: Pick<SaleItem, 'productName'>[], fallbackProductName = 'Onion'): string[] {
  const counts = new Map<string, number>();
  return items.map((item) => {
    const name = singular(item.productName || fallbackProductName);
    const next = (counts.get(name) ?? 0) + 1;
    counts.set(name, next);
    return `${name} ${next}`;
  });
}
