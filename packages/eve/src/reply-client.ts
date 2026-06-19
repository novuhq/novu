import type { AgentReplyPayload } from '@novu/framework';
import { resolveNovuCredentials, type NovuCredentialsSource } from './credentials.js';

/** Recipient for a workflow trigger — a subscriberId, subscriber object, topic, or arrays thereof. */
export type TriggerRecipient = unknown;

/**
 * Thin client for Novu's agent reply flow + workflow trigger endpoint.
 *
 * Credentials are resolved lazily per call (never captured at construction), so
 * a Vercel Connect resolver can mint fresh credentials. The reply URL is derived
 * solely from `apiBaseUrl` + `agentIdentifier` — a forged inbound request can
 * never redirect the secret key to an attacker host.
 */
export class NovuApiClient {
  private readonly source: NovuCredentialsSource;
  private readonly fetchImpl: typeof fetch;

  constructor(source: NovuCredentialsSource = {}, fetchImpl: typeof fetch = globalThis.fetch) {
    this.source = source;
    this.fetchImpl = fetchImpl;
  }

  /** POST an `AgentReplyPayload` to `/v1/agents/:id/reply`. */
  async reply(payload: AgentReplyPayload): Promise<void> {
    const { secretKey, agentIdentifier, apiBaseUrl } = await resolveNovuCredentials(this.source);
    const base = apiBaseUrl.replace(/\/$/, '');
    const url = `${base}/v1/agents/${encodeURIComponent(agentIdentifier)}/reply`;
    await this.post(url, secretKey, payload, 'reply');
  }

  /** Fire a Novu workflow via `/v1/events/trigger`. */
  async trigger(
    workflowId: string,
    options: { to?: TriggerRecipient; payload?: Record<string, unknown> } = {},
  ): Promise<void> {
    const { secretKey, apiBaseUrl } = await resolveNovuCredentials(this.source);
    const base = apiBaseUrl.replace(/\/$/, '');
    const body: Record<string, unknown> = { name: workflowId, payload: options.payload ?? {} };
    if (options.to !== undefined) body.to = options.to;
    await this.post(`${base}/v1/events/trigger`, secretKey, body, 'trigger');
  }

  private async post(url: string, secretKey: string, body: unknown, label: string): Promise<void> {
    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `ApiKey ${secretKey}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Novu ${label} failed (${response.status} ${response.statusText}): ${detail}`);
    }
  }
}
