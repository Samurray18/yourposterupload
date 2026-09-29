import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, ApiError } from '../lib/api';
import type { Denomination, Product } from '../lib/types';
import { useCart } from '../store/cartContext';
import { ProductImage } from '../components/ProductImage';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { Alert, DeliveryBadge, DiscountBadge, EmptyState } from '../components/ui';
import { DELIVERY_HINT, discountPercent, formatDzd } from '../lib/format';

const EXPLAINER = [
  { title: 'Order', body: 'Pick your option and add it to the cart.' },
  { title: 'Pay', body: 'Send the amount via CCP or Baridimob.' },
  { title: 'Receive', body: 'Your code appears on the tracking page and by email.' },
];

export function ProductDetailPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const cart = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProduct(null);
    setError(null);
    setSelectedId(null);
    setQuantity(1);

    api
      .getProduct(slug)
      .then((response) => {
        if (cancelled) return;
        setProduct(response.product);
        setRelated(response.related);
        // Pre-select the cheapest in-stock option: the most common intent.
        const cheapest = response.product.denominations
          .filter((d) => d.stockStatus === 'in_stock')
          .sort((a, b) => a.priceDzd - b.priceDzd)[0];
        setSelectedId(cheapest?.id ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Could not load this product');
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const selected: Denomination | null = useMemo(
    () => product?.denominations.find((d) => d.id === selectedId) ?? null,
    [product, selectedId],
  );

  if (error) {
    return (
      <div className="container-page py-20">
        <EmptyState
          title="Product not found"
          description={error}
          action={
            <Link to="/catalog" className="btn-primary">
              Back to catalogue
            </Link>
          }
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-page py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="skeleton aspect-4/3 w-full rounded-2xl" />
          <div className="flex flex-col gap-4">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-9 w-3/4" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-12 w-48" />
          </div>
        </div>
      </div>
    );
  }

  const saving = selected ? discountPercent(selected.priceDzd, selected.comparePriceDzd) : null;
  const bestOverall = product.totalDiscountPercent;

  const addToCart = () => {
    if (!selected) return;
    cart.add(product, selected, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const buyNow = () => {
    if (!selected) return;
    cart.add(product, selected, quantity);
    navigate('/checkout');
  };

  return (
    <div className="container-page py-8">
      <nav className="text-muted mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Link to="/" className="hover:text-bright">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/catalog?category=${product.categorySlug}`} className="hover:text-bright">
          {product.categoryName}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-bright">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* ------------------------------------------------------------ image */}
        <div>
          <div className="bg-ink-850 border-ink-700 flex aspect-4/3 items-center justify-center overflow-hidden rounded-2xl border p-10">
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <DeliveryBadge speed={product.deliverySpeed} />
            {bestOverall !== null && <DiscountBadge percent={bestOverall} />}
            {product.fulfillmentMode === 'auto' && (
              <span className="badge border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                Auto delivery
              </span>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------- details */}
        <div>
          <h1 className="text-3xl sm:text-4xl">{product.name}</h1>
          {product.description && (
            <p className="text-muted mt-4 text-lg leading-relaxed">{product.description}</p>
          )}

          {product.deliverySpeed !== 'instant' && (
            <div className="mt-4">
              <Alert tone="info" title="Delivery time">
                {DELIVERY_HINT[product.deliverySpeed]}. You will get your code on the tracking page
                and by email.
              </Alert>
            </div>
          )}

          {/* ------------------------------------------------- denominations */}
          <fieldset className="mt-8">
            <legend className="label">
              Choose an amount
              {product.denominations.length > 1 && (
                <span className="text-muted font-normal">
                  {' '}
                  — {product.denominations.length} options
                </span>
              )}
            </legend>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {product.denominations.map((denomination) => {
                const isSelected = denomination.id === selectedId;
                const percent = discountPercent(denomination.priceDzd, denomination.comparePriceDzd);
                const soldOut = denomination.stockStatus === 'out_of_stock';

                return (
                  <label
                    key={denomination.id}
                    className={`relative cursor-pointer rounded-xl border p-3.5 transition-all duration-200 ${
                      soldOut
                        ? 'border-ink-700 cursor-not-allowed opacity-45'
                        : isSelected
                          ? 'border-accent-500 bg-accent-500/10 shadow-lg shadow-accent-900/30'
                          : 'border-ink-600 hover:border-ink-500 bg-ink-850'
                    }`}
                  >
                    <input
                      type="radio"
                      name="denomination"
                      value={denomination.id}
                      checked={isSelected}
                      disabled={soldOut}
                      onChange={() => setSelectedId(denomination.id)}
                      className="sr-only"
                    />
                    <span className="text-bright block text-sm font-bold">{denomination.label}</span>
                    <span className="mt-1 block text-base font-extrabold text-accent-300">
                      {formatDzd(denomination.priceDzd)}
                    </span>
                    {percent !== null && !soldOut && (
                      <span className="text-mint mt-0.5 block text-xs font-semibold">
                        Save {percent}%
                      </span>
                    )}
                    {soldOut && (
                      <span className="text-ink-500 mt-0.5 block text-xs">Out of stock</span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* --------------------------------------------------------- actions */}
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-ink-700 bg-ink-850 mt-6 rounded-2xl border p-5"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-muted text-sm">Your price</p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span className="text-gradient text-3xl leading-none font-extrabold">
                      {formatDzd(selected.priceDzd)}
                    </span>
                    {selected.comparePriceDzd &&
                      selected.comparePriceDzd > selected.priceDzd && (
                        <span className="text-ink-500 line-through">
                          {formatDzd(selected.comparePriceDzd)}
                        </span>
                      )}
                  </div>
                  {saving !== null && (
                    <p className="text-mint mt-1 text-sm font-semibold">
                      You save {formatDzd(selected.comparePriceDzd! - selected.priceDzd)} ({saving}%)
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted mr-1 text-sm font-semibold">Qty</span>
                  <div className="border-ink-600 flex items-center rounded-xl border">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="text-bright hover:bg-ink-700 flex size-10 items-center justify-center rounded-l-xl transition-colors"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="text-bright w-9 text-center font-bold" aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                      className="text-bright hover:bg-ink-700 flex size-10 items-center justify-center rounded-r-xl transition-colors"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={addToCart} className="btn-secondary flex-1 py-3.5">
                  {added ? '✓ Added to cart' : 'Add to cart'}
                </button>
                <button type="button" onClick={buyNow} className="btn-primary flex-1 py-3.5">
                  Buy now · {formatDzd(selected.priceDzd * quantity)}
                </button>
              </div>
            </motion.div>
          )}

          {/* ------------------------------------------------------- explainer */}
          <div className="mt-8">
            <h2 className="text-lg">How it works</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-3">
              {EXPLAINER.map((step, index) => (
                <li key={step.title} className="panel p-4">
                  <span className="bg-accent-500/15 text-accent-300 flex size-7 items-center justify-center rounded-lg text-sm font-extrabold">
                    {index + 1}
                  </span>
                  <p className="text-bright mt-2.5 text-sm font-bold">{step.title}</p>
                  <p className="text-muted mt-1 text-sm">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- related */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl">More in {product.categoryName}</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
