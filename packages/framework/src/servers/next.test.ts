import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { Client } from '../client';
import { PostActionEnum } from '../constants';
import { agent } from '../resources/agent/agent.resource';
import type { AgentMessage, AgentMessageContext } from '../resources/agent/agent.types';
import { createMockBridgeRequest } from '../resources/agent/bridge-request.fixture';

type OnMessageMock = Mock<(message: AgentMessage, ctx: AgentMessageContext) => Promise<void>>;

/**
 * The adapter feature-detects `after()` from `next/server.js` at module scope, so
 * each scenario mocks `next/server.js` and re-imports the adapter with a fresh
 * module registry.
 */
async function importServeWithNextServerMock(nextServerExports: Record<string, unknown>) {
  vi.doMock('next/server.js', () => nextServerExports);
  const { serve } = await import('./next');

  return serve;
}

function createMockNextRequest() {
  return {
    method: 'POST',
    url: `http://localhost/api/novu?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`,
    headers: new Headers({ host: 'localhost' }),
    json: () => Promise.resolve(createMockBridgeRequest()),
  };
}

describe('next serve() waitUntil wiring', () => {
  let client: Client;
  let onMessageSpy: OnMessageMock;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
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
    vi.doUnmock('next/server.js');
    vi.restoreAllMocks();
  });

  it('passes the agent dispatch promise to after() when available (Next.js >= 15.1)', async () => {
    const afterMock = vi.fn();
    const serve = await importServeWithNextServerMock({ after: afterMock });

    const { POST } = serve({ agents: [agent('test-bot', { onMessage: onMessageSpy })], client });
    const response = await POST(createMockNextRequest() as never, undefined);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ack' });
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(afterMock.mock.calls[0][0]).toBeInstanceOf(Promise);

    await afterMock.mock.calls[0][0];
    expect(onMessageSpy).toHaveBeenCalledTimes(1);
  });

  it('acks without a waitUntil when after() is not exported (Next.js < 15.1)', async () => {
    // `after: undefined` mimics older Next.js versions where the export does not exist.
    const serve = await importServeWithNextServerMock({ after: undefined });

    const { POST } = serve({ agents: [agent('test-bot', { onMessage: onMessageSpy })], client });
    const response = await POST(createMockNextRequest() as never, undefined);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ack' });

    await vi.waitFor(() => expect(onMessageSpy).toHaveBeenCalledTimes(1));
  });

  it('still acks when after() throws (pages router, outside App Router request scope)', async () => {
    const afterMock = vi.fn(() => {
      throw new Error('`after` was called outside a request scope');
    });
    const serve = await importServeWithNextServerMock({ after: afterMock });

    const { POST } = serve({ agents: [agent('test-bot', { onMessage: onMessageSpy })], client });
    const response = await POST(createMockNextRequest() as never, undefined);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ack' });
    expect(afterMock).toHaveBeenCalledTimes(1);

    await vi.waitFor(() => expect(onMessageSpy).toHaveBeenCalledTimes(1));
  });

  it('prefers an explicit serve({ waitUntil }) over after()', async () => {
    const afterMock = vi.fn();
    const serve = await importServeWithNextServerMock({ after: afterMock });
    const waitUntil = vi.fn();

    const { POST } = serve({ agents: [agent('test-bot', { onMessage: onMessageSpy })], client, waitUntil });
    const response = await POST(createMockNextRequest() as never, undefined);

    expect(response.status).toBe(200);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(afterMock).not.toHaveBeenCalled();

    await waitUntil.mock.calls[0][0];
    expect(onMessageSpy).toHaveBeenCalledTimes(1);
  });
});
