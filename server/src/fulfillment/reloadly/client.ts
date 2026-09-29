/**
 * Reloadly HTTP client.
 *
 * Responsibilities kept here (and nowhere else):
 *   - client-credentials token acquisition with a process-wide cache and
 *     single-flight refresh, so a burst of orders triggers one token request;
 *   - the versioned `Accept` header every gift-cards endpoint requires;
 *   - timeouts, bounded retries with jittered backoff for 429/5xx, and typed
 *     errors.
 *
 * A request is never retried on 4xx other than 429: those are contract errors
 * (bad product, insufficient balance) and repeating them wastes quota.
 */
import { config } from '../../config.js';
import { tokenResponseSchema, errorSchema } from './types.js';
import type { ReloadlyToken } from './types.js';

const TOKEN_URL = 'https://auth.reloadly.com/oauth/token';
const ACCEPT = 'application/com.reloadly.giftcards-v1+json';

/** Refresh this long before actual expiry to avoid racing the clock. */
const EXPIRY_SKEW_MS = 60_000;
const MAX_ATTEMPTS = 3;

export class ReloadlyError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string | null,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ReloadlyError';
  }
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;
/** In-flight refresh, shared by concurrent callers. */
let refreshInFlight: Promise<CachedToken> | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function assertConfigured(): void {
  if (!config.reloadly.clientId || !config.reloadly.clientSecret) {
    throw new ReloadlyError(
      'Reloadly is not configured. Set RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET.',
      null,
      'NOT_CONFIGURED',
      false,
    );
  }
}

async function parseError(response: Response): Promise<ReloadlyError> {
  let code: string | null = null;
  let message = `Reloadly responded with ${response.status}`;
  try {
    const parsed = errorSchema.safeParse(await response.json());
    if (parsed.success) {
      code = parsed.data.errorCode ?? null;
      if (parsed.data.message) message = parsed.data.message;
    }
  } catch {
    // Non-JSON error body; the status-derived message stands.
  }
  return new ReloadlyError(
    message,
    response.status,
    code,
    response.status === 429 || response.status >= 500,
  );
}

async function requestToken(): Promise<CachedToken> {
  assertConfigured();

  const body = new URLSearchParams({
    client_id: config.reloadly.clientId,
    client_secret: config.reloadly.clientSecret,
    grant_type: 'client_credentials',
    audience: config.reloadly.audience,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body,
  });

  if (!response.ok) throw await parseError(response);

  const parsed = tokenResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ReloadlyError('Reloadly returned a malformed token response', null, null, false);
  }

  const token: ReloadlyToken = parsed.data;
  return {
    token: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000 - EXPIRY_SKEW_MS,
  };
}

/** Returns a valid access token, refreshing only when needed. */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  if (!refreshInFlight) {
    refreshInFlight = requestToken()
      .then((fresh) => {
        cachedToken = fresh;
        return fresh;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return (await refreshInFlight).token;
}

/** Test seam: drops the cached token so each case starts clean. */
export function resetTokenCache(): void {
  cachedToken = null;
  refreshInFlight = null;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  /** Serialized as a JSON body when present. */
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Bypasses retries — used for POST /orders, which is not safely replayable. */
  retries?: number;
}

/**
 * Performs an authenticated call against the gift-cards API.
 *
 * Retries are opt-out because `POST /orders` spends real money: a network
 * timeout there is ambiguous, and blindly repeating could buy a second card.
 * Callers handle that case with the stored `customIdentifier` instead.
 */
export async function reloadlyFetch<T>(
  path: string,
  { method = 'GET', body, query, retries = MAX_ATTEMPTS }: RequestOptions = {},
): Promise<T> {
  const url = new URL(path, config.reloadly.baseUrl);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }

  let lastError: ReloadlyError | null = null;

  for (let attempt = 1; attempt <= Math.max(1, retries); attempt += 1) {
    const token = await getAccessToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.reloadly.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          accept: ACCEPT,
          authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });

      if (!response.ok) {
        const error = await parseError(response);
        if (error.retryable && attempt < retries) {
          // Full jitter: avoids a synchronised retry storm across workers.
          const backoff = Math.random() * 2 ** attempt * 250;
          lastError = error;
          await sleep(backoff);
          continue;
        }
        throw error;
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof ReloadlyError) throw err;
      // Abort / network failure: retryable only while attempts remain.
      lastError = new ReloadlyError(
        err instanceof Error ? err.message : 'Reloadly request failed',
        null,
        'NETWORK',
        true,
      );
      if (attempt >= retries) throw lastError;
      await sleep(Math.random() * 2 ** attempt * 250);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new ReloadlyError('Reloadly request failed', null, null, false);
}
