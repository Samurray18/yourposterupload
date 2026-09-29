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

export type StockStatus = 'in_stock' | 'out_of_stock';
export type FulfillmentMode = 'manual' | 'auto';

export interface Category {
  id: string;
  slug: string;
  name: string;
  nameFr: string | null;
  description: string | null;
  sortOrder: number;
  productCount: number;
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
  items: Array<{
    productName: string;
    denominationLabel: string;
    quantity: number;
    lineTotalDzd: number;
  }>;
  codes: string[] | null;
  adminNotes: string | null;
}

export interface PaymentInstruction {
  accountName: string;
  accountIdentifier: string;
  notes: string | null;
}

export interface PublicSettings {
  brandName: string;
  supportEmail: string;
  supportPhone: string;
  announcement: string | null;
  paymentWindowHours: number;
  payments: Record<PaymentMethod, PaymentInstruction>;
  stats: { happyCustomers: number; averageDeliveryMinutes: number };
}

export interface PublicSettingsResponse {
  settings: PublicSettings;
  counts: { products: number; happyCustomers: number };
  wilayas: string[];
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
  productCount: number;
  bestSellers: Array<{ productName: string; unitsSold: number; revenueDzd: number }>;
  recentOrders: Array<{
    orderNumber: string;
    fullName: string;
    totalDzd: number;
    status: OrderStatus;
    createdAt: string;
  }>;
  revenueByDay: Array<{ day: string; revenueDzd: number; orders: number }>;
}

/* ------------------------------------------------------------------ reloadly */

export interface ReloadlyStatus {
  enabled: boolean;
  configured: boolean;
  environment: 'sandbox' | 'production';
  baseUrl: string;
  /** Env var names that still need a value. */
  missing: string[];
  imported: { products: string; denominations: string };
}

export interface ReloadlySettlement {
  environment: string;
  baseUrl: string;
  dzdRate: number;
  markupPercent: number;
}

export interface ReloadlyBalanceResponse {
  balance: { currencyCode?: string; balance?: number; usdBalance?: number };
  settlement: ReloadlySettlement;
}

export interface ReloadlyDenominationPreview {
  amount: number;
  label: string;
  priceDzd: number;
  costDzd: number;
}

export interface ReloadlyProductPreview {
  productId: number;
  productName: string;
  brand: string | null;
  country: string | null;
  currency: string;
  denominationType: 'FIXED' | 'RANGE';
  fixedRecipientDenominations: number[];
  minRecipientDenomination: number | null;
  maxRecipientDenomination: number | null;
  discountPercentage: number;
  senderFee: number;
  redeemInstruction: string | null;
  denominations: ReloadlyDenominationPreview[];
}

export interface ReloadlyProductListing {
  totalElements: number | null;
  totalPages: number | null;
  page: number;
  products: ReloadlyProductPreview[];
}

export interface ReloadlyImportSummary {
  productsSeen: number;
  productsCreated: number;
  productsUpdated: number;
  productsSkipped: number;
  denominationsWritten: number;
  /** Names of products skipped for having no usable denomination. */
  skippedNames: string[];
}
