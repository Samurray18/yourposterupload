export const ORDER_STATUSES = [
  'pending_payment',
  'payment_confirmed',
  'processing',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['baridimob', 'ccp'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const DELIVERY_SPEEDS = ['instant', 'few_hours', 'manual'] as const;
export type DeliverySpeed = (typeof DELIVERY_SPEEDS)[number];

export const STOCK_STATUSES = ['in_stock', 'out_of_stock'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const FULFILLMENT_MODES = ['manual', 'auto'] as const;
export type FulfillmentMode = (typeof FULFILLMENT_MODES)[number];

export interface Category {
  id: string;
  slug: string;
  name: string;
  nameFr: string | null;
  description: string | null;
  sortOrder: number;
  productCount?: number;
}

export interface Denomination {
  id: string;
  productId: string;
  label: string;
  faceValue: string | null;
  priceDzd: number;
  comparePriceDzd: number | null;
  stockStatus: StockStatus;
  sortOrder: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  description: string | null;
  imageUrl: string | null;
  deliverySpeed: DeliverySpeed;
  fulfillmentMode: FulfillmentMode;
  isActive: boolean;
  isFeatured: boolean;
  popularity: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  denominations: Denomination[];
  /** Denormalised convenience fields, computed from denominations. */
  minPriceDzd: number | null;
  maxPriceDzd: number | null;
  totalDiscountPercent: number | null;
  inStock: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  denominationId: string;
  denominationLabel: string;
  unitPriceDzd: number;
  quantity: number;
  lineTotalDzd: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  fullName: string;
  phone: string;
  email: string | null;
  wilaya: string;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  customerNotes: string | null;
  adminNotes: string | null;
  status: OrderStatus;
  subtotalDzd: number;
  totalDzd: number;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

/** What the customer is allowed to see on the tracking page. Never includes plaintext codes. */
export interface OrderTrackingView {
  orderNumber: string;
  status: OrderStatus;
  fullName: string;
  wilaya: string;
  paymentMethod: PaymentMethod;
  totalDzd: number;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  items: Array<
    Pick<OrderItem, 'productName' | 'denominationLabel' | 'quantity' | 'lineTotalDzd'>
  >;
  /** Decrypted only for a verified (order number + phone) lookup of a delivered order. */
  codes: string[] | null;
  adminNotes: string | null;
}

export interface DashboardStats {
  ordersToday: number;
  revenueTodayDzd: number;
  ordersThisWeek: number;
  revenueThisWeekDzd: number;
  ordersPendingPayment: number;
  ordersAwaitingFulfillment: number;
  lifetimeRevenueDzd: number;
  totalOrders: number;
  bestSellers: Array<{
    productName: string;
    unitsSold: number;
    revenueDzd: number;
  }>;
  recentOrders: Array<{
    orderNumber: string;
    fullName: string;
    totalDzd: number;
    status: OrderStatus;
    createdAt: string;
  }>;
  revenueByDay: Array<{ day: string; revenueDzd: number; orders: number }>;
}
