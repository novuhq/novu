import { afterEach, describe, expect, it, vi } from 'vitest';
import { agent } from './agent.resource';
import { dispatchAgentEvent } from './agent-dispatch';
import { createMockBridgeRequest } from './bridge-request.fixture';

type WireEvent = { type: string; [key: string]: unknown };

/** Stubs the ingest endpoint; with `abortOnTyping`, a post carrying a typing status answers `abortTurn`. */
function stubIngest({ abortOnTyping = false } = {}) {
  const posted: WireEvent[][] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      const events = (JSON.parse(init.body).events as Array<{ event: WireEvent }>).map((envelope) => envelope.event);
      posted.push(events);
      const isTyping = events.some((event) => event.type === 'channel.typing' && event.state === 'on');

      return new Response(JSON.stringify({ data: abortOnTyping && isTyping ? { abortTurn: true } : null }), {
        status: 200,
      });
    })
  );

  return {
    posted,
    events: () => posted.flat(),
  };
}

describe('stopping a turn', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('aborts ctx.signal when Novu answers a delivery with abortTurn, and ends the turn as aborted without onError', async () => {
    const ingest = stubIngest({ abortOnTyping: true });
    const onError = vi.fn();
    let signalAfterTyping: boolean | undefined;
    const testAgent = agent('a', {
      onMessage: async (_message, ctx) => {
        await ctx.typing('Working…');
        signalAfterTyping = ctx.signal.aborted;
        ctx.signal.throwIfAborted();
      },
      onError,
    });

    await dispatchAgentEvent({
      agent: testAgent,
      event: 'onMessage',
      bridge: createMockBridgeRequest(),
      secretKey: 's',
    });

    expect(signalAfterTyping).toBe(true);
    expect(onError).not.toHaveBeenCalled();
    const types = ingest.events().map((event) => event.type);
    expect(types).not.toContain('run-error');
    expect(ingest.events().filter((event) => event.type === 'run-finish')).toEqual([
      { type: 'run-finish', outcome: 'aborted' },
    ]);
  });

  it('sends nothing but the run-finish after the abort', async () => {
    const ingest = stubIngest({ abortOnTyping: true });
    const testAgent = agent('a', {
      onMessage: async (_message, ctx) => {
        await ctx.typing('Working…');
        await ctx.emit({ name: 'progress', data: {} });

        return 'done anyway';
      },
    });

    await dispatchAgentEvent({
      agent: testAgent,
      event: 'onMessage',
      bridge: createMockBridgeRequest(),
      secretKey: 's',
    });

    const afterAbort = ingest.posted.slice(1).flat();
    expect(afterAbort).toEqual([{ type: 'run-finish', outcome: 'aborted' }]);
  });

  it('reports aborted when the handler returns normally after the stop', async () => {
    const ingest = stubIngest({ abortOnTyping: true });
    const testAgent = agent('a', {
      onMessage: async (_message, ctx) => {
        await ctx.typing();
      },
    });

    await dispatchAgentEvent({
      agent: testAgent,
      event: 'onMessage',
      bridge: createMockBridgeRequest(),
      secretKey: 's',
    });

    expect(ingest.events().filter((event) => event.type === 'run-finish')).toEqual([
      { type: 'run-finish', outcome: 'aborted' },
    ]);
  });

  it('stops reading a returned reply stream once aborted', async () => {
    stubIngest({ abortOnTyping: true });
    const read: string[] = [];
    const testAgent = agent('a', {
      onMessage: async (_message, ctx) => {
        async function* stream() {
          read.push('one');
          yield 'one';
          await ctx.typing();
          read.push('two');
          yield 'two';
          read.push('three');
          yield 'three';
        }

        return stream();
      },
    });

    await dispatchAgentEvent({
      agent: testAgent,
      event: 'onMessage',
      bridge: createMockBridgeRequest(),
      secretKey: 's',
    });

    expect(read).toEqual(['one', 'two']);
  });
});

describe('onAbort', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const abortBridge = () =>
    createMockBridgeRequest({
      event: 'onAbort',
      message: null,
      abortedTurn: { turnId: 'del-stopped', platformMessageId: 'msg-stopped' },
    });

  it('routes onAbort with the stopped turn and posts its reply', async () => {
    const ingest = stubIngest();
    const onAbort = vi.fn(async () => 'Stopped. Want to undo?');
    const testAgent = agent('a', { onMessage: async () => undefined, onAbort });

    await dispatchAgentEvent({ agent: testAgent, event: 'onAbort', bridge: abortBridge(), secretKey: 's' });

    expect(onAbort).toHaveBeenCalledTimes(1);
    const [ctx] = onAbort.mock.calls[0] as unknown as [{ event: string; abortedTurn: unknown }];
    expect(ctx.event).toBe('onAbort');
    expect(ctx.abortedTurn).toEqual({ turnId: 'del-stopped', platformMessageId: 'msg-stopped' });
    const message = ingest.events().find((event) => event.type === 'message');
    expect((message?.content as { markdown?: string }).markdown).toBe('Stopped. Want to undo?');
    expect(ingest.events().filter((event) => event.type === 'run-finish')).toEqual([
      { type: 'run-finish', outcome: 'completed' },
    ]);
  });

  it('posts nothing, not even an empty run, when the agent has no onAbort handler', async () => {
    const ingest = stubIngest();
    const onError = vi.fn();
    const testAgent = agent('a', { onMessage: async () => undefined, onError });

    await dispatchAgentEvent({ agent: testAgent, event: 'onAbort', bridge: abortBridge(), secretKey: 's' });

    expect(onError).not.toHaveBeenCalled();
    expect(ingest.posted).toEqual([]);
  });

  it('posts nothing for an onAbort delivery that names no stopped turn', async () => {
    const ingest = stubIngest();
    const onAbort = vi.fn(async () => 'Stopped.');
    const testAgent = agent('a', { onMessage: async () => undefined, onAbort });

    await dispatchAgentEvent({
      agent: testAgent,
      event: 'onAbort',
      bridge: createMockBridgeRequest({ event: 'onAbort', message: null }),
      secretKey: 's',
    });

    expect(onAbort).not.toHaveBeenCalled();
    expect(ingest.posted).toEqual([]);
  });
});
