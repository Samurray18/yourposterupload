import { Link } from 'react-router-dom';
import { useStorefront } from '../store/StorefrontProvider';

export function Footer() {
  const { settings, categories } = useStorefront();

  return (
    <footer className="border-ink-700 mt-20 border-t">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="from-accent-500 to-violet-glow flex size-8 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-extrabold text-white">
              DZ
            </span>
            <span className="text-bright font-extrabold">
              {settings?.brandName ?? 'DZ Gift Cards'}
            </span>
          </div>
          <p className="text-muted text-sm">
            Gift cards and game top-ups priced in DZD. Pay with CCP or Baridimob, no foreign card
            needed.
          </p>
        </div>

        <div>
          <h3 className="text-bright mb-3 text-sm font-bold tracking-wide uppercase">Categories</h3>
          <ul className="space-y-2">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/catalog?category=${category.slug}`}
                  className="text-muted hover:text-bright text-sm transition-colors"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-bright mb-3 text-sm font-bold tracking-wide uppercase">Help</h3>
          <ul className="space-y-2">
            <li>
              <Link to="/track" className="text-muted hover:text-bright text-sm transition-colors">
                Track your order
              </Link>
            </li>
            <li>
              <Link to="/cart" className="text-muted hover:text-bright text-sm transition-colors">
                Your cart
              </Link>
            </li>
            <li>
              <Link
                to="/admin"
                className="text-muted hover:text-bright text-sm transition-colors"
              >
                Store owner
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-bright mb-3 text-sm font-bold tracking-wide uppercase">Contact</h3>
          <ul className="text-muted space-y-2 text-sm">
            {settings?.supportPhone && (
              <li>
                <a href={`tel:${settings.supportPhone.replace(/\s/g, '')}`} className="hover:text-bright">
                  {settings.supportPhone}
                </a>
              </li>
            )}
            {settings?.supportEmail && (
              <li>
                <a href={`mailto:${settings.supportEmail}`} className="hover:text-bright break-all">
                  {settings.supportEmail}
                </a>
              </li>
            )}
            <li className="text-ink-500">Algeria · DZD</li>
          </ul>
        </div>
      </div>

      <div className="border-ink-700 text-ink-500 border-t">
        <div className="container-page flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings?.brandName ?? 'DZ Gift Cards'}. All rights
            reserved.
          </p>
          <p>
            Gift cards are sold by an authorised reseller. Trademarks belong to their owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
