import { randomBytes, randomInt } from 'node:crypto';

/**
 * Customer-facing order numbers. Ambiguous characters (0/O, 1/I, 5/S, 8/B, 2/Z)
 * are excluded so the number can be read aloud over the phone without mistakes.
 */
const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY34679';

export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const bytes = randomBytes(8);
  let suffix = '';
  for (const byte of bytes) {
    suffix += ALPHABET[byte % ALPHABET.length];
  }
  return `DZD-${year}-${suffix}`;
}

export function generateReference(): string {
  return `ORD-${randomInt(100_000, 999_999)}`;
}

/** Algerian mobile numbers: 0X XX XX XX XX with X in 5-9. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+213')) return `0${digits.slice(4)}`;
  if (digits.startsWith('00213')) return `0${digits.slice(5)}`;
  if (digits.startsWith('213')) return `0${digits.slice(3)}`;
  if (digits.startsWith('0')) return digits;
  return `0${digits}`;
}

export function isValidAlgerianPhone(input: string): boolean {
  return /^0[5-9]\d{8}$/.test(normalizePhone(input));
}
