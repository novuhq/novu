import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Replay window for inbound deliveries, mirroring Photon's own verifier
 * (Stripe-style 300s tolerance).
 */
const TOLERANCE_SECONDS = 300;

export type StandardWebhookVerifier = (request: Request, rawBody: string) => boolean;

/**
 * Builds a Standard Webhooks (https://www.standardwebhooks.com) verifier for
 * Photon/Spectrum Cloud deliveries. The signed content is
 * `webhook-id.webhook-timestamp.rawBody`, HMAC-SHA256 with the base64 key
 * carried in the `whsec_` secret; the `webhook-signature` header holds a
 * space-delimited list of `v1,<base64>` entries (more than one during secret
 * rotation). Throws to reject — the caller treats any throw as an
 * authentication failure.
 */
export function buildStandardWebhookVerifier(webhookSecret: string): StandardWebhookVerifier {
  const key = Buffer.from(webhookSecret.replace(/^whsec_/, ''), 'base64');

  return (request: Request, rawBody: string): boolean => {
    const webhookId = request.headers.get('webhook-id');
    const timestamp = request.headers.get('webhook-timestamp');
    const signatureHeader = request.headers.get('webhook-signature');

    if (!webhookId || !timestamp || !signatureHeader) {
      throw new Error('Missing Standard Webhooks headers');
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds)) {
      throw new Error('Malformed webhook timestamp');
    }
    if (Math.abs(Date.now() / 1000 - timestampSeconds) > TOLERANCE_SECONDS) {
      throw new Error('Stale webhook timestamp');
    }

    const expected = Buffer.from(
      createHmac('sha256', key).update(`${webhookId}.${timestamp}.${rawBody}`).digest('base64')
    );

    const verified = signatureHeader.split(' ').some((entry) => {
      const [version, signature] = entry.split(',');
      if (version !== 'v1' || !signature) {
        return false;
      }

      const candidate = Buffer.from(signature);

      return candidate.length === expected.length && timingSafeEqual(candidate, expected);
    });

    if (!verified) {
      throw new Error('Invalid webhook signature');
    }

    return true;
  };
}
