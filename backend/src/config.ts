import 'dotenv/config';

export function requiredSetting(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`Missing required setting: ${name}`);
  return value;
}

export function jwtSettings() {
  const secret = requiredSetting('JWT_SECRET');
  if (Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET must contain at least 32 bytes');
  return {
    secret,
    issuer: requiredSetting('JWT_ISSUER'),
    audience: requiredSetting('JWT_AUDIENCE'),
  };
}
