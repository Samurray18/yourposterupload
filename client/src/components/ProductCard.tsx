import { Link } from 'react-router-dom';
import { DELIVERY_LABEL, formatDzd, discountPercent } from '../lib/format';
import type { Product } from '../lib/types';
import { useCart } from '../store/cartContext';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  /** Adds an at-a-glance compare price and discount ribbon. */
  showCompare?: boolean;
}

export function ProductCard({ product, showCompare = true }: ProductCardProps) {
  const cart = useCart();
  const cheapest = [...product.denominations]
    .filter((d) => d.stockStatus === 'in_stock')
    .sort((a, b) => a.priceDzd - b.priceDzd)[0];

  const saving = cheapest ? discountPercent(cheapest.priceDzd, cheapest.comparePriceDzd) : null;
  const inCart = cart.has(product.id);
  const soldOut = !product.inStock || !cheapest;

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group bg-ink-850 border-ink-700 hover:border-accent-500/60 relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent-900/40"
    >
      {soldOut && (
        <span className="badge bg-ink-950/90 absolute top-3 left-3 z-10 border border-ink-600 text-muted backdrop-blur">
          Out of stock
        </span>
      )}
      {saving !== null && !soldOut && (
        <span className="badge bg-mint/90 absolute top-3 left-3 z-10 text-ink-950">
          Save {saving}%
        </span>
      )}

      <div className="bg-ink-800/60 relative aspect-16/10 overflow-hidden">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-contain p-6 transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-accent-300 mb-1 text-xs font-semibold tracking-wide uppercase">
            {product.categoryName}
          </p>
          <h3 className="text-bright group-hover:text-accent-200 line-clamp-2 text-base leading-snug font-bold transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Price is the most prominent element, per the design direction. */}
        <div className="mt-auto">
          {cheapest ? (
            <>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-gradient text-2xl leading-none font-extrabold">
                  {formatDzd(cheapest.priceDzd)}
                </span>
                {showCompare &&
                  cheapest.comparePriceDzd &&
                  cheapest.comparePriceDzd > cheapest.priceDzd && (
                    <span className="text-ink-500 text-sm line-through">
                      {formatDzd(cheapest.comparePriceDzd)}
                    </span>
                  )}
              </div>
              <p className="text-muted mt-1.5 text-xs">
                {product.denominations.length} option
                {product.denominations.length === 1 ? '' : 's'} ·{' '}
                {DELIVERY_LABEL[product.deliverySpeed]}
              </p>
            </>
          ) : (
            <span className="text-muted text-lg font-semibold">Unavailable</span>
          )}
        </div>

        {inCart && (
          <span className="badge bg-accent-500/15 text-accent-200 border-accent-500/30 border">
            In your cart
          </span>
        )}
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-ink-850 border-ink-700 flex flex-col overflow-hidden rounded-2xl border">
      <div className="skeleton aspect-16/10 w-full rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton mt-2 h-7 w-1/2" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}
