import express, { type Express, type RequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { publicRouter } from './routes/public.js';
import { ordersRouter } from './routes/orders.js';
import { adminRouter } from './routes/admin.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { uploadsDir } from './lib/paths.js';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Uploaded product images are served from this origin, and the storefront
      // is served separately, so the default CSP would be too restrictive here.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin requests and curl have no Origin header.
        if (!origin) {
          callback(null, true);
          return;
        }
        callback(null, config.corsOrigins.includes(origin));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  // Liveness/readiness probe target for Docker and load balancers. Kept
  // dependency-free on purpose: a failing dependency should surface as API
  // errors, not as a container that refuses to start.
  const healthHandler: RequestHandler = (_req, res) => {
    res.json({ ok: true, service: 'dzdz-giftcards-api', env: config.env });
  };
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

  app.use('/api', publicRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
