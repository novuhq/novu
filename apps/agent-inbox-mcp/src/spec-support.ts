import { vi } from 'vitest';
import { AGENT_INBOX_DASHBOARD_SECRET_HEADER } from './constants';
import type { Env } from './env';
import type { InboxMessage, InboxThread, InboxThreadView } from './inbox';
import type { Interaction } from './interactions';

export const ISSUER = 'https://clerk.example.test';
/** The Dashboard API, which every tool calls. */
export const AGENT_INBOX_API = 'https://agentinbox.example.test/api';
/** The Novu API, asked only for the account's key. */
export const NOVU_API = 'https://api.example.test';
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
    AGENT_INBOX_DASHBOARD_API_SECRET: 'shared-secret',
    AGENT_INBOX_API_URL: AGENT_INBOX_API,
    NOVU_API_URL: NOVU_API,
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
  /** Fields returned by POST /v1/inbox/messages. */
  createdInteraction?: Partial<Interaction>;
  /** Contact pages keyed by their `after` cursor (the first page uses an empty key). */
  contactPages?: Record<string, { data: StubContact[]; next: string | null }>;
  contactsById?: Record<string, StubContact>;
  /** Inbox list page returned by GET /v1/inbox. */
  inboxPage?: { data: InboxThread[]; next: string | null };
  /** Thread view returned by GET /v1/inbox/:conversationId. */
  inboxThread?: InboxThreadView;
  /** Thread returned after read/resolve. */
  inboxActionThread?: InboxThread;
  /** Override GET /v1/agent. `null` means 404 (no agent). */
  agent?: StubAgent | null;
  /** Override GET /v1/channels. */
  channels?: StubChannelLink[];
  /** Override GET /v1/operator. `null` means an empty body. */
  operator?: { subscriberId?: string } | null;
  /** Override GET /v1/inbox-address. */
  inboxAddressCheck?: StubAddressCheck;
  /** Clerk /oauth/userinfo email for the good-token user. */
  userEmail?: string;
  /** Error body for POST /v1/setup when set. */
  setupError?: { status: number; code?: string; message: string; suggestion?: string };
  /** GET /v1/channels fails with this instead of returning the channel list. */
  channelsError?: { status: number; message: string };
  /** POST /v1/contacts/verifications reports that a confirmed address is being replaced. */
  replacesVerifiedAddress?: boolean;
};

export type StubContact = {
  id: string;
  email?: string;
  emailVerification?: { address: string; status: 'unverified' | 'pending' | 'verified' };
  channels?: Array<{ via: string; status?: 'unverified' | 'pending' | 'verified'; address?: string }>;
};

export type StubAgent = {
  agentId: string;
  agentIdentifier: string;
  name: string;
};

export type StubChannelLink = {
  integration: { providerId: string; sharedInboundAddress?: string };
};

export type StubAddressCheck = {
  handle: string;
  available: boolean;
  suggestion?: string;
  domain: string;
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
    'interaction' in options ||
    'createdInteraction' in options ||
    'contactPages' in options ||
    'contactsById' in options ||
    'inboxPage' in options ||
    'inboxThread' in options ||
    'inboxActionThread' in options ||
    'agent' in options ||
    'channels' in options ||
    'operator' in options ||
    'inboxAddressCheck' in options ||
    'userEmail' in options ||
    'setupError' in options ||
    'channelsError' in options ||
    'replacesVerifiedAddress' in options
  );
}

function normalizeOptions(options: StubBackendsOptions | Partial<Interaction>): StubBackendsOptions {
  if (isStubBackendsOptions(options)) {
    return options;
  }

  return { interaction: options };
}

/** Who each test token belongs to. `user_2` signed in but has no Agent Inbox account. */
const USERS_BY_TOKEN: Record<string, string> = { 'good-token': 'user_1', 'newcomer-token': 'user_2' };

/** A call's path on the Dashboard API without its query, such as `/v1/inbox`, or `null` for a call elsewhere. */
function dashboardPathOf(url: string): string | null {
  return url.startsWith(`${AGENT_INBOX_API}/`) ? url.slice(AGENT_INBOX_API.length).split('?')[0] : null;
}

function answerAuth(url: string, headers: Headers, userEmail?: string): Response | null {
  if (url === `${ISSUER}/oauth/userinfo`) {
    const user = USERS_BY_TOKEN[headers.get('Authorization')?.replace(/^Bearer /, '') ?? ''];

    return user
      ? reply({ user_id: user, ...(user === 'user_1' && userEmail ? { email: userEmail } : {}) })
      : reply({}, 401);
  }

  if (url === `${NOVU_API}/v1/human/accounts/user_1/secret-key`) {
    return headers.get(AGENT_INBOX_DASHBOARD_SECRET_HEADER) === 'shared-secret'
      ? reply({ data: { secretKey: 'account-key' } })
      : reply({}, 401);
  }

  if (url === `${NOVU_API}/v1/human/accounts/user_2/secret-key`) {
    return reply({ message: 'Not found' }, 404);
  }

  return null;
}

