import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

const ACCESS_EXPIRES_IN = '15m';
export const REFRESH_EXPIRES_IN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AccessTokenPayload {
  sub: string; // user id
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: `${REFRESH_EXPIRES_IN_MS}ms` });
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as AccessTokenPayload;
}
