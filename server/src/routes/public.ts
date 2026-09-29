import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, validated } from '../middleware/errorHandler.js';
import { listCategories, listProducts, getProductBySlug } from '../services/products.js';
import { getSettings } from '../services/settings.js';
import { wilayas } from '../services/format.js';
import { getStats } from '../services/stats.js';
import { AppError } from '../lib/errors.js';

export const publicRouter: Router = Router();

const productQuerySchema = z.object({
  category: z.string().min(1).optional(),
  search: z.string().min(1).max(100).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  inStock: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  sort: z.enum(['price_asc', 'price_desc', 'popular', 'newest']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  featured: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
});

publicRouter.get(
  '/catalog',
  validate(productQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const params = validated<z.infer<typeof productQuerySchema>>(req);
    const products = await listProducts(params);
    res.json({ products });
  }),
);

publicRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    res.json({ categories: await listCategories() });
  }),
);

publicRouter.get(
  '/products/:slug',
  asyncHandler(async (req, res) => {
    const product = await getProductBySlug(req.params.slug!);
    if (!product) throw AppError.notFound('Product not found');
    const related = await listProducts({ category: product.categorySlug, limit: 6 });
    res.json({
      product,
      related: related.filter((p) => p.id !== product.id).slice(0, 4),
    });
  }),
);

publicRouter.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const [settings, stats] = await Promise.all([getSettings(), getStats()]);
    res.json({
      settings: {
        brandName: settings.brandName,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        announcement: settings.announcement,
        paymentWindowHours: settings.paymentWindowHours,
        payments: settings.payments,
        stats: settings.stats,
      },
      counts: {
        products: stats.productCount,
        happyCustomers: Math.max(
          settings.stats.happyCustomers,
          stats.totalOrders + stats.productCount * 20,
        ),
      },
      wilayas: wilayas(),
    });
  }),
);
