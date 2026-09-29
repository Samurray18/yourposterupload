/**
 * Reloadly Gift Cards API — response shapes.
 *
 * Every shape here is validated with zod at the network boundary so a
 * surprise from upstream surfaces as a typed error instead of an
 * `undefined` deep inside the order pipeline. Numeric money fields arrive as
 * JSON numbers and are kept as `number`; rounding happens once, in pricing.ts.
 */
import { z } from 'zod';

export const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().default('Bearer'),
  expires_in: z.coerce.number().int().positive(),
  scope: z.string().optional(),
});
export type ReloadlyToken = z.infer<typeof tokenResponseSchema>;

/** Denominations are either a fixed list or a min/max range. */
export const denominationTypeSchema = z.enum(['FIXED', 'RANGE']);
export type ReloadlyDenominationType = z.infer<typeof denominationTypeSchema>;

export const brandSchema = z.object({
  brandId: z.number().int().optional(),
  brandName: z.string().optional(),
});

export const countrySchema = z.object({
  isoName: z.string().optional(),
  name: z.string().optional(),
  flagUrl: z.string().optional(),
});

export const redeemInstructionSchema = z.object({
  concise: z.string().nullish(),
  verbose: z.string().nullish(),
});

export const productSchema = z.object({
  productId: z.number().int(),
  productName: z.string(),
  global: z.boolean().default(false),
  supportsPreOrder: z.boolean().default(false),
  senderFee: z.number().default(0),
  discountPercentage: z.number().default(0),
  denominationType: denominationTypeSchema,
  recipientCurrencyCode: z.string().length(3),
  minRecipientDenomination: z.number().nullish(),
  maxRecipientDenomination: z.number().nullish(),
  fixedRecipientDenominations: z.array(z.number()).default([]),
  brand: brandSchema.default({}),
  country: countrySchema.default({}),
  redeemInstruction: redeemInstructionSchema.nullish(),
});
export type ReloadlyProduct = z.infer<typeof productSchema>;

/**
 * `/products` is a Spring Data page, not a bare array. `content` is parsed as
 * a page and the documented bare-array form is accepted as a fallback so a
 * non-paginated response still works.
 */
const pageSchema = z.object({
  content: z.array(productSchema),
  totalElements: z.number().int().nonnegative().optional(),
  totalPages: z.number().int().nonnegative().optional(),
  number: z.number().int().optional(),
  size: z.number().int().optional(),
  last: z.boolean().optional(),
});

export const productPageSchema = z.union([pageSchema, z.array(productSchema)]);

export interface ReloadlyProductPage {
  products: ReloadlyProduct[];
  totalElements: number | null;
  totalPages: number | null;
  page: number;
}

/** A code as delivered. `pinCode` is null for cards that have no PIN. */
export const smileSchema = z.object({
  code: z.string().min(1),
  pinCode: z.string().nullish(),
  validity: z.string().nullish(),
});
export type ReloadlySmile = z.infer<typeof smileSchema>;

export const orderStatusSchema = z.enum([
  'SUCCESSFUL',
  'FAILED',
  'CANCELED',
  'PENDING',
  'PROCESSING',
]);
export type ReloadlyOrderStatus = z.infer<typeof orderStatusSchema>;

export const placeOrderSchema = z.object({
  transactionId: z.number().int(),
  amount: z.number(),
  discount: z.number().optional(),
  currencyCode: z.string().optional(),
  fee: z.number().optional(),
  recipientEmail: z.string().optional(),
  customIdentifier: z.string().optional(),
  status: orderStatusSchema,
  smiles: z.array(smileSchema).default([]),
  date: z.string().optional(),
  product: z
    .object({
      productId: z.number().int(),
      productName: z.string().optional(),
      brand: brandSchema.optional(),
    })
    .optional(),
});
export type ReloadlyOrder = z.infer<typeof placeOrderSchema>;

/**
 * `GET /transactions/{id}/code` legacy shape. The modern `/orders` response
 * already embeds `smiles`; this is only used as a fallback for transactions
 * that were still processing when we first looked.
 */
export const transactionSchema = z
  .object({
    transactionId: z.number().int(),
    status: orderStatusSchema.optional(),
    smiles: z.array(smileSchema).default([]),
  })
  .passthrough();
export type ReloadlyTransaction = z.infer<typeof transactionSchema>;

export const errorSchema = z.object({
  errorCode: z.string().optional(),
  message: z.string().optional(),
  details: z.unknown().optional(),
});

export const balanceSchema = z.object({
  currencyCode: z.string().optional(),
  balance: z.number().optional(),
  usdBalance: z.number().optional(),
});
export type ReloadlyBalance = z.infer<typeof balanceSchema>;
