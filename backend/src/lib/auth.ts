// Stateless JWT issuance + verification. Tied to the script-protocol
// principle (AGENTS.md §4): anonymous sessions get a free-tier token,
// payment callback re-issues a premium-tier token.
//
// We deliberately use the same HS256 secret for both so the dev backend
// is self-contained. Swap to RS256 + KMS / Secrets Manager in prod.

import { SignJWT, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';
import { env } from './env.js';

export interface JwtClaims {
  sub: string; // user id
  tier: 'free' | 'premium';
  openid?: string;
  provider?: 'wechat' | 'alipay';
}

const ISSUER = 'wechat-video-gen';
const AUDIENCE = 'wechat-video-gen-clients';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export async function signToken(
  claims: JwtClaims,
  ttlSeconds = 60 * 60 * 24 * 7, // 7 days
): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setJti(nanoid(12))
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const sub = String(payload.sub ?? '');
    const tier = payload.tier === 'premium' ? 'premium' : 'free';
    return {
      sub,
      tier,
      openid: typeof payload.openid === 'string' ? payload.openid : undefined,
      provider:
        payload.provider === 'wechat' || payload.provider === 'alipay'
          ? payload.provider
          : undefined,
    };
  } catch {
    return null;
  }
}
