import { query, queryOne, withTransaction } from '../db/pool.js';
import { discountPercent } from './format.js';
import type { Category, Denomination, Product } from '../types.js';
import { AppError } from '../lib/errors.js';

/* ------------------------------------------------------------------ queries */

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  description: string | null;
  image_url: string | null;
  delivery_speed: Product['deliverySpeed'];
  fulfillment_mode: Product['fulfillmentMode'];
  is_active: boolean;
  is_featured: boolean;
  popularity: number;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

interface DenominationRow {
  id: string;
  product_id: string;
  label: string;
  face_value: string | null;
  price_dzd: number;
  compare_price_dzd: number | null;
  stock_status: Denomination['stockStatus'];
  sort_order: number;
}

const PRODUCT_COLUMNS = `
  p.id, p.slug, p.name, p.category_id, c.slug AS category_slug, c.name AS category_name,
  p.description, p.image_url, p.delivery_speed, p.fulfillment_mode, p.is_active,
  p.is_featured, p.popularity, p.sort_order, p.created_at, p.updated_at
`;

/** Attaches denominations plus the derived price summary to a set of product rows. */
function hydrate(rows: ProductRow[], denominations: DenominationRow[]): Product[] {
  const byProduct = new Map<string, DenominationRow[]>();
  for (const denomination of denominations) {
    const list = byProduct.get(denomination.product_id);
    if (list) list.push(denomination);
    else byProduct.set(denomination.product_id, [denomination]);
  }

  return rows.map((row) => {
    const denominations: Denomination[] = (byProduct.get(row.id) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((d) => ({
        id: d.id,
        productId: d.product_id,
        label: d.label,
        faceValue: d.face_value,
        priceDzd: Number(d.price_dzd),
        comparePriceDzd: d.compare_price_dzd === null ? null : Number(d.compare_price_dzd),
        stockStatus: d.stock_status,
        sortOrder: d.sort_order,
      }));

    const prices = denominations.map((d) => d.priceDzd);
    const bestSaving = denominations.reduce<number | null>((best, d) => {
      const percent = discountPercent(d.priceDzd, d.comparePriceDzd);
      return percent === null ? best : Math.max(best ?? 0, percent);
    }, null);

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      categoryId: row.category_id,
      categorySlug: row.category_slug,
      categoryName: row.category_name,
      description: row.description,
      imageUrl: row.image_url,
      deliverySpeed: row.delivery_speed,
      fulfillmentMode: row.fulfillment_mode,
      isActive: row.is_active,
      isFeatured: row.is_featured,
      popularity: row.popularity,
      sortOrder: row.sort_order,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      denominations,
      minPriceDzd: prices.length ? Math.min(...prices) : null,
      maxPriceDzd: prices.length ? Math.max(...prices) : null,
      totalDiscountPercent: bestSaving,
      inStock: denominations.some((d) => d.stockStatus === 'in_stock'),
    };
  });
}

export async function listCategories(): Promise<Category[]> {
  const { rows } = await query<{
    id: string;
    slug: string;
    name: string;
    name_fr: string | null;
    description: string | null;
    sort_order: number;
    product_count: number;
  }>(
    `SELECT c.id, c.slug, c.name, c.name_fr, c.description, c.sort_order,
            count(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active
      GROUP BY c.id
      ORDER BY c.sort_order, c.name`,
  );
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    nameFr: r.name_fr,
    description: r.description,
    sortOrder: r.sort_order,
    productCount: r.product_count,
  }));
}

export interface ListProductsParams {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: 'price_asc' | 'price_desc' | 'popular' | 'newest';
  limit?: number;
  offset?: number;
  includeInactive?: boolean;
  featuredOnly?: boolean;
}

export async function listProducts(params: ListProductsParams = {}): Promise<Product[]> {
  const where: string[] = [];
  const values: Array<string | number> = [];

  if (params.includeInactive !== true) where.push('p.is_active = TRUE');
  if (params.featuredOnly) where.push('p.is_featured = TRUE');
  if (params.category) {
    values.push(params.category);
    where.push(`c.slug = $${values.length}`);
  }
  if (params.search) {
    values.push(`%${params.search}%`);
    where.push(`(p.name ILIKE $${values.length} OR p.description ILIKE $${values.length})`);
  }
  if (params.inStockOnly) {
    where.push(`EXISTS (
      SELECT 1 FROM product_denominations d
       WHERE d.product_id = p.id AND d.stock_status = 'in_stock')`);
  }

  // Price filters are evaluated against the *minimum* denomination price, which
  // is the number a shopper actually compares.
  if (params.minPrice !== undefined) {
    values.push(params.minPrice);
    where.push(
      `(SELECT min(price_dzd) FROM product_denominations d WHERE d.product_id = p.id) >= $${values.length}`,
    );
  }
  if (params.maxPrice !== undefined) {
    values.push(params.maxPrice);
    where.push(
      `(SELECT min(price_dzd) FROM product_denominations d WHERE d.product_id = p.id) <= $${values.length}`,
    );
  }

  const orderBy =
    params.sort === 'price_desc'
      ? 'min_price DESC NULLS LAST'
      : params.sort === 'popular'
        ? 'p.popularity DESC, p.sort_order'
        : params.sort === 'newest'
          ? 'p.created_at DESC'
          : 'min_price ASC NULLS LAST, p.popularity DESC';

  values.push(params.limit ?? 60, params.offset ?? 0);

  const { rows } = await query<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS},
            (SELECT min(price_dzd) FROM product_denominations d WHERE d.product_id = p.id) AS min_price
       FROM products p
       JOIN categories c ON c.id = p.category_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ${orderBy}
      LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { rows: denominations } = await query<DenominationRow>(
    `SELECT * FROM product_denominations WHERE product_id = ANY($1::uuid[]) ORDER BY sort_order`,
    [ids],
  );

  return hydrate(rows, denominations);
}

