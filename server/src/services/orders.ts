import type { PoolClient } from 'pg';
import { query, queryOne, withTransaction, type QueryParam } from '../db/pool.js';
import { AppError } from '../lib/errors.js';
import { encryptSecret, tryDecryptSecret } from '../lib/crypto.js';
import { generateOrderNumber, normalizePhone } from '../lib/ids.js';
import { resolveProvider } from '../fulfillment/FulfillmentProvider.js';
import { resolvePurchaseInput } from './products.js';
import {
  sendDeliveredEmail,
  sendOrderCancelledEmail,
  sendOrderPlacedEmail,
  sendPaymentConfirmedEmail,
} from './mailer.js';
import type {
  Order,
  OrderItem,
  OrderStatus,
  OrderTrackingView,
  PaymentMethod,
} from '../types.js';

/* --------------------------------------------------------------- read model */

interface OrderRow {
  id: string;
  order_number: string;
  full_name: string;
  phone: string;
  email: string | null;
  wilaya: string;
  payment_method: PaymentMethod;
  payment_reference: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  status: OrderStatus;
  subtotal_dzd: number;
  total_dzd: number;
  delivered_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_slug: string;
  product_image_url: string | null;
  denomination_id: string | null;
  denomination_label: string;
  unit_price_dzd: number;
  quantity: number;
  line_total_dzd: number;
}

function mapItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    productId: row.product_id ?? '',
    productName: row.product_name,
    productSlug: row.product_slug,
    productImageUrl: row.product_image_url,
    denominationId: row.denomination_id ?? '',
    denominationLabel: row.denomination_label,
    unitPriceDzd: Number(row.unit_price_dzd),
    quantity: row.quantity,
    lineTotalDzd: Number(row.line_total_dzd),
  };
}

function mapOrder(row: OrderRow, items: OrderItemRow[]): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    wilaya: row.wilaya,
    paymentMethod: row.payment_method,
    paymentReference: row.payment_reference,
    customerNotes: row.customer_notes,
    adminNotes: row.admin_notes,
    status: row.status,
    subtotalDzd: Number(row.subtotal_dzd),
    totalDzd: Number(row.total_dzd),
    deliveredAt: row.delivered_at ? row.delivered_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    items: items.filter((i) => i.order_id === row.id).map(mapItem),
  };
}

const ORDER_COLUMNS = `
  id, order_number, full_name, phone, email, wilaya, payment_method, payment_reference,
  customer_notes, admin_notes, status, subtotal_dzd, total_dzd, delivered_at,
  created_at, updated_at
`;

async function loadItemsFor(orderIds: string[]): Promise<OrderItemRow[]> {
  if (orderIds.length === 0) return [];
  const { rows } = await query<OrderItemRow>(
    'SELECT * FROM order_items WHERE order_id = ANY($1::uuid[]) ORDER BY id',
    [orderIds],
  );
  return rows;
}

