import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Replay window for inbound deliveries, matching Spectrum's own verifier
 * (`@spectrum-ts/core` `verifySpectrumSignature`, 300s tolerance).
 */
const TOLERANCE_SECONDS = 300;

export type SpectrumWebhookVerifier = (request: Request, rawBody: string) => boolean;

/**
 * Builds a verifier for Photon/Spectrum Cloud webhook deliveries using the
 * native v0 scheme — the only scheme Spectrum production signs with today
 * (Standard Webhooks support is a future Spectrum refactor). The header is
 * `X-Spectrum-Signature: v0=<lowercase-hex>` where the digest is
 * `HMAC-SHA256(secret, "v0:" + timestamp + ":" + rawBody)` and `timestamp` is
 * the `X-Spectrum-Timestamp` header in unix seconds. `secret` is the webhook's
 * `signingSecret` issued once at registration. Throws to reject — the caller
 * treats any throw as an authentication failure.
 */
export function buildSpectrumWebhookVerifier(webhookSecret: string): SpectrumWebhookVerifier {
  return (request: Request, rawBody: string): boolean => {
    const signatureHeader = request.headers.get('x-spectrum-signature');
    const timestamp = request.headers.get('x-spectrum-timestamp');

    if (!signatureHeader || !timestamp) {
      throw new Error('Missing Spectrum signature headers');
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds)) {
      throw new Error('Malformed webhook timestamp');
    }
    if (Math.abs(Date.now() / 1000 - timestampSeconds) > TOLERANCE_SECONDS) {
      throw new Error('Stale webhook timestamp');
    }

    const expected = createHmac('sha256', webhookSecret).update(`v0:${timestamp}:${rawBody}`).digest();
    const providedHex = signatureHeader.startsWith('v0=') ? signatureHeader.slice(3) : signatureHeader;
    const provided = Buffer.from(providedHex, 'hex');

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new Error('Invalid webhook signature');
    }

    return true;
  };
}
