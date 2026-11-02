import { vi } from 'vitest';
import { AGENT_INBOX_DASHBOARD_SECRET_HEADER } from './constants';
import type { Env } from './env';
import type { InboxMessage, InboxThread, InboxThreadView } from './inbox';
import type { Interaction } from './interactions';

export const ISSUER = 'https://clerk.example.test';
/** The Dashboard API, which every tool calls. */
export const AGENT_INBOX_API = 'https://agentinbox.example.test/api';
/** The Novu API, asked to open an account and to read its key. */
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
  /** POST /v1/human/accounts fails with this status instead of opening the account. */
  accountCreateStatus?: number;
  /** Override GET /v1/channels/apps. */
  channelApps?: StubChannelApp[];
  /** The integrations, by identifier, the operator has a channel endpoint on. */
  connectedApps?: string[];
  /** The integrations, by identifier, that have a saved bot token or Slack app. */
  appsWithCredentials?: string[];
  /** How many checks still see no credentials, as while the setup page is saving them. */
  checksBeforeSaved?: number;
  /** Channel calls that fail, keyed like `POST /v1/channels`. */
  channelFailures?: Record<string, StubFailure>;
};

export type StubFailure = { status: number; message: string };

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
  integration: {
    _id?: string;
    identifier?: string;
    providerId: string;
    active?: boolean;
    sharedInboundAddress?: string;
  };
};

/** An integration, as GET /v1/channels/apps lists it. */
export type StubChannelApp = {
  _id: string;
  identifier: string;
  providerId: string;
  channel: string;
  active?: boolean;
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
    'replacesVerifiedAddress' in options ||
    'accountCreateStatus' in options ||
    'channelApps' in options ||
    'connectedApps' in options ||
    'appsWithCredentials' in options ||
    'checksBeforeSaved' in options ||
    'channelFailures' in options
  );
}

function normalizeOptions(options: StubBackendsOptions | Partial<Interaction>): StubBackendsOptions {
  if (isStubBackendsOptions(options)) {
    return options;
  }

  return { interaction: options };
}

/**
 * Who each test token belongs to. `user_2` signed in but has no Agent Inbox account. `grok-bot-token` and
 * `cursor-editor-token` are `user_1`'s too, issued to the sign-in apps of `SIGN_IN_APPS`.
 */
const USERS_BY_TOKEN: Record<string, string> = {
  'good-token': 'user_1',
  'newcomer-token': 'user_2',
  'grok-bot-token': 'user_1',
  'cursor-editor-token': 'user_1',
};

/** The Agent Inbox Clerk app's secret key, which the Clerk Backend API answers to. */
export const CLERK_SECRET = 'clerk-secret';
const CLERK_API = 'https://api.clerk.com/v1';

/**
 * The sign-in app each token was issued to, and where Clerk returns its sign-ins: one made in Cursor's cloud,
 * as Grok Bot's is, and the Cursor editor's.
 */
const SIGN_IN_APPS: Record<string, { clientId: string; redirectUris: string[] }> = {
  'grok-bot-token': {
    clientId: 'client_cursor_cloud',
    redirectUris: ['http://localhost:8787/callback', 'https://www.cursor.com/agents/mcp/oauth/callback'],
  },
  'cursor-editor-token': {
    clientId: 'client_cursor_editor',
    redirectUris: [
      'cursor://anysphere.cursor-mcp/oauth/callback',
      'http://localhost:8787/callback',
      'https://www.cursor.com/agents/mcp/oauth/callback',
    ],
  },
};

/** The Clerk Backend API: which sign-in app a token was issued to, and an app found by its client id. */
function answerClerk(url: string, method: string, headers: Headers, body: unknown): Response {
  if (headers.get('Authorization') !== `Bearer ${CLERK_SECRET}`) {
    return reply({}, 401);
  }

  if (url === `${CLERK_API}/oauth_applications/access_tokens/verify` && method === 'POST') {
    const app = SIGN_IN_APPS[(body as { access_token?: string } | undefined)?.access_token ?? ''];

    return app
      ? reply({ object: 'clerk_idp_oauth_access_token', client_id: app.clientId, subject: 'user_1' })
      : reply({ errors: [{ code: 'oauth_access_token_not_found' }] }, 404);
  }

  if (url.startsWith(`${CLERK_API}/oauth_applications?`) && method === 'GET') {
    const clientId = new URL(url).searchParams.get('name_query');
    const apps = Object.values(SIGN_IN_APPS).filter((app) => app.clientId === clientId);

    return reply({
      data: apps.map((app) => ({ client_id: app.clientId, name: 'Cursor', redirect_uris: app.redirectUris })),
      total_count: apps.length,
    });
  }

  return reply({ message: 'not stubbed' }, 500);
}

