import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { Product } from '../lib/types';
import { useStorefront } from '../store/StorefrontProvider';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { EmptyState } from '../components/ui';
import { formatDzdNumber } from '../lib/format';

type SortOption = 'popular' | 'price_asc' | 'price_desc' | 'newest';

const SORT_LABELS: Record<SortOption, string> = {
  popular: 'Most popular',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  newest: 'Newest first',
};

const PRICE_PRESETS = [
  { label: 'Under 1 000 DZD', min: undefined, max: 1000 },
  { label: '1 000 – 3 000 DZD', min: 1000, max: 3000 },
  { label: '3 000 – 7 000 DZD', min: 3000, max: 7000 },
  { label: 'Over 7 000 DZD', min: 7000, max: undefined },
];

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useStorefront();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The URL is the source of truth for filters so the view is shareable and
  // survives a refresh.
  const category = searchParams.get('category') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const sort = (searchParams.get('sort') as SortOption | null) ?? 'popular';
  const inStock = searchParams.get('inStock') === 'true';
  const minPrice = searchParams.get('min') ? Number(searchParams.get('min')) : undefined;
  const maxPrice = searchParams.get('max') ? Number(searchParams.get('max')) : undefined;

  const setParam = useCallback(
    (key: string, value: string | number | boolean | undefined) => {
      const next = new URLSearchParams(searchParams);
      if (value === undefined || value === '' || value === false) next.delete(key);
      else next.set(key, String(value));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    let cancelled = false;
    setError(null);

    api
      .getProducts({ category, search, sort, inStock, minPrice, maxPrice, limit: 60 })
      .then((response) => {
        if (!cancelled) setProducts(response.products);
      })
      .catch((err) => {
        if (cancelled) return;
        setProducts([]);
        setError(err instanceof ApiError ? err.message : 'Could not load products');
      });

    return () => {
      cancelled = true;
    };
  }, [category, search, sort, inStock, minPrice, maxPrice]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === category),
    [categories, category],
  );

  const hasFilters = Boolean(category || search || inStock || minPrice || maxPrice);

  return (
    <div className="container-page py-10">
      {/* ------------------------------------------------------------ header */}
      <header className="mb-8">
        <nav className="text-muted mb-3 flex items-center gap-2 text-sm">
          <Link to="/" className="hover:text-bright">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-bright">{activeCategory?.name ?? 'All products'}</span>
        </nav>
        <h1 className="text-3xl sm:text-4xl">{activeCategory?.name ?? 'All products'}</h1>
        {activeCategory?.description && (
          <p className="text-muted mt-2 max-w-2xl">{activeCategory.description}</p>
        )}
      </header>

      {/* --------------------------------------------------------- toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form
          className="relative min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get('search');
            setParam('search', typeof value === 'string' ? value : undefined);
          }}
        >
          <input
            name="search"
            type="search"
            defaultValue={search ?? ''}
            placeholder="Search Steam, PUBG, diamonds…"
            className="input pr-24"
            aria-label="Search products"
          />
          <button type="submit" className="btn-primary btn-sm absolute top-1/2 right-1.5 -translate-y-1/2">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="btn-secondary lg:hidden"
            aria-expanded={filtersOpen}
          >
            Filters{hasFilters ? ' •' : ''}
          </button>
          <label className="sr-only" htmlFor="sort">
            Sort products
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(event) => setParam('sort', event.target.value)}
            className="input w-auto min-w-44"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
              <option key={option} value={option} className="bg-ink-850">
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        {/* ------------------------------------------------------- filters */}
        <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="panel sticky top-24 space-y-6 p-5">
            <div>
              <h2 className="text-bright mb-3 text-sm font-bold tracking-wide uppercase">
                Category
              </h2>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setParam('category', undefined)}
                  className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    !category ? 'bg-ink-750 text-bright font-semibold' : 'text-muted hover:text-bright'
                  }`}
                >
                  All categories
                </button>
                {categories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setParam('category', item.slug)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      category === item.slug
                        ? 'bg-ink-750 text-bright font-semibold'
                        : 'text-muted hover:text-bright'
                    }`}
                  >
                    <span>{item.name}</span>
                    <span className="text-ink-500 text-xs">{item.productCount}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-bright mb-3 text-sm font-bold tracking-wide uppercase">Price</h2>
              <div className="flex flex-col gap-1">
                {PRICE_PRESETS.map((preset) => {
                  const active =
                    (preset.min ?? null) === (minPrice ?? null) &&
                    (preset.max ?? null) === (maxPrice ?? null);
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        if (preset.min === undefined) next.delete('min');
                        else next.set('min', String(preset.min));
                        if (preset.max === undefined) next.delete('max');
                        else next.set('max', String(preset.max));
                        setSearchParams(next, { replace: true });
                      }}
                      className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? 'bg-ink-750 text-bright font-semibold'
                          : 'text-muted hover:text-bright'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Min"
                  defaultValue={minPrice ?? ''}
                  onBlur={(event) => setParam('min', event.target.value || undefined)}
                  className="input py-2 text-sm"
                  aria-label="Minimum price"
                />
                <span className="text-ink-500" aria-hidden="true">
                  –
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Max"
                  defaultValue={maxPrice ?? ''}
                  onBlur={(event) => setParam('max', event.target.value || undefined)}
                  className="input py-2 text-sm"
                  aria-label="Maximum price"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(event) => setParam('inStock', event.target.checked || undefined)}
                className="accent-accent-500 size-4"
              />
              <span className="text-bright text-sm font-semibold">In stock only</span>
            </label>

            {hasFilters && (
              <button
                type="button"
                onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
                className="btn-ghost btn-sm w-full"
              >
                Clear all filters
              </button>
            )}
          </div>
        </aside>

        {/* --------------------------------------------------------- results */}
        <section>
          {error && (
            <div className="border-red-500/30 bg-red-500/10 text-red-100 mb-6 rounded-xl border p-4">
              {error}
            </div>
          )}

          {products !== null && products.length > 0 && (
            <p className="text-muted mb-4 text-sm">
              {products.length} product{products.length === 1 ? '' : 's'}
              {minPrice || maxPrice
                ? ` · from ${formatDzdNumber(minPrice ?? 0)} to ${formatDzdNumber(maxPrice ?? 0)} DZD`
                : ''}
            </p>
          )}

          {products === null ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              title="No products match those filters"
              description="Try widening the price range or clearing the filters."
              action={
                <button
                  type="button"
                  onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
                  className="btn-secondary"
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
