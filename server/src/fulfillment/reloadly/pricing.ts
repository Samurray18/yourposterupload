/**
 * Pricing for imported Reloadly cards.
 *
 * The store sells in DZD, but Reloadly charges the account in its own
 * settlement currency. Two conversions therefore happen, and both are kept
 * explicit here so the numbers in the admin UI can be explained:
 *
 *   supplier cost  = face value  x (1 - discount) + sender fee   (card currency)
 *   cost in DZD   = supplier cost x RELOADLY_DZD_RATE
 *   shelf price   = cost in DZD x (1 + markup)
 *
 * Rounding to whole dinars happens once, at the end: prices are whole DZD so
 * the storefront never shows cents. `margin` is rounded up so a card can never
 * be listed at or below cost.
 */
import { config } from '../../config.js';

export interface PricingInput {
  /** Face value in the product's recipient currency. */
  amount: number;
  discountPercentage?: number | null;
  senderFee?: number | null;
}

export interface PricingResult {
  /** Price the customer pays, whole DZD. */
  priceDzd: number;
  /** What we spend, in DZD, whole. */
  costDzd: number;
  /** Supplier cost in the settlement currency, unrounded. */
  supplierCost: number;
  currency: string;
  marginDzd: number;
}

export function priceDenomination({
  amount,
  discountPercentage,
  senderFee,
}: PricingInput): PricingResult {
  const discount = (discountPercentage ?? 0) / 100;
  const supplierCost = round2(amount * (1 - discount) + (senderFee ?? 0));

  const costDzd = Math.ceil(supplierCost * config.reloadly.dzdRate);
  const priceDzd = Math.ceil(costDzd * (1 + config.reloadly.markupPercent / 100));

  return {
    priceDzd,
    costDzd,
    supplierCost,
    currency: config.reloadly.settlementCurrency,
    marginDzd: priceDzd - costDzd,
  };
}

/** Half-up rounding to 2 decimals, avoiding binary float surprises. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** A "100 USD" style label for a face value. */
export function formatDenomination(amount: number, currency: string): string {
  return `${trimNumber(amount)} ${currency}`;
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(round2(value));
}

/**
 * Turns a product into the list of amounts we can actually order, with the
 * price for each. Products with neither a fixed list nor a usable range are
 * skipped rather than imported with an unusable denomination.
 */
export function denominationsFor(product: {
  denominationType: 'FIXED' | 'RANGE';
  fixedRecipientDenominations: number[];
  minRecipientDenomination?: number | null;
  maxRecipientDenomination?: number | null;
  recipientCurrencyCode: string;
  discountPercentage?: number | null;
  senderFee?: number | null;
}): { amount: number; label: string; price: PricingResult }[] {
  const amounts = resolveAmounts(product);
  return amounts.map((amount) => ({
    amount,
    label: formatDenomination(amount, product.recipientCurrencyCode),
    price: priceDenomination({
      amount,
      discountPercentage: product.discountPercentage,
      senderFee: product.senderFee,
    }),
  }));
}

function resolveAmounts(product: {
  denominationType: 'FIXED' | 'RANGE';
  fixedRecipientDenominations: number[];
  minRecipientDenomination?: number | null;
  maxRecipientDenomination?: number | null;
}): number[] {
  if (product.denominationType === 'FIXED') {
    return [...new Set(product.fixedRecipientDenominations)]
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
  }

  const min = product.minRecipientDenomination;
  const max = product.maxRecipientDenomination;
  if (!Number.isFinite(min) || !Number.isFinite(max) || (min as number) > (max as number)) {
    return [];
  }

  // A range gives no canonical steps, so offer the bounds plus a few
  // round-number steps between them, capped to keep the admin list readable.
  const steps: number[] = [min as number, max as number];
  const step = niceStep((max as number) - (min as number));
  for (let value = (min as number) + step; value < (max as number); value += step) {
    steps.push(round2(value));
  }
  return [...new Set(steps)].sort((a, b) => a - b);
}

/** Chooses a readable step (1/2/5 x 10^n) for a span. */
function niceStep(span: number): number {
  if (!Number.isFinite(span) || span <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(span));
  for (const factor of [1, 2, 5, 10]) {
    if (span / (magnitude * factor) <= 5) return magnitude * factor;
  }
  return magnitude * 10;
}
