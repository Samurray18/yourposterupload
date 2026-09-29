/**
 * Smoke tests that do not need a database. Run with:
 *   npm run test --workspace server
 *
 * These cover the pieces where a silent mistake would be expensive: the
 * encryption round-trip, phone normalisation, order-number shape, price
 * formatting, and that the Express app + all routes can be constructed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';
import { config } from './config.js';
import { encryptSecret, decryptSecret, tryDecryptSecret } from './lib/crypto.js';
import { generateOrderNumber, isValidAlgerianPhone, normalizePhone } from './lib/ids.js';
import { discountPercent, formatDzd, wilayas } from './services/format.js';
import { resolveProvider } from './fulfillment/FulfillmentProvider.js';
import { pool } from './db/pool.js';

test.after(async () => {
  await pool.end().catch(() => {});
});

test('encrypted codes round-trip', () => {
  const secret = 'XXXXX-YYYYY-ZZZZZ';
  const payload = encryptSecret(secret);

  assert.notEqual(payload, secret, 'ciphertext must not contain the plaintext');
  assert.ok(payload.startsWith('v1.'), 'payload should be version-tagged');
  assert.equal(decryptSecret(payload), secret);
});

test('a tampered payload fails to decrypt rather than returning garbage', () => {
  const payload = encryptSecret('SECRET-CODE-1234');
  const parts = payload.split('.');
  // Flip a byte in the ciphertext.
  const ciphertext = parts[3]!;
  parts[3] = (ciphertext[0] === 'a' ? 'b' : 'a') + ciphertext.slice(1);

  assert.throws(() => decryptSecret(parts.join('.')));
  assert.equal(tryDecryptSecret(parts.join('.')), null, 'tryDecrypt should swallow the error');
});

test('the same plaintext encrypts differently every time', () => {
  assert.notEqual(encryptSecret('SAME'), encryptSecret('SAME'));
});

test('Algerian phone numbers normalise and validate', () => {
  assert.equal(normalizePhone('0555123456'), '0555123456');
  assert.equal(normalizePhone('+213 555 12 34 56'), '0555123456');
  assert.equal(normalizePhone('213555123456'), '0555123456');
  assert.equal(normalizePhone('00213555123456'), '0555123456');

  assert.equal(isValidAlgerianPhone('0555 12 34 56'), true);
  assert.equal(isValidAlgerianPhone('+213555123456'), true);
  assert.equal(isValidAlgerianPhone('0123456789'), false, 'landlines are not accepted');
  assert.equal(isValidAlgerianPhone('12345'), false);
});

test('order numbers avoid visually ambiguous characters', () => {
  const number = generateOrderNumber();
  // Mirrors ALPHABET in lib/ids.ts: no 0/O, 1/I, 2/Z, 5/S or 8/B.
  // The rule applies to the random suffix only — the year prefix is fixed.
  assert.match(number, /^DZD-\d{4}-[ACDEFGHJKLMNPQRTUVWXY34679]{8}$/);
  const suffix = number.split('-')[2]!;
  for (const char of ['0', 'O', '1', 'I', '2', 'Z', '5', 'S', '8', 'B']) {
    assert.equal(suffix.includes(char), false, `${char} should not appear in ${suffix}`);
  }
});

test('discounts are only reported when they are real', () => {
  assert.equal(discountPercent(1300, 1500), 13);
  assert.equal(discountPercent(1500, 1500), null);
  assert.equal(discountPercent(1600, 1500), null, 'never shows a negative saving');
  assert.equal(discountPercent(700, null), null);
});

test('prices render as Algerian-friendly dinar amounts', () => {
  assert.equal(formatDzd(12500), '12 500 DZD');
  assert.equal(formatDzd(700), '700 DZD');
  assert.equal(formatDzd(1350.4), '1 350 DZD');
});

test('the wilaya list is complete', () => {
  const list = wilayas();
  assert.equal(list.length, 58, 'Algeria has 58 wilayas');
  assert.ok(list.some((w) => w.startsWith('16 -')), 'Alger should be present');
  assert.ok(list.some((w) => w.startsWith('31 -')), 'Oran should be present');
});

test('fulfillment providers resolve by mode', () => {
  assert.equal(resolveProvider('manual').mode, 'manual');
  assert.equal(resolveProvider('auto').mode, 'auto');
  // An unknown mode must fall back to manual rather than crash.
  assert.equal(resolveProvider('nope' as never).mode, 'manual');
});

test('the Express app and every route mount cleanly', () => {
  const app = createApp();
  assert.ok(app, 'app should be constructed');
  const routes = (app as unknown as { _router: { stack: unknown[] } })._router.stack;
  assert.ok(Array.isArray(routes) && routes.length > 0, 'router should have layers');
});

/**
 * Exercises the real HTTP stack — validation, rate limiting, password compare,
 * JWT signing and cookie flags — without needing a database.
 */
test('admin login issues an httpOnly cookie and guards the protected routes', async () => {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;

  try {
    // A missing password must be rejected by validation, not by the compare.
    const missing = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: config.admin.email }),
    });
    assert.equal(missing.status, 400);

    const wrong = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: config.admin.email, password: 'definitely-wrong' }),
    });
    assert.equal(wrong.status, 401, 'a bad password must be rejected');

    const ok = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: config.admin.email, password: config.admin.password }),
    });
    assert.equal(ok.status, 200);

    const setCookie = ok.headers.get('set-cookie') ?? '';
    assert.match(setCookie, /dzdz_admin_session=/, 'an auth cookie should be set');
    assert.match(setCookie, /HttpOnly/i, 'the auth cookie must be httpOnly');
    assert.match(setCookie, /SameSite/i, 'the auth cookie must set SameSite');
    // `Secure` is only correct over HTTPS, so it is asserted in the opposite
    // direction: it must be absent locally, where plain HTTP would drop it.
    if (config.env === 'development') {
      assert.doesNotMatch(setCookie, /;\s*Secure/i, 'Secure would break local HTTP');
    }

    // Unauthenticated access to a protected route must be refused.
    const anonymous = await fetch(`${base}/api/admin/products`);
    assert.equal(anonymous.status, 401);

    // ...and allowed once the cookie is presented.
    const cookie = setCookie.split(';')[0]!;
    const authed = await fetch(`${base}/api/admin/products`, { headers: { cookie } });
    assert.notEqual(authed.status, 401, `expected the cookie to authenticate, got ${authed.status}`);

    const logout = await fetch(`${base}/api/admin/logout`, {
      method: 'POST',
      headers: { cookie },
    });
    assert.equal(logout.status, 200);
    assert.match(
      logout.headers.get('set-cookie') ?? '',
      /dzdz_admin_session=;/,
      'logout should clear the cookie',
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