type SetupStubState = {
  agent: StubAgent | null;
  channels: StubChannelLink[];
  operator: { subscriberId?: string } | null;
  inboxAddressCheck?: StubAddressCheck;
  setupError?: { status: number; code?: string; message: string; suggestion?: string };
  channelsError?: { status: number; message: string };
  contactsById: Record<string, StubContact>;
};

function answerSetup(url: string, method: string, body: unknown, state: SetupStubState): Response | null {
  const path = dashboardPathOf(url);
  if (!path) {
    return null;
  }

  if (path === '/v1/operator' && method === 'GET') {
    return reply({ data: state.operator ?? {} });
  }

  if (path === '/v1/agent' && method === 'GET') {
    return state.agent ? reply({ data: state.agent }) : reply({ message: 'Agent not found' }, 404);
  }

  if (path === '/v1/channels' && method === 'GET') {
    if (state.channelsError) {
      return reply({ message: state.channelsError.message }, state.channelsError.status);
    }

    return reply({ data: state.channels });
  }

  if (path === '/v1/inbox-address' && method === 'GET') {
    return answerInboxAddress(url, state.inboxAddressCheck);
  }

  if (path === '/v1/setup' && method === 'POST') {
    return answerCreateSetup(body, state);
  }

  return null;
}

function answerInboxAddress(url: string, check: StubAddressCheck | undefined): Response {
  const handle = new URL(url).searchParams.get('handle') ?? '';
  const resolved = check ?? { handle, available: true, domain: 'agentinbox.md' };

  return reply({ data: { ...resolved, handle: resolved.handle || handle } });
}

function answerCreateSetup(body: unknown, state: SetupStubState): Response {
  if (state.setupError) {
    return reply(
      {
        message: state.setupError.message,
        ...(state.setupError.code ? { code: state.setupError.code } : {}),
        ...(state.setupError.suggestion ? { suggestion: state.setupError.suggestion } : {}),
      },
      state.setupError.status
    );
  }

  const posted = body as { agentName?: string; inboxHandle?: string } | undefined;
  const handle = posted?.inboxHandle ?? 'atlas';
  const name = posted?.agentName?.trim() || state.agent?.name || 'Atlas';
  const operatorId = state.operator?.subscriberId ?? 'operator_1';
  state.agent = { agentId: state.agent?.agentId ?? 'agent_1', agentIdentifier: 'human-relay', name };
  state.channels = [
    { integration: { providerId: 'agent-email-inbox', sharedInboundAddress: `${handle}@agentinbox.md` } },
  ];
  state.operator = { subscriberId: operatorId };
  state.contactsById[operatorId] = state.contactsById[operatorId] ?? {
    id: operatorId,
    emailVerification: { address: 'ada@acme.co', status: 'unverified' },
  };

  return reply({
    data: {
      agentId: 'agent_1',
      agentIdentifier: 'human-relay',
      agentName: name,
      subscriberId: 'operator_1',
      emailAddress: `${handle}@agentinbox.md`,
    },
  });
}

function answerInbox(
  url: string,
  method: string,
  inboxPage: { data: InboxThread[]; next: string | null },
  inboxThread: InboxThreadView,
  inboxActionThread: InboxThread
): Response | null {
  const path = dashboardPathOf(url);
  // Messages share the `/v1/inbox` prefix but are answered in `answerInteractions`.
  if (!path?.startsWith('/v1/inbox') || /^\/v1\/inbox\/messages(?:\/|$)/.test(path)) {
    return null;
  }

  if (/^\/v1\/inbox\/[^/]+\/(?:read|resolve)$/.test(path) && method === 'POST') {
    return reply({ data: inboxActionThread });
  }

  if (/^\/v1\/inbox\/[^/]+$/.test(path) && method === 'GET') {
    return reply({ data: inboxThread });
  }

  if (path === '/v1/inbox' && method === 'GET') {
    return reply(inboxPage);
  }

  return null;
}

function answerInteractions(
  url: string,
  method: string,
  body: unknown,
  interaction: Partial<Interaction>,
  createdInteraction: Partial<Interaction>
): Response | null {
  if (url === `${AGENT_INBOX_API}/v1/inbox/messages` && method === 'POST') {
    const posted = body as { kind?: string; thread?: string } | undefined;
    if (posted?.thread) {
      return reply({
        data: {
          id: 'hi_thread_1',
          kind: posted.kind ?? 'ask',
          status: 'pending',
          threads: [{ id: posted.thread, unreadBefore: 2 }],
          ...createdInteraction,
        },
      });
    }

    return reply({
      data: { id: 'hi_1', kind: posted?.kind ?? 'approve', status: 'pending', ...createdInteraction },
    });
  }

  if (url === `${AGENT_INBOX_API}/v1/inbox/messages/hi_1`) {
    return reply({ data: { id: 'hi_1', kind: 'approve', ...interaction } });
  }

  if (url === `${AGENT_INBOX_API}/v1/inbox/messages/hi_thread_1`) {
    return reply({
      data: {
        id: 'hi_thread_1',
        kind: 'ask',
        status: 'answered',
        response: { type: 'text', text: 'Sure', respondedBy: 'Pat' },
        ...interaction,
      },
    });
  }

  return null;
}

