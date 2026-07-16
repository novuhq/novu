import { type Context } from 'hono';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { Client } from '../client';
import { PostActionEnum } from '../constants';
import { agent } from '../resources/agent/agent.resource';
import type { AgentMessage, AgentMessageContext } from '../resources/agent/agent.types';
import { createMockBridgeRequest } from '../resources/agent/bridge-request.fixture';
import { serve } from './hono';

type OnMessageMock = Mock<(message: AgentMessage, ctx: AgentMessageContext) => Promise<void>>;

function createMockHonoContext({
  executionCtx,
}: {
  executionCtx?: { waitUntil: (promise: Promise<unknown>) => void };
}) {
  const url = `http://localhost/api/novu?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`;

  return {
    req: {
      json: () => Promise.resolve(createMockBridgeRequest()),
      header: () => undefined,
      method: 'POST',
      query: () => undefined,
      url,
    },
    get executionCtx() {
      if (!executionCtx) {
        // Mirrors Hono's behavior on runtimes without an execution context (e.g. Node.js).
        throw new Error('This context has no ExecutionContext');
      }

      return executionCtx;
    },
  } as unknown as Context;
}

describe('hono serve() waitUntil wiring', () => {
  let client: Client;
  let onMessageSpy: OnMessageMock;
  const originalFetch = global.fetch;

  beforeEach(() => {
    client = new Client({ secretKey: 'test-secret-key', strictAuthentication: false });
    onMessageSpy = vi.fn(async () => {});
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: { status: 'ok' } })),
      json: () => Promise.resolve({ data: { status: 'ok' } }),
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('passes the agent dispatch promise to the execution context on Cloudflare Workers', async () => {
    const waitUntil = vi.fn();
    const handler = serve({ agents: [agent('test-bot', { onMessage: onMessageSpy })], client });

    const response = await handler(createMockHonoContext({ executionCtx: { waitUntil } }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ack' });
    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(waitUntil.mock.calls[0][0]).toBeInstanceOf(Promise);

    await waitUntil.mock.calls[0][0];
    expect(onMessageSpy).toHaveBeenCalledTimes(1);
  });

  it('still acks when the runtime has no execution context (e.g. Node.js)', async () => {
    const handler = serve({ agents: [agent('test-bot', { onMessage: onMessageSpy })], client });

    const response = await handler(createMockHonoContext({}));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ack' });

    await vi.waitFor(() => expect(onMessageSpy).toHaveBeenCalledTimes(1));
  });

  it('prefers an explicit serve({ waitUntil }) over the execution context', async () => {
    const executionCtxWaitUntil = vi.fn();
    const optionWaitUntil = vi.fn();
    const handler = serve({
      agents: [agent('test-bot', { onMessage: onMessageSpy })],
      client,
      waitUntil: optionWaitUntil,
    });

    const response = await handler(createMockHonoContext({ executionCtx: { waitUntil: executionCtxWaitUntil } }));

    expect(response.status).toBe(200);
    expect(optionWaitUntil).toHaveBeenCalledTimes(1);
    expect(executionCtxWaitUntil).not.toHaveBeenCalled();

    await optionWaitUntil.mock.calls[0][0];
    expect(onMessageSpy).toHaveBeenCalledTimes(1);
  });
});
