import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentInboxApiError } from './agent-inbox-api';
import { hostOfClientName, hostOfSession, hostOfUserAgent, sessionIdFor } from './connections';
import { AGENT_INBOX_DASHBOARD_SECRET_HEADER } from './constants';
import worker from './index';
import { describeOutcome, type Interaction, sendInteraction, waitForAnswer } from './interactions';
import {
  AGENT_INBOX_API,
  INITIALIZE,
  ISSUER,
  inSession,
  NOVU_API,
  ORIGIN,
  rpc,
  setup,
  stubBackends,
} from './spec-support';

describe('the Agent Inbox MCP server', () => {
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

  it('names the Agent Inbox Clerk app as the place to sign in', async () => {
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
      'agent-inbox'
    );
    expect(kv.values.has('tool:user_1:claude-chat')).toBe(true);
  });

  it('tells Claude Code from Claude, and names the host in every later call to the API', async () => {
    const calls = stubBackends();
    const { env, ctx, kv, settle } = setup();

    const initialized = await worker.fetch(
      rpc('initialize', { ...INITIALIZE, clientInfo: { name: 'claude-code', version: '2.1.309' } }),
      env,
      ctx
    );
    await settle();
    const sessionId = initialized.headers.get('Mcp-Session-Id') ?? '';

    expect(sessionId.startsWith('claude-code.')).toBe(true);
    expect(kv.values.has('tool:user_1:claude-code')).toBe(true);
    expect(kv.values.has('tool:user_1:claude-chat')).toBe(false);

    // Any Worker instance can take the next call: the session id alone says which host it is.
    const listed = await worker.fetch(
      inSession(rpc('tools/call', { name: 'inbox_list', arguments: { filter: 'unread' } }), sessionId),
      env,
      ctx
    );
    expect(listed.status).toBe(200);

    const inbox = calls.find((call) => call.url.startsWith(`${AGENT_INBOX_API}/v1/inbox?`));
    expect(inbox?.headers.get('Agent-Inbox-Via')).toBe('mcp');
    expect(inbox?.headers.get('Agent-Inbox-Host')).toBe('claude-code');
  });

  it('says nothing of the host for a call outside a session, and counts an app it does not know as general', async () => {
    const calls = stubBackends();
    const { env, ctx, kv, settle } = setup();

    await worker.fetch(rpc('tools/call', { name: 'inbox_list', arguments: { filter: 'unread' } }), env, ctx);
    const outside = calls.find((call) => call.url.startsWith(`${AGENT_INBOX_API}/v1/inbox?`));
    expect(outside?.headers.get('Agent-Inbox-Via')).toBe('mcp');
    expect(outside?.headers.has('Agent-Inbox-Host')).toBe(false);

    const initialized = await worker.fetch(
      rpc('initialize', { ...INITIALIZE, clientInfo: { name: 'Some New Editor', version: '1' } }),
      env,
      ctx
    );
    await settle();
    const sessionId = initialized.headers.get('Mcp-Session-Id') ?? '';
    expect(sessionId.startsWith('general.')).toBe(true);
    expect([...kv.values.keys()].some((key) => key.startsWith('tool:'))).toBe(false);

    calls.length = 0;
    await worker.fetch(
      inSession(rpc('tools/call', { name: 'inbox_list', arguments: { filter: 'unread' } }), sessionId),
      env,
      ctx
    );
    expect(
      calls.find((call) => call.url.startsWith(`${AGENT_INBOX_API}/v1/inbox?`))?.headers.get('Agent-Inbox-Host')
    ).toBe('general');
  });

  it('names Claude Code, Codex and Cursor by their User-Agent where a call carries no session', async () => {
    const calls = stubBackends();
    const { env, ctx } = setup();
    const request = rpc('tools/call', { name: 'inbox_list', arguments: { filter: 'unread' } });
    const headers = new Headers(request.headers);
    headers.set('User-Agent', 'claude-code/2.1.309 (cli)');

    await worker.fetch(new Request(request, { headers }), env, ctx);

    const inbox = calls.find((call) => call.url.startsWith(`${AGENT_INBOX_API}/v1/inbox?`));
    expect(inbox?.headers.get('Agent-Inbox-Host')).toBe('claude-code');
  });

  it('lets an app end its session', async () => {
    const { env, ctx } = setup();
    const request = new Request(ORIGIN, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer good-token', 'Mcp-Session-Id': sessionIdFor('cursor') },
    });

    expect((await worker.fetch(request, env, ctx)).status).toBe(200);
  });

  it('offers the tools to reach a person and read the inbox', async () => {
    const { env, ctx } = setup();

    const response = await worker.fetch(rpc('tools/list', {}), env, ctx);
    const { result } = (await response.json()) as { result: { tools: Array<{ name: string }> } };

    expect(result.tools.map((tool) => tool.name).sort()).toEqual(
      [
        'contact_invite',
        'contact_list',
        'inbox_list',
        'inbox_read',
        'inbox_reply',
        'inbox_resolve',
        'inbox_send',
        'inbox_setup',
        'inbox_show',
        'inbox_wait',
      ].sort()
    );
  });

  it('asks the owner of the account for approval through the Dashboard API', async () => {
    const calls = stubBackends({ status: 'approved', response: { type: 'option', respondedBy: 'Dima' } as never });
    const { env, ctx } = setup();

    const response = await worker.fetch(
      rpc('tools/call', {
        name: 'inbox_send',
        arguments: { kind: 'approve', message: 'Deploy to production?' },
      }),
      env,
      ctx
    );
    const { result } = (await response.json()) as { result: { content: Array<{ text: string }>; isError?: boolean } };

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Approved by Dima');

    const created = calls.find((call) => call.url.endsWith('/v1/inbox/messages') && call.method === 'POST');
    expect(created?.url).toBe(`${AGENT_INBOX_API}/v1/inbox/messages`);
    expect(created?.headers.get('Authorization')).toBe('ApiKey account-key');
    // The CLI holds the same key: this is how the API tells an inbox check here from one in a terminal.
    expect(created?.headers.get('Agent-Inbox-Via')).toBe('mcp');
    expect(created?.headers.get('Novu-Analytics-Source')).toBe('mcp');
    expect(created?.body).toMatchObject({
      kind: 'approve',
      to: 'operator_1',
      card: { title: 'Deploy to production?' },
    });
  });

  it('accepts a question lifetime up to five days', async () => {
    const calls = stubBackends();
    const { env, ctx } = setup();

    const response = await worker.fetch(
      rpc('tools/call', {
        name: 'inbox_send',
        arguments: { kind: 'ask', message: 'Still there?', ttl_seconds: 345_600, wait_seconds: 0 },
      }),
      env,
      ctx
    );
    const { result } = (await response.json()) as { result: { isError?: boolean } };

    expect(result.isError).toBeFalsy();
    const created = calls.find((call) => call.url.endsWith('/v1/inbox/messages') && call.method === 'POST');
    expect(created?.body).toMatchObject({ ttlSeconds: 345_600 });
  });

  it('rejects a question lifetime past five days', async () => {
    const { env, ctx } = setup();

    const response = await worker.fetch(
      rpc('tools/call', {
        name: 'inbox_send',
        arguments: { kind: 'ask', message: 'Still there?', ttl_seconds: 5 * 24 * 60 * 60 + 1, wait_seconds: 0 },
      }),
      env,
      ctx
    );
    const { result } = (await response.json()) as { result: { isError?: boolean } };

    expect(result.isError).toBe(true);
  });

  it('passes the full send card and delivery options to the Agent Inbox API', async () => {
    const calls = stubBackends();
    const { env, ctx } = setup();

    const response = await worker.fetch(
      rpc('tools/call', {
        name: 'inbox_send',
        arguments: {
          kind: 'approve',
          message: 'Deploy?',
          to: ['alice', 'bob'],
          via: 'slack',
          from: 'deploy-bot',
          ttl_seconds: 3600,
          wait_seconds: 0,
          icon: 'github',
          subtitle: 'Production',
          body: 'Release v4.2',
          approve_label: 'Ship',
          deny_label: 'Stop',
          extra_actions: ['later:Later', { id: 'details', label: 'Show details' }],
        },
      }),
      env,
      ctx
    );
    const { result } = (await response.json()) as { result: { isError?: boolean } };

    expect(result.isError).toBeFalsy();
    const created = calls.find((call) => call.url.endsWith('/v1/inbox/messages') && call.method === 'POST');
    expect(created?.body).toEqual({
      kind: 'approve',
      to: ['alice', 'bob'],
      via: 'slack',
      from: 'deploy-bot',
      ttlSeconds: 3600,
      card: {
        title: 'Deploy?',
        icon: 'github',
        subtitle: 'Production',
        body: 'Release v4.2',
        approveLabel: 'Ship',
        denyLabel: 'Stop',
        extraActions: [
          { id: 'later', label: 'Later' },
          { id: 'details', label: 'Show details' },
        ],
      },
    });
  });

  it('keeps stable choose option ids and parses id:label shorthand', async () => {
    const calls = stubBackends();
    const { env, ctx } = setup();

    await worker.fetch(
      rpc('tools/call', {
        name: 'inbox_send',
        arguments: {
          kind: 'choose',
          message: 'Strategy?',
          options: ['canary:Canary', { id: 'all', label: 'All at once' }],
          wait_seconds: 0,
        },
      }),
      env,
      ctx
    );

    const created = calls.find((call) => call.url.endsWith('/v1/inbox/messages') && call.method === 'POST');
    expect(created?.body).toMatchObject({
      card: {
        options: [
          { id: 'canary', label: 'Canary' },
          { id: 'all', label: 'All at once' },
        ],
      },
    });
  });

  it('sends a plain message when the kind is left out, as `inbox send <text>` does in the CLI', async () => {
    const calls = stubBackends({ status: 'delivered' });
    const { env, ctx } = setup();

    const response = await worker.fetch(
      rpc('tools/call', { name: 'inbox_send', arguments: { message: 'Deploy finished.' } }),
      env,
      ctx
    );
    const { result } = (await response.json()) as { result: { content: Array<{ text: string }>; isError?: boolean } };

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Delivered.');
    const created = calls.find((call) => call.url.endsWith('/v1/inbox/messages') && call.method === 'POST');
    expect(created?.body).toMatchObject({ kind: 'tell', card: { title: 'Deploy finished.' } });
  });

  it('refuses tell as a kind: a plain message has none', async () => {
    const calls = stubBackends();
    const { env, ctx } = setup();

    const response = await worker.fetch(
      rpc('tools/call', { name: 'inbox_send', arguments: { kind: 'tell', message: 'Deploy finished.' } }),
      env,
      ctx
    );
    const body = (await response.json()) as { result?: { isError?: boolean }; error?: unknown };

    expect(body.error ?? body.result?.isError).toBeTruthy();
    expect(calls.some((call) => call.url.endsWith('/v1/inbox/messages'))).toBe(false);
  });

  it('rejects more than 50 recipients and incompatible kind options', async () => {
    const { env, ctx } = setup();
    const call = (arguments_: Record<string, unknown>) =>
      worker.fetch(rpc('tools/call', { name: 'inbox_send', arguments: arguments_ }), env, ctx);

    const responses = await Promise.all([
      call({ message: 'Hi', to: Array.from({ length: 51 }, (_, index) => `p${index}`) }),
      call({ kind: 'choose', message: 'Pick' }),
      call({ kind: 'ask', message: 'Pick', options: ['A', 'B'] }),
      call({ message: 'Done', approve_label: 'Okay' }),
      call({ message: 'Done', wait_seconds: 1 }),
    ]);

    for (const response of responses) {
      const { result } = (await response.json()) as { result: { isError?: boolean } };
      expect(result.isError).toBe(true);
    }
  });

  it('rejects anyone_may_answer together with named reply contacts', async () => {
    const { env, ctx } = setup();

    const response = await worker.fetch(
      rpc('tools/call', {
        name: 'inbox_reply',
        arguments: {
          conversation: 'conv_1',
          kind: 'ask',
          message: 'Who can answer?',
          to: 'alice',
          anyone_may_answer: true,
        },
      }),
      env,
      ctx
    );
    const { result } = (await response.json()) as { result: { isError?: boolean } };

    expect(result.isError).toBe(true);
  });

  it('sends a verified email address as typed', async () => {
    const calls = stubBackends({
      contactPages: {
        '': {
          data: [{ id: 'alice', channels: [{ via: 'email', address: 'alice@example.com' }] }],
          next: null,
        },
      },
    });
    const { env, ctx } = setup();

    const response = await worker.fetch(
      rpc('tools/call', {
        name: 'inbox_send',
        arguments: { message: 'Hello', to: 'alice@example.com' },
      }),
      env,
      ctx
    );
    const { result } = (await response.json()) as { result: { isError?: boolean } };

    expect(result.isError).toBeFalsy();
    const created = calls.find((call) => call.url.endsWith('/v1/inbox/messages') && call.method === 'POST');
    // A message without a kind is what the API calls `tell`. The address is delivered as typed.
    expect(created?.body).toMatchObject({ kind: 'tell', to: ['alice@example.com'] });
  });

  it('sends a new email address without waiting for verification', async () => {
    const calls = stubBackends();
    const { env, ctx } = setup();

    const response = await worker.fetch(
      rpc('tools/call', {
        name: 'inbox_send',
        arguments: { message: 'Hello', to: 'new@example.com' },
      }),
      env,
      ctx
    );
    const { result } = (await response.json()) as {
      result: { content: Array<{ text: string }>; isError?: boolean };
    };

    expect(result.isError).toBeFalsy();
    const created = calls.find((call) => call.url.endsWith('/v1/inbox/messages') && call.method === 'POST');
    expect(created?.body).toMatchObject({ to: ['new@example.com'] });
    expect(calls.some((call) => call.url.endsWith('/v1/contacts/verifications'))).toBe(false);
  });

  it('does not invite a new email address while replying', async () => {
    const calls = stubBackends();
    const { env, ctx } = setup();

    const response = await worker.fetch(
      rpc('tools/call', {
        name: 'inbox_reply',
        arguments: { conversation: 'conv_1', message: 'Hello', to: 'new@example.com' },
      }),
      env,
      ctx
    );
    const { result } = (await response.json()) as {
      result: { content: Array<{ text: string }>; isError?: boolean };
    };

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not one of your contacts');
    expect(calls.some((call) => call.url.endsWith('/v1/contacts/verifications'))).toBe(false);
  });

  it('remembers whose token it is, so the next call does not ask Clerk again', async () => {
    const calls = stubBackends();
    const { env, ctx } = setup();

    await worker.fetch(rpc('tools/list', {}), env, ctx);
    await worker.fetch(rpc('tools/list', {}), env, ctx);

    expect(calls.filter((call) => call.url.endsWith('/oauth/userinfo'))).toHaveLength(1);
  });

  it('still knows whose token it is from what was remembered before Agent Inbox was US only', async () => {
    const calls = stubBackends();
    const { env, ctx, kv } = setup();
    await worker.fetch(rpc('tools/list', {}), env, ctx);
    const cacheKey = [...kv.values.keys()].find((key) => key.startsWith('token:')) ?? '';
    kv.values.set(cacheKey, JSON.stringify({ agentInboxUserId: 'user_1', region: 'eu' }));
    const before = calls.length;

    const response = await worker.fetch(rpc('tools/list', {}), env, ctx);

    expect(response.status).toBe(200);
    expect(calls.slice(before).map((call) => call.url)).toEqual([`${NOVU_API}/v1/human/accounts/user_1/secret-key`]);
  });

  it('calls the Dashboard API for every tool, and the Novu API only for the account key', async () => {
    const calls = stubBackends();
    const { env, ctx } = setup();
    const callTool = (name: string, arguments_: Record<string, unknown>) =>
      worker.fetch(rpc('tools/call', { name, arguments: arguments_ }), env, ctx);

    await callTool('inbox_send', { kind: 'ask', message: 'Ship it?', wait_seconds: 0 });
    await callTool('inbox_wait', { id: 'hi_1', wait_seconds: 0 });
    // A new email address is delivered as typed. The API creates the contact; this server does not verify it first.
    await callTool('inbox_send', { message: 'Hello', to: 'new@example.com' });
    await callTool('contact_invite', { id: 'alice', name: 'Alice Chen' });
    await callTool('contact_list', {});
    await callTool('inbox_list', {});
    await callTool('inbox_show', { conversation: 'conv_1' });
    await callTool('inbox_read', { conversation: 'conv_1' });
    await callTool('inbox_resolve', { conversation: 'conv_1' });

    const reached = new Set(
      calls.filter((call) => !call.url.startsWith(`${ISSUER}/`)).map((call) => `${call.method} ${call.url}`)
    );
    expect([...reached].sort()).toEqual(
      [
        `GET ${NOVU_API}/v1/human/accounts/user_1/secret-key`,
        `GET ${AGENT_INBOX_API}/v1/operator`,
        `POST ${AGENT_INBOX_API}/v1/inbox/messages`,
        `GET ${AGENT_INBOX_API}/v1/inbox/messages/hi_1`,
        // contact_list reads a page as long as the CLI's. A typed email is sent as-is, so it does not search contacts.
        `GET ${AGENT_INBOX_API}/v1/contacts?limit=50`,
        `POST ${AGENT_INBOX_API}/v1/contacts/invites`,
        `GET ${AGENT_INBOX_API}/v1/inbox`,
        `GET ${AGENT_INBOX_API}/v1/inbox/conv_1`,
        `POST ${AGENT_INBOX_API}/v1/inbox/conv_1/read`,
        `POST ${AGENT_INBOX_API}/v1/inbox/conv_1/resolve`,
      ].sort()
    );

    // The tools act as the account; only the key lookup carries the dashboard's secret.
    for (const call of calls.filter((candidate) => candidate.url.startsWith(`${AGENT_INBOX_API}/`))) {
      expect(call.headers.get('Authorization')).toBe('ApiKey account-key');
      expect(call.headers.get('Agent-Inbox-Via')).toBe('mcp');
      expect(call.headers.has(AGENT_INBOX_DASHBOARD_SECRET_HEADER)).toBe(false);
    }
  });

  it('says it is not connected when the Dashboard API is not configured', async () => {
    const calls = stubBackends();
    const { env, ctx } = setup({ AGENT_INBOX_API_URL: '' });

    const response = await worker.fetch(rpc('tools/list', {}), env, ctx);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'unavailable',
      message: 'This server is not connected to the Agent Inbox API.',
    });
    expect(calls.some((call) => call.url.includes('/secret-key'))).toBe(false);
  });

  it('opens an Agent Inbox account when the sign-in does not have one yet', async () => {
    const calls = stubBackends();
    const { env, ctx } = setup();

    const response = await worker.fetch(rpc('tools/list', {}, 'newcomer-token'), env, ctx);

    expect(response.status).toBe(200);
    expect(
      calls.filter((call) => call.url.includes('/v1/human/accounts')).map((call) => `${call.method} ${call.url}`)
    ).toEqual([
      `GET ${NOVU_API}/v1/human/accounts/user_2/secret-key`,
      `POST ${NOVU_API}/v1/human/accounts`,
      `GET ${NOVU_API}/v1/human/accounts/user_2/secret-key`,
    ]);
    const create = calls.find((call) => call.method === 'POST' && call.url === `${NOVU_API}/v1/human/accounts`);
    expect(create?.body).toEqual({ humanUserId: 'user_2', firstName: 'Ada', lastName: 'Lovelace' });
    expect(create?.headers.get(AGENT_INBOX_DASHBOARD_SECRET_HEADER)).toBe('shared-secret');
  });

  it('says to try again when the account is already being set up', async () => {
    stubBackends({ accountCreateStatus: 409 });
    const { env, ctx } = setup();

    const response = await worker.fetch(rpc('tools/list', {}, 'newcomer-token'), env, ctx);

    expect(response.status).toBe(503);
    expect(((await response.json()) as { message: string }).message).toContain('being set up');
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

    await Promise.all([connect('claude-ai'), connect('cursor-vscode')]);
    await settle();

    const response = await worker.fetch(
      new Request(`${ORIGIN}/connections/user_1`, {
        headers: { [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: 'shared-secret' },
      }),
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
        new Request(`${ORIGIN}/connections/user_1`, {
          headers: secret ? { [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: secret } : {},
        }),
        env,
        ctx
      );

    expect((await ask()).status).toBe(401);
    expect((await ask('wrong')).status).toBe(401);
    expect(await (await ask('shared-secret')).json()).toEqual({ data: { cursor: '2026-10-09T00:00:00.000Z' } });
  });
});

