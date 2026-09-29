import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { AppError } from '../lib/errors.js';
import { config } from '../config.js';
import { pool } from '../db/pool.js';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound('Endpoint not found'));
}

 
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'Some fields need attention',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Translate the Postgres errors the app can actually hit into useful messages.
  const pgError = err as { code?: string; constraint?: string; detail?: string; message: string };
  if (pgError?.code === '23505') {
    res.status(409).json({
      error: { code: 'conflict', message: 'That value is already taken' },
    });
    return;
  }
  if (pgError?.code === '23503') {
    res.status(400).json({
      error: { code: 'bad_request', message: 'Referenced record does not exist' },
    });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({
    error: {
      code: 'internal_error',
      message: 'Something went wrong on our side',
      ...(config.isProd ? {} : { debug: pgError?.message }),
    },
  });
}

/** Wraps an async handler so rejected promises reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** Parses and validates `req[source]` against a Zod schema, replacing it with the parsed value. */
export function validate<T>(
  schema: ZodType<T>,
  source: 'body' | 'query' | 'params' = 'body',
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // req.query/params are getter-only on some Express versions; stash the
    // parsed value where handlers read it from.
    if (source === 'query') {
      (req as Request & { validatedQuery?: unknown }).validatedQuery = result.data;
    } else {
      req[source] = result.data as never;
    }
    next();
  };
}

export function validated<T>(req: Request): T {
  return (req as Request & { validatedQuery?: T }).validatedQuery as T;
}

export async function closePool(): Promise<void> {
  await pool.end();
}
