/**
 * HMAC validation utilities for Step Resolver Worker.
 *
 * Uses the same signature format as @novu/framework Bridge authentication,
 * but with a different secret for different trust boundaries:
 *
 * - Framework Bridge: Uses per-customer NOVU_SECRET_KEY to authenticate
 *   requests from Novu Cloud to customer's Bridge endpoint
 *
 * - Step Resolver Worker: Uses platform-level STEP_RESOLVER_HMAC_SECRET to authenticate
 *   requests from Novu API to Novu's Cloudflare Workers infrastructure
 *
 * Signature format: X-Novu-Signature: t={timestamp},v1={hmac}
 * HMAC computed over: ${timestamp}.${rawPayloadString}
 */

const DEFAULT_TIMESTAMP_TOLERANCE_MS = 300_000; // 5 minutes

/**
 * Create HMAC using subtle crypto.
 * Compatible with Web Crypto API available in Cloudflare Workers.
 */
async function createHmacSubtle(secretKey: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const dataBuffer = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'HMAC',
      hash: { name: 'SHA-256' },
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate HMAC signature from X-Novu-Signature header.
 * Uses the same format as Framework Bridge: t={timestamp},v1={hmac}
 */
export async function validateHmacSignature(
  signatureHeader: string,
  secretKey: string,
  payloadString: string,
  toleranceMs: number = DEFAULT_TIMESTAMP_TOLERANCE_MS
): Promise<{ valid: boolean; error?: string }> {
  const parts = signatureHeader.split(',');
  const timestampPart = parts.find((p) => p.startsWith('t='));
  const signaturePart = parts.find((p) => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    return { valid: false, error: 'Invalid signature format' };
  }

  const timestamp = Number(timestampPart.split('=')[1]);
  const providedSignature = signaturePart.split('=')[1];

  if (!Number.isFinite(timestamp)) {
    return { valid: false, error: 'Invalid timestamp' };
  }

  if (Math.abs(Date.now() - timestamp) > toleranceMs) {
    return { valid: false, error: 'Signature expired' };
  }

  const expectedSignature = await createHmacSubtle(secretKey, `${timestamp}.${payloadString}`);

  const encoder = new TextEncoder();
  const expectedBuffer = encoder.encode(expectedSignature);
  const providedBuffer = encoder.encode(providedSignature);

  const lengthsMatch = expectedBuffer.byteLength === providedBuffer.byteLength;
  const isEqual = lengthsMatch
    ? crypto.subtle.timingSafeEqual(expectedBuffer, providedBuffer)
    : !crypto.subtle.timingSafeEqual(providedBuffer, providedBuffer);

  if (!isEqual) {
    return { valid: false, error: 'Signature mismatch' };
  }

  return { valid: true };
}
