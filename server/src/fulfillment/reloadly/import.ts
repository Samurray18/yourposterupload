/**
 * Reloadly -> local catalogue import.
 *
 * Creates or refreshes a local product per Reloadly product and replaces its
 * denominations with the amounts we can order. Re-importing is safe: products
 * are matched on a stable slug derived from the Reloadly id, and
 * denominations are upserted on (product, supplier amount) so a sync never
 * duplicates rows or orphans the ones a customer is currently buying.
 */
import { query, withTransaction } from '../../db/pool.js';
import { listAllProducts } from './api.js';
import { denominationsFor } from './pricing.js';
import { config } from '../../config.js';
import { RELOADLY_SUPPLIER } from './constants.js';
import type { ReloadlyProduct } from './types.js';

export interface ImportOptions {
  countryCode?: string;
  categoryId?: number;
  search?: string;
  /** Skip products with fewer than one usable denomination. */
  minDenominations?: number;
  categorySlug?: string;
  categoryName?: string;
  maxPages?: number;
}

export interface ImportSummary {
  productsSeen: number;
  productsCreated: number;
  productsUpdated: number;
  productsSkipped: number;
  denominationsWritten: number;
  skippedNames: string[];
}

/** Stable, human-readable slug for a Reloadly product. */
function productSlug(product: ReloadlyProduct): string {
  const brand = product.brand.brandName ?? product.productName;
  const country = product.country.isoName ? `-${product.country.isoName.toLowerCase()}` : '';
  return `${slugify(brand)}${country}-${product.productId}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * `RETURNING id` should always yield a row; if it does not the write silently
 * did nothing, which is worth a loud failure rather than an undefined id
 * propagating into the next statement.
 */
function requireId(rows: { id: string }[]): string {
  const id = rows[0]?.id;
  if (!id) throw new Error('Expected the database to return a row id');
  return id;
}

export async function importReloadlyCatalogue(
  options: ImportOptions = {},
): Promise<ImportSummary> {
  const products = await listAllProducts(
    {
      countryCode: options.countryCode,
      categoryId: options.categoryId,
      search: options.search,
      includeFixed: true,
      includeRange: true,
    },
    options.maxPages ?? 20,
  );

  const minDenominations = options.minDenominations ?? 1;
  const categoryId = await resolveCategory(options);

  const summary: ImportSummary = {
    productsSeen: products.length,
    productsCreated: 0,
    productsUpdated: 0,
    productsSkipped: 0,
    denominationsWritten: 0,
    skippedNames: [],
  };

  for (const product of products) {
    const denominations = denominationsFor(product);
    if (denominations.length < minDenominations) {
      summary.productsSkipped += 1;
      summary.skippedNames.push(product.productName);
      continue;
    }

    const slug = productSlug(product);
    const instructions = product.redeemInstruction?.concise ?? null;
    const imageUrl = product.country.flagUrl ?? null;

    // One transaction per product: a product and its denominations must never
    // end up half-written.
    await withTransaction(async (client) => {
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM products WHERE slug = $1',
        [slug],
      );

      let productRowId: string;
      if (existing.rows.length > 0) {
        productRowId = requireId(existing.rows);
        await client.query(
          `UPDATE products
              SET name = $2,
                  description = $3,
                  image_url = COALESCE($4, image_url),
                  fulfillment_mode = 'auto',
                  updated_at = now()
            WHERE id = $1`,
          [productRowId, product.productName, product.brand.brandName ?? null, imageUrl],
        );
        summary.productsUpdated += 1;
      } else {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO products (slug, name, category_id, description, image_url, fulfillment_mode, delivery_speed)
           VALUES ($1, $2, $3, $4, $5, 'auto', 'instant')
           RETURNING id`,
          [slug, product.productName, categoryId, product.brand.brandName ?? null, imageUrl],
        );
        productRowId = requireId(inserted.rows);
        summary.productsCreated += 1;
      }

      for (const [index, denomination] of denominations.entries()) {
        // Upsert keyed on the supplier amount so repeat syncs update in place.
        const upserted = await client.query<{ id: string }>(
          `INSERT INTO product_denominations
             (product_id, label, face_value, price_dzd, supplier, supplier_product_id,
              supplier_amount, supplier_currency, supplier_cost_dzd, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (product_id, label) DO UPDATE
             SET price_dzd = EXCLUDED.price_dzd,
                 face_value = EXCLUDED.face_value,
                 supplier = EXCLUDED.supplier,
                 supplier_product_id = EXCLUDED.supplier_product_id,
                 supplier_amount = EXCLUDED.supplier_amount,
                 supplier_currency = EXCLUDED.supplier_currency,
                 supplier_cost_dzd = EXCLUDED.supplier_cost_dzd,
                 stock_status = 'in_stock',
                 sort_order = EXCLUDED.sort_order
           RETURNING id`,
          [
            productRowId,
            denomination.label,
            denomination.label,
            denomination.price.priceDzd,
            RELOADLY_SUPPLIER,
            product.productId,
            denomination.amount,
            product.recipientCurrencyCode,
            denomination.price.costDzd,
            index,
          ],
        );

        if (upserted.rows.length > 0) summary.denominationsWritten += 1;
      }

      // Redeem instructions belong to the product, not the denomination.
      if (instructions) {
        await client.query(
          'UPDATE products SET description = COALESCE(description, $2) WHERE id = $1',
          [productRowId, instructions],
        );
      }
    });
  }

  return summary;
}

/**
 * Denominations the importer manages for a local product. Rows without a
 * supplier amount are manual entries and are left untouched.
 */
export async function getSupplierDenominations(productId: string): Promise<
  { id: string; label: string; amount: number; currency: string; productId: number }[]
> {
  const { rows } = await query<{
    id: string;
    label: string;
    supplier_amount: number;
    supplier_currency: string;
    supplier_product_id: number;
  }>(
    `SELECT id, label, supplier_amount, supplier_currency, supplier_product_id
       FROM product_denominations
      WHERE product_id = $1 AND supplier = $2 AND supplier_amount IS NOT NULL
      ORDER BY sort_order`,
    [productId, RELOADLY_SUPPLIER],
  );

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    amount: Number(row.supplier_amount),
    currency: row.supplier_currency,
    productId: Number(row.supplier_product_id),
  }));
}

async function resolveCategory(options: ImportOptions): Promise<string> {
  if (options.categorySlug) {
    const { rows } = await query<{ id: string }>(
      'SELECT id FROM categories WHERE slug = $1',
      [options.categorySlug],
    );
    if (rows.length > 0) return requireId(rows);
  }

  // Default: the gift-cards category, created on demand so a fresh database
  // can be imported into without manual seeding.
  const { rows } = await query<{ id: string }>(
    "SELECT id FROM categories WHERE slug = 'gift-cards'",
  );
  if (rows.length > 0) return requireId(rows);

  const created = await query<{ id: string }>(
    `INSERT INTO categories (slug, name, name_fr, description)
     VALUES ('gift-cards', 'Gift Cards', 'Cartes cadeaux', 'Imported from Reloadly')
     RETURNING id`,
  );
  return requireId(created.rows);
}

/** Live balance, used by the admin dashboard to warn before a failed order. */
export async function getSettlementSummary(): Promise<{
  environment: string;
  baseUrl: string;
  dzdRate: number;
  markupPercent: number;
}> {
  return {
    environment: config.reloadly.environment,
    baseUrl: config.reloadly.baseUrl,
    dzdRate: config.reloadly.dzdRate,
    markupPercent: config.reloadly.markupPercent,
  };
}
