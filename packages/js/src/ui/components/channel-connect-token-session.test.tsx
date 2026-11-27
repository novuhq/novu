import type { ComponentProps } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NovuUI } from '../novuUI';
import type { novuComponents } from './Renderer';

const TOKEN_ENDPOINT = '/api/novu-token';

const toBase64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const sessionJwt = (claims: Record<string, unknown>) =>
  `${toBase64Url({ alg: 'HS256', typ: 'JWT' })}.${toBase64Url({ ...claims, exp: Math.floor(Date.now() / 1000) + 600 })}.sig`;

const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

type Request = { method: string; path: string; search: URLSearchParams; body?: Record<string, unknown> };

const createBackend = ({ contextKeys = ['tenant:acme'] }: { contextKeys?: string[] } = {}) => {
  const requests: Request[] = [];
  let sessions = 0;
  let rejectNext = false;
  let releaseSession: () => void = () => {};
  const sessionGate = new Promise<void>((resolve) => {
    releaseSession = resolve;
  });

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith(TOKEN_ENDPOINT)) {
      return json({ token: 'login-token' });
    }
    if (url.includes('/inbox/session')) {
      await sessionGate;
      sessions += 1;

      return json({
        data: {
          token: sessionJwt({ subscriberId: 'user_1', contextKeys, n: sessions }),
          unreadCount: { total: 0, severity: {} },
          removeNovuBranding: false,
          isDevelopmentMode: false,
          maxSnoozeDurationHours: 24,
          contextKeys,
        },
      });
    }

    const parsed = new URL(url);
    requests.push({
      method: init?.method ?? 'GET',
      path: parsed.pathname.replace(/^\/v1/, ''),
      search: parsed.searchParams,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });

    if (rejectNext) {
      rejectNext = false;

      return { ok: false, status: 401, json: async () => ({ message: 'expired' }) } as unknown as Response;
    }
    if (parsed.pathname.endsWith('/oauth')) {
      return json({ data: { url: 'https://slack.com/oauth/v2/authorize?state=abc' } });
    }
    if (parsed.pathname.includes('/channel-connections/')) {
      return { ok: false, status: 404, json: async () => ({ message: 'Not found' }) } as unknown as Response;
    }

    return json({ data: [], hasMore: false });
  });

  return {
    fetchMock,
    requests,
    releaseSession,
    sessionCount: () => sessions,
    rejectNextRequest: () => {
      rejectNext = true;
    },
  };
};

const flush = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

const mount = <T extends 'SlackConnectButton' | 'MsTeamsConnectButton' | 'SlackLinkUser'>(
  name: T,
  props: ComponentProps<(typeof novuComponents)[T]>
) => {
  const novuUI = new NovuUI({
    options: { applicationIdentifier: 'app', getToken: async () => 'login-token' },
  });
  const element = document.createElement('div');
  document.body.appendChild(element);
  novuUI.mountComponent({ name, element, props });

  return { novuUI, element };
};

const findButton = (element: HTMLElement) => {
  const button = element.querySelector('button');
  if (!button) {
    throw new Error('no button rendered');
  }

  return button;
};

