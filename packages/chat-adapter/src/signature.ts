import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_HEADER = 'novu-signature';
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FUTURE_SKEW_MS = 30 * 1000; // 30s tolerance for clock drift

export interface VerifyOptions {
  maxAgeMs?: number;
  /** Injectable clock for deterministic tests. */
  now?: () => number;
}

/**
 * Verify the `novu-signature` HMAC produced by Novu's `buildNovuSignatureHeader`
 * (libs/application-generic/src/utils/hmac.ts):
 *
 *   header  = `t=<timestamp>,v1=<hmac-hex>`
 *   message = `<timestamp>.<rawBody>`
 *   hmac    = HMAC-SHA256(secret, message) as lowercase hex
 *
 * The timestamp is milliseconds since epoch. `rawBody` MUST be the exact bytes of
 * the request body — Novu signs `JSON.stringify(payload)` and sends those same
 * bytes (`safeOutboundJsonRequest` ends with `JSON.stringify(body)`), so verifying
 * against `request.text()` is byte-identical.
 */
export function verifyNovuSignature(
  signatureHeader: string | null,
  rawBody: string,
  secret: string,
  options: VerifyOptions = {}
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(',');
  const timestampPart = parts.find((p) => p.startsWith('t='));
  const hmacPart = parts.find((p) => p.startsWith('v1='));
  if (!timestampPart || !hmacPart) {
    return false;
  }

  const timestamp = timestampPart.slice(2);
  const receivedHmac = hmacPart.slice(3);

  const now = options.now?.() ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const age = now - Number(timestamp);
  if (Number.isNaN(age) || age > maxAgeMs || age < -MAX_FUTURE_SKEW_MS) {
    return false;
  }

  const expectedHmac = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  if (receivedHmac.length !== expectedHmac.length) {
    return false;
  }

  const received = Buffer.from(receivedHmac, 'hex');
  const expected = Buffer.from(expectedHmac, 'hex');
  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(received, expected);
}

export function getSignatureHeader(request: Request): string | null {
  return request.headers.get(SIGNATURE_HEADER);
}