describe('contact_list', () => {
  const listContacts = async (arguments_: Record<string, unknown>) => {
    const { env, ctx } = setup();
    const response = await worker.fetch(rpc('tools/call', { name: 'contact_list', arguments: arguments_ }), env, ctx);
    const { result } = (await response.json()) as { result: { content: Array<{ text: string }>; isError?: boolean } };

    return result;
  };

  it('pages like contact list in the CLI and marks the operator', async () => {
    const calls = stubBackends({
      contactPages: {
        '': {
          data: [
            { id: 'operator_1', email: 'dima@novu.co' },
            { id: 'alice', email: 'alice@acme.com' },
          ],
          next: 'alice',
        },
        alice: { data: [{ id: 'bob' }], next: null },
      },
    });

    const first = await listContacts({});
    expect(first.isError).toBeFalsy();
    expect(first.content[0].text).toContain('operator_1 · dima@novu.co (you)');
    expect(first.content[0].text).toContain('alice · alice@acme.com\n');
    expect(first.content[0].text).toContain('call contact_list with after: "alice"');

    const last = await listContacts({ after: 'alice', limit: 10 });
    expect(last.content[0].text).toBe('bob');
    expect(calls.some((call) => call.url.endsWith('/v1/contacts?limit=10&after=alice'))).toBe(true);
  });

  it('says there is nobody yet, and that a page past the end has no more', async () => {
    stubBackends({ contactPages: { '': { data: [], next: null } } });

    expect((await listContacts({})).content[0].text).toContain('There is nobody to reach yet');
    expect((await listContacts({ after: 'zed' })).content[0].text).toBe('No more contacts.');
  });
});

