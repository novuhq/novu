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

vi.mock('../../shared/novu-http', () => ({
  requestApiJson: vi.fn(),
}));

import open from 'open';
import { requestApiJson } from '../../shared/novu-http';
import { browserDeviceAuth } from './device-auth';

const dashboardUrl = 'https://dashboard.novu.co';
const apiUrl = 'https://api.novu.co';

type DeviceSessionStore = {
  status: 'pending' | 'approved';
  apiKey?: string;
  environmentId?: string;
  environmentSlug?: string | null;
  environmentName?: string | null;
  organizationId?: string | null;
};

function getDeviceCodeFromOpenUrl(): string {
  const opener = open as unknown as { mock: { calls: [string][] } };
  const url = opener.mock.calls[0]?.[0];
  if (!url) throw new Error('open() was not invoked');
  const parsed = new URL(url);
  const deviceCode = parsed.searchParams.get('device_code');
  if (!deviceCode) throw new Error('device_code missing');

  return deviceCode;
}

describe('browserDeviceAuth', () => {
  let store: Map<string, DeviceSessionStore>;
  let pollCounts: Map<string, number>;
  const requestApiJsonMock = requestApiJson as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = new Map();
    pollCounts = new Map();
    requestApiJsonMock.mockReset();
    requestApiJsonMock.mockImplementation(async (baseApiUrl: string, path: string) => {
      if (baseApiUrl !== apiUrl) {
        throw new Error(`Unexpected apiUrl: ${baseApiUrl}`);
      }

      if (path === '/cli/device-sessions') {
        const deviceCode = 'test-device-code';
        store.set(deviceCode, { status: 'pending' });

        return { deviceCode, expiresIn: 300, interval: 2 };
      }

      const pollMatch = path.match(/^\/cli\/device-sessions\/([^/?]+)\/poll$/);
      if (pollMatch) {
        const deviceCode = pollMatch[1];
        const session = store.get(deviceCode);

        if (!session) {
          return { status: 'expired' };
        }

        const pollCount = (pollCounts.get(deviceCode) ?? 0) + 1;
        pollCounts.set(deviceCode, pollCount);

        if (session.status === 'approved' && pollCount >= 2) {
          store.delete(deviceCode);

          return {
            status: 'approved',
            apiKey: session.apiKey,
            environmentId: session.environmentId,
            environmentSlug: session.environmentSlug,
            environmentName: session.environmentName,
            organizationId: session.organizationId,
          };
        }

        return { status: 'pending', expiresIn: 300, interval: 2 };
      }

      throw new Error(`Unexpected path: ${path}`);
    });
    (open as unknown as { mockClear: () => void }).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves when the dashboard approves the device session', async () => {
    const promise = browserDeviceAuth({ apiUrl, dashboardUrl, region: CloudRegionEnum.US });

    await waitFor(() => (open as unknown as { mock: { calls: unknown[] } }).mock.calls.length > 0);
    const deviceCode = getDeviceCodeFromOpenUrl();

    store.set(deviceCode, {
      status: 'approved',
      apiKey: 'sk_test_123',
      environmentId: 'env_1',
      environmentSlug: 'development',
      environmentName: 'Development',
      organizationId: 'org_1',
    });

    const result = await promise;
    expect(result.secretKey).toBe('sk_test_123');
    expect(result.environmentId).toBe('env_1');
    expect(result.source).toBe('browser');
  });

  it('opens the dashboard with device_code and name query params', async () => {
    const promise = browserDeviceAuth({
      apiUrl,
      dashboardUrl,
      region: CloudRegionEnum.US,
      name: 'novu-connect',
    });

    await waitFor(() => (open as unknown as { mock: { calls: unknown[] } }).mock.calls.length > 0);
    const deviceCode = getDeviceCodeFromOpenUrl();
    store.set(deviceCode, { status: 'approved', apiKey: 'sk', environmentId: 'env' });

    await promise;

    const openedUrl = new URL((open as unknown as { mock: { calls: [string][] } }).mock.calls[0][0]);
    expect(openedUrl.pathname).toBe('/cli/auth');
    expect(openedUrl.searchParams.get('device_code')).toBe(deviceCode);
    expect(openedUrl.searchParams.get('name')).toBe('novu-connect');
  });

  it('rejects when the device session expires before approval', async () => {
    const promise = browserDeviceAuth({ apiUrl, dashboardUrl, region: CloudRegionEnum.US, timeoutMs: 50 });

    await waitFor(() => (open as unknown as { mock: { calls: unknown[] } }).mock.calls.length > 0);

    await expect(promise).rejects.toThrow(/Authorization timed out/);
  });
});

async function waitFor(condition: () => boolean, timeoutMs = 2000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
