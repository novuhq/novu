import { TelegramSubscriberLink } from './telegram-subscriber-link';
import type { TelegramSubscriberLinkState } from './types';

function mockFetch(responses: Array<{ status: number; body: unknown }>): jest.Mock {
  let callIndex = 0;

  return jest.fn(async () => {
    const entry = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;

    return {
      ok: entry.status >= 200 && entry.status < 300,
      status: entry.status,
      json: async () => entry.body,
      text: async () => JSON.stringify(entry.body),
    } as Response;
  });
}

const BASE_OPTIONS = {
  apiUrl: 'https://test.novu.co',
  secretKey: 'test-secret',
  agentIdentifier: 'my-agent',
  integrationIdentifier: 'integration-1',
  subscriberId: 'user-42',
  pollIntervalMs: 10,
};

describe('TelegramSubscriberLink', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('issues a subscriber link and transitions to pending with deep-link data', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const fetchFn = mockFetch([
      {
        status: 200,
        body: {
          data: {
            deepLinkUrl: 'https://t.me/TestBot?start=abc123',
            botUsername: 'TestBot',
            expiresAt,
          },
        },
      },
    ]);

    const link = new TelegramSubscriberLink({ ...BASE_OPTIONS, fetchFn });
    const states: TelegramSubscriberLinkState[] = [];
    link.onStateChange((s) => states.push({ ...s }));

    await link.start();
    link.stop();

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      'https://test.novu.co/v1/agents/my-agent/integrations/integration-1/telegram/subscriber-link',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'ApiKey test-secret' }),
        body: JSON.stringify({ subscriberId: 'user-42' }),
      })
    );

    expect(states.length).toBeGreaterThanOrEqual(1);
    expect(states[0]).toMatchObject({
      status: 'pending',
      deepLinkUrl: 'https://t.me/TestBot?start=abc123',
      botUsername: 'TestBot',
      error: null,
    });
  });

  it('polls until connectedAt is set and transitions to connected', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const fetchFn = mockFetch([
      {
        status: 200,
        body: {
          data: {
            deepLinkUrl: 'https://t.me/TestBot?start=abc123',
            botUsername: 'TestBot',
            expiresAt,
          },
        },
      },
      { status: 200, body: { data: [{ connectedAt: null }] } },
      { status: 200, body: { data: [{ connectedAt: null }] } },
      { status: 200, body: { data: [{ connectedAt: '2026-06-21T12:00:00Z' }] } },
    ]);

    const link = new TelegramSubscriberLink({ ...BASE_OPTIONS, fetchFn });
    const states: TelegramSubscriberLinkState[] = [];
    link.onStateChange((s) => states.push({ ...s }));

    await link.start();

    // Let poll timers fire
    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(BASE_OPTIONS.pollIntervalMs);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    }

    link.stop();

    const connected = states.find((s) => s.status === 'connected');
    expect(connected).toBeDefined();
    expect(connected?.deepLinkUrl).toBe('https://t.me/TestBot?start=abc123');
    expect(connected?.botUsername).toBe('TestBot');
  });

  it('handles expiry by re-issuing and transitioning through expired', async () => {
    const shortExpiresAt = new Date(Date.now() + 50).toISOString();
    const longExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const fetchFn = mockFetch([
      {
        status: 200,
        body: {
          data: {
            deepLinkUrl: 'https://t.me/TestBot?start=expired-code',
            botUsername: 'TestBot',
            expiresAt: shortExpiresAt,
          },
        },
      },
      {
        status: 200,
        body: {
          data: {
            deepLinkUrl: 'https://t.me/TestBot?start=new-code',
            botUsername: 'TestBot',
            expiresAt: longExpiresAt,
          },
        },
      },
    ]);

    const link = new TelegramSubscriberLink({ ...BASE_OPTIONS, fetchFn });
    const states: TelegramSubscriberLinkState[] = [];
    link.onStateChange((s) => states.push({ ...s }));

    await link.start();

    jest.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    link.stop();

    const expiredState = states.find((s) => s.status === 'expired');
    expect(expiredState).toBeDefined();

    const reissued = states.filter((s) => s.deepLinkUrl === 'https://t.me/TestBot?start=new-code');
    expect(reissued.length).toBeGreaterThanOrEqual(1);
    expect(reissued[0].status).toBe('pending');
  });

  it('handles API error gracefully and sets error state', async () => {
    const fetchFn = mockFetch([
      {
        status: 500,
        body: { message: 'Internal Server Error' },
      },
    ]);

    const link = new TelegramSubscriberLink({ ...BASE_OPTIONS, fetchFn });
    const states: TelegramSubscriberLinkState[] = [];
    link.onStateChange((s) => states.push({ ...s }));

    await link.start();
    link.stop();

    expect(states.length).toBeGreaterThanOrEqual(1);
    expect(states[0].error).toBeInstanceOf(Error);
    expect(states[0].error?.message).toContain('HTTP 500');
    expect(states[0].status).toBe('pending');
  });

  it('refresh() re-issues a new link', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const fetchFn = mockFetch([
      {
        status: 200,
        body: {
          data: {
            deepLinkUrl: 'https://t.me/TestBot?start=first',
            botUsername: 'TestBot',
            expiresAt,
          },
        },
      },
      {
        status: 200,
        body: {
          data: {
            deepLinkUrl: 'https://t.me/TestBot?start=second',
            botUsername: 'TestBot',
            expiresAt,
          },
        },
      },
    ]);

    const link = new TelegramSubscriberLink({ ...BASE_OPTIONS, fetchFn });
    const states: TelegramSubscriberLinkState[] = [];
    link.onStateChange((s) => states.push({ ...s }));

    await link.start();
    await link.refresh();
    link.stop();

    const urls = states.map((s) => s.deepLinkUrl);
    expect(urls).toContain('https://t.me/TestBot?start=first');
    expect(urls).toContain('https://t.me/TestBot?start=second');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('stop() prevents further polling', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const fetchFn = mockFetch([
      {
        status: 200,
        body: {
          data: {
            deepLinkUrl: 'https://t.me/TestBot?start=abc',
            botUsername: 'TestBot',
            expiresAt,
          },
        },
      },
      { status: 200, body: { data: [{ connectedAt: null }] } },
    ]);

    const link = new TelegramSubscriberLink({ ...BASE_OPTIONS, fetchFn });
    await link.start();
    link.stop();

    const callCountAfterStop = fetchFn.mock.calls.length;

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(fetchFn.mock.calls.length).toBe(callCountAfterStop);
  });

  it('handles transient poll errors by continuing to poll', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const fetchFn = mockFetch([
      {
        status: 200,
        body: {
          data: {
            deepLinkUrl: 'https://t.me/TestBot?start=abc',
            botUsername: 'TestBot',
            expiresAt,
          },
        },
      },
      { status: 500, body: { message: 'transient' } },
      { status: 200, body: { data: [{ connectedAt: '2026-06-21T12:00:00Z' }] } },
    ]);

    const link = new TelegramSubscriberLink({ ...BASE_OPTIONS, fetchFn });
    const states: TelegramSubscriberLinkState[] = [];
    link.onStateChange((s) => states.push({ ...s }));

    await link.start();

    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(BASE_OPTIONS.pollIntervalMs);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    }

    link.stop();

    const connected = states.find((s) => s.status === 'connected');
    expect(connected).toBeDefined();
  });

  it('removes listener via returned cleanup function', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const fetchFn = mockFetch([
      {
        status: 200,
        body: {
          data: {
            deepLinkUrl: 'https://t.me/TestBot?start=abc',
            botUsername: 'TestBot',
            expiresAt,
          },
        },
      },
    ]);

    const link = new TelegramSubscriberLink({ ...BASE_OPTIONS, fetchFn });
    const states: TelegramSubscriberLinkState[] = [];
    const cleanup = link.onStateChange((s) => states.push({ ...s }));

    cleanup();

    await link.start();
    link.stop();

    expect(states.length).toBe(0);
  });

  it('unwraps response without data envelope', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const fetchFn = mockFetch([
      {
        status: 200,
        body: {
          deepLinkUrl: 'https://t.me/TestBot?start=plain',
          botUsername: 'TestBot',
          expiresAt,
        },
      },
    ]);

    const link = new TelegramSubscriberLink({ ...BASE_OPTIONS, fetchFn });
    const states: TelegramSubscriberLinkState[] = [];
    link.onStateChange((s) => states.push({ ...s }));

    await link.start();
    link.stop();

    expect(states[0].deepLinkUrl).toBe('https://t.me/TestBot?start=plain');
  });
});
