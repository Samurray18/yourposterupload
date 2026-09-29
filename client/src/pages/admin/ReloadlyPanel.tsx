import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type {
  ReloadlyImportSummary,
  ReloadlyProductListing,
  ReloadlyStatus,
} from '../../lib/types';
import { Alert } from '../../components/ui';

/**
 * Reloadly control panel: connection state, balance, a read-only preview of
 * the upstream catalogue and the import action.
 *
 * Importing is explicit and irreversible from the UI's point of view, so it
 * asks for confirmation and always reports exactly what changed.
 */
export function ReloadlyPanel({ onImported }: { onImported?: () => void }) {
  const [status, setStatus] = useState<ReloadlyStatus | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [listing, setListing] = useState<ReloadlyProductListing | null>(null);
  const [summary, setSummary] = useState<ReloadlyImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await api.admin.reloadlyStatus();
      setStatus(response);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not read Reloadly status');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshBalance = useCallback(async () => {
    try {
      const response = await api.admin.reloadlyBalance();
      const amount = response.balance.balance ?? response.balance.usdBalance;
      setBalance(
        amount === undefined
          ? 'Balance unavailable'
          : `${amount} ${response.balance.currencyCode ?? response.settlement.environment}`,
      );
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not read balance');
    }
  }, []);

  const preview = useCallback(async () => {
    setBusy(true);
    try {
      setListing(
        await api.admin.reloadlyProducts({
          countryCode: country.trim().toUpperCase() || undefined,
          search: search.trim() || undefined,
          size: 20,
        }),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load products');
    } finally {
      setBusy(false);
    }
  }, [country, search]);

  const runImport = useCallback(async () => {
    if (!window.confirm('Import the Reloadly catalogue now? Existing prices for imported cards will be updated.')) {
      return;
    }
    setBusy(true);
    try {
      const response = await api.admin.reloadlyImport({
        countryCode: country.trim().toUpperCase() || undefined,
        search: search.trim() || undefined,
      });
      setSummary(response.summary);
      setError(null);
      onImported?.();
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }, [country, search, onImported, load]);

  if (status && !status.configured) {
    return (
      <div className="mt-6">
        <Alert tone="warning">
          Reloadly is not configured
          {status.missing.length > 0 && <> — set {status.missing.join(' and ')} in <code>.env</code></>}
          . Manual fulfilment keeps working until then.
        </Alert>
      </div>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-ink-700/60 bg-ink-900/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg">Reloadly</h2>
          <p className="text-muted mt-1 text-sm">
            {status
              ? `${status.environment} · ${status.baseUrl} · ${status.imported.products} auto products`
              : 'Checking connection…'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {balance && <span className="text-muted text-sm">Balance: {balance}</span>}
          <button type="button" className="btn-secondary btn-sm" onClick={() => void refreshBalance()} disabled={busy}>
            Check balance
          </button>
          <button type="button" className="btn-primary btn-sm" onClick={() => void runImport()} disabled={busy}>
            {busy ? 'Working…' : 'Import catalogue'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {summary && (
        <div className="mt-4">
          <Alert tone="success">
            Seen {summary.productsSeen} products — created {summary.productsCreated}, updated{' '}
            {summary.productsUpdated}, skipped {summary.productsSkipped}. Wrote{' '}
            {summary.denominationsWritten} denominations.
            {summary.skippedNames.length > 0 && (
              <> Skipped: {summary.skippedNames.slice(0, 5).join(', ')}.</>
            )}
          </Alert>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          placeholder="Country (e.g. DZ)"
          maxLength={2}
          className="input w-32"
          aria-label="Filter by country code"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search upstream…"
          className="input max-w-xs"
          aria-label="Search upstream products"
        />
        <button type="button" className="btn-secondary btn-sm" onClick={() => void preview()} disabled={busy}>
          Preview
        </button>
      </div>

      {listing && (
        <div className="mt-4 space-y-2">
          <p className="text-muted text-sm">
            Page {listing.page + 1}
            {listing.totalPages !== null && ` of ${listing.totalPages}`} — {listing.products.length} shown
          </p>
          {listing.products.map((product) => (
            <div key={product.productId} className="border-ink-700/60 rounded-xl border p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{product.productName}</span>
                <span className="text-muted">
                  {product.currency} · {product.denominations.length} denomination
                  {product.denominations.length === 1 ? '' : 's'}
                </span>
              </div>
              {product.denominations.length > 0 && (
                <div className="text-muted mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {product.denominations.slice(0, 6).map((denomination) => (
                    <span key={denomination.label}>
                      {denomination.label} → {denomination.priceDzd} DZD
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
