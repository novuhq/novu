import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Novu } from '../novu';

const HOUR_MS = 60 * 60 * 1000;

const toBase64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const createJwt = (name: string, expiresAtMs: number) =>
  `${toBase64Url({ alg: 'HS256', typ: 'JWT' })}.${toBase64Url({ sub: name, exp: Math.floor(expiresAtMs / 1000) })}.sig`;

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

  /** Simulates the server dropping the connection. */
  drop() {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatchEvent(Object.assign(new Event('close'), { code: 1006, reason: '', wasClean: false }));
  }
}

const wait = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

const tokenOf = (url: string) => new URL(url).searchParams.get('token');

/**
 * A fake API: every `POST /inbox/session` issues a new token that expires in one hour,
 * and other routes answer 401 when the bearer token has expired.
 */
const createFakeApi = () => {
  let now = Date.now();
  const issuedTokens: string[] = [];
  const notificationRequests: string[] = [];
  const sessionBodies: Array<{ subscriber: Record<string, unknown>; defaultSchedule?: unknown }> = [];
  /** The subscriber each issued token belongs to. */
  const tokenSubscribers = new Map<string, string>();
  let sessionResponseDelayMs = 0;
  let notificationResponseDelayMs = 0;
  let tokenLifetimeMs = HOUR_MS;

  vi.spyOn(Date, 'now').mockImplementation(() => now);

  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    const json = (status: number, body: unknown) =>
      ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

    if (url.includes('/inbox/session')) {
      const body = JSON.parse(init.body as string);
      sessionBodies.push(body);
      await wait(sessionResponseDelayMs);
      const token = createJwt(`token-${issuedTokens.length + 1}`, now + tokenLifetimeMs);
      issuedTokens.push(token);
      tokenSubscribers.set(token, body.subscriber.subscriberId);

      return json(200, { data: { token, unreadCount: { total: 0, severity: {} } } });
    }

    const authorization = (init.headers as Record<string, string>).Authorization ?? '';
    const token = authorization.replace(/^Bearer /, '');
    notificationRequests.push(token);
    await wait(notificationResponseDelayMs);
    const issuedAt = issuedTokens.indexOf(token);
    if (issuedAt === -1 || now >= JSON.parse(atob(token.split('.')[1])).exp * 1000) {
      return json(401, { message: 'Unauthorized', statusCode: 401 });
    }

    return json(200, { data: [], hasMore: false, filter: {} });
  });
  vi.stubGlobal('fetch', fetchMock);

  return {
    issuedTokens,
    notificationRequests,
    sessionBodies,
    subscriberOf: (token: string) => tokenSubscribers.get(token),
    sessionCalls: () => fetchMock.mock.calls.filter(([url]) => url.includes('/inbox/session')).length,
    advanceTime: (ms: number) => {
      now += ms;
    },
    delaySessionResponses: (ms: number) => {
      sessionResponseDelayMs = ms;
    },
    delayNotificationResponses: (ms: number) => {
      notificationResponseDelayMs = ms;
    },
    issueExpiredTokens: () => {
      tokenLifetimeMs = -HOUR_MS;
    },
  };
};

