import type {
  FulfillmentProvider,
  FulfillmentRequest,
  FulfillmentResult,
} from './FulfillmentProvider.js';

/**
 * Manual fulfillment: an admin sources the code themselves (reseller site,
 * bank transfer to a distributor, physical voucher) and pastes it into the
 * admin dashboard. The provider itself contributes nothing — it exists so the
 * rest of the app has one uniform call site.
 */
export const manualFulfillmentProvider: FulfillmentProvider = {
  name: 'manual',
  mode: 'manual',
  supports: () => true,
  async deliver(_request: FulfillmentRequest): Promise<FulfillmentResult> {
    // Nothing to do: `deliverManually` in the orders service handles this path
    // and is called directly. This provider is registered so that
    // `resolveProvider('manual')` always succeeds.
    return { codes: null, instructions: null, provider: 'manual', pending: true };
  },
};