describe('hostOfClientName', () => {
  it('knows each host by the name it connects with, and Claude Code is not Claude', () => {
    expect(hostOfClientName('claude-code')).toBe('claude-code');
    expect(hostOfClientName('claude-ai')).toBe('claude');
    expect(hostOfClientName('Anthropic')).toBe('claude');
    expect(hostOfClientName('Anthropic/ClaudeAI')).toBe('claude');
    expect(hostOfClientName('codex-mcp-client')).toBe('codex');
    expect(hostOfClientName(' Cursor-VSCode ')).toBe('cursor');
    expect(hostOfClientName('opencode')).toBe('opencode');
    expect(hostOfClientName('hermes-agent')).toBe('hermes');
    expect(hostOfClientName('openclaw-bundle-mcp')).toBe('openclaw');
    expect(hostOfClientName('openai-mcp')).toBe('chatgpt');
    expect(hostOfClientName('ChatGPT')).toBe('chatgpt');
  });

  it('knows no host for any other name, nor for one that only starts like Claude Code', () => {
    expect(hostOfClientName('Visual Studio Code')).toBe(null);
    expect(hostOfClientName('gemini-cli-mcp-client')).toBe(null);
    expect(hostOfClientName('claude-desktop')).toBe(null);
    expect(hostOfClientName('claude-code-but-not-really')).toBe(null);
    expect(hostOfClientName('')).toBe(null);
  });
});

