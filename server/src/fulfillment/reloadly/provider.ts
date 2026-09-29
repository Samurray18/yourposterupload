/**
 * Reloadly fulfillment provider.
 *
 * This is the `auto` implementation of `FulfillmentProvider`. It buys the
 * card, records the transaction against the order, and hands the codes back
 * to the existing delivery path.
 *
 * Two safety properties matter more than anything else here:
 *
 *  1. Idempotency. The Reloadly transaction id is recorded against the order
 *     *line* before the customer is told anything. A repeat call (retry,
 *     double-click, cron replay) finds the recorded transaction for that line
 *     and re-reads the codes instead of buying again. The order number is also
 *     sent as `customIdentifier` so a purchase whose response we never saw can
 *     still be reconciled upstream.
 *
 *  2. Mutual exclusion. Two concurrent calls for the same order — a
 *     double-clicked button, or the admin panel and a cron job at once — would
 *     both see a NULL transaction id and both buy a card, with the second
 *     write hiding the first purchase. A short-lived claim token prevents
 *     that; a claim left behind by a crashed process expires.
 *
 *  3. Never throw for a recoverable upstream problem. Per the provider
 *     contract, a failure returns `pending: true` and the order stays in
 *     `processing` for a human to look at.
 */
import { randomUUID } from 'node:crypto';
import { config } from '../../config.js';
import { query } from '../../db/pool.js';
import { ReloadlyError } from './client.js';
import { fetchCodes, placeOrder } from './api.js';
import { getSupplierDenominations } from './import.js';
import { RELOADLY_SUPPLIER } from './constants.js';
import type {
  FulfillmentProvider,
  FulfillmentRequest,
  FulfillmentResult,
} from '../FulfillmentProvider.js';

const PROVIDER_NAME = RELOADLY_SUPPLIER;

/** A claim older than this is assumed to belong to a crashed process. */
const CLAIM_TTL_MINUTES = 10;

interface ReloadlyOrderRow {
  id: string;
  order_number: string;
  email: string | null;
  supplier_error: string | null;
}

