import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, ApiError } from '../lib/api';
import type { OrderTrackingView } from '../lib/types';
import { Alert, CodeBlock, StatusBadge } from '../components/ui';
import {
  PROGRESS_STEPS,
  STATUS_LABEL,
  formatDzd,
  formatDateTime,
  statusIndex,
} from '../lib/format';

export function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') ?? '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<OrderTrackingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setOrder(null);
    setLoading(true);
    try {
      const response = await api.trackOrder({ orderNumber: orderNumber.trim(), phone: phone.trim() });
      setOrder(response.order);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not look up that order. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">Track your order</h1>
        <p className="text-muted mt-2">
          Enter your order number and the phone number you used at checkout.
        </p>

        <form onSubmit={submit} className="panel mt-8 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="orderNumber" className="label">
                Order number
              </label>
              <input
                id="orderNumber"
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                placeholder="DZD-2026-XXXXXXXX"
                className="input font-mono"
                required
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="phone" className="label">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="0555 12 34 56"
                className="input"
                required
                autoComplete="tel"
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary mt-5 w-full py-3.5">
            {loading ? 'Checking…' : 'Check status'}
          </button>
        </form>

        {error && (
          <div className="mt-5">
            <Alert tone="error" title="Could not find that order">
              {error} Double-check the order number and phone number.
            </Alert>
          </div>
        )}

        {order && <OrderResult order={order} />}
      </div>
    </div>
  );
}

function OrderResult({ order }: { order: OrderTrackingView }) {
  const currentIndex = statusIndex(order.status);
  const cancelled = order.status === 'cancelled';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-6 flex flex-col gap-5"
    >
      {/* --------------------------------------------------------- header */}
      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-muted text-sm">Order</p>
            <p className="text-bright font-mono text-xl font-extrabold">{order.orderNumber}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <dl className="border-ink-700 mt-5 grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Placed</dt>
            <dd className="text-bright font-semibold">{formatDateTime(order.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted">Wilaya</dt>
            <dd className="text-bright font-semibold">{order.wilaya}</dd>
          </div>
          <div>
            <dt className="text-muted">Total</dt>
            <dd className="text-bright font-semibold">{formatDzd(order.totalDzd)}</dd>
          </div>
        </dl>
      </div>

      {/* ------------------------------------------------------- progress */}
      {cancelled ? (
        <Alert tone="error" title="This order was cancelled">
          If you already paid, contact us and we will sort it out.
        </Alert>
      ) : (
        <div className="panel p-6">
          <h2 className="text-lg">Progress</h2>
          <ol className="mt-5 space-y-0">
            {PROGRESS_STEPS.map((step, index) => {
              const done = index < currentIndex;
              const active = index === currentIndex;
              return (
                <li key={step.status} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                        done
                          ? 'border-accent-500 bg-accent-500 text-white'
                          : active
                            ? 'border-accent-400 bg-accent-500/20 text-accent-200'
                            : 'border-ink-600 text-ink-500'
                      }`}
                    >
                      {done ? '✓' : index + 1}
                    </span>
                    {index < PROGRESS_STEPS.length - 1 && (
                      <span
                        className={`w-px flex-1 ${index < currentIndex ? 'bg-accent-500' : 'bg-ink-700'}`}
                        style={{ minHeight: '1.75rem' }}
                      />
                    )}
                  </div>
                  <div className="pb-5">
                    <p
                      className={`font-bold ${active || done ? 'text-bright' : 'text-ink-500'}`}
                    >
                      {step.label}
                    </p>
                    {active && <p className="text-muted mt-0.5 text-sm">{step.description}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* ---------------------------------------------------------- items */}
      <div className="panel p-6">
        <h2 className="text-lg">Items</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {order.items.map((item) => (
            <li
              key={`${item.productName}-${item.denominationLabel}`}
              className="flex justify-between gap-3"
            >
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
      </div>

      {/* ----------------------------------------------------------- codes */}
      {order.status === 'delivered' && (
        <div className="border-emerald-500/30 bg-emerald-500/5 rounded-2xl border p-6">
          <h2 className="text-emerald-200 text-lg font-bold">Your code is ready</h2>
          {order.codes && order.codes.length > 0 ? (
            <div className="mt-4 space-y-3">
              {order.codes.map((code) => (
                <CodeBlock key={code} value={code} />
              ))}
            </div>
          ) : (
            <p className="text-muted mt-2 text-sm">
              Your code is being attached — refresh this page in a moment.
            </p>
          )}
          {order.adminNotes && (
            <p className="text-emerald-100/80 mt-4 border-t border-emerald-500/20 pt-4 text-sm">
              {order.adminNotes}
            </p>
          )}
          <p className="text-emerald-100/60 mt-3 text-xs">
            This page stays available as long as you have your order number and phone number. A
            copy was also sent to your email.
          </p>
        </div>
      )}

      {order.status === 'pending_payment' && (
        <Alert tone="warning" title={STATUS_LABEL.pending_payment}>
          We have not received your payment yet. If you already sent it, it can take a few hours to
          appear. Quote your order number if you contact us.
        </Alert>
      )}

      {order.status === 'payment_confirmed' && (
        <Alert tone="info" title="Payment confirmed">
          Thanks — we are sourcing your code now.
        </Alert>
      )}

      {order.status === 'processing' && (
        <Alert tone="info" title="Processing">
          Your order is being prepared. This page updates automatically — no need to reload.
        </Alert>
      )}
    </motion.div>
  );
}