/** A call's path on the Dashboard API without its query, such as `/v1/inbox`, or `null` for a call elsewhere. */
function dashboardPathOf(url: string): string | null {
  return url.startsWith(`${AGENT_INBOX_API}/`) ? url.slice(AGENT_INBOX_API.length).split('?')[0] : null;
}

function answerAuth(
  url: string,
  method: string,
  headers: Headers,
  body: unknown,
  accounts: Set<string>,
  userEmail?: string,
  accountCreateStatus?: number
): Response | null {
  if (url.startsWith(`${CLERK_API}/`)) {
    return answerClerk(url, method, headers, body);
  }

  if (url === `${ISSUER}/oauth/userinfo`) {
    const user = USERS_BY_TOKEN[headers.get('Authorization')?.replace(/^Bearer /, '') ?? ''];

    return user
      ? reply({
          user_id: user,
          ...(user === 'user_1' && userEmail ? { email: userEmail } : {}),
          ...(user === 'user_2' ? { given_name: 'Ada', family_name: 'Lovelace' } : {}),
        })
      : reply({}, 401);
  }

  if (url === `${NOVU_API}/v1/human/accounts` && method === 'POST') {
    return answerEnsureAccount(headers, body, accounts, accountCreateStatus);
  }

  const accountId = secretKeyAccountId(url);
  if (!accountId) {
    return null;
  }

  if (headers.get(AGENT_INBOX_DASHBOARD_SECRET_HEADER) !== 'shared-secret') {
    return reply({}, 401);
  }

  return accounts.has(accountId) ? reply({ data: { secretKey: 'account-key' } }) : reply({ message: 'Not found' }, 404);
}

function secretKeyAccountId(url: string): string | null {
  const prefix = `${NOVU_API}/v1/human/accounts/`;
  const suffix = '/secret-key';
  if (!url.startsWith(prefix) || !url.endsWith(suffix)) {
    return null;
  }

  const id = url.slice(prefix.length, -suffix.length);
  if (!id || id.includes('/')) {
    return null;
  }

  return decodeURIComponent(id);
}