export async function getOrderById(id: string): Promise<Order | null> {
  const row = await queryOne<OrderRow>(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1`, [id]);
  if (!row) return null;
  return mapOrder(row, await loadItemsFor([row.id]));
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const row = await queryOne<OrderRow>(`SELECT ${ORDER_COLUMNS} FROM orders WHERE order_number = $1`, [
    orderNumber.trim().toUpperCase(),
  ]);
  if (!row) return null;
  return mapOrder(row, await loadItemsFor([row.id]));
}

export interface ListOrdersParams {
  status?: OrderStatus[];
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listOrders(
  params: ListOrdersParams = {},
): Promise<{ orders: Order[]; total: number }> {
  const where: string[] = [];
  const values: QueryParam[] = [];

  if (params.status?.length) {
    values.push(params.status);
    where.push(`status = ANY($${values.length}::text[])`);
  }
  if (params.search) {
    values.push(`%${params.search}%`);
    where.push(
      `(order_number ILIKE $${values.length} OR full_name ILIKE $${values.length}
        OR phone ILIKE $${values.length} OR email ILIKE $${values.length})`,
    );
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalRow = await queryOne<{ count: number }>(
    `SELECT count(*)::int AS count FROM orders ${whereSql}`,
    values,
  );

  values.push(params.limit ?? 50, params.offset ?? 0);
  const { rows } = await query<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  const itemsByOrder = new Map<string, OrderItemRow[]>();
  const allItems = await loadItemsFor(rows.map((x) => x.id));
  for (const item of allItems) {
    const list = itemsByOrder.get(item.order_id);
    if (list) list.push(item);
    else itemsByOrder.set(item.order_id, [item]);
  }

  return {
    orders: rows.map((r) => mapOrder(r, itemsByOrder.get(r.id) ?? [])),
    total: totalRow?.count ?? 0,
  };
}

/* ------------------------------------------------------------- order intake */

export interface CreateOrderInput {
  fullName: string;
  phone: string;
  email?: string | null;
  wilaya: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string | null;
  notes?: string | null;
  items: Array<{ denominationId: string; quantity: number }>;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (input.items.length === 0) throw AppError.badRequest('Your cart is empty');
  if (input.items.length > 20) throw AppError.badRequest('Too many separate items in one order');

  // Merge duplicate lines so the customer cannot get a discount by splitting.
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
      throw AppError.badRequest('Quantity must be between 1 and 10');
    }
    quantities.set(item.denominationId, (quantities.get(item.denominationId) ?? 0) + item.quantity);
  }

  // Prices always come from the database, never from the client.
  const lines: Array<{ productId: string; productName: string; productSlug: string; imageUrl: string | null; denominationId: string; denominationLabel: string; unitPrice: number; quantity: number }> = [];
  for (const [denominationId, quantity] of quantities) {
    const { product, denomination } = await resolvePurchaseInput(denominationId);
    lines.push({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: product.imageUrl,
      denominationId: denomination.id,
      denominationLabel: denomination.label,
      unitPrice: denomination.priceDzd,
      quantity,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  const order = await withTransaction(async (client) => {
    const orderNumber = await uniqueOrderNumber(client);
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO orders
         (order_number, full_name, phone, email, wilaya, payment_method, payment_reference,
          customer_notes, subtotal_dzd, total_dzd)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
       RETURNING id`,
      [
        orderNumber,
        input.fullName.trim(),
        normalizePhone(input.phone),
        input.email?.trim() || null,
        input.wilaya,
        input.paymentMethod,
        input.paymentReference?.trim() || null,
        input.notes?.trim() || null,
        subtotal,
      ],
    );
    const orderId = rows[0]!.id;

    for (const line of lines) {
      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, product_name, product_slug, product_image_url,
            denomination_id, denomination_label, unit_price_dzd, quantity, line_total_dzd)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          orderId,
          line.productId,
          line.productName,
          line.productSlug,
          line.imageUrl,
          line.denominationId,
          line.denominationLabel,
          line.unitPrice,
          line.quantity,
          line.unitPrice * line.quantity,
        ],
      );
      await client.query(
        `INSERT INTO product_sales (product_id, units_sold, revenue_dzd)
         VALUES ($1, $2, $3)
         ON CONFLICT (product_id) DO UPDATE
           SET units_sold = product_sales.units_sold + EXCLUDED.units_sold,
               revenue_dzd = product_sales.revenue_dzd + EXCLUDED.revenue_dzd,
               updated_at = now()`,
        [line.productId, line.quantity, line.unitPrice * line.quantity],
      );
    }

    return orderId;
  });

  const created = (await getOrderById(order))!;
  void sendOrderPlacedEmail(created).catch((err) =>
    console.error('[orders] order-placed email failed:', err),
  );
  return created;
}

async function uniqueOrderNumber(client: PoolClient): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateOrderNumber();
    const { rowCount } = await client.query('SELECT 1 FROM orders WHERE order_number = $1', [
      candidate,
    ]);
    if (!rowCount) return candidate;
  }
  throw AppError.internal('Could not allocate an order number');
}

/* ---------------------------------------------------------------- tracking */

/**
 * Customer-facing lookup. Both the order number and the phone number must match,
 * which is the only "authentication" in the tracking flow — codes are only
 * decrypted after this check passes.
 */
