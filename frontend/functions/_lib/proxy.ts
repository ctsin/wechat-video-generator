// Cloudflare Pages Functions — shared proxy helper.
//
// Pages Functions are deployed to a single domain alongside the SPA. The
// SPA in src/ hits /api/* and /static/* with same-origin relative paths
// (see frontend/src/lib/api.ts), so this file makes the browser think those
// paths are served from the same host while actually forwarding them to the
// App Runner backend.
//
// Target URL is provided at deploy time as the Pages env var
// `BACKEND_ORIGIN`, e.g. `https://abc123.us-east-1.awsapprunner.com`.
// We intentionally do NOT read it from request headers / query strings —
// the origin must be operator-controlled, not user-controlled.
//
// All methods, headers (except hop-by-hop ones), and the request body are
// forwarded. We only set the `Host` header to the backend's host
// (changeOrigin behavior) so the backend's PUBLIC_BASE_URL is unnecessary
// for proxied requests.

interface Env {
  BACKEND_ORIGIN: string;
}

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

function buildTarget(origin: string, path: string, search: string): string {
  const trimmed = origin.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${trimmed}${p}${search ?? ''}`;
}

function forwardHeaders(req: Request, targetOrigin: string): Headers {
  const out = new Headers();
  for (const [k, v] of req.headers) {
    if (HOP_BY_HOP.has(k.toLowerCase())) continue;
    out.set(k, v);
  }
  // Tell the backend who the original client was + which host we are
  // serving, useful for logs and for the backend's CORS check.
  out.set('X-Forwarded-Host', new URL(targetOrigin).host);
  return out;
}

export async function proxyRequest(
  req: Request,
  ctx: { params: { path?: string } },
  env: Env,
  mountPath: string,
): Promise<Response> {
  const target = env.BACKEND_ORIGIN;
  if (!target) {
    return new Response(
      JSON.stringify({
        error: 'BACKEND_ORIGIN is not configured for this Pages project',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  // ctx.params.path is the [[path]] wildcard capture. Re-attach the mount
  // path so the backend sees /api/... or /static/... as it normally would.
  const inner = ctx.params.path ?? '';
  const url = new URL(req.url);
  const url2 = new URL(target);
  const rewrittenPath = `${mountPath}/${inner}${url.pathname.slice(mountPath.length + inner.length) || ''}`;
  const targetUrl = buildTarget(target, rewrittenPath, url.search);

  const init: RequestInit = {
    method: req.method,
    headers: forwardHeaders(req, target),
    redirect: 'manual',
  };
  // Only attach a body for methods that carry one. Streaming bodies are not
  // supported here — fine for our JSON + multipart upload routes.
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    init.body = req.body;
  }

  const upstream = await fetch(targetUrl, init);
  url2.protocol = 'https:';
  // Build a pass-through response. Adjust a couple of headers that don't
  // round-trip well across origins.
  const headers = new Headers(upstream.headers);
  // Hop-by-hop stripping on the response too.
  for (const h of HOP_BY_HOP) headers.delete(h);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export type { Env };
