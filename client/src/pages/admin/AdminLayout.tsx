import { useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';

const TABS = [
  { to: '/admin/dashboard', label: 'Overview', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders', label: 'Orders' },
];

/** Guards the whole admin area and provides the shared shell. */
export function AdminLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    api.admin
      .me()
      .then((response) => setEmail(response.admin.email))
      .catch((err) => {
        // 401 is the expected "not signed in" path; anything else still means
        // we cannot confirm a session, so send them to the login screen.
        if (err instanceof ApiError && err.status !== 401) console.warn(err.message);
        navigate('/admin', { replace: true });
      })
      .finally(() => setChecking(false));
  }, [navigate]);

  const signOut = useCallback(async () => {
    await api.admin.logout().catch(() => undefined);
    navigate('/admin', { replace: true });
  }, [navigate]);

  if (checking) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-muted">Checking your session…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh]">
      <div className="border-ink-700 bg-ink-850 border-b">
        <div className="container-page flex flex-wrap items-center gap-4 py-4">
          <span className="text-bright font-extrabold">Admin</span>
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-accent-500/15 text-accent-200' : 'text-muted hover:text-bright'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {email && <span className="text-ink-500 hidden text-xs sm:block">{email}</span>}
            <button type="button" onClick={signOut} className="btn-secondary btn-sm">
              Sign out
            </button>
          </div>
        </div>
      </div>

      <Outlet />
    </div>
  );
}

export function AdminIndex() {
  return <Navigate to="/admin/dashboard" replace />;
}
