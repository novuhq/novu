import type { AdapterAgentEvent, AgentEventEnvelope } from './event-protocol.js';
import { AGENT_EVENT_PROTOCOL_VERSION } from './event-protocol.js';

const DEFAULT_API_BASE_URL = 'https://api.novu.co';

export function mint(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function deriveEventsUrl(apiBaseUrl?: string): string {
  const base = (apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');

  return `${base}/v1/agents/events/ingest`;
}

export class IngestError extends Error {
  constructor(
    readonly statusCode: number,
    detail: string
  ) {
    super(`Novu ingest failed (${statusCode}): ${detail}`);
    this.name = 'IngestError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof IngestError)) {
    return true;
  }

  if (error.statusCode === 0) {
    return true;
  }

  return isRetryableStatus(error.statusCode);
}

export interface AgentEventOutboxOptions {
  eventsUrl: string;
  apiKey: string;
  conversationId: string;
  agentId: string;
  turnId: string;
  fetchFn?: typeof fetch;
  maxRetries?: number;
}

/**
 * Per-conversation sequenced outbox. POSTs `{ events }` to a derived ingest URL.
 * Never reads inbound `replyUrl` / `eventsUrl`.
 */
export class AgentEventOutbox {
  readonly runId: string;
  private sequence = 0;
  private buffer: AgentEventEnvelope[] = [];
  private chain: Promise<void> = Promise.resolve();
  private readonly eventsUrl: string;
  private readonly apiKey: string;
  private readonly conversationId: string;
  private readonly agentId: string;
  private readonly turnId: string;
  private readonly fetchFn: typeof fetch;
  private readonly maxRetries: number;

  constructor(options: AgentEventOutboxOptions) {
    this.runId = mint('run');
    this.eventsUrl = options.eventsUrl;
    this.apiKey = options.apiKey;
    this.conversationId = options.conversationId;
    this.agentId = options.agentId;
    this.turnId = options.turnId;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
    this.maxRetries = options.maxRetries ?? 3;
  }

  enqueue(event: AdapterAgentEvent): void {
    this.sequence += 1;
    this.buffer.push({
      version: AGENT_EVENT_PROTOCOL_VERSION,
      conversationId: this.conversationId,
      agentId: this.agentId,
      runId: this.runId,
      turnId: this.turnId,
      sequence: this.sequence,
      timestamp: new Date().toISOString(),
      event,
    });
  }

  flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return this.chain;
    }

    const batch = this.buffer;
    this.buffer = [];
    this.chain = this.chain.then(() => this.postBatchWithRetry(batch));

    return this.chain;
  }

  async emit(event: AdapterAgentEvent): Promise<void> {
    this.enqueue(event);
    await this.flush();
  }

  private async postBatchWithRetry(batch: AgentEventEnvelope[]): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      try {
        await this.postBatch(batch);

        return;
      } catch (error) {
        lastError = error;

        if (!isRetryableError(error)) {
          throw error;
        }

        if (attempt < this.maxRetries) {
          await sleep(250 * attempt);
        }
      }
    }

    throw lastError;
  }

  private async postBatch(batch: AgentEventEnvelope[]): Promise<void> {
    let response: Response;

    try {
      response = await this.fetchFn(this.eventsUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `ApiKey ${this.apiKey}`,
        },
        body: JSON.stringify({ events: batch }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network request failed';
      throw new IngestError(0, message);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new IngestError(response.status, `${response.statusText}: ${detail}`);
    }
  }
}
