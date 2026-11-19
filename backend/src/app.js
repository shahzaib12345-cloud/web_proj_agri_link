import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { rejectOperatorKeys } from './middlewares/security.js';
import { apiLimiter } from './middlewares/rateLimit.js';
import api from './routes/index.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy); // required for correct client IPs behind a platform proxy / load balancer

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          // React sets inline style attributes; Google Fonts serves the stylesheet.
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
          // Listings may point at any https image the farmer supplies (see isSafeImageUrl).
          'img-src': ["'self'", 'data:', 'https:'],
          'connect-src': ["'self'"],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'none'"],
          // Only in production: plain-http local runs of a production build would otherwise break.
          ...(env.isProd ? { 'upgrade-insecure-requests': [] } : {}),
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  app.use(
    cors({
      // The built app is same-origin, so CORS never applies. It matters only for the Vite dev server on :3000.
      origin: (origin, cb) => cb(null, !origin || env.allowedOrigins.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );

  if (env.nodeEnv !== 'test') {
    app.use((req, res, next) => {
      const start = process.hrtime.bigint();
      res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        // Method, path (no query string, no body, no headers) and status only: nothing sensitive is logged.
        console.log(`${req.method} ${req.path} ${res.statusCode} ${ms.toFixed(0)}ms`);
      });
      next();
    });
  }

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(rejectOperatorKeys);

  // API responses can contain private data: never let a browser or proxy cache them.
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use('/api/v1', apiLimiter, api);

  // Anything under /api that no route handled is a JSON 404, never the React page.
  app.use('/api', notFoundHandler);

  mountFrontend(app);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

/**
 * Serves the built React app from the same origin as the API, so one Node process is the whole product.
 * It is skipped when there is no build (for example during `npm run dev`, where Vite serves the UI).
 */
function mountFrontend(app) {
  const indexFile = path.join(env.staticDir, 'index.html');
  if (!env.serveFrontend || !fs.existsSync(indexFile)) {
    if (env.isProd && env.serveFrontend) {
      console.warn(`No frontend build at ${env.staticDir}. Run "npm run build" first. Serving the API only.`);
    }
    return;
  }

  // Static assets are compressed here only; API responses stay uncompressed on purpose.
  app.use(compression());
  app.use(
    express.static(env.staticDir, {
      index: false, // index.html is sent below so it can carry its own cache rule
      dotfiles: 'ignore',
      setHeaders(res, filePath) {
        // Vite fingerprints everything in /assets, so those files can be cached for a year.
        const hashed = filePath.includes(`${path.sep}assets${path.sep}`);
        res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
      },
    }),
  );

  // Client-side routes (/market, /weather, ...) all load the same page. Anything that looks like a file
  // request (a dot in the last segment, which includes /.env) or a traversal attempt stays a plain 404
  // instead of silently returning HTML.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.includes('..') || path.posix.basename(req.path).includes('.')) return next();
    res.set('Cache-Control', 'no-cache'); // always revalidate so a new deploy is picked up
    res.sendFile(indexFile, (err) => err && next(err));
  });
}
