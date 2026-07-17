import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { Client } from './client';
import { PostActionEnum } from './constants';
import { type IActionResponse, NovuRequestHandler } from './handler';
import { agent } from './resources/agent/agent.resource';
import type { AgentMessage, AgentMessageContext } from './resources/agent/agent.types';
import { createMockBridgeRequest } from './resources/agent/bridge-request.fixture';
import type { Logger } from './types';

type OnMessageMock = Mock<(message: AgentMessage, ctx: AgentMessageContext) => Promise<void>>;

describe('agent event waitUntil', () => {
  let logger: Logger;
  let client: Client;
  let onMessageSpy: OnMessageMock;
  const originalFetch = global.fetch;

  beforeEach(() => {
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    client = new Client({ secretKey: 'test-secret-key', strictAuthentication: false, logger });
    onMessageSpy = vi.fn(async () => {});
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: { status: 'ok' } })),
      json: () => Promise.resolve({ data: { status: 'ok' } }),
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function buildHandler({
    optionWaitUntil,
    adapterWaitUntil,
  }: {
    optionWaitUntil?: (promise: Promise<unknown>) => void;
    adapterWaitUntil?: (promise: Promise<unknown>) => void;
  }) {
    const testBot = agent('test-bot', { onMessage: onMessageSpy });

    const handler = new NovuRequestHandler({
      frameworkName: 'test',
      agents: [testBot],
      client,
      waitUntil: optionWaitUntil,
      handler: () => {
        const url = new URL(`http://localhost?action=${PostActionEnum.AGENT_EVENT}&agentId=test-bot&event=onMessage`);

        return {
          body: () => createMockBridgeRequest(),
          headers: () => null,
          method: () => 'POST',
          url: () => url,
          transformResponse: (res: IActionResponse<string>) => res,
          waitUntil: adapterWaitUntil,
        };
      },
    });

    return handler.createHandler();
  }

  it('passes the dispatch promise to the serve() waitUntil option and still acks immediately', async () => {
    const waitUntil = vi.fn();
    const handler = buildHandler({ optionWaitUntil: waitUntil });

    const result = await handler();

    expect(result.status).toBe(200);
    expect(JSON.parse(result.body).status).toBe('ack');
    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(waitUntil.mock.calls[0][0]).toBeInstanceOf(Promise);

    await waitUntil.mock.calls[0][0];
    expect(onMessageSpy).toHaveBeenCalledTimes(1);
  });

  it('uses the adapter-provided waitUntil when no option is given', async () => {
    const adapterWaitUntil = vi.fn();
    const handler = buildHandler({ adapterWaitUntil });

    const result = await handler();

    expect(result.status).toBe(200);
    expect(adapterWaitUntil).toHaveBeenCalledTimes(1);

    await adapterWaitUntil.mock.calls[0][0];
    expect(onMessageSpy).toHaveBeenCalledTimes(1);
  });

  it('prefers the explicit serve() option over the adapter-provided waitUntil', async () => {
    const optionWaitUntil = vi.fn();
    const adapterWaitUntil = vi.fn();
    const handler = buildHandler({ optionWaitUntil, adapterWaitUntil });

    await handler();

    expect(optionWaitUntil).toHaveBeenCalledTimes(1);
    expect(adapterWaitUntil).not.toHaveBeenCalled();

    await optionWaitUntil.mock.calls[0][0];
  });

  it('warns when acking without waitUntil on Vercel', async () => {
    vi.stubEnv('VERCEL', '1');
    const handler = buildHandler({});

    const result = await handler();

    expect(result.status).toBe(200);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logger.warn).mock.calls[0][0]).toContain('Vercel');
    expect(vi.mocked(logger.warn).mock.calls[0][0]).toContain('waitUntil');

    await vi.waitFor(() => expect(onMessageSpy).toHaveBeenCalledTimes(1));
  });

  it('warns when acking without waitUntil on AWS Lambda', async () => {
    vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', 'my-function');
    const handler = buildHandler({});

    await handler();

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logger.warn).mock.calls[0][0]).toContain('AWS Lambda');

    await vi.waitFor(() => expect(onMessageSpy).toHaveBeenCalledTimes(1));
  });

  it('does not warn when a waitUntil is available, even on a serverless platform', async () => {
    vi.stubEnv('VERCEL', '1');
    const waitUntil = vi.fn();
    const handler = buildHandler({ optionWaitUntil: waitUntil });

    await handler();

    expect(logger.warn).not.toHaveBeenCalled();

    await waitUntil.mock.calls[0][0];
  });

  it('does not warn on long-lived runtimes without waitUntil', async () => {
    const handler = buildHandler({});

    const result = await handler();

    expect(result.status).toBe(200);
    expect(logger.warn).not.toHaveBeenCalled();

    await vi.waitFor(() => expect(onMessageSpy).toHaveBeenCalledTimes(1));
  });
});