export const reloadlyFulfillmentProvider: FulfillmentProvider = {
  name: PROVIDER_NAME,
  mode: 'auto',

  supports: () => config.reloadly.enabled && Boolean(config.reloadly.clientId),

  async deliver(request: FulfillmentRequest): Promise<FulfillmentResult> {
    const order = await loadOrder(request.orderNumber);
    if (!order) {
      return pending(`Order ${request.orderNumber} not found for fulfilment.`);
    }

    // Already purchased for this line: return the same codes instead of
    // buying a second card.
    const existing = await findTransaction(order.id, request.orderItemId);
    if (existing) {
      const codes = await readCodes(existing.transaction_id);
      if (codes) {
        return {
          codes: codes.map((smile) => renderSmile(smile)),
          instructions: request.denominationLabel,
          provider: PROVIDER_NAME,
          pending: false,
        };
      }
      return pending(
        `Waiting for Reloadly to issue codes for transaction ${existing.transaction_id}.`,
      );
    }

    const denominator = await resolveDenomination(request);
    if (!denominator) {
      await recordError(order.id, 'No Reloadly mapping for this denomination');
      return pending(
        'This denomination is not linked to a Reloadly product yet — import the catalogue or fulfil manually.',
      );
    }

    // Take an exclusive claim before spending money. Losing the race is not an
    // error: the winner is buying the card and a later pass will collect it.
    const claim = randomUUID();
    if (!(await claimOrder(order.id, claim))) {
      return pending('Another fulfilment attempt for this order is already in progress.');
    }

    try {
      const placed = await placeOrder({
        productId: denominator.productId,
        quantity: request.quantity,
        unitPrice: denominator.amount,
        customIdentifier: order.order_number,
        senderName: storeName(request),
        // Reloadly needs a recipient for the order. We only send an address
        // the customer actually provided; otherwise Reloadly's own account
        // mailbox is used by leaving the field out.
        ...(order.email ? { recipientEmail: order.email } : {}),
        recipientPhoneDetails: request.customer.phone,
      });

      await query(
        `UPDATE orders
            SET supplier_claim_token = NULL,
                supplier_claimed_at  = NULL,
                supplier_error = NULL
          WHERE id = $1`,
        [order.id],
      );
      await recordTransaction(
        order.id,
        request.orderItemId,
        String(placed.transactionId),
        denominator.amount,
        placed.status,
      );

      const codes = await fetchCodes(placed.transactionId, placed.smiles);

      if (placed.status !== 'SUCCESSFUL' || codes.length === 0) {
        await recordError(
          order.id,
          `Reloadly status ${placed.status}; transaction ${placed.transactionId}`,
        );
        return pending(
          `Reloadly accepted the order (transaction ${placed.transactionId}) but has not issued a code yet.`,
        );
      }

      return {
        codes: codes.map((smile) => renderSmile(smile)),
        instructions: request.denominationLabel,
        provider: PROVIDER_NAME,
        pending: false,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Reloadly error';
      const code = err instanceof ReloadlyError ? (err.code ?? String(err.status)) : 'UNKNOWN';

      // Free the claim so a retry can proceed, then record why. A rejected
      // order is a business outcome, not a transient fault: the admin should
      // see it rather than the job retrying forever.
      await releaseClaim(order.id, claim);
      await recordError(order.id, `${code}: ${message}`);
      console.error(`[reloadly] order ${request.orderNumber} failed — ${code}: ${message}`);

      return pending(`Reloadly could not fulfil this order (${code}). Fulfil manually or retry.`);
    }
  },
};

/** A PIN is a separate secret from the code; both must reach the customer. */
function renderSmile(smile: { code: string; pinCode?: string | null }): string {
  return smile.pinCode ? `${smile.code} (PIN: ${smile.pinCode})` : smile.code;
}

function pending(instructions: string): FulfillmentResult {
  return { codes: null, instructions, provider: PROVIDER_NAME, pending: true };
}

/**
 * Atomically takes the fulfilment claim for an order. Returns false when
 * another caller already holds it, so only one of them can spend money.
 *
 * A claim older than the TTL is treated as abandoned, which is what makes this
 * safe against a process that dies between claiming and buying.
 */
async function claimOrder(orderId: string, token: string): Promise<boolean> {
  const { rows } = await query<{ id: string }>(
    `UPDATE orders
        SET supplier_claim_token = $2,
            supplier_claimed_at  = now()
      WHERE id = $1
        AND (supplier_claim_token IS NULL
             OR supplier_claimed_at < now() - ($3 || ' minutes')::interval)
      RETURNING id`,
    [orderId, token, String(CLAIM_TTL_MINUTES)],
  );
  return rows.length > 0;
}

/** Releases a claim we own. A no-op once the transaction id has been stored. */
async function releaseClaim(orderId: string, token: string): Promise<void> {
  await query(
    `UPDATE orders
        SET supplier_claim_token = NULL,
            supplier_claimed_at  = NULL
      WHERE id = $1 AND supplier_claim_token = $2`,
    [orderId, token],
  );
}

async function recordError(orderId: string, message: string): Promise<void> {
  await query('UPDATE orders SET supplier_error = $2 WHERE id = $1', [orderId, message]);
}

async function loadOrder(orderNumber: string): Promise<ReloadlyOrderRow | null> {
  const { rows } = await query<ReloadlyOrderRow>(
    `SELECT id, order_number, email, supplier_error
       FROM orders WHERE order_number = $1`,
    [orderNumber],
  );
  return rows[0] ?? null;
}

/**
 * The purchase already recorded for this order line, if any. Keyed on the line
 * so a second item in the same order is not mistaken for a repeat of the first.
 */
async function findTransaction(
  orderId: string,
  orderItemId: string | null,
): Promise<{ transaction_id: string } | null> {
  const { rows } = await query<{ transaction_id: string }>(
    `SELECT transaction_id
       FROM order_supplier_transactions
      WHERE order_id = $1
        AND (($2::uuid IS NULL AND order_item_id IS NULL) OR order_item_id = $2::uuid)
      ORDER BY created_at
      LIMIT 1`,
    [orderId, orderItemId],
  );
  return rows[0] ?? null;
}

/**
 * Records the purchase. The unique index on (supplier, transaction_id) means a
 * duplicate insert raises rather than silently creating a second record.
 */
async function recordTransaction(
  orderId: string,
  orderItemId: string | null,
  transactionId: string,
  amount: number,
  status: string,
): Promise<void> {
  await query(
    `INSERT INTO order_supplier_transactions
       (order_id, order_item_id, supplier, transaction_id, status, unit_amount)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (supplier, transaction_id) DO NOTHING`,
    [orderId, orderItemId, RELOADLY_SUPPLIER, transactionId, status, amount],
  );
}

/** Re-reads codes for a stored transaction; `null` when none are ready. */
async function readCodes(
  transactionId: string,
): Promise<{ code: string; pinCode?: string | null }[] | null> {
  try {
    const codes = await fetchCodes(Number(transactionId));
    return codes.length > 0 ? codes : null;
  } catch (err) {
    console.error(`[reloadly] could not read codes for transaction ${transactionId}:`, err);
    return null;
  }
}

interface Denomination {
  productId: number;
  amount: number;
}

/**
 * Finds the supplier mapping for the ordered denomination. The order item
 * carries the local product id, so the mapping comes from the denominations
 * that the import wrote; the label is used as a tie-breaker.
 */
async function resolveDenomination(request: FulfillmentRequest): Promise<Denomination | null> {
  const mapped = await getSupplierDenominations(request.productId);
  if (mapped.length === 0) return null;

  const byLabel = mapped.find((d) => d.label === request.denominationLabel);
  const chosen = byLabel ?? mapped[0];
  if (!chosen) return null;

  return { productId: chosen.productId, amount: chosen.amount };
}

/** Reloadly shows this name to the recipient; the store is the sensible default. */
function storeName(request: FulfillmentRequest): string {
  return config.storeName || request.customer.fullName;
}
