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

export function mintedOpaqueTokenBodyLength(randomTokenBytes: number): number {
  return Math.ceil((randomTokenBytes * 8) / 6);
}

export function isMintedOpaqueActionId(
  actionId: string | undefined,
  prefix: string,
  randomTokenBytes: number
): boolean {
  if (!actionId?.startsWith(prefix)) {
    return false;
  }

  const body = actionId.slice(prefix.length);
  const expectedLength = mintedOpaqueTokenBodyLength(randomTokenBytes);

  return new RegExp(`^[A-Za-z0-9_-]{${expectedLength}}$`).test(body);
}
