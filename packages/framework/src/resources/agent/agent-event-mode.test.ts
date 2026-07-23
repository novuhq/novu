import { afterEach, describe, expect, it, vi } from 'vitest';

import { agent } from './agent.resource';
import type { AgentBridgeRequest } from './agent.types';
import { dispatchAgentEvent } from './agent-dispatch';
import { createMockBridgeRequest } from './bridge-request.fixture';

describe('event mode (AgentEvent protocol)', () => {
  const EVENTS_URL = 'https://api.novu.co/v1/agents/events';
  const REPLY_URL = 'https://api.novu.co/v1/agents/test-bot/reply';

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function eventModeBridge(overrides?: Partial<AgentBridgeRequest>): AgentBridgeRequest {
    return createMockBridgeRequest({
      eventsUrl: EVENTS_URL,
      ...overrides,
    });
  }

  function stubEventModeFetch() {
    const eventBatches: Array<{ sequence: number; event: { type: string; [key: string]: unknown } }[]> = [];
    const replyPosts: Record<string, unknown>[] = [];

    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => '00000000-0000-4000-8000-000000000001'),
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: { body?: string }) => {
        if (url === EVENTS_URL) {
          const body = JSON.parse(init!.body!);
          eventBatches.push(body.events);

          return new Response(
            JSON.stringify({
              data: {
                results: body.events.map((envelope: { sequence: number }) => ({
                  sequence: envelope.sequence,
                  status: 'accepted',
                })),
              },
            }),
            { status: 200 }
          );
        }

        if (url === REPLY_URL) {
          replyPosts.push(JSON.parse(init!.body!));

          return new Response(JSON.stringify({ data: { messageId: 'msg-legacy', platformThreadId: 'thread-1' } }), {
            status: 200,
          });
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      })
    );

    return { eventBatches, replyPosts };
  }

  it('reply emits message with minted id and returns handle exposing it', async () => {
    const { eventBatches } = stubEventModeFetch();
    let handleMessageId = '';

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          const handle = await ctx.reply('Hello from event mode');
          handleMessageId = handle.messageId;
          expect(handle.platformThreadId).toBe('');
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches).toHaveLength(3);
    expect(eventBatches[0]).toHaveLength(2);
    expect(eventBatches[0][0].event).toEqual({ type: 'run-start' });
    expect(eventBatches[0][1].event).toEqual({
      type: 'message',
      messageId: 'msg_00000000-0000-4000-8000-000000000001',
      content: { markdown: 'Hello from event mode' },
    });
    expect(eventBatches[1][0].event).toEqual({ type: 'run-finish', outcome: 'completed' });
    expect(eventBatches[2][0].event).toEqual({ type: 'channel.typing', state: 'off' });
    expect(handleMessageId).toBe('msg_00000000-0000-4000-8000-000000000001');
  });

  it('reply with url file emits AgentFileRef including url', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          await ctx.reply('Here is the report', {
            files: [{ filename: 'report.pdf', url: 'https://example.com/report.pdf' }],
          });
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches[0][1].event).toEqual({
      type: 'message',
      messageId: 'msg_00000000-0000-4000-8000-000000000001',
      content: { markdown: 'Here is the report' },
      files: [
        {
          fileId: 'report.pdf',
          name: 'report.pdf',
          url: 'https://example.com/report.pdf',
        },
      ],
    });
  });

  it('handle.edit emits channel.edit with the same message id', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          const handle = await ctx.reply('Draft');
          await handle.edit('Final');
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches).toHaveLength(4);
    expect(eventBatches[0][0].event).toEqual({ type: 'run-start' });
    expect(eventBatches[0][1].event.type).toBe('message');
    expect(eventBatches[1][0].event).toEqual({
      type: 'channel.edit',
      messageId: 'msg_00000000-0000-4000-8000-000000000001',
      content: { markdown: 'Final' },
    });
    expect(eventBatches[2][0].event).toEqual({ type: 'run-finish', outcome: 'completed' });
    expect(eventBatches[3][0].event).toEqual({ type: 'channel.typing', state: 'off' });
  });

  it('typing emits channel.typing events', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          await ctx.typing('Searching…');
          await ctx.typing.stop();
          await ctx.reply('Done');
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches[0][0].event).toEqual({ type: 'run-start' });
    expect(eventBatches[0][1].event).toEqual({
      type: 'channel.typing',
      state: 'on',
      status: 'Searching…',
    });
    expect(eventBatches[1][0].event).toEqual({ type: 'channel.typing', state: 'off' });
    expect(eventBatches[2][0].event.type).toBe('message');
    expect(eventBatches[3][0].event).toEqual({ type: 'run-finish', outcome: 'completed' });
    expect(eventBatches[4][0].event).toEqual({ type: 'channel.typing', state: 'off' });
  });

  it('batches queued signal then message in one flush on reply', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          ctx.metadata.set('language', 'en');
          await ctx.reply('Got it');
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches).toHaveLength(3);
    expect(eventBatches[0]).toHaveLength(3);
    expect(eventBatches[0][0].event).toEqual({ type: 'run-start' });
    expect(eventBatches[0][1].event).toEqual({
      type: 'signal',
      signal: { type: 'metadata', action: 'set', key: 'language', value: 'en' },
    });
    expect(eventBatches[0][2].event).toMatchObject({
      type: 'message',
      content: { markdown: 'Got it' },
    });
    expect(eventBatches[1][0].event).toEqual({ type: 'run-finish', outcome: 'completed' });
    expect(eventBatches[2][0].event).toEqual({ type: 'channel.typing', state: 'off' });
  });

  it('legacy mode without eventsUrl still POSTs to replyUrl', async () => {
    const { eventBatches, replyPosts } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          await ctx.reply('Legacy reply');
        },
      }),
      event: 'onMessage',
      bridge: createMockBridgeRequest(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches).toHaveLength(0);
    expect(replyPosts).toHaveLength(2);
    expect(replyPosts[0].reply).toEqual({ markdown: 'Legacy reply' });
    expect(replyPosts[1].typing).toBe('stop');
  });

  it('replyApprovalCard drains tool-approval-request without a message event', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          await ctx.toolApproval.request({ id: 'tc-1', name: 'doIt', input: { x: 1 } });
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches).toHaveLength(3);
    expect(eventBatches[0]).toHaveLength(2);
    expect(eventBatches[0][0].event).toEqual({ type: 'run-start' });
    expect(eventBatches[0][1].event).toEqual({
      type: 'tool-approval-request',
      approvalId: 'tc-1',
      toolUseId: 'tc-1',
      toolName: 'doIt',
      input: { x: 1 },
      deliverCard: true,
    });
    expect(eventBatches[0].some((envelope) => envelope.event.type === 'message')).toBe(false);
    expect(eventBatches[1][0].event).toEqual({ type: 'run-finish', outcome: 'completed' });
    expect(eventBatches[2][0].event).toEqual({ type: 'channel.typing', state: 'off' });
  });

  function flattenEventTypes(
    eventBatches: Array<{ sequence: number; event: { type: string; [key: string]: unknown } }[]>
  ) {
    return eventBatches.flat().map((envelope) => envelope.event);
  }

  it('brackets successful dispatch with run-start first and run-finish last', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async (_message, ctx) => {
          await ctx.reply('Hello');
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    const events = flattenEventTypes(eventBatches);
    expect(events[0]).toEqual({ type: 'run-start' });
    expect(events.some((event) => event.type === 'run-error')).toBe(false);

    const runFinishIndex = events.findIndex((event) => event.type === 'run-finish');
    expect(runFinishIndex).toBeGreaterThan(-1);
    expect(events[runFinishIndex]).toEqual({ type: 'run-finish', outcome: 'completed' });
    expect(events.slice(runFinishIndex + 1).every((event) => event.type === 'channel.typing')).toBe(true);
  });

  it('emits run-error without run-finish when handler throws and onError is absent', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async () => {
          throw new Error('boom');
        },
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    const events = flattenEventTypes(eventBatches);
    expect(events[0]).toEqual({ type: 'run-start' });
    expect(events.some((event) => event.type === 'run-error' && event.message === 'boom')).toBe(true);
    expect(events.some((event) => event.type === 'run-finish')).toBe(false);
  });

  it('emits message and run-finish when onError replies after handler throw', async () => {
    const { eventBatches } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async () => {
          throw new Error('handler blew up');
        },
        onError: async () => 'recovered',
      }),
      event: 'onMessage',
      bridge: eventModeBridge(),
      secretKey: 'test-secret-key',
    });

    const events = flattenEventTypes(eventBatches);
    expect(
      events.some(
        (event) =>
          event.type === 'message' && (event as { content?: { markdown?: string } }).content?.markdown === 'recovered'
      )
    ).toBe(true);
    expect(events.some((event) => event.type === 'run-finish' && event.outcome === 'completed')).toBe(true);
    expect(events.some((event) => event.type === 'run-error')).toBe(false);
  });

  it('legacy error path does not call events endpoint', async () => {
    const { eventBatches, replyPosts } = stubEventModeFetch();

    await dispatchAgentEvent({
      agent: agent('test-bot', {
        onMessage: async () => {
          throw new Error('fail');
        },
      }),
      event: 'onMessage',
      bridge: createMockBridgeRequest(),
      secretKey: 'test-secret-key',
    });

    expect(eventBatches).toHaveLength(0);
    expect(replyPosts.some((body) => body.error === true)).toBe(true);
  });
});
