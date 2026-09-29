import { config } from '../config.js';
import type {
  FulfillmentProvider,
  FulfillmentRequest,
  FulfillmentResult,
} from './FulfillmentProvider.js';

/**
 * Placeholder for a real distributor API (e.g. a card reseller / aggregator).
 *
 * To make it real:
 *   1. Fill in `endpoint`, `apiKeyEnv` and `mapRequest` / `parseResponse`.
 *   2. Set the product's `fulfillment_mode` to 'auto' in the admin dashboard.
 *   3. Add the API key to the environment.
 *
 * The contract is: return the codes for the order, or return `pending: true`
 * and the caller will retry later. Never throw for a recoverable upstream
 * problem — the order should just move to `processing`.
 */
const ENDPOINT = process.env.DISTRIBUTOR_API_URL ?? '';
const API_KEY = process.env.DISTRIBUTOR_API_KEY ?? '';
const TIMEOUT_MS = 20_000;

export const distributorApiFulfillmentProvider: FulfillmentProvider = {
  name: 'distributor-api',
  mode: 'auto',
  supports: () => Boolean(ENDPOINT && API_KEY),
  async deliver(request: FulfillmentRequest): Promise<FulfillmentResult> {
    if (!ENDPOINT || !API_KEY) {
      // Not configured: behave like manual so an "auto" product is never
      // silently left hanging without an admin noticing.
      return {
        codes: null,
        instructions: 'Distributor API is not configured yet — fulfil this order manually.',
        provider: 'distributor-api',
        pending: true,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          reference: request.orderNumber,
          product: request.productSlug,
          denomination: request.denominationLabel,
          faceValue: request.faceValue,
          quantity: request.quantity,
          // Keep customer PII out of third-party calls unless the distributor
          // actually needs it. Flip to true once that contract is settled.
          notifyCustomer: false,
        }),
      });

      if (response.status === 202) {
        return { codes: null, instructions: null, provider: 'distributor-api', pending: true };
      }
      if (!response.ok) {
        console.error(
          `[fulfillment] distributor rejected ${request.orderNumber}: ${response.status}`,
        );
        return {
          codes: null,
          instructions: null,
          provider: 'distributor-api',
          pending: true,
        };
      }

      const payload = (await response.json()) as { codes?: unknown; instructions?: unknown };
      const codes = Array.isArray(payload.codes)
        ? payload.codes.filter((c): c is string => typeof c === 'string')
        : null;

      return {
        codes: codes && codes.length > 0 ? codes : null,
        instructions: typeof payload.instructions === 'string' ? payload.instructions : null,
        provider: 'distributor-api',
        pending: !codes || codes.length === 0,
      };
    } catch (err) {
      console.error(`[fulfillment] distributor call failed for ${request.orderNumber}:`, err);
      return { codes: null, instructions: null, provider: 'distributor-api', pending: true };
    } finally {
      clearTimeout(timeout);
    }
  },
};

export const distributorIsConfigured = Boolean(ENDPOINT && API_KEY);
export const distributorBase = config.env === 'production' ? 'configured' : ENDPOINT || 'unset';
