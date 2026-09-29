import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useCart } from '../store/cartContext';
import { useStorefront } from '../store/StorefrontProvider';
import { PAYMENT_HINT, PAYMENT_LABEL, formatDzd } from '../lib/format';
import { Alert } from '../components/ui';
import { PAYMENT_METHODS, type PaymentMethod } from '../lib/types';

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  wilaya: string;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  fullName: '',
  phone: '',
  email: '',
  wilaya: '',
  paymentMethod: 'baridimob',
  paymentReference: '',
  notes: '',
};

/** Client-side mirror of the server rules, for instant feedback. */
const CLIENT_VALIDATION: Record<keyof FormState, (value: string) => string | null> = {
  fullName: (v) => (v.trim().length < 2 ? 'Enter your full name' : null),
  phone: (v) => {
    const digits = v.replace(/[^\d]/g, '');
    return /^0[5-9]\d{8}$/.test(digits) ? null : 'Use a valid Algerian mobile, e.g. 0555 12 34 56';
  },
  email: (v) =>
    v.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
      ? null
      : 'Enter a valid email address',
  wilaya: (v) => (v ? null : 'Choose your wilaya'),
  paymentMethod: () => null,
  paymentReference: () => null,
  notes: () => null,
};

export function CheckoutPage() {
  const cart = useCart();
  const { settings, wilayas } = useStorefront();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Nothing to check out — send them back to the cart.
  if (cart.lines.length === 0 && !submitting) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl">Your cart is empty</h1>
        <p className="text-muted mt-2">Add a product before checking out.</p>
        <Link to="/catalog" className="btn-primary mt-6">
          Browse products
        </Link>
      </div>
    );
  }

  const set = (key: keyof FormState) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }) as FormState);
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const payment = settings?.payments[form.paymentMethod];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    for (const key of Object.keys(CLIENT_VALIDATION) as Array<keyof FormState>) {
      const message = CLIENT_VALIDATION[key](form[key]);
      if (message) nextErrors[key] = message;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.createOrder({
        fullName: form.fullName,
        phone: form.phone,
        email: form.email || undefined,
        wilaya: form.wilaya,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference || undefined,
        notes: form.notes || undefined,
        items: cart.lines.map((line) => ({
          denominationId: line.denominationId,
          quantity: line.quantity,
        })),
      });

      // The order number is the only reference the customer keeps, so it is
      // handed to the confirmation screen before the cart is wiped.
      sessionStorage.setItem(
        'dzdz.lastOrder',
        JSON.stringify({ orderNumber: response.order.orderNumber, phone: form.phone }),
      );
      cart.clear();
      navigate('/order-confirmed', { replace: true, state: { order: response.order, payment: response.payment } });
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError) {
        setSubmitError(err.message);
        const fieldErrors = err.fieldErrors();
        if (Object.keys(fieldErrors).length > 0) {
          setErrors((current) => ({ ...current, ...(fieldErrors as Partial<Record<keyof FormState, string>>) }));
        }
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    }
  };

  const fieldProps = (key: keyof FormState) => ({
    value: form[key],
    onChange: (event: { target: { value: string } }) => set(key)(event.target.value),
    'aria-invalid': errors[key] ? (true as const) : undefined,
    'aria-describedby': errors[key] ? `${key}-error` : undefined,
    className: `input ${errors[key] ? 'input-error' : ''}`,
  });

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl sm:text-4xl">Checkout</h1>
      <p className="text-muted mt-2">
        Pay by {PAYMENT_LABEL[form.paymentMethod].split(' — ')[0]} — no card needed.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          {submitError && <Alert tone="error" title="We could not place your order">{submitError}</Alert>}

          {/* --------------------------------------------------- contact info */}
          <fieldset className="panel p-6">
            <legend className="text-bright px-2 text-lg font-bold">Your details</legend>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="fullName" className="label">
                  Full name <span className="text-red-400">*</span>
                </label>
                <input id="fullName" name="fullName" autoComplete="name" {...fieldProps('fullName')} />
                {errors.fullName && (
                  <p id="fullName-error" className="mt-1.5 text-sm text-red-300">
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="label">
                  Phone number <span className="text-red-400">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0555 12 34 56"
                  {...fieldProps('phone')}
                />
                <p className="text-muted mt-1.5 text-xs">
                  You will use this to look up your order later.
                </p>
                {errors.phone && (
                  <p id="phone-error" className="mt-1 text-sm text-red-300">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="label">
                  Email <span className="text-ink-500 font-normal">(recommended)</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...fieldProps('email')}
                />
                <p className="text-muted mt-1.5 text-xs">Your code is emailed here.</p>
                {errors.email && (
                  <p id="email-error" className="mt-1 text-sm text-red-300">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="wilaya" className="label">
                  Wilaya <span className="text-red-400">*</span>
                </label>
                <select id="wilaya" name="wilaya" {...fieldProps('wilaya')}>
                  <option value="" className="bg-ink-850">
                    Choose your wilaya
                  </option>
                  {wilayas.map((wilaya) => (
                    <option key={wilaya} value={wilaya} className="bg-ink-850">
                      {wilaya}
                    </option>
                  ))}
                </select>
                {errors.wilaya && (
                  <p id="wilaya-error" className="mt-1.5 text-sm text-red-300">
                    {errors.wilaya}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* ------------------------------------------------------- payment */}
          <fieldset className="panel p-6">
            <legend className="text-bright px-2 text-lg font-bold">Payment method</legend>

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    form.paymentMethod === method
                      ? 'border-accent-500 bg-accent-500/10'
                      : 'border-ink-600 bg-ink-850 hover:border-ink-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={form.paymentMethod === method}
                    onChange={() => set('paymentMethod')(method)}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex size-5 items-center justify-center rounded-full border-2 ${
                        form.paymentMethod === method ? 'border-accent-400' : 'border-ink-500'
                      }`}
                    >
                      {form.paymentMethod === method && (
                        <span className="bg-accent-400 size-2.5 rounded-full" />
                      )}
                    </span>
                    <span className="text-bright font-bold">{PAYMENT_LABEL[method]}</span>
                  </span>
                  <span className="text-muted mt-1.5 block text-sm">{PAYMENT_HINT[method]}</span>
                </label>
              ))}
            </div>

            {payment && (
              <div className="border-accent-500/30 bg-accent-500/5 mt-5 rounded-xl border p-5">
                <p className="text-bright text-sm font-bold">
                  Send <span className="text-accent-300">{formatDzd(cart.subtotalDzd)}</span> to
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-muted">Account holder</dt>
                    <dd className="text-bright font-semibold">{payment.accountName}</dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-muted">
                      {form.paymentMethod === 'ccp' ? 'CCP number' : 'Baridimob number'}
                    </dt>
                    <dd className="text-bright font-mono font-bold">{payment.accountIdentifier}</dd>
                  </div>
                </dl>
                {payment.notes && (
                  <p className="text-muted mt-3 border-t border-accent-500/20 pt-3 text-sm">
                    {payment.notes}
                  </p>
                )}
              </div>
            )}

            <div className="mt-5">
              <label htmlFor="paymentReference" className="label">
                Transfer reference{' '}
                <span className="text-ink-500 font-normal">(optional, but speeds things up)</span>
              </label>
              <input
                id="paymentReference"
                name="paymentReference"
                placeholder="e.g. your Baridimob transaction number"
                {...fieldProps('paymentReference')}
              />
            </div>

            <div className="mt-5">
              <label htmlFor="notes" className="label">
                Order notes <span className="text-ink-500 font-normal">(optional)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="e.g. your game player ID for a top-up"
                {...fieldProps('notes')}
              />
            </div>
          </fieldset>
        </div>

        {/* --------------------------------------------------------- summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="panel p-6">
            <h2 className="text-lg">Your order</h2>
            <ul className="mt-4 space-y-3">
              {cart.lines.map((line) => (
                <li key={line.key} className="flex justify-between gap-3 text-sm">
                  <span className="text-muted min-w-0">
                    <span className="text-bright block font-semibold">{line.productName}</span>
                    {line.denominationLabel} × {line.quantity}
                  </span>
                  <span className="text-bright shrink-0 font-semibold">
                    {formatDzd(line.unitPriceDzd * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-ink-700 mt-5 flex items-baseline justify-between border-t pt-4">
              <span className="text-bright font-bold">Total to pay</span>
              <span className="text-gradient text-2xl font-extrabold">
                {formatDzd(cart.subtotalDzd)}
              </span>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full py-3.5">
              {submitting ? 'Placing your order…' : 'Place order'}
            </button>
            <p className="text-muted mt-3 text-center text-xs">
              You will get payment instructions on the next screen.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
