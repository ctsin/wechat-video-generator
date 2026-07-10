// Pay routes. Two flows:
//
//   * POST /api/pay/orders — create an order and return a mock Native QR
//     code payload (the front-end shows it; in production this is a real
//     WeChat/Alipay Native QR).
//   * POST /api/pay/callback — provider webhook (WeChat Pay or Alipay).
//     We extract the openid, upsert the user to premium, and return a
//     freshly-signed JWT so the browser can upgrade immediately.
//
// Signatures are skipped in dev. Real providers add an HMAC check; we
// keep the structure (raw body, headers) so swapping it in doesn't
// require route changes.

import { Router, type Request, type Response, raw } from 'express';
import { nanoid } from 'nanoid';
import { signToken } from '../lib/auth.js';
import { upsertUser } from '../lib/db.js';
import { env } from '../lib/env.js';

export const payRouter: Router = Router();

// Map of orderId -> {openid, provider}. In real prod this would be Redis
// or a payments table. Plenty for dev.
const ORDERS = new Map<
  string,
  { openid: string; provider: 'wechat' | 'alipay'; createdAt: number }
>();

interface CreateOrderBody {
  openid?: string;
  provider?: 'wechat' | 'alipay';
  amount?: number; // cents
}

// POST /api/pay/orders
payRouter.post('/orders', (req: Request, res: Response) => {
  const body = (req.body ?? {}) as CreateOrderBody;
  const provider = body.provider === 'alipay' ? 'alipay' : 'wechat';
  const openid = (body.openid ?? '').trim();
  if (!openid) {
    res.status(400).json({ error: 'missing_openid' });
    return;
  }
  const orderId = `ord_${nanoid(14)}`;
  ORDERS.set(orderId, { openid, provider, createdAt: Date.now() });
  res.status(201).json({
    orderId,
    amount: body.amount ?? 9900, // ¥99.00 default
    provider,
    qrCode: `weixin://wxpay/bizpayurl?pr=devmock_${orderId}`,
    // Helper URL the front-end can hit in dev to simulate "user paid":
    simulateSuccessUrl: `${env.PUBLIC_BASE_URL}/api/pay/dev/success/${orderId}`,
  });
});

// GET /api/pay/dev/success/:orderId
// Dev-only "user paid" link the front-end can offer as a button next to
// the QR code so reviewers can complete the loop without scanning.
payRouter.get('/dev/success/:orderId', async (req: Request, res: Response) => {
  const ord = ORDERS.get(req.params.orderId);
  if (!ord) {
    res.status(404).json({ error: 'order_not_found' });
    return;
  }
  await completeOrder(ord.provider, ord.openid);
  res.json({ ok: true });
});

// POST /api/pay/callback
// Accepts both WeChat Pay and Alipay formats. Body shape (we accept either):
//   { openid: 'xxx', provider?: 'wechat' | 'alipay', out_trade_no?: string }
// Real providers send XML (WeChat) or form-urlencoded (Alipay); the openid
// extraction lives here in one place.
payRouter.post(
  '/callback',
  raw({ type: '*/*', limit: '64kb' }),
  async (req: Request, res: Response) => {
    const body = parseCallbackBody(req);
    if (!body.openid) {
      res.status(400).send('missing_openid');
      return;
    }
    const provider = body.provider ?? 'wechat';
    const result = await completeOrder(provider, body.openid);
    // WeChat expects "success" plain-text; Alipay expects "success" too.
    res.type('text/plain').send('success');
    void result;
  },
);

async function completeOrder(
  provider: 'wechat' | 'alipay',
  openid: string,
): Promise<{ token: string; userId: string }> {
  const user = await upsertUser({ openid, provider, tier: 'premium' });
  const token = await signToken({
    sub: user.id,
    tier: 'premium',
    openid,
    provider,
  });
  // Stash latest token in user record via re-upsert? Openid is already
  // mapped; subsequent /api/auth/anonymous calls reuse the same id and
  // get the premium token refreshed.
  return { token, userId: user.id };
}

function parseCallbackBody(
  req: Request,
): { openid?: string; provider?: 'wechat' | 'alipay' } {
  const ctype = req.header('content-type') ?? '';
  let raw = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : typeof req.body === 'string'
      ? req.body
      : typeof req.body === 'object' && req.body !== null
        ? JSON.stringify(req.body)
        : '';
  if (!raw) return {};
  if (ctype.includes('application/json')) {
    try {
      const j = JSON.parse(raw) as Record<string, unknown>;
      return {
        openid: typeof j.openid === 'string' ? j.openid : undefined,
        provider:
          j.provider === 'wechat' || j.provider === 'alipay'
            ? j.provider
            : undefined,
      };
    } catch {
      return {};
    }
  }
  // form-urlencoded or raw xml — extract with a cheap openid= probe.
  const m = /(?:^|&)openid=([^&]+)/.exec(raw);
  if (m) return { openid: decodeURIComponent(m[1]) };
  const m2 = /<openid>([^<]+)<\/openid>/.exec(raw);
  if (m2) return { openid: m2[1], provider: 'wechat' };
  return {};
}

// Re-export the raw body parser for tests if needed.
export const _payInternals = { completeOrder };
