import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fakeSocketIo = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;
  const create = () => {
    const handlers = new Map<string, Handler>();
    const managerHandlers = new Map<string, Handler>();

    return {
      handlers,
      managerHandlers,
      on: (event: string, handler: Handler) => handlers.set(event, handler),
      connect: () => {},
      disconnect: () => {},
      io: {
        opts: {} as { query?: Record<string, string> },
        on: (event: string, handler: Handler) => managerHandlers.set(event, handler),
        reconnectionDelayMax: () => 10,
      },
    };
  };

  return { create, current: undefined as ReturnType<typeof create> | undefined };
});

vi.mock('socket.io-client', () => ({
  __esModule: true,
  default: vi.fn((_url: string, options: { query: Record<string, string> }) => {
    const socket = fakeSocketIo.create();
    socket.io.opts.query = options.query;
    socket.connect = vi.fn();
    fakeSocketIo.current = socket;

    return socket;
  }),
}));

import { Novu } from '../novu';
import type { NovuOptions } from '../types';
import { NovuError } from '../utils/errors';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const TOKEN_ENDPOINT = 'https://customer.example.com/api/novu-token';

const toBase64Url = (value: object) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const claimsOf = (token: string) => {
  const binary = atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));

  return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
};

const createJwt = (claims: Record<string, unknown>, expiresAtMs: number) =>
  `${toBase64Url({ alg: 'HS256', typ: 'JWT' })}.${toBase64Url({ ...claims, exp: Math.floor(expiresAtMs / 1000) })}.sig`;

const expOf = (token: string) => JSON.parse(atob(token.split('.')[1])).exp * 1000;

class FakeWebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;
  readyState = FakeWebSocket.CONNECTING;
  binaryType = 'blob';
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
    FakeWebSocket.instances.push(this);
    setTimeout(() => {
      if (this.readyState !== FakeWebSocket.CONNECTING) return;
      this.readyState = FakeWebSocket.OPEN;
      this.dispatchEvent(new Event('open'));
    }, 0);
  }

  send() {}

  close(code = 1000, reason = '') {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    setTimeout(() => this.dispatchEvent(Object.assign(new Event('close'), { code, reason, wasClean: true })), 0);
  }

  closeFromServer() {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatchEvent(Object.assign(new Event('close'), { code: 4001, reason: 'session expired', wasClean: true }));
  }
}

const wait = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

type SessionBody = {
  applicationIdentifier?: string;
  subscriberToken?: string;
  subscriber?: unknown;
  subscriberHash?: string;
  context?: unknown;
  contextHash?: string;
  defaultSchedule?: unknown;
};

