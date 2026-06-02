import type { ActionRequired, StreamPart, Response as ThalamusResponse, Usage } from '@novu/thalamus';
import { mapAnthropicEvent } from '@novu/thalamus/anthropic/parser';
import { mapOpenAIEvent } from '@novu/thalamus/openai/parser';
import { Agent, type Connection, type ConnectionContext, type FiberRecoveryContext } from 'agents';
import { type EventSourceMessage, EventSourceParserStream } from 'eventsource-parser/stream';

/* ------------------------------------------------------------------ */
/*  Provider registry                                                   */
/* ------------------------------------------------------------------ */

class EdgeAccumulator {
  done = false;
  finishReason: ThalamusResponse['finishReason'] = 'stop';
  usage: Usage | undefined;
  actionsRequired: ActionRequired[] = [];
  sessionId: string | undefined;
  conversationId: string | undefined;
  /** Required by `mapAnthropicEvent` for `agent.mcp_tool_use` / `agent.mcp_tool_result`. */
  mcpServerByToolUseId = new Map<string, string>();
  stepIndex = 0;

  set content(_: string) {}
  get content() {
    return '';
  }

  toResponse(sessionId?: string): ThalamusResponse {
    return {
      content: '',
      sessionId: sessionId ?? this.conversationId ?? this.sessionId,
      finishReason: this.finishReason,
      usage: this.usage,
      actionsRequired: this.actionsRequired.length > 0 ? this.actionsRequired : undefined,
    };
  }
}

interface ProviderParser {
  createAccumulator(): EdgeAccumulator;
  mapEvent(raw: unknown, acc: EdgeAccumulator): Generator<StreamPart>;
}

