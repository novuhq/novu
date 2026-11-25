import { act, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NovuProvider, useNovu } from '../hooks/NovuProvider';
import { Inbox } from './Inbox';

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
  bufferedAmount = 0;
  extensions = '';
  protocol = '';
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
}

const TOKEN_ENDPOINT = '/api/novu-token';
const sessionBodies: Array<Record<string, unknown>> = [];
const tokenEndpointCalls: RequestInit[] = [];

const toBase64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const sessionJwt = (claims: Record<string, unknown>) =>
  `${toBase64Url({ alg: 'HS256', typ: 'JWT' })}.${toBase64Url({ ...claims, exp: Math.floor(Date.now() / 1000) + 600 })}.sig`;

const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

const fakeFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url === TOKEN_ENDPOINT) {
    tokenEndpointCalls.push(init ?? {});

    return json({ token: `login-${tokenEndpointCalls.length}`, expiresAt: new Date().toISOString() });
  }
  if (url.includes('/inbox/session')) {
    sessionBodies.push(JSON.parse(String(init?.body)));

    return json({
      data: {
        token: sessionJwt({ subscriberId: 'user_1', n: sessionBodies.length }),
        totalUnreadCount: 0,
        unreadCount: { total: 0, severity: {} },
        removeNovuBranding: false,
        isDevelopmentMode: false,
        maxSnoozeDurationHours: 24,
        contextKeys: [],
      },
    });
  }
  if (url.includes('/notifications/count')) {
    return json({ data: [{ count: 0, filter: {} }] });
  }

  return json({ data: [], hasMore: false, filter: {} });
});

const flush = (ms = 20) => act(async () => new Promise((resolve) => setTimeout(resolve, ms)));
const openSockets = () => FakeWebSocket.instances.filter((ws) => ws.readyState !== FakeWebSocket.CLOSED);

beforeEach(() => {
  FakeWebSocket.instances = [];
  sessionBodies.length = 0;
  tokenEndpointCalls.length = 0;
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.stubGlobal('fetch', fakeFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Inbox with a token source', () => {
  it('keeps one session and socket when an inline getToken arrow changes on every render', async () => {
    const getTokenCalls: number[] = [];
    const App = ({ tick }: { tick: number }) => (
      <div data-tick={tick}>
        <Inbox
          applicationIdentifier="app"
          getToken={async () => {
            getTokenCalls.push(tick);

            return `login-from-render-${tick}`;
          }}
        />
      </div>
    );

    const view = render(<App tick={0} />);
    await flush();
    for (let tick = 1; tick <= 5; tick += 1) {
      view.rerender(<App tick={tick} />);
      await flush();
    }

    expect(getTokenCalls).toEqual([0]);
    expect(sessionBodies).toHaveLength(1);
    expect(sessionBodies[0]).toMatchObject({ applicationIdentifier: 'app', subscriberToken: 'login-from-render-0' });
    expect(openSockets()).toHaveLength(1);
  });

  it('signs in through the token endpoint with the browser cookies', async () => {
    render(<Inbox applicationIdentifier="app" tokenEndpoint={TOKEN_ENDPOINT} />);
    await flush();

    expect(tokenEndpointCalls).toHaveLength(1);
    expect(tokenEndpointCalls[0]).toMatchObject({ method: 'POST', credentials: 'include', body: '{}' });
    expect(sessionBodies).toEqual([{ applicationIdentifier: 'app', subscriberToken: 'login-1' }]);
  });
});

describe('NovuProvider with a token source', () => {
  it('calls the latest getToken when the session is renewed, without a new Novu instance', async () => {
    const instances = new Set<unknown>();
    const Probe = () => {
      instances.add(useNovu());

      return null;
    };
    const App = ({ user }: { user: string }) => (
      <NovuProvider applicationIdentifier="app" getToken={async () => `login-for-${user}`}>
        <Probe />
      </NovuProvider>
    );

    const view = render(<App user="first" />);
    await flush();
    view.rerender(<App user="second" />);
    await flush();
    const [novu] = instances as Set<ReturnType<typeof useNovu>>;
    fakeFetch.mockImplementationOnce(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    await act(async () => {
      await novu.notifications.list();
    });

    expect(instances.size).toBe(1);
    expect(sessionBodies.map((body) => body.subscriberToken)).toEqual(['login-for-first', 'login-for-second']);
  });
});