const createFakeBackend = ({ subscriberId = 'user_1', contextKeys = ['tenant:org_1'] } = {}) => {
  let now = Date.now();
  const state = {
    /** The user whose cookie the token endpoint sees. */
    signedInUser: subscriberId,
    apiCalls: [] as Array<{ path: string; subscriberId: string }>,
    loginTokens: [] as string[],
    sessionTokens: [] as string[],
    revoked: new Set<string>(),
    sessionBodies: [] as SessionBody[],
    tokenRequests: [] as RequestInit[],
    apiRequests: [] as string[],
    tokenEndpointStatus: 200,
    sessionDelayMs: 0,
    loginTokenLifetimeMs: 10 * MINUTE_MS,
    /** How far the browser clock runs ahead of the server clock. */
    clientClockAheadMs: 0,
    /** Login tokens the session endpoint rejects as invalid (400), like a token signed with a rotated key. */
    invalidLoginTokens: new Set<string>(),
  };

  vi.spyOn(Date, 'now').mockImplementation(() => now + state.clientClockAheadMs);

  const json = (status: number, body: unknown) =>
    ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

  const mintLoginToken = (lifetimeMs = state.loginTokenLifetimeMs) => {
    const token = createJwt(
      { sub: state.signedInUser, aud: 'novu', n: state.loginTokens.length + 1 },
      now + lifetimeMs
    );
    state.loginTokens.push(token);

    return token;
  };

  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    if (url === TOKEN_ENDPOINT) {
      state.tokenRequests.push(init);
      if (state.tokenEndpointStatus !== 200) {
        return json(state.tokenEndpointStatus, { message: 'nope' });
      }
      const token = mintLoginToken();

      return json(200, { token, expiresAt: new Date(expOf(token)).toISOString() });
    }

    if (url.includes('/inbox/session')) {
      const body = JSON.parse(init.body as string) as SessionBody;
      state.sessionBodies.push(body);
      await wait(state.sessionDelayMs);
      const loginToken = body.subscriberToken;
      if (loginToken && state.invalidLoginTokens.has(loginToken)) {
        return json(400, { statusCode: 400, message: 'Please provide a valid HMAC hash' });
      }
      if (!loginToken || now >= expOf(loginToken)) {
        return json(401, { statusCode: 401, error: 'subscriber_token_expired' });
      }
      const token = createJwt(
        {
          subscriberId: claimsOf(loginToken).sub,
          contextKeys,
          iat: Math.floor(now / 1000),
          n: state.sessionTokens.length + 1,
        },
        expOf(loginToken)
      );
      state.sessionTokens.push(token);

      return json(200, { data: { token, contextKeys, unreadCount: { total: 0, severity: {} } } });
    }

    const token = ((init.headers as Record<string, string>).Authorization ?? '').replace(/^Bearer /, '');
    state.apiRequests.push(token);
    if (!state.sessionTokens.includes(token) || state.revoked.has(token) || now >= expOf(token)) {
      return json(401, { message: 'Unauthorized', statusCode: 401 });
    }
    const caller = claimsOf(token).subscriberId as string;
    state.apiCalls.push({ path: new URL(url).pathname, subscriberId: caller });

    return json(200, { data: [{ id: `${caller}_notification` }], hasMore: false, filter: {} });
  });
  vi.stubGlobal('fetch', fetchMock);

  return {
    state,
    mintLoginToken,
    advanceTime: (ms: number) => {
      now += ms;
    },
  };
};

const createNovu = (options: Partial<NovuOptions> = {}) =>
  new Novu({
    applicationIdentifier: 'app',
    tokenEndpoint: TOKEN_ENDPOINT,
    defaultSchedule: { isEnabled: true },
    useCache: false,
    socketOptions: { minReconnectionDelay: 10, maxReconnectionDelay: 20 },
    ...options,
  } as NovuOptions);

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('signing in with a token endpoint', () => {
  it('exchanges a token from the endpoint for a session, without sending a subscriber', async () => {
    const backend = createFakeBackend();
    const novu = createNovu();

    const { error } = await novu.notifications.list();

    expect(error).toBeUndefined();
    expect(backend.state.tokenRequests).toHaveLength(1);
    expect(backend.state.tokenRequests[0]).toMatchObject({ method: 'POST', credentials: 'include', body: '{}' });
    expect(backend.state.sessionBodies).toEqual([
      {
        applicationIdentifier: 'app',
        subscriberToken: backend.state.loginTokens[0],
        defaultSchedule: { isEnabled: true },
      },
    ]);
    expect(backend.state.apiRequests).toEqual([backend.state.sessionTokens[0]]);
  });

  it('reads the subscriber and context from the session the token opened', async () => {
    createFakeBackend({ subscriberId: 'user_42', contextKeys: ['tenant:org_9', 'app:web'] });
    const novu = createNovu();
    expect(novu.subscriberId).toBeUndefined();

    await novu.notifications.list();

    expect(novu.subscriberId).toBe('user_42');
    expect(novu.contextKey).toBe('app:web,tenant:org_9');
  });

  it('reads a subscriberId with non-ASCII characters', async () => {
    createFakeBackend({ subscriberId: 'józef' });
    const novu = createNovu();

    await novu.notifications.list();

    expect(novu.subscriberId).toBe('józef');
  });

  it('calls a getToken callback instead of an endpoint', async () => {
    const backend = createFakeBackend();
    const getToken = vi.fn(async () => backend.mintLoginToken());
    const novu = createNovu({ tokenEndpoint: undefined, getToken });

    const { error } = await novu.notifications.list();

    expect(error).toBeUndefined();
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(backend.state.sessionBodies[0].subscriberToken).toBe(backend.state.loginTokens[0]);
  });

  it('uses the server-rendered initial token for the first session without calling the endpoint', async () => {
    const backend = createFakeBackend();
    const initialToken = backend.mintLoginToken();
    const novu = createNovu({ initialToken });

    await novu.notifications.list();

    expect(backend.state.tokenRequests).toHaveLength(0);
    expect(backend.state.sessionBodies[0].subscriberToken).toBe(initialToken);
  });

  it('skips an initial token that already expired', async () => {
    const backend = createFakeBackend();
    const initialToken = backend.mintLoginToken(-MINUTE_MS);
    const novu = createNovu({ initialToken });

    const { error } = await novu.notifications.list();

    expect(error).toBeUndefined();
    expect(backend.state.tokenRequests).toHaveLength(1);
    expect(backend.state.sessionBodies.map((body) => body.subscriberToken)).toEqual([backend.state.loginTokens[1]]);
  });

  it('falls back to the endpoint when the server rejects the initial token', async () => {
    const backend = createFakeBackend();
    const initialToken = backend.mintLoginToken(5 * MINUTE_MS);
    const novu = createNovu({ initialToken });
    backend.advanceTime(6 * MINUTE_MS);
    vi.spyOn(Date, 'now').mockImplementation(() => expOf(initialToken) - 5 * MINUTE_MS);

    const { error } = await novu.notifications.list();

    expect(error).toBeUndefined();
    expect(backend.state.sessionBodies.map((body) => body.subscriberToken)).toEqual([
      initialToken,
      backend.state.loginTokens[1],
    ]);
  });

  it('falls back to the endpoint once when the server rejects the initial token as invalid', async () => {
    const backend = createFakeBackend();
    const initialToken = backend.mintLoginToken();
    backend.state.invalidLoginTokens.add(initialToken);
    const novu = createNovu({ initialToken });

    const { error } = await novu.notifications.list();

    expect(error).toBeUndefined();
    expect(backend.state.tokenRequests).toHaveLength(1);
    expect(backend.state.sessionBodies.map((body) => body.subscriberToken)).toEqual([
      initialToken,
      backend.state.loginTokens[1],
    ]);
  });
});

