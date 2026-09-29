/**
 * Reloadly integration tests.
 *
 * No network access: `globalThis.fetch` is replaced with a scripted stub and
 * restored after each test. Env vars for the client are set before the module
 * graph is imported, because `config` is evaluated once at import time.
 */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.RELOADLY_CLIENT_ID = process.env.RELOADLY_CLIENT_ID || 'test-client-id';
process.env.RELOADLY_CLIENT_SECRET = process.env.RELOADLY_CLIENT_SECRET || 'test-secret';

const { reloadlyFetch, getAccessToken, resetTokenCache, ReloadlyError } = await import(
  './fulfillment/reloadly/client.js'
);
const { listProducts, placeOrder, fetchCodes } = await import('./fulfillment/reloadly/api.js');
const { priceDenomination, denominationsFor } = await import(
  './fulfillment/reloadly/pricing.js'
);
const { config } = await import('./config.js');

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  resetTokenCache();
});

interface Call {
  url: string;
  init: RequestInit;
}

/**
 * Installs a stub that answers the token endpoint and then `routes`. A route
 * may return a body, a `[body, status]` tuple, or a `Response` directly.
 */
function stubFetch(routes: (call: Call) => unknown, calls: Call[] = []): Call[] {
  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : String(input);
    calls.push({ url, init });
    if (url.includes('/oauth/token')) {
      return jsonResponse({ access_token: 'token-abc', expires_in: 3600 });
    }
    const result = routes({ url, init });
    if (result instanceof Response) return result;
    if (Array.isArray(result) && result.length === 2 && typeof result[1] === 'number') {
      return jsonResponse(result[0], result[1]);
    }
    return jsonResponse(result ?? {});
  }) as typeof fetch;
  return calls;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const TOKEN = 'token-abc';

function baseProduct(overrides: Record<string, unknown> = {}) {
  return {
    productId: 10,
    productName: 'Amazon US',
    global: false,
    supportsPreOrder: false,
    senderFee: 0,
    discountPercentage: 0,
    denominationType: 'FIXED',
    recipientCurrencyCode: 'USD',
    minRecipientDenomination: null,
    maxRecipientDenomination: null,
    fixedRecipientDenominations: [10, 25, 50, 100],
    brand: { brandId: 3, brandName: 'Amazon' },
    country: { isoName: 'US', name: 'United States' },
    redeemInstruction: { concise: 'Go to amazon.com/gc/redeem' },
    ...overrides,
  };
}

/** First element, asserted present — `noUncheckedIndexedAccess` friendly. */
function first<T>(items: T[]): T {
  assert.ok(items.length > 0, 'expected at least one element');
  return items[0] as T;
}

// ---------------------------------------------------------------------------

test('the access token is fetched once and reused', async () => {
  const calls = stubFetch(() => ({}));
  await getAccessToken();
  await getAccessToken();
  await reloadlyFetch('/products');

  const tokenCalls = calls.filter((c) => c.url.includes('/oauth/token'));
  assert.equal(tokenCalls.length, 1, 'token should be cached across calls');
});

test('concurrent callers share a single token request', async () => {
  const calls = stubFetch(() => ({}));
  await Promise.all([getAccessToken(), getAccessToken(), getAccessToken()]);
  assert.equal(calls.filter((c) => c.url.includes('/oauth/token')).length, 1);
});

test('the token request asks for the gift-cards audience', async () => {
  const calls = stubFetch(() => ({}));
  await getAccessToken();

  const tokenCall = calls.find((c) => c.url.includes('/oauth/token'))!;
  const body = new URLSearchParams(String(tokenCall.init.body));
  assert.equal(body.get('grant_type'), 'client_credentials');
  assert.equal(body.get('audience'), 'https://giftcards.reloadly.com');
  assert.equal(body.get('client_id'), config.reloadly.clientId);
});

