import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from '../lib/errors.js';
import { constantTimeEquals } from '../lib/crypto.js';

export const ADMIN_COOKIE = 'dzdz_admin_session';

interface AdminTokenPayload {
  sub: string;
  email: string;
  role: 'admin';
  iat?: number;
  exp?: number;
}

export function signAdminToken(email: string): string {
  return jwt.sign({ email, role: 'admin' } satisfies Omit<AdminTokenPayload, 'sub'>, config.jwtSecret, {
    subject: email,
    expiresIn: '12h',
    issuer: 'dzdz-giftcards',
  });
}

export function setAdminCookie(res: Response, token: string): void {
  res.cookie(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAdminCookie(res: Response): void {
  res.clearCookie(ADMIN_COOKIE, { path: '/' });
}

function readToken(req: Request): string | null {
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[ADMIN_COOKIE];
  if (fromCookie) return fromCookie;
  const header = req.get('authorization');
  if (header?.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return null;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (!token) {
    next(AppError.unauthorized('Sign in to the admin dashboard'));
    return;
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      issuer: 'dzdz-giftcards',
    }) as AdminTokenPayload;
    if (payload.role !== 'admin') {
      next(AppError.forbidden('Not an admin account'));
      return;
    }
    res.locals.admin = { email: payload.email };
    next();
  } catch {
    next(AppError.unauthorized('Session expired, sign in again'));
  }
}

/** Compares the submitted password without leaking length or content via timing. */
export function passwordsMatch(provided: string, expected: string): boolean {
  return constantTimeEquals(provided, expected);
}
