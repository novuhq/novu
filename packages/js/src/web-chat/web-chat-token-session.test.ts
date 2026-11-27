import { afterEach, expect, it, vi } from 'vitest';

const ioClient = vi.hoisted(() => vi.fn());

vi.mock('socket.io-client', () => ({ __esModule: true, default: ioClient }));

import { Novu } from '../novu';

const toBase64Url = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
const createJwt = (claims: Record<string, unknown>) =>
  `${toBase64Url({ alg: 'HS256', typ: 'JWT' })}.${toBase64Url({ ...claims, exp: Math.floor(Date.now() / 1000) + 600 })}.sig`;

const LOGIN_TOKEN = createJwt({ sub: 'user_1', aud: 'novu' });
const SESSION_TOKEN = createJwt({ subscriberId: 'user_1', contextKeys: ['tenant:acme'] });

type Call = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

let novu: Novu | undefined;

afterEach(async () => {
  await novu?.socket.disconnect();
  novu = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('sends Web Chat messages with the session a subscriber token opened, without an agentHash', async () => {
  ioClient.mockImplementation(() => ({
    on: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    io: { on: vi.fn(), opts: {} },
  }));
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({
        url,
        headers: (init.headers ?? {}) as Record<string, string>,
        body: init.body ? JSON.parse(init.body as string) : {},
      });
      const data = url.includes('/inbox/session')
        ? { token: SESSION_TOKEN, contextKeys: ['tenant:acme'], unreadCount: { total: 0, severity: {} } }
        : { identifier: 'conv_abcdefghijkl', messageId: 'msg_abcdefghijkl' };

      return { ok: true, status: 201, json: async () => ({ data }) } as unknown as Response;
    })
  );
  novu = new Novu({
    applicationIdentifier: 'app',
    getToken: async () => LOGIN_TOKEN,
    useCache: false,
    socketOptions: { socketType: 'self-hosted' },
  });

  const webChat = await novu.loadWebChat();
  const { error } = await webChat.conversation({ agentId: 'support' }).sendMessage('Hello');

  expect(error).toBeUndefined();
  const session = calls.find((call) => call.url.includes('/inbox/session'));
  const send = calls.find((call) => call.url.includes('/web-chat/conversations'));
  expect(session?.body).toMatchObject({ subscriberToken: LOGIN_TOKEN });
  expect(session?.body).not.toHaveProperty('subscriberId');
  expect(send?.headers.Authorization).toBe(`Bearer ${SESSION_TOKEN}`);
  expect(send?.body).toMatchObject({ agentId: 'support', text: 'Hello' });
  expect(send?.body).not.toHaveProperty('agentHash');
  expect(ioClient).toHaveBeenCalled();
});