describe('keeping the session alive', () => {
  it('gets a new token a minute before the session expires, before sending the next request', async () => {
    const backend = createFakeBackend();
    const novu = createNovu();
    await novu.notifications.list();

    backend.advanceTime(9 * MINUTE_MS + 30 * 1000);
    const { error } = await novu.notifications.list();

    expect(error).toBeUndefined();
    expect(backend.state.tokenRequests).toHaveLength(2);
    expect(backend.state.sessionBodies[1]).toEqual({
      applicationIdentifier: 'app',
      subscriberToken: backend.state.loginTokens[1],
    });
    expect(backend.state.apiRequests).toEqual([backend.state.sessionTokens[0], backend.state.sessionTokens[1]]);
  });

  it('shares one refresh between concurrent requests', async () => {
    const backend = createFakeBackend();
    const novu = createNovu();
    await novu.notifications.list();

    backend.state.sessionDelayMs = 30;
    backend.advanceTime(HOUR_MS);
    const results = await Promise.all([
      novu.notifications.list(),
      novu.notifications.list(),
      novu.notifications.list(),
    ]);

    expect(results.map((result) => result.error)).toEqual([undefined, undefined, undefined]);
    expect(backend.state.tokenRequests).toHaveLength(2);
    expect(backend.state.sessionBodies).toHaveLength(2);
  });

  it('gets a new token and retries once when the server rejects a token the browser thinks is valid', async () => {
    const backend = createFakeBackend();
    const novu = createNovu();
    await novu.notifications.list();
    backend.state.revoked.add(backend.state.sessionTokens[0]);

    const { error } = await novu.notifications.list();

    expect(error).toBeUndefined();
    expect(backend.state.tokenRequests).toHaveLength(2);
    expect(backend.state.apiRequests).toEqual([
      backend.state.sessionTokens[0],
      backend.state.sessionTokens[0],
      backend.state.sessionTokens[1],
    ]);
  });

  it('returns a second 401 to the caller instead of refreshing again', async () => {
    const backend = createFakeBackend();
    const novu = createNovu();
    await novu.notifications.list();
    const revokeEverything = { has: () => true } as unknown as Set<string>;
    backend.state.revoked = revokeEverything;

    const { error } = await novu.notifications.list();

    expect(error).toBeDefined();
    expect(backend.state.tokenRequests).toHaveLength(2);
    expect(backend.state.apiRequests).toHaveLength(3);
  });
});

