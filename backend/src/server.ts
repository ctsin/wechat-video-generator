// Server entry. Wires CORS, JSON, auth middleware, the static folders
// (BGM uploads + rendered MP4s), then mounts each router under /api.

import path from 'node:path';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { corsMiddleware } from './middleware/cors.js';
import { verifyJwt } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { env } from './lib/env.js';
import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { renderRouter } from './routes/render.js';
import { payRouter } from './routes/pay.js';
import { assetsRouter } from './routes/assets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_BGM = path.resolve(__dirname, '../uploads/bgm');
const STATIC_RENDERS = path.resolve(__dirname, '../static/renders');

const app = express();

// CORS first — preflight options must be handled before body parsers so the
// Access-Control-Allow-Origin header lands on responses even for OPTIONS.
app.use(corsMiddleware);

// JWT verification populates req.user (or leaves it undefined). Every
// route handler decides what to do with that.
app.use(verifyJwt);

// Static files served under /static/* so the front-end can hit absolute
// URLs (PUBLIC_BASE_URL) without needing signed-S3-style access.
app.use('/static/bgm', express.static(STATIC_BGM, { fallthrough: true }));
app.use(
  '/static/renders',
  express.static(STATIC_RENDERS, { fallthrough: true, maxAge: '1h' }),
);

// Health check (handy for Vite proxy + uptime monitors).
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// JSON body parser is mounted per-router so /api/pay/callback can use the
// raw-parser inside pay.ts without the global JSON parser consuming the
// stream first.
const jsonParser = express.json({ limit: '1mb' });

app.use('/api/auth', jsonParser, authRouter);
app.use('/api/projects', jsonParser, projectsRouter);
app.use('/api', jsonParser, renderRouter); // mounts /preview/render, /render, /jobs
app.use('/api/assets', jsonParser, assetsRouter);
app.use('/api/pay', payRouter); // raw body handled per-route

// Central error handler — keep last.
app.use(errorHandler);

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[backend] listening on ${env.PUBLIC_BASE_URL} ` +
      `(cors=${env.FRONTEND_ORIGIN}, lambda=${env.REMOTION_LAMBDA_ENABLED ? 'on' : 'off'})`,
  );
});

export { app };
