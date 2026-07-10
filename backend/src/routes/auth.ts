// Auth routes: anonymous JWT issuance, /me introspection, upgrade mock.
// Pay-driven JWT upgrade happens in /api/pay/callback (routes/pay.ts).

import { Router, type Request, type Response } from 'express';
import { signToken } from '../lib/auth.js';
import { findUserById, upsertUser } from '../lib/db.js';
import { requireJwt } from '../middleware/auth.js';

export const authRouter: Router = Router();

// POST /api/auth/anonymous
// Always issues a fresh free-tier token for the supplied clientId (stored
// in the browser's localStorage per AGENTS.md §4). If clientId already
// maps to an upgraded user, we re-issue a premium token so reopening the
// page restores paid status.
authRouter.post('/anonymous', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { clientId?: string };
  const clientId = (body.clientId ?? '').trim();
  if (!clientId) {
    res.status(400).json({ error: 'missing_client_id' });
    return;
  }
  // Use the clientId as the openid so anonymous users are stable across
  // page reloads but locally scoped.
  const user = await upsertUser({
    openid: `anon:${clientId}`,
    provider: 'wechat',
    tier: 'free',
  });
  const tier = user.tier;
  const token = await signToken({
    sub: user.id,
    tier,
    openid: user.openid,
    provider: user.provider,
  });
  res.json({
    token,
    user: { id: user.id, tier, provider: user.provider, openid: user.openid },
  });
});

// GET /api/auth/me — returns the JWT claims for the current bearer.
authRouter.get('/me', requireJwt, (req: Request, res: Response) => {
  const u = req.user!;
  res.json({
    user: {
      id: u.id,
      tier: u.tier,
      openid: u.openid,
      provider: u.provider,
    },
  });
});

// POST /api/auth/upgrade
// Dev-mode helper: simulates a completed payment locally so the front-end
// can flip into premium tier without leaving the app. In production this
// endpoint should be removed and clients should hit /api/pay/callback via
// the real provider flow.
authRouter.post(
  '/upgrade',
  requireJwt,
  async (req: Request, res: Response) => {
    const user = await findUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'user_not_found' });
      return;
    }
    if (user.tier !== 'premium') {
      const upgraded = await upsertUser({
        openid: user.openid,
        provider: user.provider,
        tier: 'premium',
      });
      user.tier = upgraded.tier;
    }
    const token = await signToken({
      sub: user.id,
      tier: user.tier,
      openid: user.openid,
      provider: user.provider,
    });
    res.json({
      token,
      user: {
        id: user.id,
        tier: user.tier,
        openid: user.openid,
        provider: user.provider,
      },
    });
  },
);
