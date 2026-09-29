import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { z } from 'zod';
import { asyncHandler, validate, validated } from '../middleware/errorHandler.js';
import {
  clearAdminCookie,
  passwordsMatch,
  requireAdmin,
  setAdminCookie,
  signAdminToken,
} from '../middleware/auth.js';
import { config } from '../config.js';
import { AppError } from '../lib/errors.js';
import { query, queryOne } from '../db/pool.js';
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  quickUpdatePrices,
  updateProduct,
} from '../services/products.js';
import {
  deliverAutomatically,
  deliverManually,
  getOrderById,
  decryptOrderCodes,
  listOrders,
  updateAdminNotes,
  updateOrderStatus,
} from '../services/orders.js';
import { getStats } from '../services/stats.js';
import { getSettings, updateSettings } from '../services/settings.js';
import { allProviders } from '../fulfillment/FulfillmentProvider.js';
import { reloadlyStatus } from '../config.js';
import { getBalance, listProducts as listReloadlyProducts } from '../fulfillment/reloadly/api.js';
import { denominationsFor } from '../fulfillment/reloadly/pricing.js';
import {
  getSettlementSummary,
  importReloadlyCatalogue,
} from '../fulfillment/reloadly/import.js';
import { ORDER_STATUSES } from '../types.js';
import { wilayas } from '../services/format.js';
import { uploadsDir } from '../lib/paths.js';

export const adminRouter: Router = Router();

/* ------------------------------------------------------------------- login */

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => false,
  message: {
    error: { code: 'rate_limited', message: 'Too many login attempts, wait 15 minutes' },
  },
});

adminRouter.post(
  '/login',
  loginLimiter,
  validate(
    z.object({
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(1, 'Enter your password'),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const emailOk = passwordsMatch(email, config.admin.email);
    const passwordOk = passwordsMatch(password, config.admin.password);
    // Both checks always run so response time does not reveal which was wrong.
    if (!emailOk || !passwordOk) {
      throw AppError.unauthorized('Wrong email or password');
    }
    setAdminCookie(res, signAdminToken(email));
    res.json({ admin: { email } });
  }),
);

adminRouter.post('/logout', (_req, res) => {
  clearAdminCookie(res);
  res.json({ ok: true });
});

adminRouter.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: res.locals.admin });
});

/* Everything below requires a valid admin session. */
adminRouter.use(requireAdmin);

/* ---------------------------------------------------------------- overview */

adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    res.json({ stats: await getStats() });
  }),
);

adminRouter.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    res.json({ settings: await getSettings() });
  }),
);

const paymentInstructionSchema = z.object({
  accountName: z.string().trim().min(1).max(120),
  accountIdentifier: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(400).nullable().optional(),
});

const settingsSchema = z.object({
  brandName: z.string().trim().min(1).max(60).optional(),
  supportEmail: z.string().trim().email().max(160).optional(),
  supportPhone: z.string().trim().max(40).optional(),
  announcement: z.string().trim().max(200).nullable().optional(),
  paymentWindowHours: z.number().int().min(1).max(168).optional(),
  payments: z
    .object({
      baridimob: paymentInstructionSchema.partial().optional(),
      ccp: paymentInstructionSchema.partial().optional(),
    })
    .optional(),
  stats: z
    .object({
      happyCustomers: z.number().int().min(0).optional(),
      averageDeliveryMinutes: z.number().int().min(0).optional(),
    })
    .optional(),
});

type SettingsInput = z.infer<typeof settingsSchema>;

adminRouter.patch(
  '/settings',
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    res.json({ settings: await updateSettings(req.body as SettingsInput) });
  }),
);

/* ---------------------------------------------------------------- products */

const denominationSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1, 'Option label is required').max(60),
  faceValue: z.string().trim().max(40).nullable().optional(),
  priceDzd: z.number().nonnegative('Price cannot be negative'),
  comparePriceDzd: z.number().positive().nullable().optional(),
  stockStatus: z.enum(['in_stock', 'out_of_stock']).default('in_stock'),
});

