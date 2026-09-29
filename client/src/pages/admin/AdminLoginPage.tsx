import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { Alert } from '../../components/ui';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Already signed in? Skip the form.
    api
      .admin
      .me()
      .then(() => navigate('/admin/dashboard', { replace: true }))
      .catch(() => undefined);
  }, [navigate]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.admin.login(email, password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in');
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <form onSubmit={submit} className="panel w-full max-w-sm p-8">
        <h1 className="text-2xl">Store owner sign in</h1>
        <p className="text-muted mt-2 text-sm">
          Manage products, prices and orders.
        </p>

        {error && (
          <div className="mt-5">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input"
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary mt-6 w-full py-3">
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
