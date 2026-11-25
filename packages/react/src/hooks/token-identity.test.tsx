import { act, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NovuProvider } from './NovuProvider';
import { useCounts } from './useCounts';
import { useCreateSubscription } from './useCreateSubscription';
import { useSubscription } from './useSubscription';

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

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }
}

const createLockManager = () => {
  const queues = new Map<string, Array<() => void>>();

  return {
    request(name: string, callback: () => Promise<void>) {
      const queue = queues.get(name) ?? [];
      queues.set(name, queue);
      const grant = () => {
        void callback().finally(() => {
          queue.shift();
          queue[0]?.();
        });
      };
      queue.push(grant);
      if (queue.length === 1) grant();

      return Promise.resolve();
    },
  };
};

const toBase64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const createJwt = (claims: Record<string, unknown>) =>
  `${toBase64Url({ alg: 'HS256', typ: 'JWT' })}.${toBase64Url({ ...claims, exp: Math.floor(Date.now() / 1000) + 600 })}.sig`;

const subscriberOf = (token: string) => JSON.parse(atob(token.split('.')[1])).subscriberId as string;

const requests: Array<{ url: string; subscriberId?: string }> = [];

const fakeFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
  if (url.includes('/inbox/session')) {
    const { subscriberToken, subscriber } = JSON.parse(String(init?.body)) as {
      subscriberToken?: string;
      subscriber?: { subscriberId: string };
    };
    const subscriberId = subscriber?.subscriberId ?? subscriberToken?.replace('login:', '');
    const contextKeys = ['tenant:acme'];

    return json({ data: { token: createJwt({ subscriberId, contextKeys }), contextKeys } });
  }
  const bearer = ((init?.headers as Record<string, string> | undefined)?.Authorization ?? '').replace('Bearer ', '');
  requests.push({ url, subscriberId: bearer ? subscriberOf(bearer) : undefined });
  if (url.includes('/notifications/count')) {
    return json({ data: [{ count: 0, filter: {} }] });
  }
  if (url.includes('/subscriptions/')) {
    return json({ data: null });
  }
  if (url.endsWith('/topics/news/subscriptions') && init?.method === 'POST') {
    // With context preferences off, the server stores the identifier without the context.
    return json({ data: { id: 'sub_1', identifier: `tk_news:si_${subscriberOf(bearer)}` } });
  }

  return json({ data: [], hasMore: false, filter: {} });
});

const flush = (ms = 50) => act(async () => new Promise((resolve) => setTimeout(resolve, ms)));

const SignedInAs = ({ user, children }: { user: string; children: React.ReactNode }) => (
  <NovuProvider applicationIdentifier="app" getToken={async () => `login:${user}`}>
    {children}
  </NovuProvider>
);

beforeEach(() => {
  FakeWebSocket.instances = [];
  requests.length = 0;
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.stubGlobal('fetch', fakeFetch);
  Object.defineProperty(navigator, 'locks', { value: createLockManager(), configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'locks');
});

describe('hooks under a token source', () => {
  it('reads the subscription of the subscriber the token signed in', async () => {
    const Probe = () => {
      useSubscription({ topicKey: 'news' });

      return null;
    };
    render(
      <SignedInAs user="alice">
        <Probe />
      </SignedInAs>
    );
    await flush();

    const subscriptionRequests = requests.filter((request) => request.url.includes('/topics/news/subscriptions/'));
    expect(subscriptionRequests.map((request) => new URL(request.url).pathname.split('/').pop())).toEqual([
      'tk_news:si_alice',
    ]);
  });

  it('shows a subscription created for a subscriber with a context', async () => {
    let state: { subscription?: unknown; create?: ReturnType<typeof useCreateSubscription>['create'] } = {};
    const Probe = () => {
      const { subscription } = useSubscription({ topicKey: 'news' });
      const { create } = useCreateSubscription();
      state = { subscription, create };

      return null;
    };
    render(
      <NovuProvider applicationIdentifier="app" subscriberId="carol" context={{ tenant: 'acme' }}>
        <Probe />
      </NovuProvider>
    );
    await flush();
    expect(state.subscription).toBeNull();

    await act(async () => {
      await state.create?.({ topicKey: 'news' });
    });

    expect(state.subscription).toMatchObject({ id: 'sub_1', identifier: 'tk_news:si_carol' });
  });

  it('keeps the counts of two subscribers apart in one browser', async () => {
    const Counts = () => {
      useCounts({ filters: [{ read: false }] });

      return null;
    };
    render(
      <>
        <SignedInAs user="alice">
          <Counts />
        </SignedInAs>
        <SignedInAs user="bob">
          <Counts />
        </SignedInAs>
      </>
    );
    await flush();
    const refetchesAfterEventFor = async (user: string) => {
      const countRequests = () => requests.filter((request) => request.url.includes('/notifications/count'));
      const before = countRequests().length;
      const socket = FakeWebSocket.instances.find(
        (ws) => subscriberOf(new URL(ws.url).searchParams.get('token') ?? '') === user
      );
      socket?.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({ event: 'unread_count_changed', data: { counts: { total: 3, severity: {} } } }),
        })
      );
      await flush();

      return countRequests()
        .slice(before)
        .map((request) => request.subscriberId);
    };

    expect(await refetchesAfterEventFor('alice')).toEqual(['alice']);
    expect(await refetchesAfterEventFor('bob')).toEqual(['bob']);
  });

  it('reports a failed first sign-in instead of loading forever', async () => {
    const onError = vi.fn();
    let state: ReturnType<typeof useSubscription> | undefined;
    const Probe = () => {
      state = useSubscription({ topicKey: 'news', onError });

      return null;
    };
    render(
      <NovuProvider
        applicationIdentifier="app"
        getToken={async () => {
          throw new Error('signed out');
        }}
      >
        <Probe />
      </NovuProvider>
    );
    await flush();

    expect(state?.isLoading).toBe(false);
    expect(state?.error).toBeDefined();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
