import type { DeliverySpeed, OrderStatus, PaymentMethod } from './types';

/** Prices are whole dinars. `12 500 DZD` reads better to this audience than `12,500`. */
export function formatDzd(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US').replace(/,/g, ' ')} DZD`;
}

export function formatDzdNumber(amount: number): string {
  return Math.round(amount).toLocaleString('en-US').replace(/,/g, ' ');
}

/** Compact form for dashboard tiles: 1.2M / 340k / 890 */
export function formatDzdCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 10_000) return `${Math.round(amount / 1000)}k`;
  return formatDzdNumber(amount);
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US').replace(/,/g, ' ');
}

export function discountPercent(price: number, comparePrice: number | null): number | null {
  if (!comparePrice || comparePrice <= price) return null;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

export const DELIVERY_LABEL: Record<DeliverySpeed, string> = {
  instant: 'Instant',
  few_hours: 'A few hours',
  manual: '1–24 hours',
};

export const DELIVERY_HINT: Record<DeliverySpeed, string> = {
  instant: 'Delivered within minutes of payment confirmation',
  few_hours: 'Delivered the same working day',
  manual: 'Manually sourced, usually within 24 hours',
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Pending payment',
  payment_confirmed: 'Payment confirmed',
  processing: 'Processing',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Drives the status pill colour and the progress tracker on the tracking page. */
export const STATUS_TONE: Record<OrderStatus, string> = {
  pending_payment: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  payment_confirmed: 'bg-accent-500/15 text-accent-300 border-accent-500/30',
  processing: 'bg-accent-500/15 text-accent-300 border-accent-500/30',
  delivered: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-red-500/15 text-red-300 border-red-500/30',
};

/** The happy path the customer walks through, in order. */
export const PROGRESS_STEPS: Array<{ status: OrderStatus; label: string; description: string }> = [
  {
    status: 'pending_payment',
    label: 'Order placed',
    description: 'We received your order and are waiting for your payment.',
  },
  {
    status: 'payment_confirmed',
    label: 'Payment confirmed',
    description: 'We checked your transfer. Now sourcing your code.',
  },
  {
    status: 'processing',
    label: 'Processing',
    description: 'Your code is being prepared.',
  },
  {
    status: 'delivered',
    label: 'Delivered',
    description: 'Your code is ready below and in your email.',
  },
];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  baridimob: 'Baridimob',
  ccp: 'CCP — Algérie Poste',
};

export const PAYMENT_HINT: Record<PaymentMethod, string> = {
  baridimob: 'Fastest. Transfer from the Baridimob app, then send us the receipt.',
  ccp: 'Deposit at any Algérie Poste agency, then send us the ticket number.',
};

export function statusIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1;
  return PROGRESS_STEPS.findIndex((step) => step.status === status);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** "3 hours ago" — used in the admin order table. */
export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const units: Array<[number, string]> = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.35, 'week'],
    [12, 'month'],
  ];
  let value = seconds;
  let unit = 'second';
  for (const [factor, nextUnit] of units) {
    if (value < factor) break;
    value /= factor;
    unit = nextUnit;
  }
  const rounded = Math.floor(value);
  return `${rounded} ${unit}${rounded === 1 ? '' : 's'} ago`;
}
