import { afterEach, describe, expect, test, vi } from 'vitest';
import { providerFetch } from './provider-fetch';

const URL_UNDER_TEST = 'https://provider.example.com/send';

describe('providerFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('attaches an abort signal even when no init is supplied', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    global.fetch = fetchMock;

    await providerFetch(URL_UNDER_TEST);

    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  test('forwards caller init untouched, including non-standard options', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    global.fetch = fetchMock;

    const agent = { marker: 'proxy-agent' };

    await providerFetch(URL_UNDER_TEST, {
      method: 'POST',
      headers: { 'api-key': 'secret' },
      body: '{"a":1}',
      agent,
    } as RequestInit);

    const init = fetchMock.mock.calls[0][1];

    expect(init).toMatchObject({
      method: 'POST',
      headers: { 'api-key': 'secret' },
      body: '{"a":1}',
      agent,
    });
  });

  test('composes a caller supplied signal rather than replacing it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    global.fetch = fetchMock;

    const controller = new AbortController();

    await providerFetch(URL_UNDER_TEST, { signal: controller.signal });

    const { signal } = fetchMock.mock.calls[0][1];

    expect(signal).not.toBe(controller.signal);
    expect(signal.aborted).toBe(false);

    controller.abort(new Error('caller cancelled'));

    expect(signal.aborted).toBe(true);
  });

  test('aborts a request that outlives the timeout', async () => {
    global.fetch = vi.fn(
      (_input, init: RequestInit = {}) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject((init.signal as AbortSignal).reason), { once: true });
        })
    ) as typeof fetch;

    await expect(providerFetch(URL_UNDER_TEST, {}, { timeoutMs: 20 })).rejects.toMatchObject({
      name: 'TimeoutError',
    });
  });

  test('returns a response that arrives inside the timeout', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('{"id":"message-id"}'));

    const response = await providerFetch(URL_UNDER_TEST, {}, { timeoutMs: 5_000 });

    await expect(response.json()).resolves.toEqual({ id: 'message-id' });
  });

  test('does not reject on a non-2xx response, matching fetch semantics', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));

    const response = await providerFetch(URL_UNDER_TEST);

    expect(response.status).toBe(500);
  });

  test('never sends a request twice', async () => {
    const fetchMock = vi.fn().mockRejectedValue(Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }));
    global.fetch = fetchMock;

    await expect(providerFetch(URL_UNDER_TEST)).rejects.toThrow('refused');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
