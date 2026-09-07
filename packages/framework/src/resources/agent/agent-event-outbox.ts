import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEvent, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { AgentDeliveryError } from './agent.errors';

export interface AgentEventOutboxOptions {
  eventsUrl: string;
  secretKey: string;
  conversationId: string;
  agentId: string;
  /** From bridge deliveryId; not guaranteed stable across approval resumes (v1 acceptable). */
  turnId: string;
  fetchFn?: typeof fetch;
  maxRetries?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

export class AgentEventOutbox {
  readonly runId: string;
  private sequence = 0;
  private buffer: AgentEventEnvelope[] = [];
  private chain: Promise<void> = Promise.resolve();
  private readonly eventsUrl: string;
  private readonly secretKey: string;
  private readonly conversationId: string;
  private readonly agentId: string;
  private readonly turnId: string;
  private readonly fetchFn: typeof fetch;
  private readonly maxRetries: number;

  constructor(options: AgentEventOutboxOptions) {
    this.runId = `run_${crypto.randomUUID()}`;
    this.eventsUrl = options.eventsUrl;
    this.secretKey = options.secretKey;
    this.conversationId = options.conversationId;
    this.agentId = options.agentId;
    this.turnId = options.turnId;
    this.fetchFn = options.fetchFn ?? fetch;
    this.maxRetries = options.maxRetries ?? 3;
  }

  enqueue(event: AgentEvent): void {
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

  async emit(event: AgentEvent): Promise<void> {
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
          'Content-Type': 'application/json',
          Authorization: `ApiKey ${this.secretKey}`,
        },
        body: JSON.stringify({ events: batch }),
      });
    } catch (error) {
      throw toNetworkDeliveryError(error);
    }

    const responseBody = await response.text().catch(() => '');

    if (!response.ok) {
      throw new AgentDeliveryError(response.status, responseBody);
    }
  }
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof AgentDeliveryError)) {
    return true;
  }

  if (error.statusCode === 0) {
    return true;
  }

  return isRetryableStatus(error.statusCode);
}

function toNetworkDeliveryError(error: unknown): AgentDeliveryError {
  if (error instanceof AgentDeliveryError) {
    return error;
  }

  const message = error instanceof Error ? error.message : 'Network request failed';

  return new AgentDeliveryError(0, message);
}
