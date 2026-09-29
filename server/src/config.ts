import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

/**
 * `.env` lives at the repo root so a single file configures both the API and
 * the Vite client. When this module is imported from `src/` (tsx) or `dist/`,
 * that root is two levels up.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRootEnv = path.resolve(here, '../../.env');
loadEnv({ path: path.resolve(here, '../.env') });
loadEnv({ path: repoRootEnv });

const boolFromString = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  PUBLIC_STOREFRONT_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  CODES_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'CODES_ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),

  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters'),

  /** Shown to customers and sent as the Reloadly sender name. */
  STORE_NAME: z.string().min(1).default('DZ Gift Cards'),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: boolFromString,
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().default('DZ Gift Cards <no-reply@example.com>'),

  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),

  /**
   * Reloadly is optional: the storefront still works on manual fulfillment
   * alone. Everything here is only required when RELOADLY_ENABLED=true, so the
   * schema stays permissive and `reloadlyStatus()` reports what is missing
   * instead of crashing the API at boot.
   */
  RELOADLY_ENABLED: boolFromString,
  RELOADLY_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  RELOADLY_CLIENT_ID: z.string().optional().default(''),
  RELOADLY_CLIENT_SECRET: z.string().optional().default(''),
  /** Reloadly requires the audience to be the gift-cards audience. */
  RELOADLY_AUDIENCE: z.string().default('https://giftcards.reloadly.com'),
  /** DZD per one unit of `RELOADLY_SETTLEMENT_CURRENCY`. */
  RELOADLY_DZD_RATE: z.coerce.number().positive().default(150),
  /** Currency Reloadly charges the account in; used for the cost breakdown. */
  RELOADLY_SETTLEMENT_CURRENCY: z.string().default('USD'),
  /** Percentage added on top of the supplier cost to price imported cards. */
  RELOADLY_MARKUP_PERCENT: z.coerce.number().min(0).max(1000).default(8),
  RELOADLY_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  console.error('Copy .env.example to .env and fill in the values.\n');
  process.exit(1);
}

const env = parsed.data;

export const config = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  publicApiUrl: env.PUBLIC_API_URL.replace(/\/$/, ''),
  publicStorefrontUrl: env.PUBLIC_STOREFRONT_URL.replace(/\/$/, ''),
  corsOrigins: env.CORS_ORIGIN.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  codesEncryptionKey: env.CODES_ENCRYPTION_KEY,
  jwtSecret: env.JWT_SECRET,
  admin: { email: env.ADMIN_EMAIL.toLowerCase(), password: env.ADMIN_PASSWORD },
  storeName: env.STORE_NAME,
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? false,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.MAIL_FROM,
  },
  maxUploadBytes: Math.round(env.MAX_UPLOAD_MB * 1024 * 1024),

  reloadly: {
    enabled: env.RELOADLY_ENABLED,
    environment: env.RELOADLY_ENVIRONMENT,
    isProduction: env.RELOADLY_ENVIRONMENT === 'production',
    clientId: env.RELOADLY_CLIENT_ID,
    clientSecret: env.RELOADLY_CLIENT_SECRET,
    audience: env.RELOADLY_AUDIENCE,
    baseUrl:
      env.RELOADLY_ENVIRONMENT === 'production'
        ? 'https://giftcards.reloadly.com'
        : 'https://giftcards-sandbox.reloadly.com',
    dzdRate: env.RELOADLY_DZD_RATE,
    settlementCurrency: env.RELOADLY_SETTLEMENT_CURRENCY,
    markupPercent: env.RELOADLY_MARKUP_PERCENT,
    timeoutMs: env.RELOADLY_TIMEOUT_MS,
  },
} as const;

/**
 * Why the Reloadly integration is or is not usable. Exposed to the admin
 * dashboard so a misconfigured environment is obvious instead of showing up
 * as orders stuck in `processing`.
 */
export function reloadlyStatus(): {
  enabled: boolean;
  configured: boolean;
  environment: string;
  baseUrl: string;
  missing: string[];
} {
  const missing: string[] = [];
  if (!config.reloadly.clientId) missing.push('RELOADLY_CLIENT_ID');
  if (!config.reloadly.clientSecret) missing.push('RELOADLY_CLIENT_SECRET');
  return {
    enabled: config.reloadly.enabled,
    configured: missing.length === 0,
    environment: config.reloadly.environment,
    baseUrl: config.reloadly.baseUrl,
    missing,
  };
}

export type AppConfig = typeof config;
