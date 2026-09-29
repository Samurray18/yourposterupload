import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import type { Product } from '../lib/types';
import { useStorefront } from '../store/StorefrontProvider';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';

const TRUST_SIGNALS = [
  {
    title: 'Instant delivery',
    body: 'Codes and top-ups sent within minutes once your payment clears.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    ),
  },
  {
    title: 'Secure payment',
    body: 'No card details stored. Pay by CCP or Baridimob, confirmed by hand.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    ),
  },
  {
    title: 'Real DZD prices',
    body: 'Every price is checked against live sources before it goes live.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
];

const STEPS = [
  { title: 'Pick your product', body: 'Choose the card or top-up and the amount you want.' },
  { title: 'Pay with CCP or Baridimob', body: 'Send the exact amount with your order number as reference.' },
  { title: 'Get your code', body: 'It appears on your tracking page and lands in your inbox.' },
];

export function HomePage() {
  const { settings, categories, counts } = useStorefront();
  const [featured, setFeatured] = useState<Product[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .getProducts({ featured: true, sort: 'popular', limit: 8 })
      .then((response) => setFeatured(response.products))
      .catch(() => setFeatured([]));
    return () => controller.abort();
  }, []);

  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(60rem 30rem at 20% -10%, color-mix(in oklab, var(--color-accent-600) 22%, transparent), transparent), radial-gradient(45rem 25rem at 85% 0%, color-mix(in oklab, var(--color-violet-glow) 18%, transparent), transparent)',
          }}
        />
        <div className="container-page py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <span className="badge bg-accent-500/15 text-accent-200 border-accent-500/30 mb-5 border">
              Pay with CCP &amp; Baridimob · Delivered in minutes
            </span>
            <h1 className="text-4xl leading-[1.08] font-extrabold sm:text-5xl lg:text-6xl">
              Best prices on gift cards &amp;{' '}
              <span className="text-gradient">game top-ups in Algeria</span>
            </h1>
            <p className="text-muted mt-6 max-w-2xl text-lg sm:text-xl">
              Steam, PlayStation, Google Play, PUBG UC and Free Fire diamonds — priced in DZD, paid
              locally, delivered to your inbox. No foreign card, no markup games.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/catalog" className="btn-primary px-7 py-3.5 text-base">
                Browse all products
              </Link>
              <Link to="/track" className="btn-secondary px-7 py-3.5 text-base">
                Track an order
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------ announcement */}
      {settings?.announcement && (
        <div className="container-page">
          <div className="panel border-accent-500/30 bg-accent-500/10 p-4 text-center text-sm font-semibold text-accent-100">
            {settings.announcement}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ deals */}
      <section className="container-page py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl">Best deals right now</h2>
            <p className="text-muted mt-2">
              Hand-checked prices. Every card below is the best rate we could source today.
            </p>
          </div>
          <Link to="/catalog?sort=price_asc" className="btn-secondary btn-sm">
            See all →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {featured === null
            ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)
            : featured.slice(0, 8).map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.35, delay: Math.min(index, 7) * 0.04 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
        </div>
      </section>

      {/* ------------------------------------------------------- categories */}
      <section className="container-page py-8">
        <h2 className="text-2xl sm:text-3xl">Shop by category</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/catalog?category=${category.slug}`}
              className="group bg-ink-850 border-ink-700 hover:border-accent-500/50 rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1"
            >
              <h3 className="group-hover:text-accent-200 text-lg font-bold transition-colors">
                {category.name}
              </h3>
              {category.nameFr && (
                <p className="text-ink-500 mt-0.5 text-sm">{category.nameFr}</p>
              )}
              <p className="text-muted mt-3 text-sm">{category.description}</p>
              <p className="text-accent-300 mt-4 text-sm font-semibold">
                {category.productCount} product{category.productCount === 1 ? '' : 's'} →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ how it works */}
      <section className="container-page py-16">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl">How it works</h2>
          <p className="text-muted mx-auto mt-2 max-w-xl">
            Three steps, no account needed to buy.
          </p>
        </div>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative">
              <div className="bg-ink-850 border-ink-700 rounded-2xl border p-6">
                <span className="from-accent-500 to-violet-glow mb-4 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-extrabold text-white">
                  {index + 1}
                </span>
                <h3 className="text-lg">{step.title}</h3>
                <p className="text-muted mt-2 text-sm">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* -------------------------------------------------------- trust bar */}
      <section className="container-page pb-16">
        <div className="grid gap-5 sm:grid-cols-3">
          {TRUST_SIGNALS.map((signal) => (
            <div key={signal.title} className="flex gap-4">
              <span className="bg-accent-500/15 text-accent-300 flex size-11 shrink-0 items-center justify-center rounded-xl">
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                  {signal.icon}
                </svg>
              </span>
              <div>
                <h3 className="text-base font-bold">{signal.title}</h3>
                <p className="text-muted mt-1 text-sm">{signal.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="panel mt-10 grid gap-6 p-8 text-center sm:grid-cols-3">
          <div>
            <p className="text-gradient text-3xl font-extrabold">
              {counts.happyCustomers > 0
                ? `${counts.happyCustomers.toLocaleString('en-US')}+`
                : '—'}
            </p>
            <p className="text-muted mt-1 text-sm">Happy customers</p>
          </div>
          <div>
            <p className="text-gradient text-3xl font-extrabold">
              {settings?.stats.averageDeliveryMinutes ?? '—'} min
            </p>
            <p className="text-muted mt-1 text-sm">Average delivery time</p>
          </div>
          <div>
            <p className="text-gradient text-3xl font-extrabold">{counts.products || '—'}</p>
            <p className="text-muted mt-1 text-sm">Products in stock</p>
          </div>
        </div>
      </section>
    </>
  );
}