test('every gift-cards call sends the versioned accept header and bearer token', async () => {
  const calls = stubFetch(() => ({ content: [], totalElements: 0 }));
  await reloadlyFetch('/products');

  const headers = calls.at(-1)!.init.headers as Record<string, string>;
  assert.equal(headers.accept, 'application/com.reloadly.giftcards-v1+json');
  assert.equal(headers.authorization, `Bearer ${TOKEN}`);
});

test('sandbox and production use different base URLs', () => {
  assert.equal(config.reloadly.baseUrl, 'https://giftcards-sandbox.reloadly.com');
  assert.equal(config.reloadly.isProduction, false);
});

test('a paged product listing is unwrapped', async () => {
  stubFetch(() => ({
    content: [baseProduct()],
    totalElements: 1250,
    totalPages: 250,
    last: false,
    number: 0,
    size: 5,
  }));

  const page = await listProducts({ countryCode: 'US', size: 5 });
  assert.equal(page.products.length, 1);
  assert.equal(first(page.products).productName, 'Amazon US');
  assert.equal(page.totalElements, 1250);
  assert.equal(page.totalPages, 250);
});

test('a bare array listing is still accepted', async () => {
  stubFetch(() => [baseProduct()]);
  const page = await listProducts();
  assert.equal(page.products.length, 1);
  assert.equal(page.totalPages, 1);
});

test('a malformed listing is rejected rather than silently emptied', async () => {
  stubFetch(() => ({ content: 'not-an-array' }));
  await assert.rejects(() => listProducts(), /unrecognised product listing/);
});

test('placing an order returns the codes from the smiles array', async () => {
  const calls = stubFetch(() => ({
    transactionId: 98765,
    amount: 25,
    currencyCode: 'USD',
    status: 'SUCCESSFUL',
    customIdentifier: 'DZC-1',
    smiles: [{ code: 'AMZN-XXXX-XXXX-XXXX', pinCode: null, validity: 'Never expires' }],
    date: '2026-05-02T10:30:00Z',
  }));

  const order = await placeOrder({
    productId: 10,
    quantity: 1,
    unitPrice: 25,
    customIdentifier: 'DZC-1',
    senderName: 'DZ Gift Cards',
  });

  assert.equal(order.transactionId, 98765);
  assert.equal(order.status, 'SUCCESSFUL');
  assert.equal(first(order.smiles).code, 'AMZN-XXXX-XXXX-XXXX');

  // The order number is echoed upstream so a lost response can be reconciled.
  const body = JSON.parse(String(calls.at(-1)!.init.body));
  assert.equal(body.customIdentifier, 'DZC-1');
  assert.equal(body.unitPrice, 25);
});

test('placing an order is never retried automatically', async () => {
  const calls = stubFetch(() => [{ errorCode: 'INSUFFICIENT_FUNDS', message: 'No balance' }, 400]);
  await assert.rejects(() =>
    placeOrder({
      productId: 10,
      quantity: 1,
      unitPrice: 25,
      customIdentifier: 'DZC-2',
      senderName: 'DZ Gift Cards',
    }),
  );
  assert.equal(calls.filter((c) => c.url.endsWith('/orders')).length, 1);
});

test('an upstream error becomes a typed, non-retryable error', async () => {
  stubFetch(() => [{ errorCode: 'INVALID_CREDENTIALS', message: 'Access Denied' }, 401]);

  await assert.rejects(
    () => reloadlyFetch('/orders'),
    (err: unknown) => {
      assert.ok(err instanceof ReloadlyError);
      assert.equal(err.status, 401);
      assert.equal(err.code, 'INVALID_CREDENTIALS');
      assert.equal(err.retryable, false);
      return true;
    },
  );
});

test('a 429 is retried and can then succeed', async () => {
  let productCalls = 0;
  const calls = stubFetch(() => {
    productCalls += 1;
    return productCalls === 1
      ? [{ errorCode: 'RATE_LIMITED', message: 'slow down' }, 429]
      : { content: [baseProduct()], totalElements: 1, totalPages: 1 };
  });

  const page = await listProducts();
  assert.equal(page.products.length, 1);
  assert.equal(calls.filter((c) => c.url.includes('/products')).length, 2);
});

