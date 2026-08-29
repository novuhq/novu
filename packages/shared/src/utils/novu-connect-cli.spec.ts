import { describe, expect, it } from 'vitest';
import {
  buildNovuConnectStagingHint,
  getNovuConnectInvocation,
  getNovuConnectPackageTag,
  getNovuConnectTargetFlags,
  getNovuScaffoldSdkTag,
  NOVU_STAGING_API_URL,
} from './novu-connect-cli';

describe('novu-connect-cli', () => {
  it('uses latest and no extra flags on US Cloud', () => {
    expect(getNovuConnectPackageTag('https://api.novu.co')).toBe('latest');
    expect(getNovuConnectInvocation('https://api.novu.co')).toBe('npx novu@latest connect');
    expect(getNovuConnectTargetFlags('https://api.novu.co')).toEqual([]);
    expect(getNovuConnectTargetFlags(undefined)).toEqual([]);
    expect(buildNovuConnectStagingHint('https://api.novu.co')).toBeUndefined();
  });

  it('uses rc and --region staging on staging', () => {
    expect(getNovuConnectPackageTag(NOVU_STAGING_API_URL)).toBe('rc');
    expect(getNovuConnectInvocation(`${NOVU_STAGING_API_URL}/`)).toBe('npx novu@rc connect');
    expect(getNovuConnectTargetFlags(NOVU_STAGING_API_URL)).toEqual(['--region staging']);
    expect(buildNovuConnectStagingHint(NOVU_STAGING_API_URL)).toBe('Use `npx novu@rc` and pass `--region staging`.');
  });

  it('keeps --api-url for EU and local', () => {
    expect(getNovuConnectPackageTag('https://eu.api.novu.co')).toBe('latest');
    expect(getNovuConnectTargetFlags('https://eu.api.novu.co')).toEqual(['--api-url https://eu.api.novu.co']);
    expect(getNovuConnectTargetFlags('http://localhost:3000')).toEqual(['--api-url http://localhost:3000']);
  });

  it('uses rc on local API hosts', () => {
    expect(getNovuConnectPackageTag('http://localhost:3000')).toBe('rc');
    expect(getNovuConnectPackageTag('http://127.0.0.1:3000')).toBe('rc');
    expect(getNovuConnectInvocation('http://localhost:3000')).toBe('npx novu@rc connect');
  });

  it('adds dashboard URLs for local connect commands', () => {
    expect(
      getNovuConnectTargetFlags({
        apiUrl: 'http://localhost:3000',
        connectDashboardUrl: 'http://localhost:4201',
      })
    ).toEqual([
      '--api-url http://localhost:3000',
      '--connect-dashboard-url http://localhost:4201',
      '--dashboard-url http://localhost:4201',
    ]);
  });

  it('pins scaffold SDK packages to next on staging, local, or staging region', () => {
    expect(getNovuScaffoldSdkTag(NOVU_STAGING_API_URL)).toBe('next');
    expect(getNovuScaffoldSdkTag('http://localhost:3000')).toBe('next');
    expect(getNovuScaffoldSdkTag('https://api.novu.localhost')).toBe('next');
    expect(getNovuScaffoldSdkTag('https://api.novu.co', 'staging')).toBe('next');
    expect(getNovuScaffoldSdkTag('https://api.novu.co', 'local')).toBe('next');
    expect(getNovuScaffoldSdkTag('https://api.novu.co')).toBe('latest');
  });

  it('does not add dashboard URLs for cloud dashboards', () => {
    expect(
      getNovuConnectTargetFlags({
        apiUrl: 'http://localhost:3000',
        connectDashboardUrl: 'https://dashboard.novu.co',
      })
    ).toEqual(['--api-url http://localhost:3000']);
  });
});
