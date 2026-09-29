import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '../store/cartContext';
import { useStorefront } from '../store/StorefrontProvider';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/catalog', label: 'Browse' },
  { to: '/track', label: 'Track order' },
];

export function Header() {
  const cart = useCart();
  const { settings, categories, counts } = useStorefront();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile sheet on navigation — otherwise it covers the new page.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const brand = settings?.brandName ?? 'DZ Gift Cards';

  return (
    <header
      className={`bg-ink-900/80 sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-200 ${
        scrolled ? 'border-ink-700' : 'border-transparent'
      }`}
    >
      <div className="container-page flex h-16 items-center gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="from-accent-500 to-violet-glow flex size-9 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-extrabold text-white">
            DZ
          </span>
          <span className="text-bright hidden text-lg font-extrabold tracking-tight sm:block">
            {brand}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-ink-800 text-bright' : 'text-muted hover:text-bright'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {counts.happyCustomers > 0 && (
            <span className="text-muted hidden text-xs lg:block">
              {counts.happyCustomers.toLocaleString('en-US')}+ customers
            </span>
          )}

          <Link
            to="/cart"
            className="bg-ink-800 border-ink-700 text-bright hover:bg-ink-700 relative flex size-11 items-center justify-center rounded-xl border transition-colors"
            aria-label={`Cart, ${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'}`}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
            </svg>
            <AnimatePresence>
              {cart.itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="bg-accent-500 absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                >
                  {cart.itemCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="btn-secondary md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-ink-700 bg-ink-900 overflow-hidden border-t md:hidden"
          >
            <div className="container-page flex flex-col gap-1 py-3">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-3 font-semibold ${
                      isActive ? 'bg-ink-800 text-bright' : 'text-muted'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              {categories.length > 0 && (
                <>
                  <p className="text-ink-500 mt-2 px-3 text-xs font-bold tracking-wide uppercase">
                    Categories
                  </p>
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/catalog?category=${category.slug}`}
                      className="text-muted hover:text-bright rounded-lg px-3 py-2.5 text-sm"
                    >
                      {category.name}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
