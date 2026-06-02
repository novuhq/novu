import { describe, expect, it } from 'vitest';
import { CloudRegionEnum } from './enums';
import { getRegionUrls, resolveRegionUrls } from './resolve-region-urls';

describe('resolveRegionUrls', () => {
  it('maps us region to production URLs', () => {
    const urls = getRegionUrls(CloudRegionEnum.US);

    expect(urls.apiUrl).toBe('https://api.novu.co');
    expect(urls.dashboardUrl).toBe('https://dashboard.novu.co');
    expect(urls.connectDashboardUrl).toBe('https://connect.novu.co');
  });

  it('maps staging region to staging stack URLs', () => {
    const urls = getRegionUrls(CloudRegionEnum.STAGING);

    expect(urls.apiUrl).toBe('https://api.novu-staging.co');
    expect(urls.dashboardUrl).toBe('https://dashboard.novu-staging.co');
    expect(urls.connectDashboardUrl).toBe('https://connect.novu-staging.co');
  });

  it('maps local region to local dev URLs with connect dashboard matching dashboard', () => {
    const urls = getRegionUrls(CloudRegionEnum.LOCAL);

    expect(urls.apiUrl).toBe('https://api.novu.localhost');
    expect(urls.dashboardUrl).toBe('https://dashboard.novu.localhost');
    expect(urls.connectDashboardUrl).toBe(urls.dashboardUrl);
  });

  it('lets explicit flags override region defaults', () => {
    const urls = resolveRegionUrls(CloudRegionEnum.US, {
      apiUrl: 'https://custom.api/',
      connectDashboardUrl: 'https://custom.connect/',
    });

    expect(urls.apiUrl).toBe('https://custom.api');
    expect(urls.dashboardUrl).toBe('https://dashboard.novu.co');
    expect(urls.connectDashboardUrl).toBe('https://custom.connect');
  });
});
