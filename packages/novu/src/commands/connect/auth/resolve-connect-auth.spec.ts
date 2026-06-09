import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const bootstrapKeylessSession = vi.fn();
const resolveAuth = vi.fn();
const configGetValue = vi.fn();
const configSetValue = vi.fn();

vi.mock('../api/keyless-session', () => ({
  bootstrapKeylessSession: (...args: unknown[]) => bootstrapKeylessSession(...args),
}));

vi.mock('../../wizard/auth/resolve-auth', () => ({
  resolveAuth: (...args: unknown[]) => resolveAuth(...args),
}));

vi.mock('../../../services', () => ({
  ConfigService: vi.fn(function ConfigService() {
    return {
      getValue: (...args: unknown[]) => configGetValue(...args),
      setValue: (...args: unknown[]) => configSetValue(...args),
    };
  }),
}));

import { CloudRegionEnum } from '../../dev/enums';
import { fallbackToAuthenticatedConnectAuth, resolveConnectAuth } from './resolve-connect-auth';

const options = {
  apiUrl: 'https://api.novu.co',
  dashboardUrl: 'https://dashboard.novu.co',
  connectDashboardUrl: 'https://connect.novu.co',
  region: CloudRegionEnum.US,
};

describe('resolveConnectAuth', () => {
  const originalCi = process.env.CI;
  const originalNovuSecretKey = process.env.NOVU_SECRET_KEY;
  const originalStdinIsTTY = process.stdin.isTTY;
  const originalStdoutIsTTY = process.stdout.isTTY;

  beforeEach(() => {
    vi.clearAllMocks();
    configGetValue.mockReturnValue(undefined);
    delete process.env.NOVU_SECRET_KEY;
    process.env.CI = 'false';
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
  });

  afterEach(() => {
    if (originalCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCi;
    }

    if (originalNovuSecretKey === undefined) {
      delete process.env.NOVU_SECRET_KEY;
    } else {
      process.env.NOVU_SECRET_KEY = originalNovuSecretKey;
    }

    Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinIsTTY, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: originalStdoutIsTTY, configurable: true });
  });

  it('falls back to dashboard auth when keyless bootstrap hits the demo limit', async () => {
    bootstrapKeylessSession.mockRejectedValueOnce(
      new Error(
        'Failed to start a keyless session (429): Daily keyless demo limit reached. Sign up for a free Novu account or try again tomorrow.'
      )
    );
    resolveAuth.mockResolvedValueOnce({
      secretKey: 'sk_test',
      environmentId: 'env-1',
      environmentSlug: 'dev',
      environmentName: 'Development',
      organizationId: 'org-1',
      user: { id: 'user-1' },
      apiUrl: options.apiUrl,
      dashboardUrl: options.dashboardUrl,
      region: options.region,
      source: 'dashboard',
    });

    const onStatus = vi.fn();
    const auth = await resolveConnectAuth(options, { onStatus });

    expect(auth.isKeyless).toBe(false);
    expect(auth.secretKey).toBe('sk_test');
    expect(resolveAuth).toHaveBeenCalledTimes(1);
    expect(configSetValue).toHaveBeenCalledWith('connectKeylessApplicationIdentifier', '');
    expect(onStatus).toHaveBeenCalledWith(
      'Demo limit reached. Signing in to your Novu account so you can continue without interruption…'
    );
  });
});

describe('fallbackToAuthenticatedConnectAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears stored keyless state before starting dashboard auth', async () => {
    resolveAuth.mockResolvedValueOnce({
      secretKey: 'sk_test',
      environmentId: 'env-1',
      environmentSlug: 'dev',
      environmentName: 'Development',
      organizationId: 'org-1',
      user: null,
      apiUrl: options.apiUrl,
      dashboardUrl: options.dashboardUrl,
      region: options.region,
      source: 'dashboard',
    });

    const auth = await fallbackToAuthenticatedConnectAuth(options);

    expect(auth.isKeyless).toBe(false);
    expect(configSetValue).toHaveBeenCalledWith('connectKeylessApplicationIdentifier', '');
    expect(resolveAuth).toHaveBeenCalledTimes(1);
  });
});
