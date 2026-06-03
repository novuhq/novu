import { randomBytes } from 'node:crypto';

export function parseTtlFromEnv(envVar: string | undefined, defaultSeconds: number): number {
  const parsed = envVar ? Number.parseInt(envVar, 10) : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultSeconds;
}

export function mintRandomToken(bytes: number): string {
  return randomBytes(bytes).toString('base64url');
}

export function buildOpaqueStorageKey(keyPrefix: string, token: string): string {
  return `${keyPrefix}${token}`;
}