describe('refreshing before expiry on the server clock', () => {
  it('fetches at most one token when the browser clock runs 10 minutes ahead of the server', async () => {
    const backend = createFakeBackend();
    backend.state.loginTokenLifetimeMs = 5 * MINUTE_MS;
    backend.state.clientClockAheadMs = 10 * MINUTE_MS;
    const novu = createNovu();

    for (let i = 0; i < 5; i += 1) {
      const { error } = await novu.notifications.list();
      expect(error).toBeUndefined();
      backend.advanceTime(10 * 1000);
    }

    expect(backend.state.tokenRequests.length).toBeLessThanOrEqual(1);
  });

  it('does not fetch a token per call with 15-second tokens', async () => {
    const backend = createFakeBackend();
    backend.state.loginTokenLifetimeMs = 15 * 1000;
    const novu = createNovu();

    for (let i = 0; i < 5; i += 1) {
      const { error } = await novu.notifications.list();
      expect(error).toBeUndefined();
      backend.advanceTime(1000);
    }

    expect(backend.state.tokenRequests).toHaveLength(1);
  });
});

describe('when the token source fails', () => {
  it('returns an error from calls when the endpoint answers non-2xx, and does not retry', async () => {
    const backend = createFakeBackend();
    backend.state.tokenEndpointStatus = 500;
    const novu = createNovu();
    const sessionErrors: unknown[] = [];
    novu.on('session.initialize.resolved', ({ error }) => error && sessionErrors.push(error));

    const first = await novu.notifications.list();
    const second = await novu.notifications.list();
    await wait();

    expect(first.error).toBeDefined();
    expect(second.error).toBeDefined();
    expect(sessionErrors).toHaveLength(1);
    expect(backend.state.tokenRequests).toHaveLength(1);
    expect(backend.state.sessionBodies).toHaveLength(0);
  });

  it('returns an error from calls when getToken throws', async () => {
    const backend = createFakeBackend();
    const getToken = vi.fn(async () => {
      throw new Error('signed out');
    });
    const novu = createNovu({ tokenEndpoint: undefined, getToken });

    const { error } = await novu.notifications.list();
    await wait();

    expect(error).toBeDefined();
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(backend.state.sessionBodies).toHaveLength(0);
  });

  it('returns the 401 when the refresh fails, without looping', async () => {
    const backend = createFakeBackend();
    const novu = createNovu();
    await novu.notifications.list();

    backend.state.tokenEndpointStatus = 401;
    backend.advanceTime(HOUR_MS);
    const { error } = await novu.notifications.list();

    expect(error).toBeDefined();
    expect(backend.state.tokenRequests).toHaveLength(2);
    expect(backend.state.sessionBodies).toHaveLength(1);
  });
});

describe('when the token endpoint signs in another user', () => {
  const switchToBob = async () => {
    const backend = createFakeBackend({ subscriberId: 'alice' });
    const novu = createNovu({ useCache: true });
    await novu.socket.connect();
    await novu.notifications.list();
    await wait();
    backend.state.signedInUser = 'bob';

    return { backend, novu };
  };

  it('drops the previous user cached data and reconnects the socket as the new user after expiry', async () => {
    const { backend, novu } = await switchToBob();

    backend.advanceTime(10 * MINUTE_MS);
    await novu.notifications.count({});
    await wait();
    const { data } = await novu.notifications.list();

    expect(data?.notifications.map((notification) => notification.id)).toEqual(['bob_notification']);
    const sockets = FakeWebSocket.instances.filter((ws) => ws.readyState !== FakeWebSocket.CLOSED);
    expect(sockets.map((ws) => claimsOf(new URL(ws.url).searchParams.get('token')!).subscriberId)).toEqual(['bob']);

    await novu.socket.disconnect();
  });

  it('does not send a request started as the previous user after a refresh before expiry signed in the new user', async () => {
    const { backend, novu } = await switchToBob();
    backend.advanceTime(10 * MINUTE_MS);

    const { error } = await novu.notifications.readAll();

    expect(error).toBeInstanceOf(NovuError);
    expect(backend.state.apiCalls.filter((call) => call.path.endsWith('/notifications/read'))).toEqual([]);
    expect(novu.subscriberId).toBe('bob');

    await novu.socket.disconnect();
  });

  it('does not resend a request rejected for the previous user with the new user token', async () => {
    const { backend, novu } = await switchToBob();
    backend.state.revoked.add(backend.state.sessionTokens[0]);

    const { error } = await novu.notifications.readAll();

    expect(error).toBeDefined();
    expect(backend.state.apiCalls.filter((call) => call.path.endsWith('/notifications/read'))).toEqual([]);
    expect(novu.subscriberId).toBe('bob');

    await novu.socket.disconnect();
  });
});

