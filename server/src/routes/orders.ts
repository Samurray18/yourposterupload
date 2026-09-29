import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler, validate } from '../middleware/errorHandler.js';
import { createOrder, trackOrder } from '../services/orders.js';
import { isValidAlgerianPhone } from '../lib/ids.js';
import { getSettings } from '../services/settings.js';
import { wilayas } from '../services/format.js';
import { AppError } from '../lib/errors.js';

export const ordersRouter: Router = Router();

const createOrderSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  phone: z
    .string()
    .trim()
    .min(9, 'Enter a valid phone number')
    .refine(isValidAlgerianPhone, 'Use an Algerian mobile number, e.g. 0555 12 34 56'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address')
    .max(160)
    .optional()
    .or(z.literal('')),
  wilaya: z.string().trim().min(2, 'Choose your wilaya').max(60),
  paymentMethod: z.enum(['baridimob', 'ccp']),
  paymentReference: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(600).optional().or(z.literal('')),
  items: z
    .array(
      z.object({
        denominationId: z.string().uuid('Invalid option'),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1, 'Your cart is empty')
    .max(20),
});

/** Order creation is rate limited to blunt bot-driven pricing-page scraping. */
const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many orders from this address, try again shortly' } },
});

ordersRouter.post(
  '/',
  createLimiter,
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createOrderSchema>;
    const settings = await getSettings();

    // Validate against the canonical wilaya list so a tampered client cannot
    // smuggle arbitrary text into the admin order table.
    if (!wilayas().includes(body.wilaya)) {
      throw AppError.badRequest('Choose your wilaya from the list');
    }

    const order = await createOrder({
      fullName: body.fullName,
      phone: body.phone,
      email: body.email || null,
      wilaya: body.wilaya,
      paymentMethod: body.paymentMethod,
      paymentReference: body.paymentReference || null,
      notes: body.notes || null,
      items: body.items,
    });

    res.status(201).json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        totalDzd: order.totalDzd,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          productName: item.productName,
          denominationLabel: item.denominationLabel,
          quantity: item.quantity,
          lineTotalDzd: item.lineTotalDzd,
        })),
      },
      payment: settings.payments[body.paymentMethod],
    });
  }),
);

const trackSchema = z.object({
  orderNumber: z.string().trim().min(4, 'Enter your order number').max(40),
  phone: z.string().trim().min(9, 'Enter the phone number used on the order').max(20),
});

/** Tracking attempts are limited: order numbers are guessable-ish and codes are behind them. */
const trackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many lookups, wait a moment' } },
});

ordersRouter.post(
  '/track',
  trackLimiter,
  validate(trackSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof trackSchema>;
    res.json({ order: await trackOrder(body.orderNumber, body.phone) });
  }),
);