export async function getProductBySlug(slug: string, includeInactive = false): Promise<Product | null> {
  const { rows } = await query<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p
       JOIN categories c ON c.id = p.category_id
      WHERE p.slug = $1 ${includeInactive ? '' : 'AND p.is_active = TRUE'}`,
    [slug],
  );
  const row = rows[0];
  if (!row) return null;

  const { rows: denominations } = await query<DenominationRow>(
    'SELECT * FROM product_denominations WHERE product_id = $1 ORDER BY sort_order',
    [row.id],
  );
  return hydrate([row], denominations)[0] ?? null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const { rows } = await query<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  const { rows: denominations } = await query<DenominationRow>(
    'SELECT * FROM product_denominations WHERE product_id = $1 ORDER BY sort_order',
    [row.id],
  );
  return hydrate([row], denominations)[0] ?? null;
}

/** Product + denomination resolved together, for order creation. */
export async function resolvePurchaseInput(
  denominationId: string,
): Promise<{ product: Product; denomination: Denomination }> {
  const { rows } = await query<{ product_id: string }>(
    'SELECT product_id FROM product_denominations WHERE id = $1',
    [denominationId],
  );
  const productId = rows[0]?.product_id;
  if (!productId) throw AppError.badRequest('That option is no longer available');

  const product = await getProductById(productId);
  if (!product || !product.isActive) throw AppError.badRequest('That product is unavailable');

  const denomination = product.denominations.find((d) => d.id === denominationId);
  if (!denomination) throw AppError.badRequest('That option is no longer available');
  if (denomination.stockStatus !== 'in_stock') {
    throw AppError.badRequest(`${product.name} — ${denomination.label} is out of stock`);
  }

  return { product, denomination };
}

/* ------------------------------------------------------------------ writing */

export interface UpsertProductInput {
  slug?: string;
  name: string;
  categoryId: string;
  description?: string | null;
  imageUrl?: string | null;
  deliverySpeed: Product['deliverySpeed'];
  fulfillmentMode: Product['fulfillmentMode'];
  isActive: boolean;
  isFeatured: boolean;
  popularity: number;
  sortOrder: number;
  denominations: Array<{
    id?: string;
    label: string;
    faceValue?: string | null;
    priceDzd: number;
    comparePriceDzd?: number | null;
    stockStatus: Denomination['stockStatus'];
  }>;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function createProduct(input: UpsertProductInput): Promise<Product> {
  const slug = slugify(input.slug || input.name);
  if (!slug) throw AppError.badRequest('Could not derive a URL slug from that name');

  const id = await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO products
         (slug, name, category_id, description, image_url, delivery_speed,
          fulfillment_mode, is_active, is_featured, popularity, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        slug,
        input.name,
        input.categoryId,
        input.description ?? null,
        input.imageUrl ?? null,
        input.deliverySpeed,
        input.fulfillmentMode,
        input.isActive,
        input.isFeatured,
        input.popularity,
        input.sortOrder,
      ],
    );
    const productId = rows[0]!.id;
    await replaceDenominations(client, productId, input.denominations);
    await client.query(
      'INSERT INTO product_sales (product_id) VALUES ($1) ON CONFLICT (product_id) DO NOTHING',
      [productId],
    );
    return productId;
  });

  return (await getProductById(id))!;
}

export async function updateProduct(
  id: string,
  input: Partial<UpsertProductInput> & { denominations?: UpsertProductInput['denominations'] },
): Promise<Product> {
  const existing = await getProductById(id);
  if (!existing) throw AppError.notFound('Product not found');

  const fields: string[] = [];
  const values: Array<string | number | boolean | null> = [];
  const push = (column: string, value: unknown) => {
    values.push(value as never);
    fields.push(`${column} = $${values.length}`);
  };

  if (input.name !== undefined) push('name', input.name);
  if (input.slug !== undefined) {
    const slug = slugify(input.slug);
    if (slug) push('slug', slug);
  }
  if (input.categoryId !== undefined) push('category_id', input.categoryId);
  if (input.description !== undefined) push('description', input.description);
  if (input.imageUrl !== undefined) push('image_url', input.imageUrl);
  if (input.deliverySpeed !== undefined) push('delivery_speed', input.deliverySpeed);
  if (input.fulfillmentMode !== undefined) push('fulfillment_mode', input.fulfillmentMode);
  if (input.isActive !== undefined) push('is_active', input.isActive);
  if (input.isFeatured !== undefined) push('is_featured', input.isFeatured);
  if (input.popularity !== undefined) push('popularity', input.popularity);
  if (input.sortOrder !== undefined) push('sort_order', input.sortOrder);

  await withTransaction(async (client) => {
    if (fields.length) {
      await client.query(`UPDATE products SET ${fields.join(', ')} WHERE id = $${values.length + 1}`, [
        ...values,
        id,
      ]);
    }
    if (input.denominations) {
      await replaceDenominations(client, id, input.denominations);
    }
  });

  return (await getProductById(id))!;
}

async function replaceDenominations(
  client: import('pg').PoolClient,
  productId: string,
  denominations: UpsertProductInput['denominations'],
): Promise<void> {
  if (denominations.length === 0) throw AppError.badRequest('A product needs at least one option');
  const ids = denominations.map((d) => d.id).filter(Boolean) as string[];
  if (ids.length) {
    // Only delete rows that are not being kept, so any deliveries referencing a
    // removed option keep their foreign key intact.
    await client.query(
      'DELETE FROM product_denominations WHERE product_id = $1 AND NOT (id = ANY($2::uuid[]))',
      [productId, ids],
    );
  } else {
    await client.query('DELETE FROM product_denominations WHERE product_id = $1', [productId]);
  }

  for (const [index, denomination] of denominations.entries()) {
    const values = [
      productId,
      denomination.label,
      denomination.faceValue ?? null,
      denomination.priceDzd,
      denomination.comparePriceDzd ?? null,
      denomination.stockStatus,
      index * 10,
    ];
    if (denomination.id) {
      await client.query(
        `UPDATE product_denominations
            SET label = $2, face_value = $3, price_dzd = $4, compare_price_dzd = $5,
                stock_status = $6, sort_order = $7
          WHERE id = $1 AND product_id = $8`,
        [...values, denomination.id],
      );
    } else {
      await client.query(
        `INSERT INTO product_denominations
           (product_id, label, face_value, price_dzd, compare_price_dzd, stock_status, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        values,
      );
    }
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const ordered = await queryOne<{ count: number }>(
    'SELECT count(*)::int AS count FROM order_items WHERE product_id = $1',
    [id],
  );
  if ((ordered?.count ?? 0) > 0) {
    // Products referenced by an order are archived rather than deleted so past
    // orders keep a readable history.
    await query('UPDATE products SET is_active = FALSE WHERE id = $1', [id]);
    return;
  }
  await query('DELETE FROM products WHERE id = $1', [id]);
}

