import { getSignatureHeader, verifyNovuSignature } from './signature.js';
import type { AgentBridgeRequest } from './types.js';

export interface ParseResult {
  request: AgentBridgeRequest | null;
  status: number;
}

/**
 * Verifies the HMAC over the *raw* request body, then parses the
 * `AgentBridgeRequest`. Reading the body once via `request.text()` is required —
 * the signature is computed over those exact bytes.
 */
export class WebhookHandler {
  constructor(
    private readonly bridgeSecret: string,
    private readonly maxAgeMs?: number
  ) {}

  async parseAndVerify(request: Request): Promise<ParseResult> {
    const signature = getSignatureHeader(request);
    const rawBody = await request.text();

    if (!verifyNovuSignature(signature, rawBody, this.bridgeSecret, { maxAgeMs: this.maxAgeMs })) {
      return { request: null, status: 401 };
    }

    let parsed: AgentBridgeRequest;
    try {
      parsed = JSON.parse(rawBody) as AgentBridgeRequest;
    } catch {
      return { request: null, status: 400 };
    }

    if (!parsed || typeof parsed !== 'object' || !parsed.conversationId || !parsed.event) {
      return { request: null, status: 400 };
    }

    return { request: parsed, status: 200 };
  }
}
