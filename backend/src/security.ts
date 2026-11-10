import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { jwtSettings } from './config';
import type { JwtPayload } from './shared/types/upload';

export function generateTempPassword(): string {
  // Rejection sampling keeps all 192 random bits and meets the existing policy.
  let value: string;
  do { value = randomBytes(24).toString('base64url'); }
  while (!/[A-Za-z]/.test(value) || !/\d/.test(value));
  return value;
}

export function signToken(payload: JwtPayload): string {
  const { secret, issuer, audience } = jwtSettings();
  return jwt.sign(payload, secret, { algorithm: 'HS256', issuer, audience, expiresIn: '8h' });
}

export function verifyToken(token: string): { userId: number; tokenVersion: number } {
  const { secret, issuer, audience } = jwtSettings();
  const payload = jwt.verify(token, secret, { algorithms: ['HS256'], issuer, audience });
  if (typeof payload === 'string' || !Number.isSafeInteger(payload.userId) || payload.userId < 1
      || !Number.isSafeInteger(payload.tokenVersion) || payload.tokenVersion < 0
      || !Number.isSafeInteger(payload.exp) || !Number.isSafeInteger(payload.iat)) {
    throw new Error('Invalid token claims');
  }
  return { userId: payload.userId, tokenVersion: payload.tokenVersion };
}