export async function trackOrder(orderNumber: string, phone: string): Promise<OrderTrackingView> {
  const order = await getOrderByNumber(orderNumber);
  if (!order) throw AppError.notFound('No order found with that number');
  if (normalizePhone(phone) !== order.phone) {
    throw AppError.forbidden('Phone number does not match this order');
  }

  const codes =
    order.status === 'delivered' ? await decryptOrderCodes(order.id) : null;

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    fullName: order.fullName,
    wilaya: order.wilaya,
    paymentMethod: order.paymentMethod,
    totalDzd: order.totalDzd,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    deliveredAt: order.deliveredAt,
    items: order.items.map((item) => ({
      productName: item.productName,
      denominationLabel: item.denominationLabel,
      quantity: item.quantity,
      lineTotalDzd: item.lineTotalDzd,
    })),
    codes,
    adminNotes: order.adminNotes,
  };
}

export async function decryptOrderCodes(orderId: string): Promise<string[] | null> {
  const { rows } = await query<{ encrypted_payload: string }>(
    'SELECT encrypted_payload FROM order_deliveries WHERE order_id = $1 ORDER BY created_at',
    [orderId],
  );
  if (rows.length === 0) return null;
  const codes = rows.map((r) => tryDecryptSecret(r.encrypted_payload)).filter((c): c is string => !!c);
  return codes.length ? codes : null;
}

/* --------------------------------------------------------- admin operations */

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['payment_confirmed', 'cancelled'],
  payment_confirmed: ['processing', 'delivered', 'cancelled'],
  processing: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export async function updateOrderStatus(
  orderId: string,
  next: OrderStatus,
  options: { adminNotes?: string | null; paymentReference?: string | null } = {},
): Promise<Order> {
  const order = await getOrderById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  if (order.status === next) return order;
  if (!ALLOWED_TRANSITIONS[order.status].includes(next)) {
    throw AppError.badRequest(`Cannot move an order from ${order.status} to ${next}`);
  }

  await query(
    `UPDATE orders
        SET status = $2,
            admin_notes = COALESCE($3, admin_notes),
            payment_reference = COALESCE($4, payment_reference),
            delivered_at = CASE WHEN $2 = 'delivered' THEN now() ELSE delivered_at END
      WHERE id = $1`,
    [orderId, next, options.adminNotes ?? null, options.paymentReference ?? null],
  );

  const updated = (await getOrderById(orderId))!;
  void notifyStatusChange(updated, order.status).catch((err) =>
    console.error('[orders] status email failed:', err),
  );
  return updated;
}

async function notifyStatusChange(order: Order, previous: OrderStatus): Promise<void> {
  if (order.status === 'payment_confirmed' && previous === 'pending_payment') {
    await sendPaymentConfirmedEmail(order);
  } else if (order.status === 'cancelled') {
    await sendOrderCancelledEmail(order);
  }
}

/**
 * Deliver an order by pasting the code(s) the admin sourced by hand.
 * This is the manual counterpart to `FulfillmentProvider.deliver`.
 */