describe('hostOfUserAgent', () => {
  it('knows the apps that name themselves on every request', () => {
    expect(hostOfUserAgent('claude-code/2.1.309 (cli)')).toBe('claude-code');
    expect(hostOfUserAgent('codex-mcp-client/0.160.0')).toBe('codex');
    expect(hostOfUserAgent('Cursor/3.25.6 (darwin arm64)')).toBe('cursor');
  });

  it('knows no host from any other', () => {
    expect(hostOfUserAgent('node')).toBe(null);
    expect(hostOfUserAgent('python-httpx/0.28.1')).toBe(null);
    expect(hostOfUserAgent(null)).toBe(null);
  });
});

describe('hostOfSession', () => {
  it('reads the host back from a session id it handed out', () => {
    expect(hostOfSession(sessionIdFor('chatgpt'))).toBe('chatgpt');
    expect(hostOfSession(sessionIdFor('claude-code'))).toBe('claude-code');
  });

  it('knows no host for a session id from elsewhere, or none', () => {
    expect(hostOfSession('6f1c8f3e-2b1a-4c1e-9d55-6c9c0b1f2a3d')).toBe(null);
    expect(hostOfSession('windsurf.6f1c8f3e')).toBe(null);
    expect(hostOfSession('')).toBe(null);
    expect(hostOfSession(null)).toBe(null);
  });
});