function answerContacts(
  url: string,
  method: string,
  contactPages: Record<string, { data: StubContact[]; next: string | null }>,
  contactsById: Record<string, StubContact>,
  body: unknown,
  replacesVerifiedAddress: boolean
): Response | null {
  const path = dashboardPathOf(url);
  if (!path?.startsWith('/v1/contacts')) {
    return null;
  }

  if (path === '/v1/contacts/verifications' && method === 'POST') {
    const posted = body as { address?: string; subscriberId?: string } | undefined;
    if (posted?.subscriberId && posted.address) {
      contactsById[posted.subscriberId] = {
        ...(contactsById[posted.subscriberId] ?? { id: posted.subscriberId }),
        emailVerification: { address: posted.address, status: 'pending' },
      };
    }

    return reply({
      data: {
        address: posted?.address ?? 'masked',
        requestedAt: 'now',
        ...(replacesVerifiedAddress ? { replacesVerifiedAddress: true } : {}),
      },
    });
  }

  if (path === '/v1/contacts/invites' && method === 'POST') {
    return reply({ data: { url: 'https://agentinbox.example.test/invite/inv_1', expiresAt: '2026-10-27T00:00:00Z' } });
  }

  if (method !== 'GET') {
    return null;
  }

  return answerContactGet(url, path, contactPages, contactsById);
}

function answerContactGet(
  url: string,
  path: string,
  contactPages: Record<string, { data: StubContact[]; next: string | null }>,
  contactsById: Record<string, StubContact>
): Response {
  const id = path.slice('/v1/contacts/'.length);
  if (path.startsWith('/v1/contacts/') && id) {
    return answerOneContact(contactsById[decodeURIComponent(id)]);
  }

  const subscriberId = new URL(url).searchParams.get('subscriberId');
  if (subscriberId) {
    const contact = contactsById[subscriberId];

    return reply({ data: contact ? [contact] : [], next: null });
  }

  return reply(contactPages[new URL(url).searchParams.get('after') ?? ''] ?? { data: [], next: null });
}

/** The single-contact endpoint returns channels, not `emailVerification`. The list does. */
function answerOneContact(contact: StubContact | undefined): Response {
  if (!contact) {
    return reply({ message: 'Contact not found' }, 404);
  }

  return reply({
    data: {
      id: contact.id,
      ...(contact.email ? { email: contact.email } : {}),
      ...(contact.channels ? { channels: contact.channels } : {}),
    },
  });
}

/**
 * Answers the calls the Worker makes: Clerk for who the token is, the Novu API for the account's key, and the
 * Dashboard API for everything else. A call anywhere else gets a 500, so a tool that strays fails its test.
 */
export function stubBackends(options: StubBackendsOptions | Partial<Interaction> = {}) {
  const opts = normalizeOptions(options);
  const interaction = opts.interaction ?? { status: 'approved' };
  const createdInteraction = opts.createdInteraction ?? {};
  const contactPages = opts.contactPages ?? { '': { data: [], next: null } };
  const contactsById = opts.contactsById ?? {};
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
  const setupState = {
    agent:
      opts.agent === undefined
        ? ({ agentId: 'agent_1', agentIdentifier: 'human-relay', name: 'Atlas' } satisfies StubAgent)
        : opts.agent,
    channels:
      opts.channels ??
      ([
        { integration: { providerId: 'agent-email-inbox', sharedInboundAddress: 'atlas@agentinbox.md' } },
      ] satisfies StubChannelLink[]),
    operator: opts.operator === undefined ? { subscriberId: 'operator_1' } : opts.operator,
    inboxAddressCheck: opts.inboxAddressCheck,
    setupError: opts.setupError,
    channelsError: opts.channelsError,
    contactsById,
  };

  if (opts.agent !== null && !contactsById.operator_1 && setupState.operator?.subscriberId) {
    contactsById[setupState.operator.subscriberId] = contactsById[setupState.operator.subscriberId] ?? {
      id: setupState.operator.subscriberId,
      emailVerification: { address: 'ada@acme.co', status: 'verified' },
    };
  }

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
        answerAuth(url, headers, opts.userEmail) ??
        answerSetup(url, method, body, setupState) ??
        answerInbox(url, method, inboxPage, inboxThread, inboxActionThread) ??
        answerContacts(url, method, contactPages, contactsById, body, opts.replacesVerifiedAddress === true) ??
        answerInteractions(url, method, body, interaction, createdInteraction) ??
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
