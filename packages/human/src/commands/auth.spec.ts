import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { create, post } = vi.hoisted(() => {
  const post = vi.fn();

  return { post, create: vi.fn(() => ({ post })) };
});

vi.mock('axios', () => ({
  default: { create },
}));

const { authorizeWithDashboard, resolveAuthDashboardUrl, saveDashboardAuth } = await import('./auth');

describe('human auth', () => {
  beforeEach(() => {
    post.mockReset();
    create.mockClear();
  });

  afterEach(() => {
    delete process.env.NOVU_DASHBOARD_URL;
    delete process.env.NOVU_HUMAN_CONFIG;
    vi.restoreAllMocks();
  });

  it('opens a Human device session and resolves its approved Development key', async () => {
    post
      .mockResolvedValueOnce({
        data: { data: { deviceCode: 'device-code', expiresIn: 1800, interval: 2 } },
      })
      .mockResolvedValueOnce({
        data: { data: { status: 'pending', expiresIn: 1800, interval: 2 } },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            status: 'approved',
            apiKey: 'nvsk_development',
            environmentId: 'env-development',
            environmentName: 'Development',
          },
        },
      });
    const openBrowser = vi.fn();
    const wait = vi.fn(async () => undefined);

    const result = await authorizeWithDashboard({
      apiUrl: 'https://api.novu.co',
      dashboardUrl: 'https://dashboard.novu.co',
      openBrowser,
      wait,
    });

    expect(post).toHaveBeenNthCalledWith(1, '/v1/cli/device-sessions', { name: 'human' });
    expect(post).toHaveBeenNthCalledWith(2, '/v1/cli/device-sessions/device-code/poll', undefined);
    expect(openBrowser).toHaveBeenCalledOnce();
    const openedUrl = new URL(openBrowser.mock.calls[0][0]);
    expect(openedUrl.pathname).toBe('/cli/auth');
    expect(openedUrl.searchParams.get('name')).toBe('human');
    expect(openedUrl.searchParams.get('device_code')).toBe('device-code');
    expect(wait).toHaveBeenCalledWith(2000);
    expect(result.apiKey).toBe('nvsk_development');
  });

  it('fails clearly when the dashboard session expires', async () => {
    post
      .mockResolvedValueOnce({
        data: { data: { deviceCode: 'expired-code', expiresIn: 1800, interval: 2 } },
      })
      .mockResolvedValueOnce({ data: { data: { status: 'expired' } } });

    await expect(
      authorizeWithDashboard({
        apiUrl: 'https://api.novu.co',
        dashboardUrl: 'https://dashboard.novu.co',
        openBrowser: vi.fn(),
      })
    ).rejects.toThrow('human auth');
  });

  it('stops polling when the authorization window times out', async () => {
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    post
      .mockResolvedValueOnce({
        data: { data: { deviceCode: 'pending-code', expiresIn: 1, interval: 1 } },
      })
      .mockResolvedValue({ data: { data: { status: 'pending', expiresIn: 1, interval: 1 } } });

    await expect(
      authorizeWithDashboard({
        apiUrl: 'https://api.novu.co',
        dashboardUrl: 'https://dashboard.novu.co',
        timeoutMs: 1000,
        openBrowser: vi.fn(),
        wait: async (ms) => {
          now += ms;
        },
      })
    ).rejects.toThrow('timed out');
  });

  it('uses explicit and environment dashboard URLs before known API mappings', () => {
    process.env.NOVU_DASHBOARD_URL = 'https://dashboard.env.example/';
    expect(resolveAuthDashboardUrl('https://api.novu.co')).toBe('https://dashboard.env.example');
    expect(resolveAuthDashboardUrl('https://api.novu.co', 'https://dashboard.flag.example/')).toBe(
      'https://dashboard.flag.example'
    );

    delete process.env.NOVU_DASHBOARD_URL;
    expect(resolveAuthDashboardUrl('https://eu.api.novu.co/')).toBe('https://eu.dashboard.novu.co');
    expect(() => resolveAuthDashboardUrl('https://api.self-hosted.example')).toThrow('--dashboard-url');
  });

  it('replaces only auth while preserving the claimed workspace preferences', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'human-auth-')), 'human.json');
    process.env.NOVU_HUMAN_CONFIG = path;

    saveDashboardAuth('https://api.novu.co', 'nvsk_development', {
      apiUrl: 'https://api.novu.co',
      auth: { mode: 'keyless', keylessIdentifier: 'pk_keyless_old' },
      relayAgentIdentifier: 'my-relay',
      subscriberId: 'human_alice',
      defaultChannel: 'telegram',
    });

    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      apiUrl: 'https://api.novu.co',
      auth: { mode: 'apiKey', secretKey: 'nvsk_development' },
      relayAgentIdentifier: 'my-relay',
      subscriberId: 'human_alice',
      defaultChannel: 'telegram',
    });
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });
});
