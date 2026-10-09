import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toolOf } from './connections';
import type { Env } from './env';
import worker from './index';
import { describeOutcome, type Interaction, waitForAnswer } from './interactions';

const ISSUER = 'https://clerk.example.test';
const API = 'https://api.example.test';
const API_EU = 'https://eu.api.example.test';
const ORIGIN = 'https://mcp.example.test';

function fakeKv() {
  const values = new Map<string, string>();

  return {
    values,
    get: async (key: string) => (values.has(key) ? JSON.parse(values.get(key) as string) : null),
    put: async (key: string, value: string) => void values.set(key, value),
  };
}

function setup(overrides: Partial<Env> = {}) {
  const kv = fakeKv();
  const env = {
    CLERK_OAUTH_ISSUER: ISSUER,
    HUMAN_DASHBOARD_API_SECRET: 'shared-secret',
    NOVU_API_URL: API,
    NOVU_API_URL_EU: API_EU,
    CONNECTIONS: kv,
    ...overrides,
  } as unknown as Env;
  const pending: Promise<unknown>[] = [];
  const ctx = { waitUntil: (work: Promise<unknown>) => void pending.push(work) } as unknown as ExecutionContext;

  return { env, ctx, kv, settle: () => Promise.all(pending) };
}

/** Answers the calls the Worker makes: Clerk for who the token is, the API for everything else. */
function stubBackends(interaction: Partial<Interaction> = { status: 'approved' }) {
  const calls: Array<{ url: string; method: string; body?: unknown; headers: Headers }> = [];
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(input);
      const headers = new Headers(init.headers);
      calls.push({
        url,
        method: init.method ?? 'GET',
        body: init.body ? JSON.parse(String(init.body)) : undefined,
        headers,
      });

      if (url === `${ISSUER}/oauth/userinfo`) {
        return headers.get('Authorization') === 'Bearer good-token' ? reply({ user_id: 'user_1' }) : reply({}, 401);
      }

      // The account lives in the EU: the US API has never heard of it.
      if (url === `${API}/v1/human/accounts/user_1/secret-key`) {
        return reply({}, 404);
      }

      if (url === `${API_EU}/v1/human/accounts/user_1/secret-key`) {
        return headers.get('x-human-dashboard-secret') === 'shared-secret'
          ? reply({ data: { secretKey: 'account-key' } })
          : reply({}, 401);
      }

      if (url === `${API_EU}/v1/human/operator`) {
        return reply({ data: { subscriberId: 'operator_1' } });
      }

      if (url === `${API_EU}/v1/human/interactions` && init.method === 'POST') {
        return reply({ data: { id: 'hi_1', kind: 'approve', status: 'pending' } });
      }

      if (url === `${API_EU}/v1/human/interactions/hi_1`) {
        return reply({ data: { id: 'hi_1', kind: 'approve', ...interaction } });
      }

      return reply({ message: 'not stubbed' }, 500);
    })
  );

  return calls;
}

function rpc(method: string, params: unknown, token: string | null = 'good-token'): Request {
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

const INITIALIZE = { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'claude-ai', version: '1' } };