test('codes embedded in the order response skip the extra call', async () => {
  const calls = stubFetch(() => ({}));
  const codes = await fetchCodes(1, [{ code: 'ABC', pinCode: '1234' }]);
  assert.equal(codes.length, 1);
  assert.equal(first(codes).pinCode, '1234');
  assert.equal(calls.filter((c) => c.url.includes('/code')).length, 0);
});

test('codes fall back to the transaction code endpoint', async () => {
  const calls = stubFetch(() => ({
    transactionId: 42,
    smiles: [{ code: 'LEGACY-CODE', pinCode: null }],
  }));
  const codes = await fetchCodes(42);
  assert.equal(first(codes).code, 'LEGACY-CODE');
  assert.ok(calls.some((c) => c.url.includes('/transactions/42/code')));
});

test('a top-level redeemCode is understood as well', async () => {
  stubFetch(() => ({ redeemCode: 'OLD-STYLE', pinCode: '9999', validity: '1 year' }));
  const codes = await fetchCodes(7);
  assert.equal(first(codes).code, 'OLD-STYLE');
  assert.equal(first(codes).pinCode, '9999');
});

// --- pricing ---------------------------------------------------------------

test('supplier discount and fee are applied before conversion', () => {
  // 100 USD, 5% off, 1.00 fee, 150 DZD/USD, 0% markup in this test env.
  const result = priceDenomination({ amount: 100, discountPercentage: 5, senderFee: 1 });
  assert.equal(result.supplierCost, 96);
  assert.equal(result.costDzd, 14400);
});

test('shelf price always covers the cost, even at zero markup', () => {
  const result = priceDenomination({ amount: 10 });
  assert.ok(result.priceDzd >= result.costDzd);
  assert.equal(result.marginDzd, result.priceDzd - result.costDzd);
});

test('fixed denominations are sorted, de-duplicated and priced', () => {
  const result = denominationsFor({
    denominationType: 'FIXED',
    fixedRecipientDenominations: [50, 10, 25, 10],
    recipientCurrencyCode: 'USD',
    discountPercentage: 0,
    senderFee: 0,
  });

  assert.deepEqual(result.map((d) => d.amount), [10, 25, 50]);
  assert.deepEqual(result.map((d) => d.label), ['10 USD', '25 USD', '50 USD']);
  for (const denomination of result) {
    assert.ok(denomination.price.priceDzd > 0);
  }
});

test('range products produce ordered amounts between the bounds', () => {
  const result = denominationsFor({
    denominationType: 'RANGE',
    fixedRecipientDenominations: [],
    minRecipientDenomination: 10,
    maxRecipientDenomination: 100,
    recipientCurrencyCode: 'USD',
  });

  const amounts = result.map((d) => d.amount);
  assert.equal(amounts[0], 10);
  assert.equal(amounts.at(-1), 100);
  // Strictly ascending, no duplicates.
  assert.deepEqual(amounts, [...new Set(amounts)].sort((a, b) => a - b));
  assert.ok(amounts.length > 2 && amounts.length <= 10);
});

test('an unusable range yields no denominations instead of bogus prices', () => {
  assert.deepEqual(
    denominationsFor({
      denominationType: 'RANGE',
      fixedRecipientDenominations: [],
      minRecipientDenomination: null,
      maxRecipientDenomination: null,
      recipientCurrencyCode: 'USD',
    }),
    [],
  );
});

test('zero and negative fixed denominations are dropped', () => {
  const result = denominationsFor({
    denominationType: 'FIXED',
    fixedRecipientDenominations: [0, -5, 20],
    recipientCurrencyCode: 'USD',
  });
  assert.deepEqual(result.map((d) => d.amount), [20]);
});
