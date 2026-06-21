import type { StreamPart } from '@novu/thalamus';
import { Agent, type Connection, type ConnectionContext, type FiberRecoveryContext } from 'agents';
import { type EventSourceMessage, EventSourceParserStream } from 'eventsource-parser/stream';
import { providers } from './parsers';
import type {
  DeliveryOutcome,
  EnqueueParams,
  Env,
  EventRow,
  MessageQueueRow,
  ObservationParams,
  ObservationStatus,
  State,
} from './types';

const MAX_ATTEMPTS = 10;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 60_000;
const MAX_QUEUE_SIZE = 50;
const STALE_QUEUE_TTL_SECONDS = 600;

export class SessionObserver extends Agent<Env, State> {
  initialState: State = { observation: null, queueState: 'idle' };

  private abortController: AbortController | null = null;
  private delivering = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          sequence INTEGER NOT NULL,
          event_json TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          attempts INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        )
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS message_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          run_id TEXT NOT NULL,
          turn_id TEXT NOT NULL,
          request_json TEXT NOT NULL,
          webhook_json TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);
    });
  }

  /* ---------- Lifecycle ---------- */

  async onStart(): Promise<void> {
    const cutoff = Math.floor(Date.now() / 1000) - STALE_QUEUE_TTL_SECONDS;
    this.ctx.storage.sql.exec('DELETE FROM message_queue WHERE created_at < ?', cutoff);

    const obs = this.state.observation;
    if (!obs) return;
    const pending = this.getPendingEvents(obs.sessionId);
    if (pending.length > 0) {
      this.triggerDelivery(obs);
    }
  }

  /* ---------- RPC: observation control ---------- */

  async startObserving(params: ObservationParams): Promise<void> {
    this.abortController?.abort();

    this.updateObservation({ ...params, status: 'active' });

    const controller = new AbortController();
    this.abortController = controller;

    void this.runFiber('observe', async (ctx) => {
      ctx.stash(params);
      await this.observeSSE(params, ctx, controller.signal);
    });
  }

  async stopObserving(): Promise<void> {
    const sessionId = this.state.observation?.sessionId;
    this.abortController?.abort();
    this.abortController = null;
    this.setState({ observation: null, queueState: 'idle' });
    this.cleanupEvents(sessionId);
  }

  async getStatus(): Promise<string> {
    return this.state.observation?.status ?? 'none';
  }

  /* ---------- RPC: message queue ---------- */

  async handleEnqueue(params: EnqueueParams): Promise<{ status: 'active' | 'queued' }> {
    if (params.request.toolResults?.length) {
      return { status: 'active' };
    }

    if (this.state.queueState === 'idle') {
      this.setState({ ...this.state, queueState: 'active' });
      return { status: 'active' };
    }

    const count =
      this.ctx.storage.sql
        .exec<{ cnt: number }>('SELECT COUNT(*) as cnt FROM message_queue WHERE session_id = ?', params.sessionId)
        .toArray()[0]?.cnt ?? 0;

    if (count >= MAX_QUEUE_SIZE) {
      throw new Error(`Session message queue is full (limit: ${MAX_QUEUE_SIZE})`);
    }

    this.ctx.storage.sql.exec(
      'INSERT INTO message_queue (session_id, run_id, turn_id, request_json, webhook_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      params.sessionId,
      params.runId,
      params.turnId,
      JSON.stringify(params.request),
      JSON.stringify(params.webhook),
      Math.floor(Date.now() / 1000)
    );

    const sequence = this.getNextSequence(params.sessionId);
    this.persistEvent(params.sessionId, sequence, { type: 'status-change', status: 'queued' } as StreamPart);
    this.triggerDelivery({
      sessionId: params.sessionId,
      runId: params.runId,
      turnId: params.turnId,
      streamUrl: '',
      headers: {},
      provider: params.provider,
      webhook: params.webhook,
    });

    return { status: 'queued' };
  }

  /* ---------- Reject WebSocket upgrades ---------- */

  async onConnect(connection: Connection, _ctx: ConnectionContext): Promise<void> {
    connection.close(4000, 'WebSocket not supported — use webhook delivery');
  }

  /* ---------- Fiber recovery ---------- */

  async onFiberRecovered(ctx: FiberRecoveryContext): Promise<void> {
    if (ctx.name !== 'observe') return;
    const snapshot = ctx.snapshot as ObservationParams | null;
    if (!snapshot || !this.state.observation) return;
    void this.startObserving(snapshot);
  }

  /* ---------- Internal: SSE observation + event processing ---------- */

  private async observeSSE(
    params: ObservationParams,
    fiberCtx: { stash(data: unknown): void },
    signal: AbortSignal
  ): Promise<void> {
    const parser = providers[params.provider];
    if (!parser) {
      throw new Error(`Unsupported provider: ${params.provider}`);
    }

    const fetchHeaders: Record<string, string> = {
      ...params.headers,
      Accept: 'text/event-stream',
    };
    if (params.lastEventId) {
      fetchHeaders['Last-Event-ID'] = params.lastEventId;
    }

    const response = await fetch(params.streamUrl, {
      headers: fetchHeaders,
      redirect: 'manual',
      signal,
    });

    if (!response.ok || !response.body) {
      this.updateObservation({
        ...(this.state.observation ?? params),
        status: 'error',
      });
      throw new Error(`SSE connection failed: ${response.status}`);
    }

    const eventStream = response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream());

    const acc = parser.createAccumulator();
    let sequence = this.getNextSequence(params.sessionId);
    let pauseWebhookSent = false;

    for await (const sseEvent of eventStream) {
      if (signal.aborted) break;

      if (sseEvent.id) {
        fiberCtx.stash({ ...params, lastEventId: sseEvent.id });
      }

      const parts = this.parseSSEEvent(sseEvent, parser, acc);
      let hasError = false;
      for (const part of parts) {
        if (part.type === 'finish') continue;
        if (part.type === 'error') hasError = true;
        this.persistEvent(params.sessionId, sequence++, part);
      }

      this.triggerDelivery(params);

      if (hasError) break;

      if (acc.done) {
        if (acc.finishReason === 'requires-action') {
          sequence = this.emitFinishWebhook(params, params.sessionId, sequence, acc);
          pauseWebhookSent = true;
        }

        break;
      }
    }

    if (acc.done && !pauseWebhookSent) {
      sequence = this.emitFinishWebhook(params, params.sessionId, sequence, acc);
      this.finalizeObservation(params, signal, 'terminal-complete');
    } else if (pauseWebhookSent) {
      this.finalizeObservation(params, signal, 'pause-complete');
    } else {
      this.finalizeObservation(params, signal, 'stream-error');
    }
  }

  private emitFinishWebhook(
    params: ObservationParams,
    sessionId: string,
    sequence: number,
    acc: import('./parsers').EdgeAccumulator
  ): number {
    // Override acc.messages with the DB-reconstructed list: it includes messages
    // from before a fiber recovery, where the in-memory accumulator is recreated empty.
    const messages = this.reconstructMessages(sessionId);
    const finish: StreamPart = {
      type: 'finish',
      response: { ...acc.toResponse(sessionId), messages },
    };
    this.persistEvent(sessionId, sequence, finish);
    this.triggerDelivery(params);

    return sequence + 1;
  }

  private finalizeObservation(
    params: ObservationParams,
    signal: AbortSignal,
    endState: 'terminal-complete' | 'pause-complete' | 'stream-error'
  ): void {
    if (endState === 'terminal-complete') {
      this.updateObservation({
        ...this.state.observation!,
        status: 'completed',
      });

      return;
    }

    if (endState === 'pause-complete') {
      this.updateObservation({
        ...(this.state.observation ?? params),
        status: 'completed',
      });

      return;
    }

    if (!signal.aborted) {
      this.updateObservation({
        ...(this.state.observation ?? params),
        status: 'error',
      });
    }
  }

  private async drainQueue(sessionId: string, lastParams: ObservationParams): Promise<void> {
    const row = this.ctx.storage.sql
      .exec<MessageQueueRow>('SELECT * FROM message_queue WHERE session_id = ? ORDER BY id LIMIT 1', sessionId)
      .toArray()[0];

    if (!row) {
      this.setState({ ...this.state, queueState: 'idle' });
      return;
    }

    this.ctx.storage.sql.exec('DELETE FROM message_queue WHERE id = ? AND session_id = ?', row.id, sessionId);

    const request = JSON.parse(row.request_json);
    const webhook = JSON.parse(row.webhook_json);
    const event = { type: 'queue-ready', request } as unknown as StreamPart;
    const sequence = this.getNextSequence(sessionId);
    this.persistEvent(sessionId, sequence, event);

    const drainParams: ObservationParams = {
      sessionId,
      runId: row.run_id,
      turnId: row.turn_id,
      streamUrl: '',
      headers: {},
      provider: lastParams.provider,
      webhook,
    };

    const eventRow = this.getPendingEvents(sessionId)[0];
    if (eventRow) {
      await this.deliverOne(eventRow, event, drainParams);
      this.cleanupEvents(sessionId);
    }
  }

  private parseSSEEvent(
    sseEvent: EventSourceMessage,
    parser: import('./types').ProviderParser,
    acc: import('./parsers').EdgeAccumulator
  ): StreamPart[] {
    if (!sseEvent.data) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(sseEvent.data);
    } catch {
      return [];
    }

    if (isMcpInitFailure(parsed)) {
      return [];
    }

    const parts: StreamPart[] = [];
    try {
      for (const part of parser.mapEvent(parsed, acc)) {
        parts.push(part);
      }
    } catch (err) {
      parts.push({
        type: 'error',
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }

    return parts;
  }

  /* ---------- SQLite event queue ---------- */

  private persistEvent(sessionId: string, sequence: number, event: StreamPart): void {
    const serializable =
      event.type === 'error'
        ? {
            type: 'error',
            error: { message: event.error.message, name: event.error.name },
          }
        : event;
    this.ctx.storage.sql.exec(
      "INSERT INTO events (session_id, sequence, event_json, status, attempts, created_at) VALUES (?, ?, ?, 'pending', 0, ?)",
      sessionId,
      sequence,
      JSON.stringify(serializable),
      Math.floor(Date.now() / 1000)
    );
  }

  private getNextSequence(sessionId: string): number {
    const row = this.ctx.storage.sql
      .exec<{ max_seq: number | null }>('SELECT MAX(sequence) as max_seq FROM events WHERE session_id = ?', sessionId)
      .toArray()[0];

    return (row?.max_seq ?? 0) + 1;
  }

  private reconstructMessages(sessionId: string): string[] {
    const cursor = this.ctx.storage.sql.exec<{ text: string }>(
      "SELECT json_extract(event_json, '$.text') as text FROM events WHERE session_id = ? AND json_extract(event_json, '$.type') = 'message' ORDER BY sequence",
      sessionId
    );

    const messages: string[] = [];
    for (const row of cursor) {
      if (row.text) messages.push(row.text);
    }

    return messages;
  }

  private getPendingEvents(sessionId: string): EventRow[] {
    return this.ctx.storage.sql
      .exec<EventRow>(
        "SELECT * FROM events WHERE session_id = ? AND status = 'pending' ORDER BY sequence ASC",
        sessionId
      )
      .toArray();
  }

  private markFailed(id: number): void {
    this.ctx.storage.sql.exec("UPDATE events SET status = 'failed' WHERE id = ?", id);
  }

  private markDead(id: number): void {
    this.ctx.storage.sql.exec("UPDATE events SET status = 'dead' WHERE id = ?", id);
  }

  private markDelivered(id: number): void {
    this.ctx.storage.sql.exec("UPDATE events SET status = 'delivered' WHERE id = ?", id);
  }

  private incrementAttempts(id: number): void {
    this.ctx.storage.sql.exec('UPDATE events SET attempts = attempts + 1 WHERE id = ?', id);
  }

  private cleanupEvents(sessionId?: string): void {
    if (!sessionId) return;
    this.ctx.storage.sql.exec('DELETE FROM events WHERE session_id = ?', sessionId);
  }

  /* ---------- Webhook delivery ---------- */

  private triggerDelivery(params: ObservationParams): void {
    if (this.delivering) return;
    this.delivering = true;
    void this.deliverPending(params).finally(() => {
      this.delivering = false;
    });
  }

  private async deliverPending(params: ObservationParams): Promise<void> {
    const { sessionId } = params;

    while (true) {
      const pending = this.getPendingEvents(sessionId);
      if (pending.length === 0) break;

      const row = pending[0];
      const event = JSON.parse(row.event_json) as StreamPart;
      const outcome = await this.deliverOne(row, event, params);

      switch (outcome) {
        case 'delivered':
        case 'skipped':
          if (event.type === 'error') {
            this.cleanupEvents(sessionId);
            this.setState({ observation: null, queueState: this.state.queueState });
            await this.drainQueue(sessionId, params);

            return;
          }
          if (event.type === 'finish') {
            const isPauseWebhook =
              (event as { response?: { finishReason?: string } }).response?.finishReason === 'requires-action';
            if (isPauseWebhook) {
              this.markDelivered(row.id);

              continue;
            }
            this.cleanupEvents(sessionId);
            this.setState({ observation: null, queueState: this.state.queueState });
            await this.drainQueue(sessionId, params);

            return;
          }
          this.markDelivered(row.id);
          break;

        case 'retry-later':
          this.scheduleRetry(params);

          return;

        case 'exhausted':
          this.markDead(row.id);
          console.error(`Event delivery exhausted: session=${sessionId} seq=${row.sequence} type=${event.type}`);
          break;
      }
    }
  }

  private async deliverOne(row: EventRow, event: StreamPart, params: ObservationParams): Promise<DeliveryOutcome> {
    const { sessionId, runId, turnId, provider, webhook } = params;

    if (row.attempts >= MAX_ATTEMPTS) return 'exhausted';

    this.incrementAttempts(row.id);

    const body = JSON.stringify({
      sessionId,
      runId,
      turnId,
      sequence: row.sequence,
      timestamp: row.created_at,
      provider,
      metadata: webhook.metadata ?? {},
      event,
    });

    const signature = await this.sign(body, webhook.secret, row.created_at);

    try {
      await this.retry(
        async () => {
          const r = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Thalamus-Signature': signature,
              'X-Thalamus-Event-Type': event.type,
              'X-Thalamus-Session-Id': sessionId,
              'X-Thalamus-Run-Id': runId,
              'X-Thalamus-Sequence': String(row.sequence),
            },
            body,
          });

          if (r.status >= 200 && r.status < 300) return r;
          if (r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429) {
            const err = new Error(`HTTP ${r.status}`) as Error & {
              permanent: boolean;
            };
            err.permanent = true;
            throw err;
          }
          throw new Error(`HTTP ${r.status}`);
        },
        {
          maxAttempts: 3,
          baseDelayMs: BASE_DELAY_MS,
          maxDelayMs: MAX_DELAY_MS,
          shouldRetry: (err) => {
            return !(err && typeof err === 'object' && 'permanent' in err);
          },
        }
      );

      return 'delivered';
    } catch (err) {
      if (err && typeof err === 'object' && 'permanent' in err) {
        console.warn(`Webhook 4xx (permanent failure): session=${sessionId} seq=${row.sequence}`);
        this.markFailed(row.id);

        return 'skipped';
      }

      console.warn(`Webhook delivery failed: session=${sessionId} seq=${row.sequence} attempts=${row.attempts}`);

      return 'retry-later';
    }
  }

  private scheduleRetry(params: ObservationParams): void {
    const pending = this.getPendingEvents(params.sessionId);
    if (pending.length === 0) return;

    const attempt = pending[0].attempts;
    const delaySec = Math.min((BASE_DELAY_MS * 2 ** attempt) / 1000, MAX_DELAY_MS / 1000);

    this.schedule(delaySec, 'retryDelivery', params);
  }

  async retryDelivery(params: ObservationParams): Promise<void> {
    if (!this.state.observation) return;
    const pending = this.getPendingEvents(params.sessionId);
    if (pending.length === 0) return;
    await this.deliverPending(params);
  }

  /* ---------- HMAC signature ---------- */

  private async sign(body: string, secret: string, timestamp: number): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
    ]);
    const payload = `${timestamp}.${body}`;
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return `t=${timestamp},v1=${hex}`;
  }

  /* ---------- Helpers ---------- */

  private updateObservation(obs: (ObservationParams & { status: ObservationStatus }) | null): void {
    this.setState({ ...this.state, observation: obs });
  }
}

function isMcpInitFailure(parsed: unknown): boolean {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const obj = parsed as { type?: string; error?: { type?: string; message?: string } };

  return (
    obj.type === 'session.error' &&
    (obj.error?.type === 'mcp_authentication_failed_error' ||
      /MCP server .+ initialize failed/i.test(obj.error?.message ?? ''))
  );
}
