import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, ApiError } from '../../lib/api';
import type { Order, OrderStatus } from '../../lib/types';
import { Alert, CodeBlock, EmptyState, StatusBadge } from '../../components/ui';
import {
  PAYMENT_LABEL,
  STATUS_LABEL,
  formatDateTime,
  formatDzd,
  timeAgo,
} from '../../lib/format';

const FILTERS: Array<{ label: string; value: string }> = [
  { label: 'All', value: '' },
  { label: 'Pending payment', value: 'pending_payment' },
  { label: 'Paid', value: 'payment_confirmed,processing' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

export function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';

  const load = useCallback(async () => {
    try {
      const response = await api.admin.orders({ status: status || undefined, search: search || undefined, limit: 100 });
      setOrders(response.orders);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load orders');
      setOrders([]);
    }
  }, [status, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 3500);
  };

  const selected = useMemo(
    () => orders?.find((order) => order.id === selectedId) ?? null,
    [orders, selectedId],
  );

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl">Orders</h1>
      <p className="text-muted mt-1">
        Confirm payments, paste codes, and the customer sees them immediately.
      </p>

      {notice && (
        <div className="mt-5">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}
      {error && (
        <div className="mt-5">
          <Alert tone="error" title="Something went wrong">
            {error}
          </Alert>
        </div>
      )}

      {/* ---------------------------------------------------------- filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value || 'all'}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              if (filter.value) next.set('status', filter.value);
              else next.delete('status');
              setSearchParams(next, { replace: true });
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              status === filter.value
                ? 'bg-accent-500/15 text-accent-200'
                : 'text-muted hover:text-bright bg-ink-850'
            }`}
          >
            {filter.label}
          </button>
        ))}

        <form
          className="ml-auto"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get('q');
            const next = new URLSearchParams(searchParams);
            if (typeof value === 'string' && value.trim()) next.set('search', value.trim());
            else next.delete('search');
            setSearchParams(next, { replace: true });
          }}
        >
          <input
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Order number, name, phone…"
            className="input w-64 py-2 text-sm"
            aria-label="Search orders"
          />
        </form>
      </div>

      {/* ------------------------------------------------------------ table */}
      {orders === null ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No orders here" description="Try a different filter or search term." />
        </div>
      ) : (
        <div className="panel mt-6 overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-ink-700 text-muted border-b text-left">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className={`border-ink-800 border-b last:border-0 transition-colors ${
                    selectedId === order.id ? 'bg-accent-500/5' : 'hover:bg-ink-800/50'
                  }`}
                >
                  <td className="text-accent-300 px-4 py-3 font-mono font-semibold whitespace-nowrap">
                    {order.orderNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-bright block font-semibold">{order.fullName}</span>
                    <span className="text-ink-500 text-xs">{order.phone}</span>
                  </td>
                  <td className="text-muted px-4 py-3">
                    {order.items.length} item{order.items.length === 1 ? '' : 's'}
                  </td>
                  <td className="text-bright px-4 py-3 font-bold whitespace-nowrap">
                    {formatDzd(order.totalDzd)}
                  </td>
                  <td className="text-muted px-4 py-3 whitespace-nowrap">
                    {PAYMENT_LABEL[order.paymentMethod]}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="text-ink-500 px-4 py-3 whitespace-nowrap">
                    {timeAgo(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedId(selectedId === order.id ? null : order.id)}
                      className="btn-secondary btn-sm"
                    >
                      {selectedId === order.id ? 'Close' : 'Manage'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <OrderDrawer
          order={selected}
          onClose={() => setSelectedId(null)}
          onChanged={(message) => {
            void load();
            flash(message);
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------- the drawer */

function OrderDrawer({
  order,
  onClose,
  onChanged,
}: {
  order: Order;
  onClose(): void;
  onChanged(message: string): void;
}) {
  const [codes, setCodes] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [adminNotes, setAdminNotes] = useState(order.adminNotes ?? '');
  const [existingCodes, setExistingCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expectedCodes = order.items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    setCodes([]);
    setInstructions('');
    setAdminNotes(order.adminNotes ?? '');
    setError(null);
    // Show the already-delivered codes so the owner can see what went out.
    if (order.status === 'delivered') {
      api.admin
        .order(order.id)
        .then((response) => setExistingCodes(response.codes))
        .catch(() => setExistingCodes(null));
    } else {
      setExistingCodes(null);
    }
  }, [order]);

  const setStatus = async (status: OrderStatus) => {
    setBusy(true);
    setError(null);
    try {
      await api.admin.setOrderStatus(order.id, { status });
      onChanged(`Order ${order.orderNumber} → ${STATUS_LABEL[status]}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the order');
    } finally {
      setBusy(false);
    }
  };

  const saveNotes = async () => {
    setBusy(true);
    try {
      await api.admin.saveOrderNotes(order.id, adminNotes || null);
      onChanged('Notes saved');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save notes');
    } finally {
      setBusy(false);
    }
  };

  const deliver = async () => {
    const cleaned = codes.map((code) => code.trim()).filter(Boolean);
    if (cleaned.length !== expectedCodes) {
      setError(`This order needs ${expectedCodes} code(s) — you entered ${cleaned.length}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.admin.deliverOrder(order.id, {
        codes: cleaned,
        instructions: instructions || null,
      });
      setCodes([]);
      onChanged(`Order ${order.orderNumber} delivered — the customer has been emailed`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not deliver');
    } finally {
      setBusy(false);
    }
  };

  const deliverAuto = async () => {
    setBusy(true);
    setError(null);
    try {
      const { order: updated } = await api.admin.deliverOrderAuto(order.id);
      onChanged(
        updated.status === 'delivered'
          ? `Order ${order.orderNumber} delivered automatically`
          : `Distributor has not returned a code yet — order moved to ${STATUS_LABEL[updated.status]}`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Automatic delivery failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-ink-950/80 fixed inset-0 z-50 overflow-y-auto p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(event) => event.stopPropagation()}
        className="panel mx-auto my-6 w-full max-w-2xl p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-accent-300 font-mono text-xl font-extrabold">{order.orderNumber}</h2>
            <p className="text-muted mt-1 text-sm">{formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <button type="button" onClick={onClose} className="btn-ghost btn-sm" aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        {/* ------------------------------------------------------ customer */}
        <dl className="border-ink-700 mt-5 grid gap-4 border-t pt-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Customer</dt>
            <dd className="text-bright font-semibold">{order.fullName}</dd>
          </div>
          <div>
            <dt className="text-muted">Phone</dt>
            <dd className="text-bright font-semibold">
              <a href={`tel:${order.phone}`} className="link">
                {order.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
            <dd className="text-bright font-semibold break-all">
              {order.email ? (
                <a href={`mailto:${order.email}`} className="link">
                  {order.email}
                </a>
              ) : (
                <span className="text-ink-500">Not provided</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Wilaya</dt>
            <dd className="text-bright font-semibold">{order.wilaya}</dd>
          </div>
          <div>
            <dt className="text-muted">Payment method</dt>
            <dd className="text-bright font-semibold">{PAYMENT_LABEL[order.paymentMethod]}</dd>
          </div>
          <div>
            <dt className="text-muted">Transfer reference</dt>
            <dd className="text-bright font-semibold">
              {order.paymentReference || <span className="text-ink-500">None</span>}
            </dd>
          </div>
        </dl>

        {order.customerNotes && (
          <div className="panel-inset mt-4 p-4 text-sm">
            <p className="text-muted text-xs font-semibold tracking-wide uppercase">
              Customer note
            </p>
            <p className="text-bright mt-1">{order.customerNotes}</p>
          </div>
        )}

        {/* --------------------------------------------------------- items */}
        <div className="mt-5">
          <h3 className="text-bright text-sm font-bold">Items</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="border-ink-800 flex justify-between gap-3 border-b pb-2">
                <span className="text-muted">
                  <span className="text-bright block font-semibold">{item.productName}</span>
                  {item.denominationLabel} × {item.quantity}
                </span>
                <span className="text-bright shrink-0 font-semibold">
                  {formatDzd(item.lineTotalDzd)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between text-base">
            <span className="text-bright font-bold">Total</span>
            <span className="text-gradient font-extrabold">{formatDzd(order.totalDzd)}</span>
          </div>
        </div>

        {/* ------------------------------------------------------- actions */}
        <div className="border-ink-700 mt-6 border-t pt-5">
          <h3 className="text-bright text-sm font-bold">Actions</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {order.status === 'pending_payment' && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStatus('payment_confirmed')}
                  className="btn-primary btn-sm"
                >
                  ✓ Payment received
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStatus('cancelled')}
                  className="btn-danger btn-sm"
                >
                  Cancel order
                </button>
              </>
            )}

            {order.status === 'payment_confirmed' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setStatus('processing')}
                className="btn-secondary btn-sm"
              >
                Start processing
              </button>
            )}

            <button
              type="button"
              disabled={busy || order.status === 'delivered'}
              onClick={deliverAuto}
              className="btn-secondary btn-sm"
              title="Uses the product's fulfillment mode; falls back to manual when the distributor API is not configured"
            >
              Try automatic delivery
            </button>

            {order.status === 'cancelled' && (
              <span className="text-ink-500 self-center text-sm">This order is closed.</span>
            )}
          </div>
        </div>

        {/* --------------------------------------------------- deliver code */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="border-accent-500/30 bg-accent-500/5 mt-5 rounded-xl border p-4">
            <h3 className="text-bright text-sm font-bold">
              Deliver the code
            </h3>
            <p className="text-muted mt-1 text-xs">
              One code per unit ordered — this order needs {expectedCodes}. Codes are encrypted
              before they are stored.
            </p>

            <div className="mt-3 space-y-2">
              {Array.from({ length: expectedCodes }, (_, index) => (
                <input
                  key={index}
                  value={codes[index] ?? ''}
                  onChange={(event) => {
                    const next = [...codes];
                    next[index] = event.target.value;
                    setCodes(next);
                  }}
                  placeholder={`Code ${index + 1}`}
                  className="input font-mono"
                  aria-label={`Code ${index + 1}`}
                />
              ))}
            </div>

            <input
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="Optional instructions shown with the code (e.g. redeem at store…)"
              className="input mt-2"
              aria-label="Delivery instructions"
            />

            <button
              type="button"
              onClick={deliver}
              disabled={busy || order.status === 'pending_payment'}
              className="btn-primary mt-3 w-full"
            >
              {order.status === 'pending_payment'
                ? 'Confirm payment before delivering'
                : 'Mark as delivered & email the code'}
            </button>
          </div>
        )}

        {order.status === 'delivered' && existingCodes && existingCodes.length > 0 && (
          <div className="border-emerald-500/30 bg-emerald-500/5 mt-5 rounded-xl border p-4">
            <h3 className="text-emerald-200 text-sm font-bold">
              Delivered {order.deliveredAt ? formatDateTime(order.deliveredAt) : ''}
            </h3>
            <div className="mt-3 space-y-2">
              {existingCodes.map((code) => (
                <CodeBlock key={code} value={code} />
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------- notes */}
        <div className="mt-5">
          <label htmlFor="adminNotes" className="label">
            Private notes (visible to the customer on their tracking page)
          </label>
          <textarea
            id="adminNotes"
            rows={2}
            value={adminNotes}
            onChange={(event) => setAdminNotes(event.target.value)}
            className="input"
          />
          <button type="button" onClick={saveNotes} disabled={busy} className="btn-secondary btn-sm mt-2">
            Save notes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
