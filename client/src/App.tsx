import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { useStorefront } from './store/StorefrontProvider';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmedPage } from './pages/OrderConfirmedPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { NotFoundPage } from './pages/NotFoundPage';

// The admin bundle is only fetched when someone actually opens /admin, so
// storefront visitors never download it.
const AdminLayout = lazy(() =>
  import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const AdminLoginPage = lazy(() =>
  import('./pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })),
);
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminProductsPage = lazy(() =>
  import('./pages/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage })),
);
const AdminOrdersPage = lazy(() =>
  import('./pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })),
);
const AdminIndex = lazy(() =>
  import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminIndex })),
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function StorefrontError() {
  const { error, refresh } = useStorefront();
  if (!error) return null;
  return (
    <div className="border-red-500/30 bg-red-500/10 text-red-100 mx-auto my-6 max-w-2xl rounded-xl border p-4">
      <p className="font-bold">{error}</p>
      <button type="button" onClick={() => void refresh()} className="btn-secondary btn-sm mt-3">
        Try again
      </button>
    </div>
  );
}

function Loading() {
  return (
    <div className="container-page py-20 text-center">
      <p className="text-muted">Loading…</p>
    </div>
  );
}

/** Admin pages render without the storefront header/footer. */
function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

export function App() {
  const location = useLocation();
  const admin = isAdminPath(location.pathname);

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      {!admin && <Header />}
      <StorefrontError />

      <main className="flex-1">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/product/:slug" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-confirmed" element={<OrderConfirmedPage />} />
            <Route path="/track" element={<TrackOrderPage />} />

            <Route path="/admin" element={<AdminLoginPage />} />
            <Route path="/admin/dashboard" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
            </Route>
            <Route path="/admin/products" element={<AdminLayout />}>
              <Route index element={<AdminProductsPage />} />
            </Route>
            <Route path="/admin/orders" element={<AdminLayout />}>
              <Route index element={<AdminOrdersPage />} />
            </Route>
            <Route path="/admin/*" element={<AdminIndex />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {!admin && <Footer />}
    </div>
  );
}
