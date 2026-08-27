import nock from 'nock';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createProviderHttpClient } from './provider-http.client';
import { PROVIDER_HTTP_TIMEOUT_MS } from './provider-http.constants';
import { type ProviderHttpCallEvent, setProviderHttpObserver } from './provider-http.observer';

const BASE_URL = 'https://provider.example.com';

describe('createProviderHttpClient', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
    setProviderHttpObserver(undefined);
  });

  test('applies the default timeout when none is supplied', () => {
    const client = createProviderHttpClient({ baseURL: BASE_URL });

    expect(client.defaults.timeout).toBe(PROVIDER_HTTP_TIMEOUT_MS);
  });

  test('honours a per-provider timeoutMs override', () => {
    const client = createProviderHttpClient({ baseURL: BASE_URL, timeoutMs: 5_000 });

    expect(client.defaults.timeout).toBe(5_000);
  });

  test('does not forward observability-only options to axios', () => {
    const client = createProviderHttpClient({
      baseURL: BASE_URL,
      providerId: 'acme',
      channel: 'sms',
      timeoutMs: 5_000,
    });

    expect(client.defaults).not.toHaveProperty('providerId');
    expect(client.defaults).not.toHaveProperty('channel');
    expect(client.defaults).not.toHaveProperty('timeoutMs');
  });

  test('preserves caller supplied config', () => {
    const client = createProviderHttpClient({
      baseURL: BASE_URL,
      headers: { 'api-key': 'secret' },
    });

    expect(client.defaults.baseURL).toBe(BASE_URL);
    expect(client.defaults.headers['api-key']).toBe('secret');
  });

  test('aborts a request that outlives the timeout', async () => {
    nock(BASE_URL).post('/send').delay(200).reply(200, { id: 'never-arrives' });

    const client = createProviderHttpClient({ baseURL: BASE_URL, timeoutMs: 50 });

    await expect(client.post('/send', {})).rejects.toMatchObject({ code: 'ECONNABORTED' });
  });

  test('lets a response inside the timeout through untouched', async () => {
    nock(BASE_URL).post('/send').reply(200, { id: 'message-id' });

    const client = createProviderHttpClient({ baseURL: BASE_URL, timeoutMs: 5_000 });

    const response = await client.post('/send', {});

    expect(response.data).toEqual({ id: 'message-id' });
  });

  test('reports a successful call to the observer', async () => {
    nock(BASE_URL).post('/send').reply(200, {});

    const events: ProviderHttpCallEvent[] = [];
    setProviderHttpObserver((event) => events.push(event));

    const client = createProviderHttpClient({ baseURL: BASE_URL, providerId: 'acme', channel: 'sms' });
    await client.post('/send', {});

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ providerId: 'acme', channel: 'sms', timedOut: false });
    expect(events[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  test('flags a timed out call to the observer', async () => {
    nock(BASE_URL).post('/send').delay(200).reply(200, {});

    const events: ProviderHttpCallEvent[] = [];
    setProviderHttpObserver((event) => events.push(event));

    const client = createProviderHttpClient({ baseURL: BASE_URL, providerId: 'acme', timeoutMs: 50 });

    await expect(client.post('/send', {})).rejects.toThrow();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ providerId: 'acme', timedOut: true });
  });

  test('reports a provider error without flagging it as a timeout', async () => {
    nock(BASE_URL).post('/send').reply(400, { error: 'bad request' });

    const events: ProviderHttpCallEvent[] = [];
    setProviderHttpObserver((event) => events.push(event));

    const client = createProviderHttpClient({ baseURL: BASE_URL, providerId: 'acme' });

    await expect(client.post('/send', {})).rejects.toThrow();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ timedOut: false });
  });

  test('never sends a request twice', async () => {
    const scope = nock(BASE_URL).post('/send').reply(503, {});

    const client = createProviderHttpClient({ baseURL: BASE_URL });

    await expect(client.post('/send', {})).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
    expect(nock.pendingMocks()).toHaveLength(0);
  });

  test('does not let an observer failure break the request', async () => {
    nock(BASE_URL).post('/send').reply(200, { id: 'message-id' });

    setProviderHttpObserver(() => {
      throw new Error('observer exploded');
    });

    const client = createProviderHttpClient({ baseURL: BASE_URL });

    const response = await client.post('/send', {});

    expect(response.data).toEqual({ id: 'message-id' });
  });

  test('works when the axios instance has no interceptors, as under axiosSpy', async () => {
    const axios = (await import('axios')).default;
    const post = vi.fn().mockResolvedValue({ data: {} });
    const spy = vi.spyOn(axios, 'create').mockImplementation(() => ({ post }) as never);

    const client = createProviderHttpClient({ baseURL: BASE_URL });
    await client.post('/send', {});

    expect(post).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});
