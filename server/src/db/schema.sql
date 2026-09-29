-- ============================================================================
-- DZ Gift Cards — PostgreSQL schema
-- Idempotent: safe to run on every boot / via `npm run db:migrate`.
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  name_fr       TEXT,
  description   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  category_id      UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  description      TEXT,
  image_url        TEXT,
  delivery_speed   TEXT NOT NULL DEFAULT 'manual'
                     CHECK (delivery_speed IN ('instant', 'few_hours', 'manual')),
  fulfillment_mode TEXT NOT NULL DEFAULT 'manual'
                     CHECK (fulfillment_mode IN ('manual', 'auto')),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured      BOOLEAN NOT NULL DEFAULT FALSE,
  popularity       INTEGER NOT NULL DEFAULT 0,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_category_idx  ON products (category_id);
CREATE INDEX IF NOT EXISTS products_active_idx    ON products (is_active, sort_order);
CREATE INDEX IF NOT EXISTS products_featured_idx  ON products (is_featured) WHERE is_featured;

CREATE TABLE IF NOT EXISTS product_denominations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label               TEXT NOT NULL,
  face_value          TEXT,
  price_dzd           NUMERIC(12, 2) NOT NULL CHECK (price_dzd >= 0),
  compare_price_dzd   NUMERIC(12, 2) CHECK (compare_price_dzd > 0),
  stock_status        TEXT NOT NULL DEFAULT 'in_stock'
                        CHECK (stock_status IN ('in_stock', 'out_of_stock')),
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS denominations_product_idx ON product_denominations (product_id, sort_order);

CREATE TABLE IF NOT EXISTS orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number       TEXT NOT NULL UNIQUE,
  full_name          TEXT NOT NULL,
  phone              TEXT NOT NULL,
  email              TEXT,
  wilaya             TEXT NOT NULL,
  payment_method     TEXT NOT NULL CHECK (payment_method IN ('baridimob', 'ccp')),
  payment_reference  TEXT,
  customer_notes     TEXT,
  admin_notes        TEXT,
  status             TEXT NOT NULL DEFAULT 'pending_payment'
                       CHECK (status IN ('pending_payment', 'payment_confirmed',
                                         'processing', 'delivered', 'cancelled')),
  subtotal_dzd       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_dzd          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  delivered_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_status_idx    ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_created_idx   ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_lookup_idx    ON orders (order_number, phone);

CREATE TABLE IF NOT EXISTS order_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id          UUID,
  product_name        TEXT NOT NULL,
  product_slug        TEXT NOT NULL,
  product_image_url   TEXT,
  denomination_id     UUID,
  denomination_label  TEXT NOT NULL,
  unit_price_dzd      NUMERIC(12, 2) NOT NULL,
  quantity            INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  line_total_dzd      NUMERIC(12, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

-- One row per delivered code. `encrypted_payload` holds an AES-256-GCM
-- envelope produced by server/src/lib/crypto.ts. It is only decrypted for a
-- verified order-owner lookup or for the admin who delivered it.
CREATE TABLE IF NOT EXISTS order_deliveries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id      UUID REFERENCES order_items(id) ON DELETE SET NULL,
  encrypted_payload  TEXT NOT NULL,
  instructions       TEXT,
  fulfilled_by       TEXT NOT NULL DEFAULT 'manual',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deliveries_order_idx ON order_deliveries (order_id);

-- Track how many times each product has been ordered, without scanning
-- order_items on every list request.
CREATE TABLE IF NOT EXISTS product_sales (
  product_id    UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  units_sold    INTEGER NOT NULL DEFAULT 0,
  revenue_dzd   NUMERIC(14, 2) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Site-wide settings edited from the admin dashboard (payment instructions,
-- support contact, announcement banner...). Values are JSONB so the shape can
-- grow without a migration.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep products.updated_at honest without relying on every writer to set it.
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_touch_updated_at ON products;
CREATE TRIGGER products_touch_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS orders_touch_updated_at ON orders;
CREATE TRIGGER orders_touch_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
