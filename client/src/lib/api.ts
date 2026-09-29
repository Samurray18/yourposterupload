/**
 * Thin fetch wrapper around the API.
 *
 * In dev the Vite proxy forwards /api to the Express server, so relative URLs
 * keep everything same-origin (which also makes the admin cookie work without
 * any CORS credential juggling). In production the app can either be served
 * behind the same host or point at an absolute VITE_API_URL.
 */
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Array<{ field: string; message: string }>;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Array<{ field: string; message: string }> = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field-level messages keyed by field name, for form error display. */
  fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]));
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Skip the JSON parse for endpoints that return nothing useful. */
  raw?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'network_error', 'Cannot reach the server. Check your connection.');
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const error = (payload as { error?: { code: string; message: string; details?: unknown } })
      ?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'unknown',
      error?.message ?? `Request failed (${response.status})`,
      Array.isArray(error?.details) ? (error.details as Array<{ field: string; message: string }>) : [],
    );
  }

  return payload as T;
}

function queryString(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  /* ------------------------------------------------------------ storefront */
  getSettings: () => request<import('./types').PublicSettingsResponse>('/api/settings'),
  getCategories: () =>
    request<{ categories: import('./types').Category[] }>('/api/categories'),
  getProducts: (params: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sort?: string;
    limit?: number;
    offset?: number;
    featured?: boolean;
  }) =>
    request<{ products: import('./types').Product[] }>(
      `/api/catalog${queryString({ ...params, inStock: params.inStock || undefined })}`,
    ),
  getProduct: (slug: string) =>
    request<{ product: import('./types').Product; related: import('./types').Product[] }>(
      `/api/products/${encodeURIComponent(slug)}`,
    ),

  /* ---------------------------------------------------------------- orders */
  createOrder: (body: {
    fullName: string;
    phone: string;
    email?: string;
    wilaya: string;
    paymentMethod: string;
    paymentReference?: string;
    notes?: string;
    items: Array<{ denominationId: string; quantity: number }>;
  }) =>
    request<{
      order: {
        orderNumber: string;
        status: import('./types').OrderStatus;
        totalDzd: number;
        createdAt: string;
        items: Array<{
          productName: string;
          denominationLabel: string;
          quantity: number;
          lineTotalDzd: number;
        }>;
      };
      payment: import('./types').PaymentInstruction;
    }>('/api/orders', { method: 'POST', body }),

  trackOrder: (body: { orderNumber: string; phone: string }) =>
    request<{ order: import('./types').OrderTrackingView }>('/api/orders/track', {
      method: 'POST',
      body,
    }),

  /* ----------------------------------------------------------------- admin */
  admin: {
    login: (email: string, password: string) =>
      request<{ admin: { email: string } }>('/api/admin/login', {
        method: 'POST',
        body: { email, password },
      }),
    logout: () => request<{ ok: true }>('/api/admin/logout', { method: 'POST' }),
    me: () => request<{ admin: { email: string } }>('/api/admin/me'),
    stats: () =>
      request<{ stats: import('./types').DashboardStats }>('/api/admin/stats'),

    settings: () => request<{ settings: unknown }>('/api/admin/settings'),
    updateSettings: (patch: unknown) =>
      request<{ settings: unknown }>('/api/admin/settings', { method: 'PATCH', body: patch }),

    products: (params: { category?: string; search?: string; includeInactive?: boolean } = {}) =>
      request<{ products: import('./types').Product[] }>(
        `/api/admin/products${queryString({ ...params, includeInactive: params.includeInactive || undefined })}`,
      ),
    createProduct: (body: unknown) =>
      request<{ product: import('./types').Product }>('/api/admin/products', {
        method: 'POST',
        body,
      }),
    updateProduct: (id: string, body: unknown) =>
      request<{ product: import('./types').Product }>(`/api/admin/products/${id}`, {
        method: 'PATCH',
        body,
      }),
    deleteProduct: (id: string) =>
      request<{ ok: true }>(`/api/admin/products/${id}`, { method: 'DELETE' }),
    updatePrices: (id: string, updates: Array<{ id: string; priceDzd: number; comparePriceDzd?: number | null }>) =>
      request<{ product: import('./types').Product }>(`/api/admin/products/${id}/prices`, {
        method: 'PATCH',
        body: { updates },
      }),
    setFeatured: (id: string, isFeatured: boolean) =>
      request<{ product: import('./types').Product }>(`/api/admin/products/${id}/featured`, {
        method: 'PATCH',
        body: { isFeatured },
      }),
    setStock: (id: string, denominationId: string, stockStatus: string) =>
      request<{ product: import('./types').Product }>(`/api/admin/products/${id}/stock`, {
        method: 'PATCH',
        body: { denominationId, stockStatus },
      }),
    uploadImage: async (file: File) => {
      const form = new FormData();
      form.append('image', file);
      const response = await fetch(`${BASE_URL}/api/admin/upload`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new ApiError(
          response.status,
          payload?.error?.code ?? 'upload_failed',
          payload?.error?.message ?? 'Upload failed',
        );
      }
      return payload as { url: string; bytes: number };
    },

    orders: (params: { status?: string; search?: string; limit?: number } = {}) =>
      request<{ orders: import('./types').Order[]; total: number }>(
        `/api/admin/orders${queryString(params)}`,
      ),
    order: (id: string) =>
      request<{ order: import('./types').Order; codes: string[] | null }>(
        `/api/admin/orders/${id}`,
      ),
    setOrderStatus: (
      id: string,
      body: { status: string; adminNotes?: string | null; paymentReference?: string | null },
    ) =>
      request<{ order: import('./types').Order }>(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        body,
      }),
    deliverOrder: (id: string, body: { codes: string[]; instructions?: string | null }) =>
      request<{ order: import('./types').Order }>(`/api/admin/orders/${id}/deliver`, {
        method: 'POST',
        body,
      }),
    deliverOrderAuto: (id: string) =>
      request<{ order: import('./types').Order }>(`/api/admin/orders/${id}/deliver-auto`, {
        method: 'POST',
      }),
    saveOrderNotes: (id: string, adminNotes: string | null) =>
      request<{ order: import('./types').Order }>(`/api/admin/orders/${id}/notes`, {
        method: 'PATCH',
        body: { adminNotes },
      }),

    /* ------------------------------------------------------------- reloadly */
    reloadlyStatus: () =>
      request<import('./types').ReloadlyStatus>('/api/admin/reloadly/status'),

    reloadlyBalance: () =>
      request<import('./types').ReloadlyBalanceResponse>('/api/admin/reloadly/balance'),

    /** Preview upstream products without writing anything. */
    reloadlyProducts: (params: { countryCode?: string; search?: string; page?: number; size?: number } = {}) =>
      request<import('./types').ReloadlyProductListing>(
        `/api/admin/reloadly/products${queryString({ ...params })}`,
      ),

    /** Import or refresh the catalogue. */
    reloadlyImport: (body: { countryCode?: string; search?: string; maxPages?: number } = {}) =>
      request<{ summary: import('./types').ReloadlyImportSummary }>('/api/admin/reloadly/import', {
        method: 'POST',
        body,
      }),
  },
};