const providers: Record<string, ProviderParser> = {
  anthropic: {
    createAccumulator: () => new EdgeAccumulator(),
    mapEvent: (raw, acc) => mapAnthropicEvent(raw as any, acc as any),
  },
  openai: {
    createAccumulator: () => new EdgeAccumulator(),
    mapEvent: (raw, acc) => mapOpenAIEvent(raw as any, acc as any),
  },
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Env {
  SESSION_OBSERVER: DurableObjectNamespace<SessionObserver>;
  API_KEY?: string;
}

export interface ObservationParams {
  sessionId: string;
  runId: string;
  /** Stable turn identifier — groups multiple send() calls within one user interaction. */
  turnId: string;
  streamUrl: string;
  headers: Record<string, string>;
  lastEventId?: string;
  provider: string;
  webhook: {
    url: string;
    secret: string;
    metadata?: Record<string, string>;
  };
}

type EventRow = {
  id: number;
  session_id: string;
  sequence: number;
  event_json: string;
  status: string;
  attempts: number;
  created_at: number;
  [key: string]: SqlStorageValue;
};

type DeliveryOutcome = 'delivered' | 'skipped' | 'retry-later' | 'exhausted';

type ObservationStatus = 'active' | 'completed' | 'error';

type State = {
  observation: (ObservationParams & { status: ObservationStatus }) | null;
};

/* ------------------------------------------------------------------ */
/*  SessionObserver — one Durable Object per session                   */
/*                                                                     */
/*  Opens an SSE connection to a provider API, normalizes events into  */
/*  StreamParts, persists to SQLite, and delivers via HTTP POST with   */
/*  HMAC signatures and exponential backoff retries.                   */
/* ------------------------------------------------------------------ */

const MAX_ATTEMPTS = 10;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 60_000;

export class SessionObserver extends Agent<Env, State> {
  initialState: State = { observation: null };

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
    });
  }

  /* ---------- Lifecycle ---------- */

  async onStart(): Promise<void> {
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
    this.setState({ observation: null });
    this.cleanupEvents(sessionId);
  }

  async getStatus(): Promise<string> {
    return this.state.observation?.status ?? 'none';
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

        // One requires-action webhook per observe run. User approval starts a fresh
        // observe via startObserving(); continuing this SSE caused duplicate pause
        // webhooks when Anthropic emitted multiple session.status_idle events.
        break;
      }
    }

    // acc.done stays true after the break above — do not persist a second finish.
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
    acc: EdgeAccumulator
  ): number {
    const content = this.reconstructContent(sessionId);
    const finish: StreamPart = {
      type: 'finish',
      response: { ...acc.toResponse(sessionId), content },
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

  private parseSSEEvent(sseEvent: EventSourceMessage, parser: ProviderParser, acc: EdgeAccumulator): StreamPart[] {
    if (!sseEvent.data) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(sseEvent.data);
    } catch {
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

  private reconstructContent(sessionId: string): string {
    const cursor = this.ctx.storage.sql.exec<{ text: string }>(
      "SELECT json_extract(event_json, '$.text') as text FROM events WHERE session_id = ? AND json_extract(event_json, '$.type') = 'text-delta' ORDER BY sequence",
      sessionId
    );

    let content = '';
    for (const row of cursor) {
      content += row.text;
    }

    return content;
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
            this.setState({ observation: null });

            return;
          }
          if (event.type === 'finish') {
            const isPauseWebhook =
              (event as { response?: { finishReason?: string } }).response?.finishReason === 'requires-action';
            if (isPauseWebhook) {
              // Pause is not terminal — the next user approval starts a new observe run.
              this.markDelivered(row.id);

              continue;
            }
            this.cleanupEvents(sessionId);
            this.setState({ observation: null });

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
    this.setState({ observation: obs });
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const encoder = new TextEncoder();
const subtle = crypto.subtle as unknown as {
  timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean;
};

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;

  return subtle.timingSafeEqual(bufA, bufB);
}

function validateObservationParams(body: unknown): body is ObservationParams {
  if (typeof body !== 'object' || body === null) return false;
  const obj = body as Record<string, unknown>;
  if (typeof obj.sessionId !== 'string' || obj.sessionId.length === 0) return false;
  if (typeof obj.runId !== 'string' || obj.runId.length === 0) return false;
  if (typeof obj.turnId !== 'string' || obj.turnId.length === 0) return false;
  if (typeof obj.streamUrl !== 'string') return false;
  try {
    new URL(obj.streamUrl);
  } catch {
    return false;
  }
  if (typeof obj.headers !== 'object' || obj.headers === null || Array.isArray(obj.headers)) return false;
  const headers = obj.headers as Record<string, unknown>;
  for (const val of Object.values(headers)) {
    if (typeof val !== 'string') return false;
  }
  if (typeof obj.provider !== 'string' || !providers[obj.provider]) return false;
  if (typeof obj.webhook !== 'object' || obj.webhook === null) return false;
  const webhook = obj.webhook as Record<string, unknown>;
  if (typeof webhook.url !== 'string') return false;
  try {
    new URL(webhook.url);
  } catch {
    return false;
  }
  if (typeof webhook.secret !== 'string' || webhook.secret.length === 0) return false;

  return true;
}

/* ------------------------------------------------------------------ */
/*  Worker entry                                                       */
/* ------------------------------------------------------------------ */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/health') {
      return Response.json({ status: 'ok' });
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      return new Response('WebSocket not supported — use webhook delivery', {
        status: 400,
      });
    }

    if (env.API_KEY) {
      const auth = request.headers.get('Authorization') ?? '';
      if (!timingSafeEqual(auth, `Bearer ${env.API_KEY}`)) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    try {
      if (request.method === 'POST' && path === '/observe') {
        const body = await request.json();
        if (!validateObservationParams(body)) {
          return Response.json(
            {
              error: 'Invalid params: sessionId, streamUrl, headers, provider, and webhook are required',
            },
            { status: 400 }
          );
        }
        const stub = env.SESSION_OBSERVER.getByName(body.sessionId);
        await stub.startObserving(body);

        return new Response(null, { status: 204 });
      }

      if (request.method === 'DELETE' && path.startsWith('/observe/')) {
        const sessionId = decodeURIComponent(path.slice('/observe/'.length));
        const stub = env.SESSION_OBSERVER.getByName(sessionId);
        await stub.stopObserving();

        return new Response(null, { status: 204 });
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      console.error('Worker request failed:', err);

      return new Response('Internal server error', { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
