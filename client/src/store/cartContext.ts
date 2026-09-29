import { createContext, useContext } from 'react';
import type { CartLine, CartState } from './cart';

export const CartContext = createContext<CartState | null>(null);

/** Throws outside the provider — a missing provider is a programming error. */
export function useCart(): CartState {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}

export function useRequireCart(): CartState {
  return useCart();
}

export type { CartLine, CartState };
