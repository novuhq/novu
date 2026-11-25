import { createRoot } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Novu } from '../../../novu';
import type { UnreadCount } from '../../../types';
import { createWebSocketEventEffect } from './events';

const toBase64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const createJwt = (claims: Record<string, unknown>) =>
  `${toBase64Url({ alg: 'HS256', typ: 'JWT' })}.${toBase64Url({ ...claims, exp: Math.floor(Date.now() / 1000) + 600 })}.sig`;

const subscriberOf = (token: string) => JSON.parse(atob(token.split('.')[1])).subscriberId as string;

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

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }
}

const createLockManager = () => {
  const queues = new Map<string, Array<() => void>>();

  const runNext = (name: string) => {
    queues.get(name)?.[0]?.();
  };

  return {
    request(name: string, callback: () => Promise<void>) {
      const queue = queues.get(name) ?? [];
      queues.set(name, queue);
      const grant = () => {
        void callback().finally(() => {
          queue.shift();
          runNext(name);
        });
      };
      queue.push(grant);
      if (queue.length === 1) grant();

      return Promise.resolve();
    },
  };
};

const fakeFetch = vi.fn(async (url: string, init: RequestInit) => {
  const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
  if (url.includes('/inbox/session')) {
    const { subscriberToken } = JSON.parse(init.body as string) as { subscriberToken: string };
    const subscriberId = subscriberToken.replace('login:', '');

    return json({ data: { token: createJwt({ subscriberId, contextKeys: [] }), contextKeys: [] } });
  }

  return json({ data: [], hasMore: false, filter: {} });
});

const signInAs = (subscriberId: string) =>
  new Novu({
    applicationIdentifier: 'app',
    getToken: async () => `login:${subscriberId}`,
    useCache: false,
    socketOptions: { minReconnectionDelay: 10, maxReconnectionDelay: 20 },
  });

const unreadCountFor = (subscriberId: string, total: number) => {
  const socket = FakeWebSocket.instances.find(
    (ws) => subscriberOf(new URL(ws.url).searchParams.get('token') ?? '') === subscriberId
  );
  socket?.dispatchEvent(
    new MessageEvent('message', {
      data: JSON.stringify({ event: 'unread_count_changed', data: { counts: { total, severity: {} } } }),
    })
  );
};

const wait = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

const listen = (novu: Novu) => {
  const received: Array<UnreadCount> = [];
  const dispose = createRoot((dispose) => {
    createWebSocketEventEffect(
      () => novu,
      'notifications.unread_count_changed',
      ({ result }) => {
        received.push(result);
      }
    );

    return dispose;
  });

  return { received, dispose };
};

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.stubGlobal('fetch', fakeFetch);
  Object.defineProperty(navigator, 'locks', { value: createLockManager(), configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'locks');
});

describe('websocket events across tabs signed in with a token source', () => {
  it('keeps the counts of two subscribers apart in one browser', async () => {
    const alice = listen(signInAs('alice'));
    const bob = listen(signInAs('bob'));
    await wait();

    unreadCountFor('alice', 3);
    unreadCountFor('bob', 7);
    await wait();

    expect(alice.received.map((count) => count.total)).toEqual([3]);
    expect(bob.received.map((count) => count.total)).toEqual([7]);

    alice.dispose();
    bob.dispose();
  });
});
