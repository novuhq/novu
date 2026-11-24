import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import { createApiClient } from '../api/client';
import { serveConversationTools } from './conversation-tools';
import { FakeApi } from './fake-api.fixture';

let api: FakeApi | undefined;

afterEach(async () => {
  await api?.stop();
  api = undefined;
});

/** The server on a pair of streams, and a way to talk to it as a host does: one JSON-RPC message a line. */
async function serve(conversationId = 'conv_1') {
  api = await new FakeApi().start();
  const input = new PassThrough();
  const output = new PassThrough();
  const served = serveConversationTools(input, output, {
    client: createApiClient({ apiUrl: api.url, secretKey: 'sk_test' }),
    conversationId,
    agentIdentifier: 'human-relay',
    version: '9.9.9',
  });
  const answers: Array<Record<string, unknown>> = [];
  let buffered = '';
  output.on('data', (chunk: Buffer) => {
    buffered += chunk.toString();
    const lines = buffered.split('\n');
    buffered = lines.pop() ?? '';
    answers.push(...lines.filter(Boolean).map((line) => JSON.parse(line) as Record<string, unknown>));
  });
  let next = 1;
  const request = async (method: string, params?: unknown) => {
    const id = next++;
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) })}\n`);
    for (let tries = 0; tries < 200; tries++) {
      const answer = answers.find((each) => each.id === id);
      if (answer) {
        return answer;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`No answer to ${method}`);
  };

  return { api, input, request, served };
}

describe('serveConversationTools', () => {
  it('speaks MCP: the version the host asks for when it knows it, its two tools, and pings', async () => {
    const { request } = await serve();

    expect(await request('initialize', { protocolVersion: '2025-03-26', capabilities: {} })).toMatchObject({
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'agentinbox-conversation', version: '9.9.9' },
      },
    });
    expect(await request('initialize', { protocolVersion: '1999-01-01' })).toMatchObject({
      result: { protocolVersion: '2025-06-18' },
    });
    const listed = (await request('tools/list')) as { result: { tools: Array<{ name: string }> } };
    expect(listed.result.tools.map((tool) => tool.name)).toEqual(['read', 'resolve']);
    expect(await request('ping')).toMatchObject({ result: {} });
    expect(await request('resources/list')).toMatchObject({ error: { code: -32601 } });
  });

  it('reads its own conversation, and only that one: no tool takes another', async () => {
    const { api: fake, request } = await serve('conv_ben');
    fake.deliver({ text: 'Where is my order?', conversationId: 'conv_ben' });
    fake.deliver({ text: 'Anna’s secret', conversationId: 'conv_anna' });

    const read = (await request('tools/call', {
      name: 'read',
      arguments: { limit: 5, conversation: 'conv_anna' },
    })) as { result: { content: Array<{ text: string }> } };

    expect(read.result.content[0].text).toContain('Where is my order?');
    expect(read.result.content[0].text).not.toContain('Anna’s secret');
    expect(fake.calls.filter((call) => call.method === 'GET').map((call) => call.path)).toEqual(['/v1/inbox/conv_ben']);
  });

  it('leaves resolving to the listener, and says when a tool isn’t there', async () => {
    const { api: fake, request } = await serve();

    expect(await request('tools/call', { name: 'resolve', arguments: {} })).toMatchObject({
      result: { content: [{ type: 'text', text: 'Done: this conversation is resolved once your reply is sent.' }] },
    });
    expect(fake.calls.some((call) => call.path.endsWith('/resolve'))).toBe(false);
    expect(await request('tools/call', { name: 'inbox_send', arguments: {} })).toMatchObject({
      result: { isError: true },
    });
  });

  it('ends when the host closes its input', async () => {
    const { input, served } = await serve();

    input.end();

    await expect(served).resolves.toBeUndefined();
  });
});
