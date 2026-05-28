import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudRegionEnum } from '../../dev/enums';

vi.mock('open', () => ({ default: vi.fn(async () => undefined) }));

vi.mock('ora', () => {
  return {
    default: () => ({
      start: () => ({ stop: vi.fn(), warn: vi.fn() }),
    }),
  };
});

vi.mock('get-port', () => ({ default: vi.fn(async () => 0) }));

import getPort from 'get-port';
import open from 'open';
import { browserDeviceAuth } from './device-auth';

const dashboardUrl = 'https://dashboard.novu.co';

async function postCallback(callbackUrl: string, body: Record<string, unknown>, origin = dashboardUrl) {
  return fetch(callbackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
}

function getCallbackUrl(): string {
  const opener = open as unknown as { mock: { calls: [string][] } };
  const url = opener.mock.calls[0]?.[0];
  if (!url) throw new Error('open() was not invoked');
  const parsed = new URL(url);
  const callback = parsed.searchParams.get('cli_callback');
  if (!callback) throw new Error('cli_callback missing');

  return callback;
}

function getState(): string {
  const opener = open as unknown as { mock: { calls: [string][] } };
  const url = new URL(opener.mock.calls[0][0]);
  const state = url.searchParams.get('state');
  if (!state) throw new Error('state missing');

  return state;
}

describe('browserDeviceAuth', () => {
  beforeEach(async () => {
    (getPort as unknown as { mockResolvedValue: (n: number) => void }).mockResolvedValue(0);
    (open as unknown as { mockClear: () => void }).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves when the dashboard posts a valid payload', async () => {
    const promise = browserDeviceAuth({ apiUrl: 'https://api.novu.co', dashboardUrl, region: CloudRegionEnum.US });

    await waitFor(() => (open as unknown as { mock: { calls: unknown[] } }).mock.calls.length > 0);
    const callbackUrl = getCallbackUrl();
    const state = getState();

    const response = await postCallback(callbackUrl, {
      state,
      apiKey: 'sk_test_123',
      environmentId: 'env_1',
      environmentSlug: 'development',
      environmentName: 'Development',
      organizationId: 'org_1',
    });
    expect(response.status).toBe(200);

    const result = await promise;
    expect(result.secretKey).toBe('sk_test_123');
    expect(result.environmentId).toBe('env_1');
    expect(result.source).toBe('browser');
  });

  it('rejects payloads with mismatched state', async () => {
    const promise = browserDeviceAuth({ apiUrl: 'https://api.novu.co', dashboardUrl, region: CloudRegionEnum.US });

    await waitFor(() => (open as unknown as { mock: { calls: unknown[] } }).mock.calls.length > 0);
    const callbackUrl = getCallbackUrl();

    const response = await postCallback(callbackUrl, {
      state: 'wrong-state',
      apiKey: 'sk_test_123',
      environmentId: 'env_1',
    });
    expect(response.status).toBe(400);

    await expect(promise).rejects.toThrow(/Invalid pairing code/);
  });

  it('responds to CORS preflight', async () => {
    const promise = browserDeviceAuth({ apiUrl: 'https://api.novu.co', dashboardUrl, region: CloudRegionEnum.US });

    await waitFor(() => (open as unknown as { mock: { calls: unknown[] } }).mock.calls.length > 0);
    const callbackUrl = getCallbackUrl();
    const state = getState();

    const preflight = await fetch(callbackUrl, {
      method: 'OPTIONS',
      headers: {
        Origin: dashboardUrl,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe(dashboardUrl);

    await postCallback(callbackUrl, { state, apiKey: 'sk', environmentId: 'env' });
    await promise;
  });
});

async function waitFor(condition: () => boolean, timeoutMs = 2000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
