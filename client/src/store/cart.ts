import type { Denomination, Product } from '../lib/types';

/** One product/denomination pair in the cart. Price is snapshotted at add-time. */
export interface CartLine {
  key: string;
  productId: string;
  productSlug: string;
  productName: string;
  productImageUrl: string | null;
  categoryName: string;
  denominationId: string;
  denominationLabel: string;
  unitPriceDzd: number;
  quantity: number;
}

export interface CartState {
  lines: CartLine[];
  add(product: Product, denomination: Denomination, quantity?: number): void;
  setQuantity(denominationId: string, quantity: number): void;
  remove(denominationId: string): void;
  clear(): void;
  /** True when the cart already holds a line for this product. */
  has(productId: string): boolean;
  itemCount: number;
  subtotalDzd: number;
}

export function lineKey(productId: string, denominationId: string): string {
  return `${productId}:${denominationId}`;
}
