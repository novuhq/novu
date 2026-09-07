import type { AgentReplyPayload, NovuAdapterConfig, SentMessageInfo } from './types.js';

const DEFAULT_API_BASE_URL = 'https://api.novu.co';

/**
 * Posts `AgentReplyPayload`s to Novu's reply endpoint.
 *
 * The reply URL is derived solely from `apiBaseUrl` + `agentIdentifier`; the
 * inbound bridge request's `replyUrl` is never used, so a forged request can
 * never redirect the `apiKey` to an attacker-controlled host.
 */
export class ReplyClient {
  private readonly replyUrl: string;
  private readonly bridgeUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: NovuAdapterConfig) {
    const base = (config.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
    const id = encodeURIComponent(config.agentIdentifier);
    this.replyUrl = `${base}/v1/agents/${id}/reply`;
    this.bridgeUrl = `${base}/v1/agents/${id}/bridge`;
    this.apiKey = config.apiKey;
    this.fetchImpl = config.fetch ?? globalThis.fetch;
  }

  /** The derived reply URL (exposed for assertions/tests). */
  getReplyUrl(): string {
    return this.replyUrl;
  }

  async send(payload: AgentReplyPayload): Promise<SentMessageInfo | null> {
    const response = await this.fetchImpl(this.replyUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `ApiKey ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Novu reply failed (${response.status} ${response.statusText}): ${detail}`);
    }

    const text = await response.text().catch(() => '');
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text) as SentMessageInfo;
    } catch {
      return null;
    }
  }

  /** Register the bridge endpoint for an agent (boot-time, optional). */
  async registerBridge(bridgeUrl: string): Promise<void> {
    const response = await this.fetchImpl(this.bridgeUrl, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `ApiKey ${this.apiKey}`,
      },
      body: JSON.stringify({ bridgeUrl }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Bridge registration failed (${response.status} ${response.statusText}): ${detail}`);
    }
  }
}
