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

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: boolFromString,
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().default('DZ Gift Cards <no-reply@example.com>'),

  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),
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
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? false,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.MAIL_FROM,
  },
  maxUploadBytes: Math.round(env.MAX_UPLOAD_MB * 1024 * 1024),
} as const;

export type AppConfig = typeof config;
