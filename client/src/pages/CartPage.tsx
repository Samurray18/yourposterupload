import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../store/cartContext';
import { ProductImage } from '../components/ProductImage';
import { EmptyState } from '../components/ui';
import { formatDzd } from '../lib/format';

export function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();

  if (cart.lines.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" className="size-12" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
            </svg>
          }
          title="Your cart is empty"
          description="Browse the catalogue and add the gift cards or top-ups you need."
          action={
            <Link to="/catalog" className="btn-primary">
              Browse products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl sm:text-4xl">Your cart</h1>
      <p className="text-muted mt-2">
        {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        {/* ---------------------------------------------------------- lines */}
        <ul className="flex flex-col gap-4">
          {cart.lines.map((line) => (
            <li key={line.key} className="panel flex gap-4 p-4">
              <Link
                to={`/product/${line.productSlug}`}
                className="bg-ink-800/60 flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl"
              >
                <ProductImage
                  src={line.productImageUrl}
                  alt={line.productName}
                  className="h-full w-full object-contain p-2"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  to={`/product/${line.productSlug}`}
                  className="hover:text-accent-200 text-bright block font-bold transition-colors"
                >
                  {line.productName}
                </Link>
                <p className="text-muted mt-0.5 text-sm">{line.denominationLabel}</p>
                <p className="text-accent-300 mt-1.5 font-bold">
                  {formatDzd(line.unitPriceDzd)}{' '}
                  <span className="text-ink-500 font-normal">each</span>
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="border-ink-600 flex items-center rounded-lg border">
                    <button
                      type="button"
                      onClick={() => cart.setQuantity(line.denominationId, line.quantity - 1)}
                      className="text-bright hover:bg-ink-700 flex size-9 items-center justify-center rounded-l-lg transition-colors"
                      aria-label={`Decrease quantity of ${line.productName}`}
                    >
                      −
                    </button>
                    <span className="text-bright w-8 text-center text-sm font-bold">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => cart.setQuantity(line.denominationId, line.quantity + 1)}
                      disabled={line.quantity >= 10}
                      className="text-bright hover:bg-ink-700 flex size-9 items-center justify-center rounded-r-lg transition-colors disabled:opacity-40"
                      aria-label={`Increase quantity of ${line.productName}`}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => cart.remove(line.denominationId)}
                    className="text-muted hover:text-red-300 text-sm font-semibold transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="text-bright shrink-0 text-right text-lg font-extrabold">
                {formatDzd(line.unitPriceDzd * line.quantity)}
              </div>
            </li>
          ))}

          <li>
            <button type="button" onClick={cart.clear} className="btn-ghost btn-sm">
              Clear cart
            </button>
          </li>
        </ul>

        {/* --------------------------------------------------------- summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="panel p-6">
            <h2 className="text-lg">Summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Items</dt>
                <dd className="text-bright font-semibold">{cart.itemCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="text-mint font-semibold">Free</dd>
              </div>
            </dl>

            <div className="border-ink-700 mt-4 flex items-baseline justify-between border-t pt-4">
              <span className="text-bright font-bold">Total</span>
              <span className="text-gradient text-2xl font-extrabold">
                {formatDzd(cart.subtotalDzd)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="btn-primary mt-5 w-full py-3.5"
            >
              Proceed to checkout
            </button>
            <Link to="/catalog" className="btn-ghost mt-2 w-full">
              Keep shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