function answerEnsureAccount(
  headers: Headers,
  body: unknown,
  accounts: Set<string>,
  accountCreateStatus?: number
): Response {
  if (headers.get(AGENT_INBOX_DASHBOARD_SECRET_HEADER) !== 'shared-secret') {
    return reply({}, 401);
  }

  if (accountCreateStatus) {
    return reply({ message: 'Account setup failed' }, accountCreateStatus);
  }

  const humanUserId = (body as { humanUserId?: unknown } | undefined)?.humanUserId;
  if (typeof humanUserId !== 'string' || !humanUserId) {
    return reply({ message: 'humanUserId is required' }, 400);
  }

  accounts.add(humanUserId);

  return reply({ data: { organizationId: 'org_1', userId: 'novu_user_1', environmentId: 'env_1' } });
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

type ChannelStubState = {
  apps: StubChannelApp[];
  connectedApps: string[];
  appsWithCredentials: string[];
  checksBeforeSaved: number;
  failures: Record<string, StubFailure>;
};

/** Everything `channel_add` calls beside the agent, the operator and the list of what's linked. */
function answerChannels(
  url: string,
  method: string,
  body: unknown,
  setup: SetupStubState,
  state: ChannelStubState
): Response | null {
  const path = dashboardPathOf(url);
  if (!path?.startsWith('/v1/channels')) {
    return null;
  }

  const failure = state.failures[`${method} ${path}`];
  if (failure) {
    return reply({ message: failure.message }, failure.status);
  }

  if (method === 'GET') {
    return answerChannelReads(url, path, state);
  }

  return (
    answerChannelLinking(path, body, setup, state) ??
    answerSetupLink(path, setup) ??
    answerConnectLink(path, body, state)
  );
}

function answerChannelReads(url: string, path: string, state: ChannelStubState): Response | null {
  if (path === '/v1/channels/apps') {
    return reply({ data: state.apps });
  }

  if (path === '/v1/channels/links') {
    const identifier = new URL(url).searchParams.get('integrationIdentifier') ?? '';

    return reply({ data: state.connectedApps.includes(identifier) ? [{ identifier: 'endpoint_1' }] : [], next: null });
  }

  return null;
}

function answerChannelLinking(
  path: string,
  body: unknown,
  setup: SetupStubState,
  state: ChannelStubState
): Response | null {
  if (path === '/v1/channels/apps') {
    const { providerId, channel } = body as { providerId: string; channel: string };
    const created = { _id: 'app_created', identifier: `${providerId}-created`, providerId, channel };
    state.apps.push(created);

    return reply({ data: created }, 201);
  }

  if (path === '/v1/channels') {
    const { integrationIdentifier } = body as { integrationIdentifier: string };
    const app = state.apps.find((candidate) => candidate.identifier === integrationIdentifier);
    if (!app) {
      return reply({ message: `Integration with identifier "${integrationIdentifier}" was not found.` }, 404);
    }

    setup.channels.push({ integration: app });

    return reply({ data: { integration: app } }, 201);
  }

  return null;
}

/** As the API does: Telegram's route finds the integration by its identifier and Slack's by its `_id`, once linked. */
function answerSetupLink(path: string, setup: SetupStubState): Response | null {
  const match = /^\/v1\/channels\/apps\/([^/]+)\/(telegram-link|slack-setup-link)$/.exec(path);
  if (!match) {
    return null;
  }

  const [, appId, route] = match;
  const channel = route === 'telegram-link' ? 'telegram' : 'slack';
  const linked = setup.channels.some(({ integration }) =>
    channel === 'telegram' ? integration.identifier === appId : integration._id === appId
  );
  if (!linked) {
    return reply({ message: `Integration ${appId} not found` }, 404);
  }

  const token = `tok_${channel}`;

  return reply({
    data: {
      token,
      url: `https://dashboard.example.test/agents/${channel}/connect/${token}`,
      expiresAt: '2026-10-30T12:15:00.000Z',
    },
  });
}

function answerConnectLink(path: string, body: unknown, state: ChannelStubState): Response | null {
  const { integrationIdentifier } = (body ?? {}) as { integrationIdentifier?: string };

  if (path === '/v1/channels/telegram/link') {
    return credentialsReadable(integrationIdentifier, state)
      ? reply({
          data: {
            url: 'https://t.me/atlas_bot?start=code_1',
            providerMetadata: { botUsername: 'atlas_bot', expiresAt: '2026-10-30T12:10:00.000Z' },
          },
        })
      : reply(
          {
            message:
              'Bot Token is missing from integration credentials. Save the Bot Token and re-run the webhook configuration first.',
          },
          422
        );
  }

  if (path === '/v1/channels/slack/install-link') {
    return credentialsReadable(integrationIdentifier, state)
      ? reply({ data: { url: 'https://slack.com/oauth/v2/authorize?client_id=1' } }, 201)
      : reply({ message: 'Slack integration missing credentials ' }, 404);
  }

  return null;
}

function credentialsReadable(identifier: string | undefined, state: ChannelStubState): boolean {
  if (state.checksBeforeSaved > 0) {
    state.checksBeforeSaved -= 1;

    return false;
  }

  return state.appsWithCredentials.includes(identifier ?? '');
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
  const channelState = {
    apps: opts.channelApps ?? [],
    connectedApps: opts.connectedApps ?? [],
    appsWithCredentials: opts.appsWithCredentials ?? [],
    checksBeforeSaved: opts.checksBeforeSaved ?? 0,
    failures: opts.channelFailures ?? {},
  };

  if (opts.agent !== null && !contactsById.operator_1 && setupState.operator?.subscriberId) {
    contactsById[setupState.operator.subscriberId] = contactsById[setupState.operator.subscriberId] ?? {
      id: setupState.operator.subscriberId,
      emailVerification: { address: 'ada@acme.co', status: 'verified' },
    };
  }

  const calls: Call[] = [];
  const accounts = new Set<string>(['user_1']);

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(input);
      const headers = new Headers(init.headers);
      const method = init.method ?? 'GET';
      const body = init.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, method, body, headers });

      return (
        answerAuth(url, method, headers, body, accounts, opts.userEmail, opts.accountCreateStatus) ??
        answerSetup(url, method, body, setupState) ??
        answerChannels(url, method, body, setupState, channelState) ??
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

/** The same request, sent in the session `initialize` handed out, as an app sends every later one. */
export function inSession(request: Request, sessionId: string): Request {
  const headers = new Headers(request.headers);
  headers.set('Mcp-Session-Id', sessionId);

  return new Request(request, { headers });
}

/** The same request, from an app that names itself in its User-Agent. */
export function withUserAgent(request: Request, userAgent: string): Request {
  const headers = new Headers(request.headers);
  headers.set('User-Agent', userAgent);

  return new Request(request, { headers });
}

export const INITIALIZE = {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'claude-ai', version: '1' },
};