export async function quickUpdatePrices(
  productId: string,
  updates: Array<{ id: string; priceDzd: number; comparePriceDzd?: number | null }>,
): Promise<Product> {
  const existing = await getProductById(productId);
  if (!existing) throw AppError.notFound('Product not found');

  const validIds = new Set(existing.denominations.map((d) => d.id));
  const merged = existing.denominations.map((denomination) => {
    const update = updates.find((u) => u.id === denomination.id);
    return {
      id: denomination.id,
      label: denomination.label,
      faceValue: denomination.faceValue,
      priceDzd: update?.priceDzd ?? denomination.priceDzd,
      comparePriceDzd:
        update && 'comparePriceDzd' in update
          ? (update.comparePriceDzd ?? null)
          : denomination.comparePriceDzd,
      stockStatus: denomination.stockStatus,
    };
  });

  const foreign = updates.filter((u) => !validIds.has(u.id));
  if (foreign.length) throw AppError.badRequest('Unknown option in price update');

  await withTransaction(async (client) => {
    for (const denomination of merged) {
      await client.query(
        'UPDATE product_denominations SET price_dzd = $2, compare_price_dzd = $3 WHERE id = $1',
        [denomination.id, denomination.priceDzd, denomination.comparePriceDzd],
      );
    }
  });

  return (await getProductById(productId))!;
}

export async function setFeatured(id: string, isFeatured: boolean): Promise<Product> {
  await query('UPDATE products SET is_featured = $2 WHERE id = $1', [id, isFeatured]);
  return updateProduct(id, {});
}
