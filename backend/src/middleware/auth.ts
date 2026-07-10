import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type JwtClaims } from '../lib/auth.js';
import { findUserById } from '../lib/db.js';

// Augment Express Request with the authenticated user, populated by
// verifyJwt (or left undefined when the route doesn't require auth).
declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtClaims & { id: string };
  }
}

// Verify the bearer JWT and attach req.user. If the token is invalid or
// absent, req.user stays undefined and the route handler decides whether
// that means "anonymous" or "401". This matches the AGENTS.md §4 flow:
// every anonymous preview gets its own token first via /api/auth/anonymous.
export const verifyJwt = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const header = req.header('authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match) return next();
    const claims = await verifyToken(match[1]);
    if (!claims) return next();
    // Re-read user from DB so a revoked/downgraded account can't keep
    // using a stale premium token.
    const user = await findUserById(claims.sub);
    if (!user) return next();
    req.user = {
      id: user.id,
      sub: user.id,
      tier: user.tier,
      openid: user.openid,
      provider: user.provider,
    };
    return next();
  } catch (err) {
    console.warn('[auth] verify error:', err);
    return next();
  }
};

// Require a valid auth token. Returns 401 otherwise.
export const requireJwt: (
  req: Request,
  res: Response,
  next: NextFunction,
) => void = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
};
