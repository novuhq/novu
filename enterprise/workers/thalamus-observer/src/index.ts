import { Agent, type Connection, type ConnectionContext, type FiberRecoveryContext } from 'agents';
import { type EventSourceMessage, EventSourceParserStream } from 'eventsource-parser/stream';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Env {
  SESSION_OBSERVER: DurableObjectNamespace<SessionObserver>;
  SESSION_REGISTRY: DurableObjectNamespace<SessionRegistry>;
  API_KEY?: string;
}

export interface ObservationParams {
  sessionId: string;
  streamUrl: string;
  headers: Record<string, string>;
  lastEventId?: string;
}

type ObservationStatus = 'active' | 'completed' | 'error';

interface State {
  observation: (ObservationParams & { status: ObservationStatus }) | null;
  eventBuffer: EventSourceMessage[];
}

/* ------------------------------------------------------------------ */
/*  SessionObserver — one Durable Object per session                   */
/* ------------------------------------------------------------------ */

const MAX_BUFFERED_EVENTS = 10_000;

export class SessionObserver extends Agent<Env, State> {
  initialState: State = { observation: null, eventBuffer: [] };

  private abortController: AbortController | null = null;

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
    this.abortController?.abort();
    this.abortController = null;
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(1000, 'observation stopped');
      } catch {}
    }
    this.setState({ observation: null, eventBuffer: [] });
  }

  async getStatus(): Promise<string> {
    return this.state.observation?.status ?? 'none';
  }

  async onConnect(connection: Connection, ctx: ConnectionContext): Promise<void> {
    const url = new URL(ctx.request.url);

    if (this.env.API_KEY) {
      const token = url.searchParams.get('token') ?? '';
      if (!timingSafeEqual(token, this.env.API_KEY)) {
        connection.close(4001, 'Unauthorized');

        return;
      }
    }

    if (this.ctx.getWebSockets().length > 1) {
      connection.close(4002, 'consumer already connected');

      return;
    }

    if (this.state.eventBuffer.length > 0) {
      for (const event of this.state.eventBuffer) {
        connection.send(JSON.stringify(event));
      }
      this.setState({ ...this.state, eventBuffer: [] });
    }

    const status = this.state.observation?.status;
    if (!status || status === 'completed' || status === 'error') {
      connection.close(1000, 'observation ended');
    }
  }

  async onFiberRecovered(ctx: FiberRecoveryContext): Promise<void> {
    if (ctx.name !== 'observe') return;
    const snapshot = ctx.snapshot as ObservationParams | null;
    if (!snapshot || !this.state.observation) return;
    void this.startObserving(snapshot);
  }

  private updateObservation(obs: (ObservationParams & { status: ObservationStatus }) | null): void {
    this.setState({ ...this.state, observation: obs });
  }

  private relayEvent(event: EventSourceMessage): void {
    const sockets = this.ctx.getWebSockets();
    if (sockets.length > 0) {
      const payload = JSON.stringify(event);
      for (const ws of sockets) {
        try {
          ws.send(payload);
        } catch {}
      }
    } else if (this.state.eventBuffer.length < MAX_BUFFERED_EVENTS) {
      this.setState({
        ...this.state,
        eventBuffer: [...this.state.eventBuffer, event],
      });
    }

    if (this.isResponseComplete(event)) {
      this.markCompleted();
    }
  }

  /**
   * Detects provider-level "response finished" signals in the SSE stream.
   * Anthropic sends `session.status_idle` when the AI finishes a turn.
   */
  private isResponseComplete(event: EventSourceMessage): boolean {
    if (!event.data) return false;
    try {
      const parsed = JSON.parse(event.data);

      return parsed.type === 'session.status_idle';
    } catch {
      return false;
    }
  }

  private markCompleted(): void {
    const sessionId = this.state.observation?.sessionId;
    if (this.state.observation) {
      this.updateObservation({
        ...this.state.observation,
        status: 'completed',
      });
    }
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(1000, 'response complete');
      } catch {}
    }
  }

  private async observeSSE(
    params: ObservationParams,
    fiberCtx: { stash(data: unknown): void },
    signal: AbortSignal
  ): Promise<void> {
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
      if (this.state.observation) {
        this.updateObservation({ ...this.state.observation, status: 'error' });
      }
      throw new Error(`SSE connection failed: ${response.status}`);
    }

    const eventStream = response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream());

    for await (const event of eventStream) {
      if (signal.aborted) break;
      this.relayEvent(event);
      if (event.id) {
        fiberCtx.stash({ ...params, lastEventId: event.id });
      }
    }

    if (!signal.aborted && this.state.observation) {
      this.updateObservation({
        ...this.state.observation,
        status: 'completed',
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/*  SessionRegistry — singleton DO that tracks active session IDs      */
/* ------------------------------------------------------------------ */

export class SessionRegistry extends Agent<Env, { sessions: string[] }> {
  initialState = { sessions: [] as string[] };

  async add(sessionId: string): Promise<void> {
    if (!this.state.sessions.includes(sessionId)) {
      this.setState({ sessions: [...this.state.sessions, sessionId] });
    }
  }

  async remove(sessionId: string): Promise<void> {
    this.setState({
      sessions: this.state.sessions.filter((s) => s !== sessionId),
    });
  }

  async list(): Promise<string[]> {
    return this.state.sessions;
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

    const isWsUpgrade = request.headers.get('Upgrade') === 'websocket';

    if (env.API_KEY && !isWsUpgrade) {
      const auth = request.headers.get('Authorization') ?? '';
      if (!timingSafeEqual(auth, `Bearer ${env.API_KEY}`)) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    try {
      if (request.method === 'POST' && path === '/observe') {
        const body = await request.json();
        if (!validateObservationParams(body)) {
          return Response.json({ error: 'sessionId, streamUrl, and headers are required' }, { status: 400 });
        }
        const stub = env.SESSION_OBSERVER.getByName(body.sessionId);
        await stub.startObserving(body);
        const registry = env.SESSION_REGISTRY.getByName('global');
        await registry.add(body.sessionId);

        return new Response(null, { status: 204 });
      }

      if (request.method === 'DELETE' && path.startsWith('/observe/')) {
        const sessionId = decodeURIComponent(path.slice('/observe/'.length));
        const stub = env.SESSION_OBSERVER.getByName(sessionId);
        await stub.stopObserving();
        const registry = env.SESSION_REGISTRY.getByName('global');
        await registry.remove(sessionId);

        return new Response(null, { status: 204 });
      }

      if (request.method === 'GET' && path === '/active-sessions') {
        const registry = env.SESSION_REGISTRY.getByName('global');
        const sessionIds = await registry.list();

        return Response.json(sessionIds);
      }

      if (isWsUpgrade) {
        const sessionId = url.searchParams.get('sessionId');
        if (!sessionId) {
          return new Response('sessionId query parameter required', {
            status: 400,
          });
        }
        const stub = env.SESSION_OBSERVER.getByName(sessionId);

        return stub.fetch(request);
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      console.error('Worker request failed:', err);

      return new Response('Internal server error', { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
