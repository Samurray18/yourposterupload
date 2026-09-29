# DZ Gift Cards

A full-stack digital gift card and game top-up comparison and ordering platform
built for the Algerian market.

Customers browse a catalogue of game cards, platform subscriptions and mobile
top-ups, compare prices, pay with **CCP** or **Baridimob**, and receive their
codes by email or on the order-tracking page. Operators manage products, prices,
stock and orders from a password-protected admin dashboard.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Quick start with Docker](#quick-start-with-docker)
- [Local development without Docker](#local-development-without-docker)
- [Environment variables](#environment-variables)
- [How fulfilment works](#how-fulfilment-works)
- [Payments](#payments)- [Admin guide](#admin-guide)
- [Scripts](#scripts)
- [Project layout](#project-layout)
- [Security notes](#security-notes)
- [Deployment](#deployment)

---

## Features

### Storefront

- Dark, responsive UI built with Tailwind CSS v4 — no UI framework lock-in.
- Catalogue with category browsing, search, price range, in-stock filter and
  sorting.
- Product pages showing every denomination, the saving against the face value,
  and a live stock indicator.
- Cart persisted in `localStorage`, so a refresh mid-checkout loses nothing.
- Guest checkout — no account required. The order number plus the customer's
  mobile number is the key to viewing codes later.
- Order tracking page that reveals codes once an admin delivers the order.
- Loading skeletons, empty states, and mobile-friendly 44px touch targets.

### Orders and delivery

- Prices stored and computed in **integer dinars** — no floating-point money bugs.
- AES-256-GCM encryption of delivered codes at rest.
- A customer only ever sees a code after confirming their order number and the
  mobile number used at checkout.
- Email notifications on order placement, payment confirmation, delivery and
  cancellation. If SMTP is not configured, emails are logged instead of sent so
  development never silently fails.

### Admin

- Single-password login with a signed, `httpOnly`, `SameSite` session cookie.
- Dashboard with revenue, order counts, low-stock alerts and recent orders.
- Product management: create, edit, activate/deactivate, feature, and add or
  remove denominations.
- Inline price editing and per-denomination stock status.
- Reloadly integration panel: connection status, live balance, catalogue preview
  and one-click import, with per-denomination DZD pricing derived from supplier
  cost.
- Order management: filter by status and payment method, mark payments received,
  add internal notes, and deliver one or more codes.
- Product image upload, served from the API so no object storage is required.
- Storefront settings (brand name, contact details, payment instructions,
  announcement banner) editable at runtime.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion |
| Routing | React Router 7 (admin bundle is lazy-loaded and never reaches shoppers) |
| State | React context + `localStorage` — no Redux |
| Backend | Node.js, Express 4, TypeScript |
| Database | PostgreSQL 16 |
| Validation | Zod (v4) on every request body, query and file |
| Auth | `jsonwebtoken` in an `httpOnly` cookie |
| Crypto | Node `crypto`, AES-256-GCM |
| Email | Nodemailer |
| Security | Helmet, CORS allowlist, `express-rate-limit` |
| Tests | Node's built-in test runner |
| Lint | ESLint 9 flat config + typescript-eslint |

---

## Architecture

```
yourposterupload/
├── client/            # React storefront + admin SPA
│   ├── public/        # Static files copied verbatim
│   ├── nginx.conf     # Production server config (SPA fallback + API proxy)
│   └── src/
│       ├── components/   # Header, Footer, ProductCard, shared UI primitives
│       ├── lib/          # Typed API client, shared types, formatters
│       ├── pages/        # Storefront routes
│       │   └── admin/    # Lazy-loaded admin routes
│       ├── store/        # Cart + storefront settings context
│       └── App.tsx       # Router
└── server/            # Express API
    ├── scripts/       # Build-time helpers
    ├── src/
    │   ├── db/        # Schema, idempotent migration runner, seed data
    │       ├── fulfillment/ # Provider interface, manual provider, reloadly/ integration
    │   ├── lib/       # Crypto, IDs, paths
    │   ├── middleware/ # Auth, error handling
    │   ├── routes/    # public, orders, admin
    │   ├── services/  # Orders, products, settings, mailer, formatting
    │   └── types.ts   # Shared domain types
    └── uploads/      # Admin-uploaded product images (git-ignored)
```

### Key design decisions

**Prices are integers.** All money is stored and calculated in whole dinars. The
`price_dzd` columns are `integer`, and comparisons never touch floats.

**Codes are encrypted at rest.** `server/src/lib/crypto.ts` seals each code with
AES-256-GCM under a 32-byte key from `CODES_ENCRYPTION_KEY`. The payload is
`v1.<iv>.<tag>.<ciphertext>`, so the version is explicit and a future key rotation
can still read old rows. GCM is authenticated, so a tampered row fails loudly
rather than returning garbage.

**Fulfilment is pluggable.** `FulfillmentProvider` is an interface with two
implementations: `manual` (an admin pastes the code) and `reloadly` (we buy the
card from Reloadly, including catalogue import and pricing). Adding another
supplier means implementing one interface — no changes to order or route code.

**Migrations are idempotent.** `schema.sql` uses `CREATE ... IF NOT EXISTS`, and
the API applies it on boot. A fresh database volume and an existing one follow
the same code path, so `docker compose up` needs no manual migration step.

**The storefront is same-origin with the API in production.** nginx proxies
`/api` and `/uploads` to the API container, so there is no CORS preflight, the
admin cookie is first-party, and the API URL is not baked into the JS bundle.

---

## Quick start with Docker

Prerequisites: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
with the Compose plugin.

```bash
git clone https://github.com/Samurray18/yourposterupload.git
cd yourposterupload

cp .env.example .env
```

Generate real secrets and paste them into `.env`:

```bash
# Delivery-code encryption key (keep this safe — losing it makes stored
# codes unreadable)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Admin session signing secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# The admin login password — this is a plain login, so pick a strong one
read -s -p "Admin password: " ADMIN_PW && echo
```

Then start everything:

```bash
docker compose up --build
```

| Service | URL |
| --- | --- |
| Storefront | <http://localhost:8080> |
| API | <http://localhost:4000> |
| Health check | <http://localhost:4000/api/health> |
| Admin | <http://localhost:8080/admin> |

On first boot the API creates the schema and, if the database has no products
yet, loads a starter catalogue of 4 categories and 12 products so the storefront
is immediately browsable. The seed only runs while `products` is empty, so your
later edits are never overwritten.

> **The seeded prices are placeholders** that demonstrate the "best verified
> price vs. face value" display. Replace them with your real sourced numbers from
> the admin dashboard before taking real orders.

Stop with `Ctrl+C`, or `docker compose down`. Add `-v` to also delete the
database and uploaded images.

---

## Local development without Docker

Requires Node.js 20+ and a PostgreSQL 14+ instance.

```bash
npm install
cp .env.example .env      # then set DATABASE_URL, secrets and admin credentials
npm run db:migrate        # optional: the API also migrates on boot
npm run db:seed
npm run dev
```

`npm run dev` starts both processes:

- API on <http://localhost:4000> (tsx watch, restarts on change)
- Storefront on <http://localhost:5173>

Vite proxies `/api` and `/uploads` to the API, so the browser stays
same-origin and admin cookies work without any CORS setup.

Run `npm run db:reset` to drop all data and reload the starter catalogue.

---

## Environment variables

`.env` lives at the repository root and is read by the API. Inside Docker
Compose, the values are passed through from the same file.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. In Compose the host is `db`, not `localhost`. |
| `CODES_ENCRYPTION_KEY` | yes | 64 hex characters (32 bytes). Rotating it makes existing codes unreadable. |
| `JWT_SECRET` | yes | Signs the admin session cookie. |
| `ADMIN_EMAIL` | yes | Admin login username. |
| `ADMIN_PASSWORD` | yes | Admin login password. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Compose | Database credentials used by the `db` service. |
| `PORT` | no | API port, default `4000`. |
| `NODE_ENV` | no | `development` or `production`. |
| `PUBLIC_API_URL` | no | Used in links inside emails. |
| `PUBLIC_STOREFRONT_URL` | no | Used in "track your order" links. |
| `CORS_ORIGIN` | no | Comma-separated origin allowlist. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | no | Leave `SMTP_HOST` empty to log emails to the console. |
| `MAIL_FROM` | no | Sender shown on transactional emails. |
| `MAX_UPLOAD_MB` | no | Admin image upload limit, default `5`. |
| `STORE_NAME` | no | Store name shown to customers and sent as the Reloadly sender. |
| `RELOADLY_ENABLED` | no | Turns automatic fulfilment on, default `false`. |
| `RELOADLY_ENVIRONMENT` | no | `sandbox` or `production`; picks the API host. |
| `RELOADLY_CLIENT_ID` / `RELOADLY_CLIENT_SECRET` | Reloadly | Sandbox or production credentials — see [Reloadly](#reloadly-automatic-fulfilment). |
| `RELOADLY_AUDIENCE` | no | Keep `https://giftcards.reloadly.com` for the gift-cards API. |
| `RELOADLY_DZD_RATE` | no | DZD per 1 unit of the settlement currency, default `150`. |
| `RELOADLY_SETTLEMENT_CURRENCY` | no | Currency Reloadly charges the account in, default `USD`. |
| `RELOADLY_MARKUP_PERCENT` | no | Margin added to imported prices, default `8`. |
| `RELOADLY_TIMEOUT_MS` | no | Per-request timeout, default `20000`. |

> If your database password contains characters that are special in a URL
> (`@`, `:`, `/`, `#`, `?`), percent-encode them in `DATABASE_URL`, otherwise
> the connection string will be parsed incorrectly.

---

## How fulfilment works

An order moves through these statuses:

```
pending_payment → payment_confirmed → processing → delivered
                                                  ↘ cancelled
```

1. **pending_payment** — the customer submitted the order and sees payment
   instructions. Nothing is reserved yet.
2. **payment_confirmed** — an admin marks the CCP/Baridimob transfer as
   received, or the customer confirms it if the payment gateway is connected.
3. **processing** — an operator starts sourcing the codes.
4. **delivered** — one or more codes are attached. They are encrypted before
   being written, emailed, and made visible on the tracking page.
5. **cancelled** — terminal. Use this for a payment that never arrived.

Each transition is validated server-side, so an order cannot jump from
`pending_payment` straight to `delivered` by calling the API directly.

Stock status is set explicitly by an operator on each denomination
(`in_stock` / `out_of_stock`) rather than derived from a counter, so the
dashboard can show low-stock warnings and the catalogue can hide a product
without a background job that could drift out of sync. Cards bought from
Reloadly are not stock-tracked: availability is whatever the supplier reports,
so imported products stay active and a failed purchase surfaces as an order in
`processing` rather than a "sold out" storefront.

### Reloadly (automatic fulfilment)

Reloadly is the built-in automatic supplier. It is **off by default** — the
store runs entirely on manual fulfilment until you configure it.

#### 1. Get sandbox credentials

In the Reloadly dashboard, switch the environment toggle to **TEST (sandbox)**
and copy the client id and secret from the API credentials page.

> Credentials are tied to the mode the dashboard was showing when you copied
> them. Secrets copied while the dashboard was on LIVE are rejected by the
> sandbox API with `INVALID_CREDENTIALS`, and vice versa. If authentication
> fails, toggle the dashboard and re-copy rather than debugging the app.

#### 2. Configure the environment

```bash
RELOADLY_ENABLED=true
RELOADLY_ENVIRONMENT=sandbox        # "sandbox" or "production"
RELOADLY_CLIENT_ID=your-client-id
RELOADLY_CLIENT_SECRET=your-client-secret
RELOADLY_DZD_RATE=150               # DZD per 1 USD
RELOADLY_SETTLEMENT_CURRENCY=USD
RELOADLY_MARKUP_PERCENT=8
```

Restart the server and confirm the token exchange works — the admin dashboard
shows the environment and base URL under **Products → Reloadly**, and
**Check balance** performs a live authenticated call.

#### 3. Import the catalogue

**Import catalogue** in the admin panel, or `POST /api/admin/reloadly/import`.
The importer walks the upstream product pages and, for each product, creates or
updates a local product plus one denomination per orderable amount. Re-running
is safe: products are matched on a slug derived from the Reloadly product id
and denominations are upserted on `(product_id, label)`, so a sync never
duplicates rows.

**Preview** shows what a sync would bring in, including the computed DZD price
per denomination, without writing anything.

#### Pricing

The store sells in DZD; Reloadly charges the account in its settlement
currency. Three values, all applied in `reloadly/pricing.ts`:

```
supplier cost = face value × (1 − discount%) + sender fee   (card currency)
cost in DZD   = supplier cost × RELOADLY_DZD_RATE
shelf price   = cost in DZD × (1 + RELOADLY_MARKUP_PERCENT / 100)
```

Costs are rounded up, so a card is never listed at or below what you pay.
Imported denominations always carry whole-dinar prices. Set
`RELOADLY_DZD_RATE` from your actual bank rate and review the margin before
going live.

#### How an order is fulfilled

Products imported from Reloadly have `fulfillment_mode = 'auto'`. When an
operator triggers automatic delivery, the `reloadly` provider:

1. looks up whether this order *line* was already purchased;
2. `POST /orders` with the order number as `customIdentifier`;
3. records the returned `transactionId` in `order_supplier_transactions`
   against that line, before anything is shown to the customer;
4. reads the codes from the `smiles` array in the order response, falling back
   to `GET /transactions/{id}/code` if the card is still processing;
5. hands the codes to the normal delivery path, which encrypts and emails them.

Cards that carry a PIN are delivered as `CODE (PIN: …)`.

**Safety properties worth knowing:**

- `POST /orders` is **never retried automatically**. A timeout may have been
  accepted upstream, and repeating it would spend money twice. The stored
  `transactionId` plus the `customIdentifier` sent upstream is what makes an
  ambiguous outcome recoverable.
- A repeat call for a line that already has a recorded transaction returns the
  stored codes instead of buying a second card, so retries and double-clicks
  are safe. Transactions are recorded per line, not per order, so the second
  item of a multi-item order is tracked separately from the first.
- Before buying, the provider takes an exclusive **claim** on the order
  (`supplier_claim_token`). A double-clicked button, or the admin panel and a
  scheduled job firing together, therefore cannot both spend money: the loser
  reports the order as still in progress. A claim older than 10 minutes is
  treated as abandoned, so a process that dies mid-purchase does not block the
  order forever.
- Upstream failures never throw. The order stays in `processing` and the reason
  is written to `orders.supplier_error` for an operator to see.
- Multi-item orders are fulfilled line by line, each line resolving its own
  provider, so a cart can mix imported and manual products. The order is only
  marked delivered when every line has codes.

#### Rate limits

Requests use bounded retries with jittered backoff for `429` and `5xx`,
honouring the upstream signal. Checked `GET` calls are retried; order placement
is not. The access token is cached process-wide and refreshed 60 seconds before
expiry, with concurrent callers sharing a single refresh.

### Adding another distributor

Implement `FulfillmentProvider` in `server/src/fulfillment/`, then register it
in `FulfillmentProvider.ts`. The `reloadly/` directory is laid out as a
reference: `client.ts` (auth, retries), `api.ts` (typed endpoints),
`pricing.ts` (money), `import.ts` (catalogue sync), `provider.ts` (the
`FulfillmentProvider` implementation).

---

## Payments

CCP and Baridimob are both **manual payment methods**: the customer transfers
the exact amount using the instructions shown at checkout, then the operator
confirms receipt from the admin dashboard.

This is deliberate. There is no automated confirmation and no payment
integration to get wrong, so there is no risk of an order being marked paid
that was not. It also means you keep the funds flow and the customer
relationship in your own bank.

The `payments` block in store settings holds the instructions shown to
customers per method (account holder, bank, RIB, amount to transfer, and what
to write in the reference). They are editable from the admin dashboard.

If you later want a gateway, add a `payment_intents` table and a provider
alongside the existing `paymentMethod` enum — the order state machine already
treats "payment confirmed" as an externally-triggerable event.

---

## Admin guide

Open `/admin` and sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

- **Dashboard** — revenue, orders by status, low-stock products, recent orders.
- **Products** — create and edit products, set the category and image, mark a
  product as featured, toggle it active, and manage denominations. Prices and
  stock status are editable inline without opening a modal.
- **Orders** — filter by status, search, open an order to see items, payment and
  customer details. Mark payments received, move an order to processing, paste
  the delivered codes, or cancel with a reason. Internal notes are visible to
  staff only.

Uploaded product images are stored in `server/uploads` (or the `uploads` volume
in Docker) and served from `/uploads/`. For a multi-server deployment, swap the
storage in `server/src/routes/admin.ts` for S3 or any object store.

---

## Scripts

Run from the repository root.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API and the Vite dev server together. |
| `npm run build` | Build both packages for production. |
| `npm start` | Run the compiled API. |
| `npm run typecheck` | Type-check both packages. |
| `npm run lint` | Lint everything with ESLint. |
| `npm test` | Run the server test suite. |
| `npm run db:migrate` | Apply the schema. |
| `npm run db:seed` | Load the starter catalogue. |
| `npm run db:reset` | Drop everything, then re-migrate and re-seed. |

`db:reset` is destructive. There is no undo.

---

## Security notes

- Delivery codes are encrypted with AES-256-GCM. Reading one requires decrypting
  it server-side, and only after the customer proves they own the order.
- The admin session is a signed JWT in an `httpOnly`, `SameSite=Lax` cookie, so
  it is not reachable from JavaScript. `Secure` is set automatically in
  production.
- Login and public order endpoints are rate limited.
- Every request body, query string and upload is validated with Zod. Unknown
  fields are stripped rather than passed through, so a caller cannot smuggle
  extra keys into a query.
- `helmet` sets the usual security headers, and CORS uses an explicit origin
  allowlist rather than reflecting the request origin.
- Admin passwords are read from the environment and compared in constant time.
  If you need multiple staff accounts with hashed passwords, move them into a
  `staff_users` table and compare with argon2 or bcrypt.
- `RELOADLY_CLIENT_SECRET` is only ever read server-side. The admin status
  endpoint reports *which* variables are missing, never their values.
- Money handling: `POST /orders` is never retried automatically, because a
  network timeout may still have been accepted upstream. Each purchase stores
  its `transactionId` before the customer sees anything, and that stored id is
  what a retry reads, so a repeated delivery attempt cannot buy a second card.
  Rotate the Reloadly secret if it is ever pasted into a chat, an issue tracker
  or a log.

**Before going live:** change `ADMIN_PASSWORD`, set real `CODES_ENCRYPTION_KEY`
and `JWT_SECRET` values, put the site behind HTTPS so the `Secure` cookie flag
is active, and review `RELOADLY_DZD_RATE` / `RELOADLY_MARKUP_PERCENT` against
your real costs.

---

## Deployment

The Dockerfiles produce production images for both services, so any host that
can run containers will work.

```bash
docker compose up -d --build
```

For a real deployment, put a reverse proxy with TLS (Caddy, nginx, Traefik) in
front of port `8080`, then set in `.env`:

```
NODE_ENV=production
PUBLIC_API_URL=https://api.example.com
PUBLIC_STOREFRONT_URL=https://example.com
CORS_ORIGIN=https://example.com
```

Notes for production:

- `docker compose up` waits for the database health check before starting the
  API, so the first migration never races an unready Postgres.
- Back up the `db_data` and `uploads` volumes. Losing `CODES_ENCRYPTION_KEY`
  makes every delivered code permanently unreadable.
- The API is stateless apart from the database and the upload directory, so it
  scales horizontally behind a load balancer.
- Scaling the Vite bundle: the admin bundle is code-split, so shoppers never
  download it.

---

## Licence

Private project. All rights reserved.
