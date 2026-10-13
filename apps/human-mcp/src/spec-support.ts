import { vi } from 'vitest';
import type { Env } from './env';
import type { InboxMessage, InboxThread, InboxThreadView } from './inbox';
import type { Interaction } from './interactions';

export const ISSUER = 'https://clerk.example.test';
export const API = 'https://api.example.test';
export const API_EU = 'https://eu.api.example.test';
export const ORIGIN = 'https://mcp.example.test';

type FakeKv = {
  values: Map<string, string>;
  puts: Array<{ key: string; expirationTtl?: number }>;
  get(key: string, type?: 'json'): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

export function fakeKv(): FakeKv {
  const values = new Map<string, string>();
  const puts: Array<{ key: string; expirationTtl?: number }> = [];

  return {
    values,
    puts,
    async get(key: string, type?: 'json') {
      const value = values.get(key) ?? null;

      return value !== null && type === 'json' ? JSON.parse(value) : value;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      puts.push({ key, expirationTtl: options?.expirationTtl });
      values.set(key, value);
    },
  };
}

function asConnections(kv: FakeKv): KVNamespace {
  // Test double: only get/put are exercised by the Worker.
  return kv as never;
}

function asExecutionContext(waitUntil: (work: Promise<unknown>) => void): ExecutionContext {
  return { waitUntil } as never;
}

export function setup(overrides: Partial<Env> = {}) {
  const kv = fakeKv();
  const env: Env = {
    CLERK_OAUTH_ISSUER: ISSUER,
    HUMAN_DASHBOARD_API_SECRET: 'shared-secret',
    NOVU_API_URL: API,
    NOVU_API_URL_EU: API_EU,
    CONNECTIONS: asConnections(kv),
    ...overrides,
  };
  const pending: Promise<unknown>[] = [];
  const ctx = asExecutionContext((work) => {
    pending.push(work);
  });

  return { env, ctx, kv, settle: () => Promise.all(pending) };
}

export type StubBackendsOptions = {
  interaction?: Partial<Interaction>;
  /** Inbox list page returned by GET /v1/human/inbox. */
  inboxPage?: { data: InboxThread[]; next: string | null };
  /** Thread view returned by GET /v1/human/inbox/:id. */
  inboxThread?: InboxThreadView;
  /** Thread returned after read/resolve. */
  inboxActionThread?: InboxThread;
};

export const DEFAULT_STRANGER_THREAD: InboxThread = {
  id: 'conv_stranger_1',
  channel: 'telegram',
  kind: 'stranger',
  people: [{ id: 'tg_99', name: 'Pat', kind: 'stranger' }],
  status: 'open',
  unreadCount: 2,
  lastMessage: { text: 'Hello agent', at: '2026-10-12T10:00:00.000Z', from: 'human' },
  isDirectMessage: true,
  lastActivityAt: '2026-10-12T10:00:00.000Z',
};

export const DEFAULT_MESSAGES: InboxMessage[] = [
  {
    id: 'msg_1',
    from: 'human',
    senderKind: 'stranger',
    senderName: 'Pat',
    text: 'Hello agent',
    at: '2026-10-12T10:00:00.000Z',
  },
];

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

type Call = { url: string; method: string; body?: unknown; headers: Headers };

function isStubBackendsOptions(options: StubBackendsOptions | Partial<Interaction>): options is StubBackendsOptions {
  return (
    'interaction' in options || 'inboxPage' in options || 'inboxThread' in options || 'inboxActionThread' in options
  );
}

function normalizeOptions(options: StubBackendsOptions | Partial<Interaction>): StubBackendsOptions {
  if (isStubBackendsOptions(options)) {
    return options;
  }

  return { interaction: options };
}

function answerAuth(url: string, headers: Headers): Response | null {
  if (url === `${ISSUER}/oauth/userinfo`) {
    return headers.get('Authorization') === 'Bearer good-token' ? reply({ user_id: 'user_1' }) : reply({}, 401);
  }

  if (url === `${API}/v1/human/accounts/user_1/secret-key`) {
    return reply({}, 404);
  }

  if (url === `${API_EU}/v1/human/accounts/user_1/secret-key`) {
    return headers.get('x-human-dashboard-secret') === 'shared-secret'
      ? reply({ data: { secretKey: 'account-key' } })
      : reply({}, 401);
  }

  if (url === `${API_EU}/v1/human/operator`) {
    return reply({ data: { subscriberId: 'operator_1' } });
  }

  return null;
}

function answerInbox(
  url: string,
  method: string,
  inboxPage: { data: InboxThread[]; next: string | null },
  inboxThread: InboxThreadView,
  inboxActionThread: InboxThread
): Response | null {
  if (!url.startsWith(`${API_EU}/v1/human/inbox`)) {
    return null;
  }

  if (url.startsWith(`${API_EU}/v1/human/inbox/`) && method === 'POST') {
    return reply({ data: inboxActionThread });
  }

  if (url.startsWith(`${API_EU}/v1/human/inbox/`) && method === 'GET') {
    return reply({ data: inboxThread });
  }

  if (method === 'GET') {
    return reply(inboxPage);
  }

  return null;
}

function answerInteractions(
  url: string,
  method: string,
  body: unknown,
  interaction: Partial<Interaction>
): Response | null {
  if (url === `${API_EU}/v1/human/interactions` && method === 'POST') {
    const posted = body as { thread?: string } | undefined;
    if (posted?.thread) {
      return reply({
        data: {
          id: 'hi_thread_1',
          kind: 'ask',
          status: 'pending',
          threads: [{ id: posted.thread, unreadBefore: 2 }],
        },
      });
    }

    return reply({ data: { id: 'hi_1', kind: 'approve', status: 'pending' } });
  }

  if (url === `${API_EU}/v1/human/interactions/hi_1`) {
    return reply({ data: { id: 'hi_1', kind: 'approve', ...interaction } });
  }

  if (url === `${API_EU}/v1/human/interactions/hi_thread_1`) {
    return reply({
      data: {
        id: 'hi_thread_1',
        kind: 'ask',
        status: 'answered',
        response: { type: 'text', text: 'Sure', respondedBy: 'Pat' },
        threads: [{ id: 'conv_stranger_1', unreadBefore: 2 }],
        ...interaction,
      },
    });
  }

  return null;
}

/** Answers the calls the Worker makes: Clerk for who the token is, the API for everything else. */
export function stubBackends(options: StubBackendsOptions | Partial<Interaction> = {}) {
  const opts = normalizeOptions(options);
  const interaction = opts.interaction ?? { status: 'approved' };
  const inboxPage = opts.inboxPage ?? { data: [DEFAULT_STRANGER_THREAD], next: null };
  const inboxThread =
    opts.inboxThread ??
    ({
      thread: DEFAULT_STRANGER_THREAD,
      messages: DEFAULT_MESSAGES,
      hasMore: false,
    } satisfies InboxThreadView);
  const inboxActionThread = opts.inboxActionThread ?? {
    ...DEFAULT_STRANGER_THREAD,
    unreadCount: 0,
    status: 'resolved' as const,
  };

  const calls: Call[] = [];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(input);
      const headers = new Headers(init.headers);
      const method = init.method ?? 'GET';
      const body = init.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, method, body, headers });

      return (
        answerAuth(url, headers) ??
        answerInbox(url, method, inboxPage, inboxThread, inboxActionThread) ??
        answerInteractions(url, method, body, interaction) ??
        reply({ message: 'not stubbed' }, 500)
      );
    })
  );

  return calls;
}

export function rpc(method: string, params: unknown, token: string | null = 'good-token'): Request {
  return new Request(ORIGIN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
}

export const INITIALIZE = {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'claude-ai', version: '1' },
};
