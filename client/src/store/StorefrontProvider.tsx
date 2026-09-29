import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError } from '../lib/api';
import type { Category, PublicSettings } from '../lib/types';

interface StorefrontContextValue {
  settings: PublicSettings | null;
  categories: Category[];
  wilayas: string[];
  /** Product/category counts for the trust bar. */
  counts: { products: number; happyCustomers: number };
  loading: boolean;
  error: string | null;
  refresh(): Promise<void>;
}

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

/**
 * Loads the handful of site-wide values that nearly every page needs. Fetched
 * once at the app root so navigation never re-requests them.
 */
export function StorefrontProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wilayas, setWilayas] = useState<string[]>([]);
  const [counts, setCounts] = useState({ products: 0, happyCustomers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [settingsResponse, categoriesResponse] = await Promise.all([
        api.getSettings(),
        api.getCategories(),
      ]);
      if (signal?.aborted) return;
      setSettings(settingsResponse.settings);
      setWilayas(settingsResponse.wilayas);
      setCounts(settingsResponse.counts);
      setCategories(categoriesResponse.categories);
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not load the store. Is the API running?',
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const value = useMemo<StorefrontContextValue>(
    () => ({
      settings,
      categories,
      wilayas,
      counts,
      loading,
      error,
      refresh: () => load(),
    }),
    [settings, categories, wilayas, counts, loading, error, load],
  );

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront(): StorefrontContextValue {
  const context = useContext(StorefrontContext);
  if (!context) throw new Error('useStorefront must be used inside <StorefrontProvider>');
  return context;
}
