import { createHmac, timingSafeEqual } from 'node:crypto';

/** ElevenLabs rejects a signature older than this. Matches their webhook verifier. */
const MAX_SKEW_SECONDS = 30 * 60;

/**
 * `ElevenLabs-Signature: t=<unix>,v0=<hex>` over `${timestamp}.${rawBody}`.
 */
export function verifyElevenLabsSignature(
  rawBody: string,
  header: string | undefined,
  secret: string | undefined
): boolean {
  if (!secret || !header) {
    return false;
  }

  const parts = new Map<string, string>();
  for (const piece of header.split(',')) {
    const index = piece.indexOf('=');
    if (index === -1) {
      continue;
    }

    parts.set(piece.slice(0, index).trim(), piece.slice(index + 1).trim());
  }

  const timestamp = parts.get('t');
  const signature = parts.get('v0');
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) {
    return false;
  }

  const skew = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (skew > MAX_SKEW_SECONDS) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const given = Buffer.from(signature);
  const actual = Buffer.from(expected);
  if (given.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(given, actual);
}
