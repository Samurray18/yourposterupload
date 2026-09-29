/**
 * Fulfillment abstraction
 * =======================
 *
 * Everything the app knows about "how do we obtain a code for this order" lives
 * behind `FulfillmentProvider`. Two implementations are registered:
 * `ManualFulfillmentProvider` (an admin pastes the code in) and
 * `ReloadlyFulfillmentProvider` (we buy the card from Reloadly).
 *
 * A product carries `fulfillment_mode` ('manual' | 'auto'), which selects the
 * provider. `resolveProvider` is the single place that maps mode -> provider, so
 * routing changes stay in one file.
 */
import type { FulfillmentMode } from '../types.js';

export interface FulfillmentRequest {
  orderNumber: string;
  /**
   * The order line being fulfilled. Automatic suppliers need this: an order can
   * hold several items, each bought separately, and the supplier transaction
   * must be recorded against the right line or a repeat run would buy the
   * first card twice.
   */
  orderItemId: string | null;
  productId: string;
  productSlug: string;
  productName: string;
  /** Free-form label such as "10 USD" / "660 UC" / "1 month". */
  denominationLabel: string;
  /** Face value in the product's own currency, when it has one. */
  faceValue: string | null;
  quantity: number;
  customer: {
    fullName: string;
    email: string | null;
    phone: string;
  };
  /** Whatever the admin typed as the order note, if any. */
  orderNotes: string | null;
}

export interface FulfillmentResult {
  /** The code / credentials handed to the customer. `null` means the provider has nothing yet. */
  codes: string[] | null;
  /** Optional human-readable instructions shown next to the code. */
  instructions: string | null;
  provider: string;
  /** Set when the provider is still working and the order should stay non-delivered. */
  pending: boolean;
}

export interface FulfillmentProvider {
  readonly name: string;
  readonly mode: FulfillmentMode;
  /** Whether this provider can serve a product at all (e.g. only specific SKUs). */
  supports(product: { slug: string; categorySlug: string }): boolean;
  /**
   * Obtain codes. May return `pending: true` when the provider needs time; the
   * order then stays in `processing` and a retry happens later.
   */
  deliver(request: FulfillmentRequest): Promise<FulfillmentResult>;
}

import { manualFulfillmentProvider } from './manual.js';
import { reloadlyFulfillmentProvider } from './reloadly/provider.js';

const providers: Record<FulfillmentMode, FulfillmentProvider> = {
  manual: manualFulfillmentProvider,
  auto: reloadlyFulfillmentProvider,
};

export function resolveProvider(mode: FulfillmentMode): FulfillmentProvider {
  return providers[mode] ?? manualFulfillmentProvider;
}

export function allProviders(): FulfillmentProvider[] {
  return Object.values(providers);
}