const createNovu = () =>
  new Novu({
    applicationIdentifier: 'app',
    subscriber: { subscriberId: 'subscriber_1', firstName: 'Ada', email: 'ada@example.com' },
    defaultSchedule: { isEnabled: true },
    useCache: false,
    socketOptions: { minReconnectionDelay: 10, maxReconnectionDelay: 20 },
  });

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('session refresh after the subscriber token expires', () => {
  it('reconnects the socket with a new token once the old one expired', async () => {
    const api = createFakeApi();
    const novu = createNovu();
    const tokens: string[] = [];
    novu.on('session.initialize.resolved', ({ data }) => data && tokens.push(data.token));

    await novu.socket.connect();
    await wait();
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(tokenOf(FakeWebSocket.instances[0].url)).toBe(api.issuedTokens[0]);

    api.advanceTime(2 * HOUR_MS);
    FakeWebSocket.instances[0].drop();
    await wait();

    expect(api.sessionCalls()).toBe(2);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(tokenOf(FakeWebSocket.instances[1].url)).toBe(api.issuedTokens[1]);
    // Modules read the token from the session event, so the refresh must emit it like the first initialize
    expect(tokens).toEqual(api.issuedTokens);

    await novu.socket.disconnect();
  });

  it('keeps the token on reconnect while it is still valid', async () => {
    const api = createFakeApi();
    const novu = createNovu();

    await novu.socket.connect();
    await wait();
    FakeWebSocket.instances[0].drop();
    await wait();

    expect(api.sessionCalls()).toBe(1);
    expect(tokenOf(FakeWebSocket.instances[1].url)).toBe(api.issuedTokens[0]);

    await novu.socket.disconnect();
  });

  it('refreshes the session once and retries a request that failed with 401', async () => {
    const api = createFakeApi();
    const novu = createNovu();
    await novu.notifications.list();

    api.advanceTime(2 * HOUR_MS);
    const { data, error } = await novu.notifications.list();

    expect(error).toBeUndefined();
    expect(data?.notifications).toEqual([]);
    expect(api.sessionCalls()).toBe(2);
    expect(api.notificationRequests).toEqual([api.issuedTokens[0], api.issuedTokens[0], api.issuedTokens[1]]);
  });

  it('shares one refresh between concurrent requests and the socket', async () => {
    const api = createFakeApi();
    const novu = createNovu();
    await novu.socket.connect();
    await wait();

    api.delaySessionResponses(30);
    api.advanceTime(2 * HOUR_MS);
    FakeWebSocket.instances[0].drop();
    const results = await Promise.all([
      novu.notifications.list(),
      novu.notifications.list(),
      novu.notifications.list(),
    ]);
    await wait(80);

    expect(results.map((result) => result.error)).toEqual([undefined, undefined, undefined]);
    expect(api.sessionCalls()).toBe(2);
    expect(tokenOf(FakeWebSocket.instances[1].url)).toBe(api.issuedTokens[1]);

    await novu.socket.disconnect();
  });

  it('does not refresh more than once when the retried request fails again', async () => {
    const api = createFakeApi();
    const novu = createNovu();
    await novu.notifications.list();

    api.advanceTime(2 * HOUR_MS);
    api.issueExpiredTokens();
    const { error } = await novu.notifications.list();

    expect(error).toBeDefined();
    expect(api.sessionCalls()).toBe(2);
    expect(api.notificationRequests).toHaveLength(3);
  });

  it('does not refresh on a 401 for a token that has not expired', async () => {
    const api = createFakeApi();
    const novu = createNovu();
    await novu.notifications.list();
    // The server stops accepting the token for another reason
    api.issuedTokens.splice(0, 1);

    const { error } = await novu.notifications.list();

    expect(error).toBeDefined();
    expect(api.sessionCalls()).toBe(1);
  });

  it('renews with the subscriber identity only, so profile fields changed on the server are kept', async () => {
    const api = createFakeApi();
    const novu = createNovu();
    await novu.notifications.list();

    api.advanceTime(2 * HOUR_MS);
    await novu.notifications.list();

    expect(api.sessionBodies[0].subscriber).toMatchObject({ subscriberId: 'subscriber_1', firstName: 'Ada' });
    expect(api.sessionBodies[0].defaultSchedule).toBeDefined();
    expect(api.sessionBodies[1].subscriber).toEqual({ subscriberId: 'subscriber_1' });
    expect(api.sessionBodies[1].defaultSchedule).toBeUndefined();
  });

  it('does not resend a request of the previous subscriber with the new subscriber token', async () => {
    const api = createFakeApi();
    const novu = createNovu();
    await novu.notifications.list();

    api.advanceTime(2 * HOUR_MS);
    api.delayNotificationResponses(30);
    // Sent with the expired token of subscriber_1; it answers 401 after the switch to subscriber_2
    const pending = novu.notifications.list();
    await novu.changeSubscriber({ subscriber: { subscriberId: 'subscriber_2' } });
    const { error } = await pending;

    expect(error).toBeDefined();
    expect(api.notificationRequests.map(api.subscriberOf)).toEqual(['subscriber_1', 'subscriber_1']);
    expect(api.sessionBodies.map((body) => body.subscriber.subscriberId)).toEqual(['subscriber_1', 'subscriber_2']);
  });

  it('ends on the latest subscriber after switching away and back while a refresh runs', async () => {
    const api = createFakeApi();
    const novu = createNovu();
    await novu.notifications.list();

    api.advanceTime(2 * HOUR_MS);
    api.delaySessionResponses(30);
    const refreshing = novu.notifications.list();
    await wait(10); // the 401 came back and the refresh for subscriber_1 is in flight
    expect(api.sessionBodies).toHaveLength(2);
    const toSecond = novu.changeSubscriber({ subscriber: { subscriberId: 'subscriber_2' } });
    const backToFirst = novu.changeSubscriber({ subscriber: { subscriberId: 'subscriber_1' } });
    await Promise.all([refreshing, toSecond, backToFirst]);

    expect(novu.subscriberId).toBe('subscriber_1');
    await novu.notifications.list();
    expect(api.subscriberOf(api.notificationRequests.at(-1) ?? '')).toBe('subscriber_1');
    expect(api.sessionBodies.map((body) => body.subscriber.subscriberId)).not.toContain('subscriber_2');
  });
});

describe('the resolved session', () => {
  it('stays readable after session.initialize.resolved has fired', async () => {
    const api = createFakeApi();
    const novu = createNovu();

    expect(novu.session).toBeUndefined();

    await wait();

    expect(novu.session?.token).toBe(api.issuedTokens[0]);
  });

  it('is cleared when the subscriber changes and holds the new one once it resolves', async () => {
    const api = createFakeApi();
    const novu = createNovu();
    await wait();
    api.delaySessionResponses(20);

    const change = novu.changeSubscriber({ subscriber: { subscriberId: 'subscriber_2' } });

    expect(novu.session).toBeUndefined();

    await change;

    expect(novu.session?.token).toBe(api.issuedTokens[1]);
    expect(api.subscriberOf(novu.session?.token ?? '')).toBe('subscriber_2');
  });
});