const productSchema = z.object({
  slug: z.string().trim().max(60).optional(),
  name: z.string().trim().min(1, 'Name is required').max(120),
  categoryId: z.string().uuid('Choose a category'),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  deliverySpeed: z.enum(['instant', 'few_hours', 'manual']).default('manual'),
  fulfillmentMode: z.enum(['manual', 'auto']).default('manual'),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  popularity: z.number().int().min(0).max(100).default(50),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  denominations: z.array(denominationSchema).min(1, 'Add at least one option'),
});

const listProductsSchema = z.object({
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  includeInactive: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
});

adminRouter.get(
  '/products',
  validate(listProductsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const params = validated<z.infer<typeof listProductsSchema>>(req);
    res.json({
      products: await listProducts({ ...params, limit: 200, sort: 'popular' }),
    });
  }),
);

adminRouter.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await getProductById(req.params.id!);
    if (!product) throw AppError.notFound('Product not found');
    res.json({ product });
  }),
);

adminRouter.post(
  '/products',
  validate(productSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ product: await createProduct(req.body as never) });
  }),
);

adminRouter.patch(
  '/products/:id',
  validate(productSchema.partial()),
  asyncHandler(async (req, res) => {
    res.json({ product: await updateProduct(req.params.id!, req.body as never) });
  }),
);

adminRouter.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    await deleteProduct(req.params.id!);
    res.json({ ok: true });
  }),
);

/** Fast inline price editing from the products table. */
adminRouter.patch(
  '/products/:id/prices',
  validate(
    z.object({
      updates: z
        .array(
          z.object({
            id: z.string().uuid(),
            priceDzd: z.number().nonnegative(),
            comparePriceDzd: z.number().positive().nullable().optional(),
          }),
        )
        .min(1),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { updates } = req.body as { updates: Array<{ id: string; priceDzd: number; comparePriceDzd?: number | null }> };
    res.json({ product: await quickUpdatePrices(req.params.id!, updates) });
  }),
);

adminRouter.patch(
  '/products/:id/featured',
  validate(z.object({ isFeatured: z.boolean() })),
  asyncHandler(async (req, res) => {
    const { isFeatured } = req.body as { isFeatured: boolean };
    await query('UPDATE products SET is_featured = $2 WHERE id = $1', [req.params.id!, isFeatured]);
    res.json({ product: await getProductById(req.params.id!) });
  }),
);

adminRouter.patch(
  '/products/:id/stock',
  validate(
    z.object({
      denominationId: z.string().uuid(),
      stockStatus: z.enum(['in_stock', 'out_of_stock']),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { denominationId, stockStatus } = req.body as {
      denominationId: string;
      stockStatus: 'in_stock' | 'out_of_stock';
    };
    await query(
      'UPDATE product_denominations SET stock_status = $3 WHERE id = $1 AND product_id = $2',
      [denominationId, req.params.id!, stockStatus],
    );
    res.json({ product: await getProductById(req.params.id!) });
  }),
);

/* ------------------------------------------------------------------ orders */

const listOrdersSchema = z.object({
  status: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter((s) => s !== '') : undefined)),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

adminRouter.get(
  '/orders',
  validate(listOrdersSchema, 'query'),
  asyncHandler(async (req, res) => {
    const params = validated<z.infer<typeof listOrdersSchema>>(req);
    const statuses = (params.status ?? []).filter((s): s is (typeof ORDER_STATUSES)[number] =>
      (ORDER_STATUSES as readonly string[]).includes(s),
    );
    const result = await listOrders({
      status: statuses.length ? statuses : undefined,
      search: params.search,
      limit: params.limit,
      offset: params.offset,
    });
    res.json(result);
  }),
);

adminRouter.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const order = await getOrderById(req.params.id!);
    if (!order) throw AppError.notFound('Order not found');
    const codes =
      order.status === 'delivered' ? await decryptOrderCodes(order.id) : null;
    res.json({ order, codes });
  }),
);

