import type { RequestHandler } from 'express';
import cors from 'cors';
import { env } from '../lib/env.js';

// Single, explicitly-allowed origin — the Vite dev server. Production
// deployments override FRONTEND_ORIGIN.
export const corsMiddleware: RequestHandler = cors({
  origin: env.FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