describe('the realtime socket with a token source', () => {
  it('reconnects PartySocket with a new session after the server closes it at expiry', async () => {
    const backend = createFakeBackend();
    const novu = createNovu();
    await novu.socket.connect();
    await wait();
    expect(new URL(FakeWebSocket.instances[0].url).searchParams.get('token')).toBe(backend.state.sessionTokens[0]);

    backend.advanceTime(10 * MINUTE_MS);
    FakeWebSocket.instances[0].closeFromServer();
    await wait();

    expect(backend.state.tokenRequests).toHaveLength(2);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(new URL(FakeWebSocket.instances[1].url).searchParams.get('token')).toBe(backend.state.sessionTokens[1]);

    await novu.socket.disconnect();
  });

  it('reconnects socket.io with a new session after an io server disconnect at expiry', async () => {
    const backend = createFakeBackend();
    const novu = createNovu({ socketUrl: 'https://ws.self-hosted.example.com' });
    await novu.socket.connect();
    const socket = fakeSocketIo.current!;
    expect(socket.io.opts.query?.token).toBe(backend.state.sessionTokens[0]);

    backend.advanceTime(10 * MINUTE_MS);
    socket.handlers.get('disconnect')?.('io server disconnect');
    await wait();

    expect(backend.state.tokenRequests).toHaveLength(2);
    expect(socket.connect).toHaveBeenCalledTimes(1);
    expect(socket.io.opts.query?.token).toBe(backend.state.sessionTokens[1]);
  });
});

describe('several tabs waking up after the session expired', () => {
  it('refreshes only in tabs that make a request, once each', async () => {
    const backend = createFakeBackend();
    const tabs = [createNovu(), createNovu(), createNovu(), createNovu()];
    await Promise.all(tabs.map((tab) => tab.notifications.list()));
    expect(backend.state.tokenRequests).toHaveLength(4);

    backend.advanceTime(HOUR_MS);
    const [visible, other] = tabs;
    const results = await Promise.all([
      visible.notifications.list(),
      visible.notifications.list(),
      other.notifications.list(),
    ]);
    await wait();

    expect(results.map((result) => result.error)).toEqual([undefined, undefined, undefined]);
    expect(backend.state.tokenRequests).toHaveLength(6);
    expect(backend.state.sessionBodies).toHaveLength(6);
  });
});

describe('identity warnings', () => {
  it('warns once that subscriber props are ignored with a token source, and does not send them', async () => {
    const backend = createFakeBackend();
    const options = {
      subscriber: 'user_1',
      subscriberHash: 'hash',
      context: { tenant: 'org_1' },
    } as Partial<NovuOptions>;
    createNovu(options);
    const novu = createNovu(options);

    await novu.notifications.list();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('subscriber, context, subscriberHash');
    for (const body of backend.state.sessionBodies) {
      expect(body).not.toHaveProperty('subscriber');
      expect(body).not.toHaveProperty('subscriberHash');
      expect(body).not.toHaveProperty('context');
    }
  });

  it('warns once when a subscriber is opened without a hash or a token', () => {
    createFakeBackend();
    new Novu({ applicationIdentifier: 'app', subscriber: 'user_no_hash' });
    new Novu({ applicationIdentifier: 'app', subscriber: 'user_no_hash_2' });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('tokenEndpoint');
  });

  it('does not warn for a subscriber with a hash, keyless mode, or a token source alone', () => {
    createFakeBackend();
    new Novu({ applicationIdentifier: 'app', subscriber: 'user_1', subscriberHash: 'hash' });
    new Novu({});
    createNovu();

    expect(warn).not.toHaveBeenCalled();
  });

  it('refuses to change the subscriber or context with a token source', async () => {
    createFakeBackend();
    const novu = createNovu();

    await expect(novu.changeSubscriber({ subscriber: { subscriberId: 'other' } })).rejects.toBeInstanceOf(NovuError);
    await expect(novu.changeContext({ context: { tenant: 'org_2' } })).rejects.toBeInstanceOf(NovuError);
  });
});
