import { setSocketStatus } from './socket-status';

export type DebugEventSource = 'http' | 'ws' | 'sdk';

export type DebugEvent = {
  id: string;
  ts: number;
  source: DebugEventSource;
  name: string;
  payload?: unknown;
};

let seq = 0;

export function createDebugEvent(event: Omit<DebugEvent, 'id' | 'ts'> & { ts?: number }): DebugEvent {
  seq += 1;
  return {
    id: `${Date.now()}-${seq}`,
    ts: event.ts ?? Date.now(),
    source: event.source,
    name: event.name,
    payload: event.payload,
  };
}

export const SDK_DEBUG_EVENTS = [
  'session.initialize.pending',
  'session.initialize.resolved',
  'socket.connect.pending',
  'socket.connect.resolved',
] as const;

/**
 * Pub/sub with a small buffer so network events captured before the
 * inspector mounts (session init fires very early) are not lost.
 */
type Listener = (event: DebugEvent) => void;

const listeners = new Set<Listener>();
const buffer: DebugEvent[] = [];
const BUFFER_LIMIT = 100;

export function emitDebugEvent(event: Omit<DebugEvent, 'id' | 'ts'>): void {
  const full = createDebugEvent(event);

  if (listeners.size === 0) {
    buffer.push(full);
    if (buffer.length > BUFFER_LIMIT) buffer.shift();
    return;
  }

  listeners.forEach((listener) => listener(full));
}

export function subscribeDebugEvents(listener: Listener): () => void {
  listeners.add(listener);
  buffer.splice(0).forEach((event) => listener(event));
  return () => {
    listeners.delete(listener);
  };
}

/** Truncate huge payloads so a single frame cannot blow up the panel. */
function sanitize(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value.length > 4000) return `${value.slice(0, 4000)}… (${value.length} chars)`;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function shortPath(url: string): string {
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

function bodyOf(body: BodyInit | null | undefined): unknown {
  if (body == null) return undefined;
  if (typeof body === 'string') return sanitize(body);
  return `<${body.constructor?.name ?? typeof body}>`;
}

/**
 * Patch window.fetch and window.WebSocket so every real network exchange
 * with the Novu API / socket worker shows up in the inspector. Traffic to
 * other hosts (Next.js dev server, HMR socket) is passed through untouched.
 */
export function installNetworkInspector(watchedUrls: string[]): void {
  if (typeof window === 'undefined') return;

  const marker = window as unknown as { __novuNetworkInspector?: boolean };
  if (marker.__novuNetworkInspector) return;
  marker.__novuNetworkInspector = true;

  const watchedHosts = new Set(
    watchedUrls
      .map((url) => {
        try {
          return new URL(url).host;
        } catch {
          return null;
        }
      })
      .filter((host): host is string => Boolean(host))
  );

  const isWatched = (url: string): boolean => {
    try {
      return watchedHosts.has(new URL(url, window.location.href).host);
    } catch {
      return false;
    }
  };

  // --- fetch ---
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (!isWatched(url)) return originalFetch(input, init);

    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const path = shortPath(url);
    const startedAt = performance.now();
    const requestBody = bodyOf(init?.body);

    try {
      const response = await originalFetch(input, init);
      const durationMs = Math.round(performance.now() - startedAt);

      let responseBody: unknown;
      try {
        responseBody = sanitize(await response.clone().text());
      } catch {
        responseBody = '<unreadable>';
      }

      emitDebugEvent({
        source: 'http',
        name: `${method} ${path} → ${response.status}`,
        payload: {
          method,
          url,
          status: response.status,
          durationMs,
          ...(requestBody !== undefined ? { requestBody } : {}),
          responseBody,
        },
      });

      return response;
    } catch (error) {
      emitDebugEvent({
        source: 'http',
        name: `${method} ${path} → network error`,
        payload: {
          method,
          url,
          durationMs: Math.round(performance.now() - startedAt),
          ...(requestBody !== undefined ? { requestBody } : {}),
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  };

  // --- WebSocket ---
  const OriginalWebSocket = window.WebSocket;

  const PatchedWebSocket = function (this: WebSocket, url: string | URL, protocols?: string | string[]) {
    const socket = protocols === undefined ? new OriginalWebSocket(url) : new OriginalWebSocket(url, protocols);

    const urlString = String(url);
    if (!isWatched(urlString)) return socket;

    const path = shortPath(urlString);

    setSocketStatus('connecting');
    emitDebugEvent({ source: 'ws', name: `connecting ${path}`, payload: { url: urlString } });

    socket.addEventListener('open', () => {
      setSocketStatus('online');
      emitDebugEvent({ source: 'ws', name: `open ${path}`, payload: { url: urlString } });
    });

    socket.addEventListener('message', (event) => {
      emitDebugEvent({
        source: 'ws',
        name: '⇣ message',
        payload: typeof event.data === 'string' ? sanitize(event.data) : `<${typeof event.data}>`,
      });
    });

    socket.addEventListener('error', () => {
      setSocketStatus('offline');
      emitDebugEvent({ source: 'ws', name: `error ${path}`, payload: { url: urlString } });
    });

    socket.addEventListener('close', (event) => {
      setSocketStatus('offline');
      emitDebugEvent({
        source: 'ws',
        name: `close ${path}`,
        payload: { code: event.code, reason: event.reason || undefined, wasClean: event.wasClean },
      });
    });

    const originalSend = socket.send.bind(socket);
    socket.send = (data: Parameters<WebSocket['send']>[0]) => {
      emitDebugEvent({
        source: 'ws',
        name: '⇡ send',
        payload: typeof data === 'string' ? sanitize(data) : `<${typeof data}>`,
      });
      originalSend(data);
    };

    return socket;
  } as unknown as typeof WebSocket;

  PatchedWebSocket.prototype = OriginalWebSocket.prototype;
  Object.defineProperties(PatchedWebSocket, {
    CONNECTING: { value: OriginalWebSocket.CONNECTING },
    OPEN: { value: OriginalWebSocket.OPEN },
    CLOSING: { value: OriginalWebSocket.CLOSING },
    CLOSED: { value: OriginalWebSocket.CLOSED },
  });

  window.WebSocket = PatchedWebSocket;
}