export async function deliverManually(
  orderId: string,
  codes: string[],
  options: {
    instructions?: string | null;
    orderItemId?: string | null;
    /** Recorded on the delivery rows so auto-bought codes are auditable. */
    fulfilledBy?: string;
  } = {},
): Promise<Order> {
  const order = await getOrderById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  if (order.status === 'cancelled') throw AppError.badRequest('This order was cancelled');
  if (order.status === 'pending_payment') {
    throw AppError.badRequest('Confirm the payment before delivering');
  }
  if (order.status === 'delivered') {
    throw AppError.badRequest('This order is already delivered');
  }

  const expected = order.items.reduce((sum, item) => sum + item.quantity, 0);
  if (codes.length !== expected) {
    throw AppError.badRequest(
      `This order needs ${expected} code${expected === 1 ? '' : 's'} — you pasted ${codes.length}`,
    );
  }

  await withTransaction(async (client) => {
    await client.query('DELETE FROM order_deliveries WHERE order_id = $1', [orderId]);
    const defaultItem = order.items[0]?.id ?? null;
    for (const code of codes) {
      await client.query(
        `INSERT INTO order_deliveries (order_id, order_item_id, encrypted_payload, instructions, fulfilled_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          orderId,
          options.orderItemId ?? defaultItem,
          encryptSecret(code),
          options.instructions ?? null,
          options.fulfilledBy ?? 'manual',
        ],
      );
    }
    await client.query(
      `UPDATE orders
          SET status = 'delivered', delivered_at = now(),
              admin_notes = COALESCE($2, admin_notes)
        WHERE id = $1`,
      [orderId, options.instructions ?? null],
    );
  });

  const updated = (await getOrderById(orderId))!;
  const decrypted = codes;
  void sendDeliveredEmail(updated, decrypted).catch((err) =>
    console.error('[orders] delivery email failed:', err),
  );
  return updated;
}

/**
 * Automatic path. Selects the provider from each product's `fulfillment_mode`
 * and only marks the order delivered when codes came back for *every* item.
 *
 * Multi-item orders are fulfilled line by line: each item resolves its own
 * provider, because a cart can mix a Reloadly card with a manually-fulfilled
 * one. If any line comes back pending the order stays in `processing` and is
 * retried later — the lines that already succeeded are not re-bought, since
 * the provider returns the stored transaction's codes instead.
 */
export async function deliverAutomatically(orderId: string): Promise<Order> {
  const order = await getOrderById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  if (order.status === 'delivered' || order.status === 'cancelled') return order;
  if (order.status === 'pending_payment') {
    throw AppError.badRequest('Confirm the payment before delivering');
  }
  if (order.items.length === 0) throw AppError.badRequest('Order has no items');

  const collected: string[] = [];
  const instructions: string[] = [];
  let pendingLine: string | null = null;

  for (const item of order.items) {
    const provider = await resolveProviderForProduct(item.productId);
    const result = await provider.deliver({
      orderNumber: order.orderNumber,
      orderItemId: item.id,
      productId: item.productId,
      productSlug: item.productSlug,
      productName: item.productName,
      denominationLabel: item.denominationLabel,
      faceValue: null,
      quantity: item.quantity,
      customer: { fullName: order.fullName, email: order.email, phone: order.phone },
      orderNotes: order.customerNotes,
    });

    if (result.pending || !result.codes?.length) {
      // Keep going so the remaining lines are attempted, then report the
      // first one that blocked delivery.
      pendingLine ??= result.instructions ?? `${item.productName} is not ready yet.`;
      continue;
    }

    collected.push(...result.codes);
    if (result.instructions) instructions.push(`${item.denominationLabel}: ${result.instructions}`);
  }

  if (pendingLine !== null || collected.length === 0) {
    await query('UPDATE orders SET status = $2 WHERE id = $1', [orderId, 'processing']);
    return (await getOrderById(orderId))!;
  }

  // A supplier can issue fewer codes than the quantity ordered. Delivering a
  // short order silently would strand the customer, and delivering none would
  // hide the purchase — so hold it in `processing` with the reason recorded and
  // let an operator decide. The codes already issued stay recoverable from the
  // stored supplier transactions.
  const expected = order.items.reduce((sum, item) => sum + item.quantity, 0);
  if (collected.length < expected) {
    await query(
      `UPDATE orders
          SET status = 'processing',
              supplier_error = COALESCE(supplier_error, $2)
        WHERE id = $1`,
      [
        orderId,
        `Supplier issued ${collected.length} of ${expected} code(s). Codes already bought: ${collected.length}.`,
      ],
    );
    return (await getOrderById(orderId))!;
  }

  return deliverManually(orderId, collected, {
    instructions: instructions.length > 0 ? instructions.join('\n') : null,
    orderItemId: order.items[0]?.id ?? null,
    fulfilledBy: 'auto',
  });
}

/** Resolves the provider for one line item's product. */
async function resolveProviderForProduct(productId: string) {
  const { rows } = await query<{ fulfillment_mode: 'manual' | 'auto' }>(
    'SELECT fulfillment_mode FROM products WHERE id = $1',
    [productId],
  );
  return resolveProvider(rows[0]?.fulfillment_mode ?? 'manual');
}

export async function updateAdminNotes(orderId: string, notes: string | null): Promise<Order> {
  await query('UPDATE orders SET admin_notes = $2 WHERE id = $1', [orderId, notes]);
  return (await getOrderById(orderId))!;
}