adminRouter.patch(
  '/orders/:id/status',
  validate(
    z.object({
      status: z.enum(ORDER_STATUSES),
      adminNotes: z.string().max(2000).nullable().optional(),
      paymentReference: z.string().max(120).nullable().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { status, adminNotes, paymentReference } = req.body as {
      status: (typeof ORDER_STATUSES)[number];
      adminNotes?: string | null;
      paymentReference?: string | null;
    };
    res.json({
      order: await updateOrderStatus(req.params.id!, status, { adminNotes, paymentReference }),
    });
  }),
);

/** Manual delivery: the admin pastes the code(s) they sourced. */
adminRouter.post(
  '/orders/:id/deliver',
  validate(
    z.object({
      codes: z.array(z.string().trim().min(1, 'Code cannot be empty')).min(1, 'Paste at least one code'),
      instructions: z.string().trim().max(600).nullable().optional(),
      orderItemId: z.string().uuid().nullable().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { codes, instructions, orderItemId } = req.body as {
      codes: string[];
      instructions?: string | null;
      orderItemId?: string | null;
    };
    res.json({
      order: await deliverManually(req.params.id!, codes, { instructions, orderItemId }),
    });
  }),
);

/** Automatic delivery: routes through the product's FulfillmentProvider. */
adminRouter.post(
  '/orders/:id/deliver-auto',
  asyncHandler(async (req, res) => {
    res.json({ order: await deliverAutomatically(req.params.id!) });
  }),
);

adminRouter.patch(
  '/orders/:id/notes',
  validate(z.object({ adminNotes: z.string().max(2000).nullable() })),
  asyncHandler(async (req, res) => {
    const { adminNotes } = req.body as { adminNotes: string | null };
    res.json({ order: await updateAdminNotes(req.params.id!, adminNotes) });
  }),
);

/* ------------------------------------------------------------------ images */

/**
 * Product image upload. Files land in `server/uploads` and are served as
 * static assets by the app, so no external object store is needed to run this.
 * Swap the storage call below for S3/Cloudflare R2 when you outgrow that.
 */
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdir(uploadsDir, { recursive: true }, (err) => cb(err, uploadsDir));
    },
    filename: (_req, file, cb) => {
      const ext = ALLOWED_IMAGE_TYPES[file.mimetype] ?? 'bin';
      cb(null, `${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`);
    },
  }),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES[file.mimetype]) {
      cb(AppError.badRequest('Upload a PNG, JPG, WEBP, GIF or SVG image'));
      return;
    }
    cb(null, true);
  },
});

