import { describe, expect, it, vi } from 'vitest';
import { AgentEventOutbox, deriveEventsUrl, IngestError } from './event-outbox.js';

function okResponse() {
  return new Response(null, { status: 200 });
}

describe('deriveEventsUrl', () => {
  it('honors a custom apiBaseUrl and strips a trailing slash', () => {
    expect(deriveEventsUrl('https://eu.api.novu.co/')).toBe('https://eu.api.novu.co/v1/agents/events/ingest');
  });
});

describe('AgentEventOutbox', () => {
  it('retries 500 then resolves', async () => {
    vi.useFakeTimers();
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response('server error', { status: 500 }))
      .mockResolvedValueOnce(okResponse());

    const outbox = new AgentEventOutbox({
      eventsUrl: 'https://api.novu.co/v1/agents/events/ingest',
      apiKey: 'k',
      conversationId: 'c1',
      agentId: 'a',
      turnId: 't1',
      fetchFn,
      maxRetries: 3,
    });
    const flushPromise = outbox.emit({ type: 'resolve' });

    await vi.advanceTimersByTimeAsync(250);
    await flushPromise;

    expect(fetchFn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('does not retry 403', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('nope', { status: 403, statusText: 'Forbidden' }));
    const outbox = new AgentEventOutbox({
      eventsUrl: 'https://api.novu.co/v1/agents/events/ingest',
      apiKey: 'k',
      conversationId: 'c1',
      agentId: 'a',
      turnId: 't1',
      fetchFn,
      maxRetries: 3,
    });

    await expect(outbox.emit({ type: 'resolve' })).rejects.toBeInstanceOf(IngestError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
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

        return okResponse();
      })
      .mockImplementationOnce(async () => {
        callOrder.push('second-start');
        await secondGate;
        callOrder.push('second-end');

        return okResponse();
      });

    const outbox = new AgentEventOutbox({
      eventsUrl: 'https://api.novu.co/v1/agents/events/ingest',
      apiKey: 'k',
      conversationId: 'c1',
      agentId: 'a',
      turnId: 't1',
      fetchFn,
    });
    const first = outbox.emit({ type: 'resolve', summary: 'a' });
    const second = outbox.emit({ type: 'resolve', summary: 'b' });

    await vi.waitFor(() => expect(callOrder).toEqual(['first-start']));

    releaseFirst?.();
    await vi.waitFor(() => expect(callOrder).toEqual(['first-start', 'first-end', 'second-start']));

    releaseSecond?.();
    await Promise.all([first, second]);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(callOrder).toEqual(['first-start', 'first-end', 'second-start', 'second-end']);
  });
});
