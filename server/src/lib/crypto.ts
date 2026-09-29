import { Buffer } from 'node:buffer';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { config } from '../config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const SALT = 'dzdz-giftcards-codes-v1';

/**
 * Delivered codes / credentials are stored encrypted at rest. The payload
 * format is `v1.<iv-hex>.<auth-tag-hex>.<ciphertext-hex>` so the version is
 * explicit and a future key rotation or algorithm change can still read old
 * rows.
 */
const key = Buffer.from(config.codesEncryptionKey, 'hex');

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ['v1', iv.toString('hex'), authTag.toString('hex'), ciphertext.toString('hex')].join('.');
}

export function decryptSecret(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 4) {
    throw new Error('Malformed encrypted payload');
  }
  const [version, ivHex, authTagHex, ciphertextHex] = parts as [string, string, string, string];
  if (version !== 'v1') {
    throw new Error(`Unsupported payload version: ${version}`);
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Decrypt without throwing. Used on read paths where a single unreadable row
 * must not take down an admin list.
 */
export function tryDecryptSecret(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    return decryptSecret(payload);
  } catch {
    return null;
  }
}

/**
 * bcrypt is deliberately not used for anything secret that must be reversible;
 * this helper exists for the rare case where a code must be compared exactly
 * against a stored value without revealing timing information.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Derive a stable, non-reversible fingerprint used for log-safe identifiers. */
export function fingerprint(value: string): string {
  return scryptSync(value, SALT, 16).toString('hex').slice(0, 12);
}
