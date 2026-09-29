import { Link, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStorefront } from '../store/StorefrontProvider';
import { Alert } from '../components/ui';
import { formatDzd } from '../lib/format';
import type { OrderStatus, PaymentInstruction } from '../lib/types';

interface ConfirmedOrder {
  orderNumber: string;
  status: OrderStatus;
  totalDzd: number;
  createdAt: string;
  items: Array<{
    productName: string;
    denominationLabel: string;
    quantity: number;
    lineTotalDzd: number;
  }>;
}

const NEXT_STEPS = [
  {
    title: 'Send the payment',
    body: 'Transfer the exact total with your order number as the reference, then send us the receipt.',
  },
  {
    title: 'We confirm it',
    body: 'We check your transfer, usually within a few hours during working hours.',
  },
  {
    title: 'Your code arrives',
    body: 'It appears on your tracking page and in your inbox as soon as it is ready.',
  },
];

export function OrderConfirmedPage() {
  const location = useLocation();
  const { settings } = useStorefront();

  // Reached by refresh? Rebuild what we can from sessionStorage so the order
  // number is never lost, which is the one thing the customer needs.
  const stored = (() => {
    try {
      const raw = sessionStorage.getItem('dzdz.lastOrder');
      return raw ? (JSON.parse(raw) as { orderNumber: string; phone: string }) : null;
    } catch {
      return null;
    }
  })();

  const state = location.state as
    | { order: ConfirmedOrder; payment: PaymentInstruction }
    | null;

  const orderNumber = state?.order.orderNumber ?? stored?.orderNumber;

  if (!orderNumber) {
    return <Navigate to="/track" replace />;
  }

  const order = state?.order;
  const payment = state?.payment ?? settings?.payments.baridimob;

  return (
    <div className="container-page py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-2xl"
      >
        <div className="text-center">
          <span className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300 mx-auto flex size-16 items-center justify-center rounded-full border">
            <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </span>
          <h1 className="mt-6 text-3xl sm:text-4xl">Order placed</h1>
          <p className="text-muted mt-2">
            Keep your order number — you need it to track your delivery.
          </p>
        </div>

        {/* ---------------------------------------------------- order number */}
        <div className="panel border-accent-500/40 mt-8 p-6 text-center">
          <p className="text-muted text-sm font-semibold tracking-wide uppercase">Order number</p>
          <p className="text-gradient mt-2 font-mono text-2xl font-extrabold sm:text-3xl">
            {orderNumber}
          </p>
        </div>

        {/* --------------------------------------------------------- summary */}
        {order && (
          <div className="panel mt-6 p-6">
            <div className="flex items-baseline justify-between border-b border-ink-700 pb-4">
              <span className="text-bright text-lg font-bold">Total to pay</span>
              <span className="text-gradient text-2xl font-extrabold">
                {formatDzd(order.totalDzd)}
              </span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {order.items.map((item) => (
                <li key={`${item.productName}-${item.denominationLabel}`} className="flex justify-between gap-3">
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
        )}

        {/* ---------------------------------------------- payment instructions */}
        {payment && (
          <div className="panel mt-6 p-6">
            <h2 className="text-lg">Pay now</h2>
            <p className="text-muted mt-1 text-sm">
              Send <span className="text-bright font-bold">{order ? formatDzd(order.totalDzd) : 'the total'}</span>{' '}
              to these details and use{' '}
              <span className="text-bright font-mono font-bold">{orderNumber}</span> as the reference.
            </p>
            <dl className="mt-4 space-y-3 rounded-xl border border-ink-600 bg-ink-900/60 p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted">Account holder</dt>
                <dd className="text-bright font-semibold">{payment.accountName}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted">Account</dt>
                <dd className="text-bright font-mono font-bold">{payment.accountIdentifier}</dd>
              </div>
            </dl>
            {payment.notes && <p className="text-muted mt-3 text-sm">{payment.notes}</p>}
          </div>
        )}

        {/* ----------------------------------------------------- what happens */}
        <div className="mt-8">
          <h2 className="text-lg">What happens next</h2>
          <ol className="mt-4 space-y-3">
            {NEXT_STEPS.map((step, index) => (
              <li key={step.title} className="panel flex gap-4 p-4">
                <span className="bg-accent-500/15 text-accent-300 flex size-8 shrink-0 items-center justify-center rounded-lg font-extrabold">
                  {index + 1}
                </span>
                <div>
                  <p className="text-bright font-bold">{step.title}</p>
                  <p className="text-muted mt-1 text-sm">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {settings && (
          <div className="mt-6">
            <Alert tone="info" title="Need to check on this order?">
              Go to the{' '}
              <Link to="/track" className="link">
                order tracking page
              </Link>{' '}
              and enter your order number plus the phone number you used. Contact us at{' '}
              <a href={`tel:${settings.supportPhone.replace(/\s/g, '')}`} className="link">
                {settings.supportPhone}
              </a>{' '}
              if anything looks wrong.
            </Alert>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/track" className="btn-primary flex-1 py-3.5">
            Track this order
          </Link>
          <Link to="/catalog" className="btn-secondary flex-1 py-3.5">
            Keep shopping
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
