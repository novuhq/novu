import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Novu } from '../../../novu';
import { NovuProvider } from '../../context';
import { useNotificationsInfiniteScroll } from './useNotifications';

const toBase64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const createJwt = (claims: Record<string, unknown>) =>
  `${toBase64Url({ alg: 'HS256', typ: 'JWT' })}.${toBase64Url({ ...claims, exp: Math.floor(Date.now() / 1000) + 600 })}.sig`;

const subscriberOf = (token: string) => JSON.parse(atob(token.split('.')[1])).subscriberId as string;

const signedOut = new Set<string>();

const fakeFetch = vi.fn(async (url: string, init: RequestInit) => {
  const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;
  if (url.includes('/inbox/session')) {
    const { subscriberToken } = JSON.parse(init.body as string) as { subscriberToken: string };
    const subscriberId = subscriberToken.replace('login:', '');

    return json(200, { data: { token: createJwt({ subscriberId }), contextKeys: [] } });
  }
  const caller = subscriberOf((init.headers as Record<string, string>).Authorization.replace('Bearer ', ''));
  if (signedOut.has(caller)) {
    return json(401, { statusCode: 401, message: 'Unauthorized' });
  }
  if (url.includes('/notifications/count')) {
    return json(200, { data: [{ count: 0, filter: {} }] });
  }

  return json(200, { data: [{ id: `${caller}_notification` }], hasMore: false, filter: {} });
});

const wait = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  signedOut.clear();
  vi.stubGlobal('fetch', fakeFetch);
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('the Inbox notification list', () => {
  it('shows the notifications of the user a renewal signed in, not of the one before', async () => {
    let user = 'alice';
    const novu = new Novu({ applicationIdentifier: 'app', getToken: async () => `login:${user}`, useCache: false });
    let shown: () => string[] = () => [];
    const List = () => {
      const { data } = useNotificationsInfiniteScroll({ options: () => ({ limit: 10 }) });
      shown = () => data().map((notification) => notification.id);

      return null;
    };
    const mountPoint = document.createElement('div');
    document.body.appendChild(mountPoint);
    const dispose = render(
      () => (
        <NovuProvider novu={() => novu}>
          <List />
        </NovuProvider>
      ),
      mountPoint
    );
    await wait();
    expect(shown()).toEqual(['alice_notification']);

    user = 'bob';
    signedOut.add('alice');
    await novu.notifications.count({});
    await wait();

    expect(novu.subscriberId).toBe('bob');
    expect(shown()).toEqual(['bob_notification']);
    dispose();
  });
});
