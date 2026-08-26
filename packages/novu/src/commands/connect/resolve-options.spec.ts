import { describe, expect, it } from 'vitest';
import { CloudRegionEnum } from '../dev/enums';
import { resolveConnectCommandOptions } from './resolve-options';

describe('resolveConnectCommandOptions', () => {
  it('maps --staging to the staging region and URLs', () => {
    const resolved = resolveConnectCommandOptions({
      region: CloudRegionEnum.US,
      staging: true,
    });

    expect(resolved.region).toBe(CloudRegionEnum.STAGING);
    expect(resolved.apiUrl).toBe('https://api.novu-staging.co');
    expect(resolved.dashboardUrl).toBe('https://dashboard.novu-staging.co');
  });

  it('keeps an explicit --api-url when --staging is set', () => {
    const resolved = resolveConnectCommandOptions({
      region: CloudRegionEnum.US,
      staging: true,
      apiUrl: 'https://api.novu-staging.co/',
    });

    expect(resolved.apiUrl).toBe('https://api.novu-staging.co');
  });
});