describe('channel connect components on a token session', () => {
  let openSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it.each([
    ['SlackConnectButton', 'chconn-slack-default-user_1'],
    ['MsTeamsConnectButton', 'chconn-msteams-default-user_1'],
  ] as const)('%s reads and connects the signed-in subscriber connection, with no hash', async (name, expectedId) => {
    const backend = createBackend();
    vi.stubGlobal('fetch', backend.fetchMock);
    const { novuUI, element } = mount(name, { integrationIdentifier: 'slack-int' });

    await flush();
    backend.releaseSession();
    await flush();

    const lookups = backend.requests.filter((r) => r.method === 'GET' && r.path.includes('/channel-connections/'));
    expect(lookups.map((r) => r.path)).toEqual([`/inbox/channel-connections/${expectedId}`]);

    findButton(element).click();
    await flush();

    const oauth = backend.requests.find((r) => r.path === '/inbox/channel-connections/oauth');
    expect(oauth?.body).toMatchObject({ connectionIdentifier: expectedId, connectionMode: 'subscriber' });
    expect(oauth?.body).not.toHaveProperty('contextHash');
    expect(oauth?.body).not.toHaveProperty('subscriberHash');
    expect(openSpy).toHaveBeenCalledWith(
      'https://slack.com/oauth/v2/authorize?state=abc',
      '_blank',
      'noopener,noreferrer'
    );

    novuUI.unmount();
  });

  it('SlackLinkUser lists and links the signed-in subscriber connection, with no hash', async () => {
    const backend = createBackend();
    vi.stubGlobal('fetch', backend.fetchMock);
    const { novuUI, element } = mount('SlackLinkUser', { integrationIdentifier: 'slack-int' });

    await flush();
    backend.releaseSession();
    await flush();

    const lists = backend.requests.filter((r) => r.method === 'GET' && r.path === '/inbox/channel-endpoints');
    expect(lists.map((r) => r.search.get('connectionIdentifier'))).toEqual(['chconn-slack-default-user_1']);

    findButton(element).click();
    await flush();

    const oauth = backend.requests.find((r) => r.path === '/inbox/channel-endpoints/oauth');
    expect(oauth?.body).toMatchObject({
      connectionIdentifier: 'chconn-slack-default-user_1',
      subscriberId: 'user_1',
    });
    expect(oauth?.body).not.toHaveProperty('contextHash');
    expect(oauth?.body).not.toHaveProperty('subscriberHash');

    novuUI.unmount();
  });

  it('SlackLinkUser does not look its endpoint up again when the session renews for the same subscriber', async () => {
    const backend = createBackend();
    vi.stubGlobal('fetch', backend.fetchMock);
    const { novuUI } = mount('SlackLinkUser', { integrationIdentifier: 'slack-int' });

    await flush();
    backend.releaseSession();
    await flush();
    backend.rejectNextRequest();
    await novuUI.stores.novu().channelEndpoints.list({ integrationIdentifier: 'slack-int' });
    await flush();

    expect(backend.sessionCount()).toBe(2);
    const componentLists = backend.requests.filter(
      (r) => r.path === '/inbox/channel-endpoints' && r.search.get('connectionIdentifier') !== null
    );
    expect(componentLists).toHaveLength(1);

    novuUI.unmount();
  });

  it('SlackConnectButton in shared mode connects when the token carries a context', async () => {
    const backend = createBackend({ contextKeys: ['tenant:acme'] });
    vi.stubGlobal('fetch', backend.fetchMock);
    const { novuUI, element } = mount('SlackConnectButton', {
      integrationIdentifier: 'slack-int',
      connectionMode: 'shared',
    });

    await flush();
    backend.releaseSession();
    await flush();

    const button = findButton(element);
    expect(button.disabled).toBe(false);
    button.click();
    await flush();

    const oauth = backend.requests.find((r) => r.path === '/inbox/channel-connections/oauth');
    expect(oauth?.body).toMatchObject({ connectionMode: 'shared' });
    expect(oauth?.body).not.toHaveProperty('contextHash');

    novuUI.unmount();
  });

  it('SlackConnectButton in shared mode stays misconfigured when the token carries no context', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const backend = createBackend({ contextKeys: [] });
    vi.stubGlobal('fetch', backend.fetchMock);
    const { novuUI, element } = mount('SlackConnectButton', {
      integrationIdentifier: 'slack-int',
      connectionMode: 'shared',
    });

    await flush();
    backend.releaseSession();
    await flush();

    const button = findButton(element);
    expect(button.disabled).toBe(true);
    button.click();
    await flush();
    expect(backend.requests.some((r) => r.path === '/inbox/channel-connections/oauth')).toBe(false);

    novuUI.unmount();
    warn.mockRestore();
  });
});
