/**
 * Typed wrappers over the Reloadly Gift Cards endpoints.
 *
 * Each method validates its response before returning, so callers work with
 * known shapes only.
 */
import { reloadlyFetch } from './client.js';
import {
  balanceSchema,
  productPageSchema,
  placeOrderSchema,
  transactionSchema,
} from './types.js';
import type {
  ReloadlyBalance,
  ReloadlyOrder,
  ReloadlyProduct,
  ReloadlyProductPage,
  ReloadlySmile,
  ReloadlyTransaction,
} from './types.js';

export interface ListProductsParams {
  countryCode?: string;
  categoryId?: number;
  /** Brand filter, accepted by the API but rarely used by the importer. */
  brandId?: number;
  search?: string;
  page?: number;
  size?: number;
  includeFixed?: boolean;
  includeRange?: boolean;
  includeGlobal?: boolean;
}

export async function listProducts(
  params: ListProductsParams = {},
): Promise<ReloadlyProductPage> {
  const raw = await reloadlyFetch<unknown>('/products', {
    query: {
      countryCode: params.countryCode,
      category: params.categoryId,
      brand: params.brandId,
      search: params.search,
      page: params.page ?? 0,
      size: params.size ?? 100,
      includeFixed: params.includeFixed,
      includeRange: params.includeRange,
      includeGlobal: params.includeGlobal,
    },
  });

  const parsed = productPageSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Reloadly returned an unrecognised product listing');
  }

  // Accept both the paged envelope and a bare array.
  if (Array.isArray(parsed.data)) {
    return {
      products: parsed.data,
      totalElements: parsed.data.length,
      totalPages: 1,
      page: 0,
    };
  }

  return {
    products: parsed.data.content,
    totalElements: parsed.data.totalElements ?? null,
    totalPages: parsed.data.totalPages ?? null,
    page: parsed.data.number ?? params.page ?? 0,
  };
}

/**
 * Walks every page of a product query. Bounded by `maxPages` so a
 * misbehaving upstream cannot spin forever, and so a bulk import stays
 * predictable on a free-tier quota.
 */
export async function listAllProducts(
  params: ListProductsParams = {},
  maxPages = 20,
): Promise<ReloadlyProduct[]> {
  const collected: ReloadlyProduct[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const result = await listProducts({ ...params, page });
    collected.push(...result.products);

    // Stop on a short page or once the advertised total is reached.
    if (result.products.length === 0) break;
    if (result.totalPages !== null && page + 1 >= result.totalPages) break;
    if (result.totalElements !== null && collected.length >= result.totalElements) break;
  }

  return collected;
}

export interface PlaceOrderInput {
  productId: number;
  quantity: number;
  /** Face value in the product's recipient currency. */
  unitPrice: number;
  /** Our order number, used to reconcile and to de-duplicate retries. */
  customIdentifier: string;
  senderName: string;
  recipientEmail?: string;
  recipientPhoneDetails?: string;
  preOrder?: boolean;
  productAdditionalRequirements?: Record<string, unknown>;
}

/**
 * Purchases a card. Never retried automatically: a timeout may have been
 * accepted upstream, and a second attempt would spend money twice. The
 * `customIdentifier` we pass is what makes the outcome recoverable.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<ReloadlyOrder> {
  const raw = await reloadlyFetch<unknown>('/orders', {
    method: 'POST',
    body: input,
    retries: 1,
  });

  const parsed = placeOrderSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Reloadly returned an unrecognised order response');
  return parsed.data;
}

export async function getTransaction(transactionId: number): Promise<ReloadlyTransaction> {
  const raw = await reloadlyFetch<unknown>(`/transactions/${transactionId}`, { retries: 2 });
  const parsed = transactionSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Reloadly returned an unrecognised transaction');
  return parsed.data;
}

/**
 * Codes for a transaction. The modern order response already embeds
 * `smiles`; the code endpoint is the fallback for cards that were still
 * processing on the first attempt.
 */
export async function fetchCodes(
  transactionId: number,
  embedded?: ReloadlySmile[],
): Promise<ReloadlySmile[]> {
  if (embedded && embedded.length > 0) return embedded;

  const raw = await reloadlyFetch<unknown>(`/transactions/${transactionId}/code`, { retries: 2 });
  const parsed = transactionSchema.safeParse(raw);
  if (parsed.success && parsed.data.smiles.length > 0) return parsed.data.smiles;

  // Older responses put a single code at the top level.
  const legacy = raw as { redeemCode?: string; pinCode?: string; validity?: string };
  if (typeof legacy?.redeemCode === 'string' && legacy.redeemCode) {
    return [{ code: legacy.redeemCode, pinCode: legacy.pinCode ?? null, validity: legacy.validity ?? null }];
  }

  return [];
}

export async function getBalance(): Promise<ReloadlyBalance> {
  const raw = await reloadlyFetch<unknown>('/balance', { retries: 2 });
  const parsed = balanceSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}
