// Cloudflare Pages Function: /api/* → BACKEND_ORIGIN/api/*
// SPA in src/lib/api.ts issues all API requests as same-origin /api/... paths.
// This file makes /api/* resolve to the App Runner backend while the browser
// still thinks it's talking to the same host as the static SPA.

import { proxyRequest, type Env } from '../_lib/proxy';

export const onRequest: PagesFunction<Env> = async (ctx) => {
  return proxyRequest(ctx.request, ctx, ctx.env, '/api');
};

// PagesFunction type isn't in our TS lib, so declare a minimal local shim.
type PagesFunction<E = unknown> = (ctx: {
  request: Request;
  env: E;
  params: Record<string, string | string[]>;
}) => Promise<Response> | Response;
