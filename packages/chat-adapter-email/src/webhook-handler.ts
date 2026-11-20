import { createHmac, timingSafeEqual } from 'node:crypto';
import type { EmailWebhookPayload } from './types.js';

const SIGNATURE_HEADER = 'novu-signature';
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FUTURE_SKEW_MS = 30 * 1000; // 30 seconds tolerance for clock drift

interface VerifyResult {
  payload: EmailWebhookPayload | null;
  status: number;
}

export class WebhookHandler {
  constructor(private readonly signingSecret: string) {}

  async parseAndVerify(request: Request): Promise<VerifyResult> {
    const signature = request.headers.get(SIGNATURE_HEADER);
    if (!signature) {
      return { status: 401, payload: null };
    }

    const body = await request.text();

    if (!this.verifySignature(signature, body)) {
      return { status: 401, payload: null };
    }

    try {
      const payload = JSON.parse(body) as EmailWebhookPayload;
      if (!payload.messageId || !payload.from?.address) {
        return { status: 400, payload: null };
      }

      return { status: 200, payload };
    } catch {
      return { status: 400, payload: null };
    }
  }

  /**
   * Verify HMAC signature matching the format produced by
   * `buildNovuSignatureHeader` in libs/application-generic/src/utils/hmac.ts.
   *
   * Format: t={timestamp},v1={hmac-hex}[,v1={hmac-hex}...]
   * HMAC input: "{timestamp}.{body}"
   *
   * A rolling secret-key rotation puts one `v1` in the header per active key.
   * The webhook is authentic when any of them matches this handler's secret.
   */
  private verifySignature(signature: string, body: string): boolean {
    const parts = signature.split(',');
    const timestampPart = parts.find((p) => p.startsWith('t='));
    const receivedHmacs = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));

    if (!timestampPart || receivedHmacs.length === 0) {
      return false;
    }

    const timestamp = timestampPart.slice(2);

    const age = Date.now() - Number(timestamp);
    if (Number.isNaN(age) || age > MAX_TIMESTAMP_AGE_MS || age < -MAX_FUTURE_SKEW_MS) {
      return false;
    }

    const expectedHmac = createHmac('sha256', this.signingSecret).update(`${timestamp}.${body}`).digest('hex');
    const expected = Buffer.from(expectedHmac, 'hex');
    let matched = false;

    for (const receivedHmac of receivedHmacs) {
      if (receivedHmac.length !== expectedHmac.length) {
        continue;
      }

      const received = Buffer.from(receivedHmac, 'hex');
      if (received.length !== expected.length) {
        continue;
      }

      if (timingSafeEqual(received, expected)) {
        matched = true;
      }
    }

    return matched;
  }
}