adminRouter.post(
  '/upload',
  (req, res, next) => {
    upload.single('image')(req, res, (err: unknown) => {
      if (err) {
        next(
          err instanceof AppError
            ? err
            : AppError.badRequest(
                err instanceof Error && err.message.includes('limit')
                  ? `Image must be under ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB`
                  : 'Upload failed',
              ),
        );
        return;
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw AppError.badRequest('No image was uploaded');
    res.status(201).json({ url: `/uploads/${file.filename}`, bytes: file.size });
  }),
);

adminRouter.get(
  '/fulfillment/providers',
  asyncHandler(async (_req, res) => {
    res.json({
      providers: allProviders().map((provider) => ({
        name: provider.name,
        mode: provider.mode,
        configured: provider.supports({ slug: '*', categorySlug: '*' }),
      })),
    });
  }),
);

// ---------------------------------------------------------------------------
// Reloadly
// ---------------------------------------------------------------------------

/** Configuration state, without ever exposing the client secret. */
adminRouter.get('/reloadly/status', asyncHandler(async (_req, res) => {
  const status = reloadlyStatus();
  const { rows } = await query<{ products: string; denominations: string }>(
    `SELECT count(*) FILTER (WHERE fulfillment_mode = 'auto')::text  AS products,
            count(*) FILTER (WHERE supplier = 'reloadly')::text      AS denominations
       FROM products p
       LEFT JOIN product_denominations d ON d.product_id = p.id`,
  );
  res.json({ ...status, imported: rows[0] ?? { products: '0', denominations: '0' } });
}));

/** Live account balance. Only callable when the integration is configured. */
adminRouter.get('/reloadly/balance', asyncHandler(async (_req, res) => {
  const status = reloadlyStatus();
  if (!status.configured) {
    throw AppError.badRequest(`Reloadly is not configured: missing ${status.missing.join(', ')}`);
  }
  const [balance, settlement] = await Promise.all([getBalance(), getSettlementSummary()]);
  res.json({ balance, settlement });
}));

const reloadlyProductsQuerySchema = z.object({
  countryCode: z.string().length(2).optional(),
  search: z.string().max(80).optional(),
  page: z.coerce.number().int().min(0).max(50).default(0),
  size: z.coerce.number().int().min(1).max(100).default(25),
});
type ReloadlyProductsQuery = z.infer<typeof reloadlyProductsQuerySchema>;

/**
 * Browse upstream products without writing anything, so the admin can check
 * the connection and see what a sync would bring in.
 */
adminRouter.get(
  '/reloadly/products',
  validate(reloadlyProductsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const status = reloadlyStatus();
    if (!status.configured) {
      throw AppError.badRequest(`Reloadly is not configured: missing ${status.missing.join(', ')}`);
    }
    const q = validated<ReloadlyProductsQuery>(req);

    const result = await listReloadlyProducts({
      countryCode: q.countryCode,
      search: q.search,
      page: q.page,
      size: q.size,
      includeFixed: true,
      includeRange: true,
    });

    res.json({
      totalElements: result.totalElements,
      totalPages: result.totalPages,
      page: result.page,
      products: result.products.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        brand: product.brand.brandName ?? null,
        country: product.country.isoName ?? null,
        currency: product.recipientCurrencyCode,
        denominationType: product.denominationType,
        fixedRecipientDenominations: product.fixedRecipientDenominations,
        minRecipientDenomination: product.minRecipientDenomination ?? null,
        maxRecipientDenomination: product.maxRecipientDenomination ?? null,
        discountPercentage: product.discountPercentage,
        senderFee: product.senderFee,
        redeemInstruction: product.redeemInstruction?.concise ?? null,
        denominations: denominationsFor(product).map((d) => ({
          amount: d.amount,
          label: d.label,
          priceDzd: d.price.priceDzd,
          costDzd: d.price.costDzd,
        })),
      })),
    });
  }),
);

const reloadlyImportSchema = z.object({
  countryCode: z.string().length(2).optional(),
  search: z.string().max(80).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  minDenominations: z.coerce.number().int().min(1).max(20).optional(),
  maxPages: z.coerce.number().int().min(1).max(50).optional(),
});
type ReloadlyImportInput = z.infer<typeof reloadlyImportSchema>;

/** Import or refresh the catalogue from Reloadly. */
adminRouter.post(
  '/reloadly/import',
  validate(reloadlyImportSchema),
  asyncHandler(async (req, res) => {
    const status = reloadlyStatus();
    if (!status.configured) {
      throw AppError.badRequest(`Reloadly is not configured: missing ${status.missing.join(', ')}`);
    }
    const summary = await importReloadlyCatalogue(req.body as ReloadlyImportInput);
    res.json({ summary });
  }),
);

adminRouter.get('/meta', asyncHandler(async (_req, res) => {
  const categories = await query('SELECT id, slug, name FROM categories ORDER BY sort_order');
  res.json({
    categories: categories.rows,
    wilayas: wilayas(),
    orderStatuses: ORDER_STATUSES,
  });
}));

adminRouter.get('/health/deep', asyncHandler(async (_req, res) => {
  const row = await queryOne<{ now: Date }>('SELECT now()');
  res.json({ ok: true, serverTime: row?.now });
}));
