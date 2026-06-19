import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifies Novu's `novu-signature` HMAC on inbound bridge requests.
 *
 * Scheme (Novu's `buildNovuSignatureHeader`):
 *   header  = `t=<timestamp-ms>,v1=<hmac-hex>`
 *   message = `<timestamp>.<rawBody>`
 *   hmac    = HMAC-SHA256(secretKey, message) as lowercase hex
 *
 * `rawBody` MUST be the exact request body bytes (Novu signs
 * `JSON.stringify(payload)` and sends those same bytes), so verify against
 * `await request.text()` before parsing.
 */

const SIGNATURE_HEADER = 'novu-signature';
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 30 * 1000;

export interface VerifyOptions {
  readonly maxAgeMs?: number;
  /** Injectable clock for deterministic tests. */
  readonly now?: () => number;
}

/** Read the `novu-signature` header from a `Request`. */
export function getSignatureHeader(request: Request): string | null {
  return request.headers.get(SIGNATURE_HEADER);
}

/** Constant-time verification of the `novu-signature` header against the raw body. */
export function verifyNovuSignature(
  signatureHeader: string | null,
  rawBody: string,
  secret: string,
  options: VerifyOptions = {},
): boolean {
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(',');
  const timestampPart = parts.find((p) => p.startsWith('t='));
  const hmacPart = parts.find((p) => p.startsWith('v1='));
  if (!timestampPart || !hmacPart) return false;

  const timestamp = timestampPart.slice(2);
  const receivedHmac = hmacPart.slice(3);

  const now = options.now?.() ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const age = now - Number(timestamp);
  if (Number.isNaN(age) || age > maxAgeMs || age < -MAX_FUTURE_SKEW_MS) return false;

  const expectedHmac = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  if (receivedHmac.length !== expectedHmac.length) return false;

  const received = Buffer.from(receivedHmac, 'hex');
  const expected = Buffer.from(expectedHmac, 'hex');
  if (received.length !== expected.length) return false;

  return timingSafeEqual(received, expected);
}
