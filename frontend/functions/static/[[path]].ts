// Cloudflare Pages Function: /static/* → BACKEND_ORIGIN/static/*
// Backend serves uploaded BGM from /static/bgm/* (the only /static/* path used
// in the SPA today — the MP4 is delivered directly from S3 via outputUrl).
// All other /static/* requests also pass through.

import { proxyRequest, type Env } from '../_lib/proxy';

export const onRequest: PagesFunction<Env> = async (ctx) => {
  return proxyRequest(ctx.request, ctx, ctx.env, '/static');
};

type PagesFunction<E = unknown> = (ctx: {
  request: Request;
  env: E;
  params: Record<string, string | string[]>;
}) => Promise<Response> | Response;