describe('the Human MCP server', () => {
  beforeEach(() => {
    stubBackends();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks a tool without a token to sign in, and says where', async () => {
    const { env, ctx } = setup();

    const response = await worker.fetch(rpc('tools/list', {}, null), env, ctx);

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe(
      `Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource"`
    );
  });

  it('names the Human Clerk app as the place to sign in', async () => {
    const { env, ctx } = setup();

    const response = await worker.fetch(new Request(`${ORIGIN}/.well-known/oauth-protected-resource`), env, ctx);

    expect(await response.json()).toMatchObject({ resource: ORIGIN, authorization_servers: [ISSUER] });
  });

  it('turns away a token Clerk does not know', async () => {
    const { env, ctx } = setup();

    const response = await worker.fetch(rpc('tools/list', {}, 'bad-token'), env, ctx);

    expect(response.status).toBe(401);
  });

  it('lets a signed-in tool connect and remembers which tool it is', async () => {
    const { env, ctx, kv, settle } = setup();

    const response = await worker.fetch(rpc('initialize', INITIALIZE), env, ctx);
    await settle();

    expect(response.status).toBe(200);
    expect(((await response.json()) as { result: { serverInfo: { name: string } } }).result.serverInfo.name).toBe(
      'human'
    );
    expect(Object.keys(JSON.parse(kv.values.get('tools:user_1') as string))).toEqual(['claude']);
  });

  it('offers the tools to reach a person', async () => {
    const { env, ctx } = setup();

    const response = await worker.fetch(rpc('tools/list', {}), env, ctx);
    const { result } = (await response.json()) as { result: { tools: Array<{ name: string }> } };

    expect(result.tools.map((tool) => tool.name).sort()).toEqual(
      ['approve', 'ask', 'choose', 'contacts', 'invite', 'tell', 'wait'].sort()
    );
  });

  it('asks the owner of the account for approval, in the region the account lives in', async () => {
    const calls = stubBackends({ status: 'approved', response: { type: 'option', respondedBy: 'Dima' } as never });
    const { env, ctx } = setup();

    const response = await worker.fetch(
      rpc('tools/call', { name: 'approve', arguments: { request: 'Deploy to production?' } }),
      env,
      ctx
    );
    const { result } = (await response.json()) as { result: { content: Array<{ text: string }>; isError?: boolean } };

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Approved by Dima');

    const created = calls.find((call) => call.url.endsWith('/v1/human/interactions') && call.method === 'POST');
    expect(created?.headers.get('Authorization')).toBe('ApiKey account-key');
    expect(created?.body).toMatchObject({
      kind: 'approve',
      to: 'operator_1',
      card: { title: 'Deploy to production?' },
    });
  });

  it('remembers whose token it is, so the next call does not ask Clerk again', async () => {
    const calls = stubBackends();
    const { env, ctx } = setup();

    await worker.fetch(rpc('tools/list', {}), env, ctx);
    await worker.fetch(rpc('tools/list', {}), env, ctx);

    expect(calls.filter((call) => call.url.endsWith('/oauth/userinfo'))).toHaveLength(1);
    // The remembered region is asked first: no second trip to the US API.
    expect(calls.filter((call) => call.url.startsWith(`${API}/`))).toHaveLength(1);
  });

  it('tells the dashboard which tools are connected, and nobody else', async () => {
    const { env, ctx, kv } = setup();
    kv.values.set('tools:user_1', JSON.stringify({ cursor: '2026-10-09T00:00:00.000Z' }));
    const ask = (secret?: string) =>
      worker.fetch(
        new Request(`${ORIGIN}/connections/user_1`, { headers: secret ? { 'x-human-dashboard-secret': secret } : {} }),
        env,
        ctx
      );

    expect((await ask()).status).toBe(401);
    expect((await ask('wrong')).status).toBe(401);
    expect(await (await ask('shared-secret')).json()).toEqual({ data: { cursor: '2026-10-09T00:00:00.000Z' } });
  });
});

describe('toolOf', () => {
  it('knows the three tools by the name they connect with', () => {
    expect(toolOf('claude-ai')).toBe('claude');
    expect(toolOf('Cursor')).toBe('cursor');
    expect(toolOf('openai-mcp')).toBe('chatgpt');
    expect(toolOf('something-else')).toBe(null);
  });
});

describe('waiting for an answer', () => {
  it('stops at the time limit and says how to keep waiting', async () => {
    const api = { get: vi.fn(async () => ({ id: 'hi_1', kind: 'ask', status: 'pending' })), post: vi.fn() };

    const interaction = await waitForAnswer(api as never, 'hi_1', 0);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(describeOutcome(interaction as Interaction)).toContain('call the wait tool with id "hi_1"');
  });

  it('says which option was chosen by its label', () => {
    const outcome = describeOutcome({
      id: 'hi_1',
      kind: 'choose',
      status: 'answered',
      content: { cardChrome: { options: [{ id: 'opt_1', label: 'Canary' }] } },
      response: { type: 'option', optionId: 'opt_1' },
    });

    expect(outcome).toContain('They chose: Canary');
  });
});
