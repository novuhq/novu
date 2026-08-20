import { describe, expect, it } from 'vitest';
import {
  buildNovuConnectStagingHint,
  getNovuConnectInvocation,
  getNovuConnectPackageTag,
  getNovuConnectTargetFlags,
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
});