describe('waiting for an answer', () => {
  it('stops at the time limit and says how to keep waiting', async () => {
    const api = { get: vi.fn(async () => ({ id: 'hi_1', kind: 'ask', status: 'pending' })), post: vi.fn() };

    const interaction = await waitForAnswer(api as never, 'hi_1', 0);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(describeOutcome(interaction as Interaction)).toContain('call inbox_wait with id "hi_1"');
  });

  it('hands back the id of a request it just sent when the checks for an answer fail', async () => {
    const api = { get: vi.fn().mockRejectedValue(new Error('stalled')), post: vi.fn() };
    const sent: Interaction = { id: 'hi_1', kind: 'approve', status: 'pending' };

    vi.useFakeTimers();

    const interaction = await waitForAnswer(api as never, sent, 4, async (ms) => void vi.advanceTimersByTime(ms));
    vi.useRealTimers();

    expect(api.get).toHaveBeenCalled();
    expect(describeOutcome(interaction)).toContain('call inbox_wait with id "hi_1"');
  });

  it('gives a check no longer than what is left of the wait', async () => {
    const api = { get: vi.fn(async () => ({ id: 'hi_1', kind: 'ask', status: 'pending' })), post: vi.fn() };

    await waitForAnswer(api as never, 'hi_1', 3);

    const timeoutMs = Number(api.get.mock.calls[0]?.at(2));
    expect(timeoutMs).toBeGreaterThan(0);
    expect(timeoutMs).toBeLessThanOrEqual(3000);
  });

  it('gives sending longer than other calls, and says a send without an answer may still arrive', async () => {
    const post = vi.fn().mockRejectedValue(new AgentInboxApiError(0, 'Could not reach the Agent Inbox API.'));
    const api = { get: vi.fn(), post };

    await expect(
      sendInteraction(api as never, { kind: 'approve', card: { title: 'Deploy?' }, to: 'alice' })
    ).rejects.toThrow('do not send it again right away');
    expect(post.mock.calls[0][2]).toBeGreaterThan(15_000);
  });

  it('keeps a partial delivery and reports the contacts that failed', async () => {
    const api = {
      get: vi.fn(),
      post: vi.fn(async () => ({
        id: 'hi_1',
        kind: 'tell',
        status: 'delivered',
        failedTo: ['bob'],
      })),
    };

    const interaction = await sendInteraction(api as never, {
      kind: 'tell',
      card: { title: 'Done' },
      to: ['alice', 'bob'],
    });

    expect(describeOutcome(interaction as Interaction)).toContain('delivery failed for bob');
  });

  it('fails when delivery failed for every recipient', async () => {
    const api = {
      get: vi.fn(),
      post: vi.fn(async () => ({
        id: 'hi_1',
        kind: 'tell',
        status: 'delivered',
        failedTo: ['alice', 'bob'],
      })),
    };

    await expect(
      sendInteraction(api as never, {
        kind: 'tell',
        card: { title: 'Done' },
        to: ['alice', 'bob'],
      })
    ).rejects.toThrow('could not be delivered');
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

  it('keeps a partial delivery warning after a check that does not return failedTo', async () => {
    const api = {
      get: vi.fn(async () => ({ id: 'hi_1', kind: 'ask', status: 'pending' })),
      post: vi.fn(),
    };
    const sent: Interaction = {
      id: 'hi_1',
      kind: 'ask',
      status: 'pending',
      failedTo: ['bob'],
    };

    const interaction = await waitForAnswer(api as never, sent, 5, async () => undefined);
    const outcome = describeOutcome(interaction);

    expect(api.get).toHaveBeenCalled();
    expect(outcome).toContain('still open');
    expect(outcome).toContain('delivery failed for bob');
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
      '/v1/inbox/messages',
      { kind: 'ask', card: { title: 'Hi?' }, thread: 'conv_1', anyoneMayAnswer: true },
      expect.any(Number)
    );
    expect(api.get).not.toHaveBeenCalled();
  });
});
