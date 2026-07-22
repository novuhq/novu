import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentDeliveryError } from './agent.errors';
import { AgentEventOutbox } from './agent-event-outbox';
import type { AgentEvent } from './agent-event-protocol';
import { AGENT_EVENT_PROTOCOL_VERSION } from './agent-event-protocol';

const BASE_OPTIONS = {
  eventsUrl: 'https://api.novu.co/v1/agents/events',
  secretKey: 'test-secret-key',
  conversationId: 'conv-456',
  agentId: 'test-bot',
  turnId: 'del-123',
};

function ackResponse(results: Array<{ sequence: number; status: 'accepted' | 'duplicate' }>) {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify({ data: { results } })),
  };
}

describe('AgentEventOutbox', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => '00000000-0000-4000-8000-000000000001'),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('assigns sequences 1, 2, 3 across enqueues in a single flush batch', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ackResponse([]));
    const outbox = new AgentEventOutbox({ ...BASE_OPTIONS, fetchFn });

    outbox.enqueue({ type: 'run-start' });
    outbox.enqueue({ type: 'message', messageId: 'msg-1', content: { markdown: 'a' } });
    outbox.enqueue({ type: 'run-finish', outcome: 'completed' });
    await outbox.flush();

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(body.events.map((envelope: { sequence: number }) => envelope.sequence)).toEqual([1, 2, 3]);
  });

  it('emit posts correct envelope fields and Authorization header', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ackResponse([{ sequence: 1, status: 'accepted' }]));
    const outbox = new AgentEventOutbox({ ...BASE_OPTIONS, fetchFn });
    const event: AgentEvent = { type: 'channel.typing', state: 'on', status: 'thinking' };

    await outbox.emit(event);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe(BASE_OPTIONS.eventsUrl);
    expect(fetchFn.mock.calls[0][1].method).toBe('POST');
    expect(fetchFn.mock.calls[0][1].headers.Authorization).toBe('ApiKey test-secret-key');
    expect(fetchFn.mock.calls[0][1].headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({
      version: AGENT_EVENT_PROTOCOL_VERSION,
      conversationId: BASE_OPTIONS.conversationId,
      agentId: BASE_OPTIONS.agentId,
      runId: 'run_00000000-0000-4000-8000-000000000001',
      turnId: BASE_OPTIONS.turnId,
      sequence: 1,
      event,
    });
    expect(typeof body.events[0].timestamp).toBe('string');
  });

  it('serializes concurrent emit calls into sequential POSTs', async () => {
    const callOrder: string[] = [];
    let releaseFirst: (() => void) | undefined;
    let releaseSecond: (() => void) | undefined;

    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const secondGate = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });

    const fetchFn = vi
      .fn()
      .mockImplementationOnce(async () => {
        callOrder.push('first-start');
        await firstGate;
        callOrder.push('first-end');

        return ackResponse([{ sequence: 1, status: 'accepted' }]);
      })
      .mockImplementationOnce(async () => {
        callOrder.push('second-start');
        await secondGate;
        callOrder.push('second-end');

        return ackResponse([{ sequence: 2, status: 'accepted' }]);
      });

    const outbox = new AgentEventOutbox({ ...BASE_OPTIONS, fetchFn });
    const first = outbox.emit({ type: 'run-start' });
    const second = outbox.emit({ type: 'run-finish', outcome: 'completed' });

    await vi.waitFor(() => expect(callOrder).toEqual(['first-start']));

    releaseFirst?.();
    await vi.waitFor(() => expect(callOrder).toEqual(['first-start', 'first-end', 'second-start']));

    releaseSecond?.();
    await Promise.all([first, second]);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(callOrder).toEqual(['first-start', 'first-end', 'second-start', 'second-end']);
  });

  it('retries 500 responses then resolves', async () => {
    vi.useFakeTimers();
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('server error') })
      .mockResolvedValueOnce(ackResponse([{ sequence: 1, status: 'accepted' }]));

    const outbox = new AgentEventOutbox({ ...BASE_OPTIONS, fetchFn, maxRetries: 3 });
    const flushPromise = outbox.emit({ type: 'run-start' });

    await vi.advanceTimersByTimeAsync(250);
    await flushPromise;

    expect(fetchFn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws after exhausting retries on persistent 500 responses', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('server error'),
    });

    const outbox = new AgentEventOutbox({ ...BASE_OPTIONS, fetchFn, maxRetries: 3 });
    const flushPromise = outbox.emit({ type: 'run-start' });
    const rejection = expect(flushPromise).rejects.toBeInstanceOf(AgentDeliveryError);

    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(500);
    await rejection;
    expect(fetchFn).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('does not fetch when flush is called on an empty buffer', async () => {
    const fetchFn = vi.fn();
    const outbox = new AgentEventOutbox({ ...BASE_OPTIONS, fetchFn });

    await outbox.flush();

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('treats missing ack sequences as terminal skips without retry', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      ackResponse([
        { sequence: 1, status: 'accepted' },
        { sequence: 3, status: 'duplicate' },
      ])
    );
    const outbox = new AgentEventOutbox({ ...BASE_OPTIONS, fetchFn });

    outbox.enqueue({ type: 'run-start' });
    outbox.enqueue({ type: 'message', messageId: 'msg-1', content: { markdown: 'skipped' } });
    outbox.enqueue({ type: 'run-finish', outcome: 'completed' });
    await outbox.flush();

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
