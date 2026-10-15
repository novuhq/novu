import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toolOf } from './connections';
import { HumanApiError } from './human-api';
import worker from './index';
import { describeOutcome, type Interaction, sendInteraction, waitForAnswer } from './interactions';
import { API, INITIALIZE, ISSUER, ORIGIN, rpc, setup, stubBackends } from './spec-support';

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
    expect(kv.values.has('tool:user_1:claude')).toBe(true);
  });

  it('offers the tools to reach a person and read the inbox', async () => {
    const { env, ctx } = setup();

    const response = await worker.fetch(rpc('tools/list', {}), env, ctx);
    const { result } = (await response.json()) as { result: { tools: Array<{ name: string }> } };

    expect(result.tools.map((tool) => tool.name).sort()).toEqual(
      [
        'approve',
        'ask',
        'choose',
        'contacts',
        'inbox_list',
        'inbox_read',
        'inbox_resolve',
        'inbox_show',
        'invite',
        'tell',
        'wait',
      ].sort()
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
    // The CLI holds the same key: this is how the API tells an inbox check here from one in a terminal.
    expect(created?.headers.get('Agent-Inbox-Via')).toBe('mcp');
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

  it('does not renew a remembered token, so one Clerk no longer accepts stops working', async () => {
    const { env, ctx, kv } = setup();

    await worker.fetch(rpc('tools/list', {}), env, ctx);
    await worker.fetch(rpc('tools/list', {}), env, ctx);

    expect(kv.puts.filter((put) => put.key.startsWith('token:'))).toEqual([
      { key: expect.any(String), expirationTtl: 300 },
    ]);
  });

  it('keeps each connected tool on its own, so two signing in at once both count', async () => {
    const { env, ctx, settle } = setup();
    const connect = (name: string) =>
      worker.fetch(rpc('initialize', { ...INITIALIZE, clientInfo: { name, version: '1' } }), env, ctx);

    await Promise.all([connect('claude-ai'), connect('Cursor')]);
    await settle();

    const response = await worker.fetch(
      new Request(`${ORIGIN}/connections/user_1`, { headers: { 'x-human-dashboard-secret': 'shared-secret' } }),
      env,
      ctx
    );
    const { data } = (await response.json()) as { data: Record<string, string> };

    expect(Object.keys(data).sort()).toEqual(['claude', 'cursor']);
  });

  it('tells the dashboard which tools are connected, and nobody else', async () => {
    const { env, ctx, kv } = setup();
    kv.values.set('tool:user_1:cursor', '2026-10-09T00:00:00.000Z');
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

  it('hands back the id of a request it just sent when the checks for an answer fail', async () => {
    const api = { get: vi.fn().mockRejectedValue(new Error('stalled')), post: vi.fn() };
    const sent: Interaction = { id: 'hi_1', kind: 'approve', status: 'pending' };

    vi.useFakeTimers();

    const interaction = await waitForAnswer(api as never, sent, 4, async (ms) => void vi.advanceTimersByTime(ms));
    vi.useRealTimers();

    expect(api.get).toHaveBeenCalled();
    expect(describeOutcome(interaction)).toContain('call the wait tool with id "hi_1"');
  });

  it('gives a check no longer than what is left of the wait', async () => {
    const api = { get: vi.fn(async () => ({ id: 'hi_1', kind: 'ask', status: 'pending' })), post: vi.fn() };

    await waitForAnswer(api as never, 'hi_1', 3);

    const timeoutMs = Number(api.get.mock.calls[0]?.at(2));
    expect(timeoutMs).toBeGreaterThan(0);
    expect(timeoutMs).toBeLessThanOrEqual(3000);
  });

  it('gives sending longer than other calls, and says a send without an answer may still arrive', async () => {
    const post = vi.fn().mockRejectedValue(new HumanApiError(0, 'Could not reach the Human API.'));
    const api = { get: vi.fn(), post };

    await expect(
      sendInteraction(api as never, { kind: 'approve', card: { title: 'Deploy?' }, to: 'alice' })
    ).rejects.toThrow('do not send it again right away');
    expect(post.mock.calls[0][2]).toBeGreaterThan(15_000);
  });

  it('counts the wait from when the call began, so a slow send does not add to it', async () => {
    const api = { get: vi.fn(async () => ({ id: 'hi_1', kind: 'ask', status: 'pending' })), post: vi.fn() };
    const sent: Interaction = { id: 'hi_1', kind: 'ask', status: 'pending' };

    await waitForAnswer(api as never, sent, 30, undefined, Date.now() - 30_000);

    expect(api.get).not.toHaveBeenCalled();
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

  it('keeps the unread warning after a check that does not return threads', async () => {
    const api = {
      get: vi.fn(async () => ({
        id: 'hi_1',
        kind: 'ask',
        status: 'answered',
        response: { type: 'text', text: 'Sure', respondedBy: 'Pat' },
      })),
      post: vi.fn(),
    };
    const sent: Interaction = {
      id: 'hi_1',
      kind: 'ask',
      status: 'pending',
      threads: [{ id: 'conv_1', unreadBefore: 2 }],
    };

    const interaction = await waitForAnswer(api as never, sent, 5, async () => undefined);
    const outcome = describeOutcome(interaction);

    expect(api.get).toHaveBeenCalled();
    expect(outcome).toContain('Answered by Pat');
    expect(outcome).toContain('conv_1');
    expect(outcome).toContain('2 unread');
    expect(outcome).toContain('inbox_show');
  });

  it('surfaces unread messages that a send into a thread marked read', () => {
    const outcome = describeOutcome({
      id: 'hi_1',
      kind: 'ask',
      status: 'answered',
      response: { type: 'text', text: 'ok' },
      threads: [{ id: 'conv_1', unreadBefore: 2 }],
    });

    expect(outcome).toContain('conv_1');
    expect(outcome).toContain('2 unread');
    expect(outcome).toContain('inbox_show');
  });

  it('does not invent a recipient when sending into a thread', async () => {
    const post = vi.fn(async () => ({ id: 'hi_1', kind: 'ask', status: 'pending' }));
    const api = { get: vi.fn(), post };

    await sendInteraction(api as never, {
      kind: 'ask',
      card: { title: 'Hi?' },
      thread: 'conv_1',
      anyoneMayAnswer: true,
    });

    expect(post).toHaveBeenCalledWith(
      '/v1/human/interactions',
      { kind: 'ask', card: { title: 'Hi?' }, thread: 'conv_1', anyoneMayAnswer: true },
      expect.any(Number)
    );
    expect(api.get).not.toHaveBeenCalled();
  });
});
