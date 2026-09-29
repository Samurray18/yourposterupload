import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CartContext } from './cartContext';
import { lineKey, type CartLine, type CartState } from './cart';
import type { Denomination, Product } from '../lib/types';

const STORAGE_KEY = 'dzdz.cart.v1';
const MAX_QTY = 10;

function readStored(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: anything unexpected in localStorage is dropped rather than
    // crashing the storefront.
    return parsed.filter(
      (line): line is CartLine =>
        typeof line === 'object' &&
        line !== null &&
        typeof (line as CartLine).denominationId === 'string' &&
        typeof (line as CartLine).quantity === 'number',
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Private browsing / quota exceeded — the cart still works in memory.
    }
  }, [lines]);

  const add = useCallback((product: Product, denomination: Denomination, quantity = 1) => {
    const key = lineKey(product.id, denomination.id);
    setLines((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) =>
          line.key === key
            ? { ...line, quantity: Math.min(MAX_QTY, line.quantity + quantity) }
            : line,
        );
      }
      const newLine: CartLine = {
        key,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        productImageUrl: product.imageUrl,
        categoryName: product.categoryName,
        denominationId: denomination.id,
        denominationLabel: denomination.label,
        unitPriceDzd: denomination.priceDzd,
        quantity: Math.min(MAX_QTY, Math.max(1, quantity)),
      };
      return [...current, newLine];
    });
  }, []);

  const setQuantity = useCallback((denominationId: string, quantity: number) => {
    if (quantity <= 0) {
      setLines((current) => current.filter((line) => line.denominationId !== denominationId));
      return;
    }
    setLines((current) =>
      current.map((line) =>
        line.denominationId === denominationId
          ? { ...line, quantity: Math.min(MAX_QTY, quantity) }
          : line,
      ),
    );
  }, []);

  const remove = useCallback((denominationId: string) => {
    setLines((current) => current.filter((line) => line.denominationId !== denominationId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const has = useCallback(
    (productId: string) => lines.some((line) => line.productId === productId),
    [lines],
  );

  const value = useMemo<CartState>(() => {
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotalDzd = lines.reduce((sum, line) => sum + line.unitPriceDzd * line.quantity, 0);
    return { lines, add, setQuantity, remove, clear, has, itemCount, subtotalDzd };
  }, [lines, add, setQuantity, remove, clear, has]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
