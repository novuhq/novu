import nock from 'nock';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createProviderHttpClient } from './provider-http.client';
import { PROVIDER_HTTP_TIMEOUT_MS } from './provider-http.constants';

const BASE_URL = 'https://provider.example.com';

describe('createProviderHttpClient', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test('applies the default timeout when none is supplied', () => {
    const client = createProviderHttpClient({ baseURL: BASE_URL });

    expect(client.defaults.timeout).toBe(PROVIDER_HTTP_TIMEOUT_MS);
  });

  test('honours a per-provider timeoutMs override', () => {
    const client = createProviderHttpClient({ baseURL: BASE_URL, timeoutMs: 5_000 });

    expect(client.defaults.timeout).toBe(5_000);
  });

  test('does not forward timeoutMs to axios', () => {
    const client = createProviderHttpClient({
      baseURL: BASE_URL,
      timeoutMs: 5_000,
    });

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

  test('never sends a request twice', async () => {
    const scope = nock(BASE_URL).post('/send').reply(503, {});

    const client = createProviderHttpClient({ baseURL: BASE_URL });

    await expect(client.post('/send', {})).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
    expect(nock.pendingMocks()).toHaveLength(0);
  });
});
