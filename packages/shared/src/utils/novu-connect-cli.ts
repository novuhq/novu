export const NOVU_CLOUD_API_URL = 'https://api.novu.co';
export const NOVU_STAGING_API_URL = 'https://api.novu-staging.co';

export type NovuConnectPackageTag = 'latest' | 'rc';

function normalizeApiUrl(apiUrl: string | null | undefined): string {
  return (apiUrl ?? '').replace(/\/$/, '');
}

export function isNovuStagingApiUrl(apiUrl: string | null | undefined): boolean {
  return normalizeApiUrl(apiUrl) === NOVU_STAGING_API_URL;
}

export function getNovuConnectPackageTag(apiUrl?: string | null): NovuConnectPackageTag {
  return isNovuStagingApiUrl(apiUrl) ? 'rc' : 'latest';
}

export function getNovuConnectRegionFlag(apiUrl?: string | null): '--region staging' | undefined {
  if (!isNovuStagingApiUrl(apiUrl)) {
    return undefined;
  }

  return '--region staging';
}

export function getNovuConnectInvocation(apiUrl?: string | null): string {
  return `npx novu@${getNovuConnectPackageTag(apiUrl)} connect`;
}

/**
 * Staging uses `--region staging` so OAuth hits dashboard.novu-staging.co.
 * Other non-US Cloud APIs keep `--api-url`.
 */
export function getNovuConnectTargetFlags(apiUrl?: string | null): string[] {
  const regionFlag = getNovuConnectRegionFlag(apiUrl);
  if (regionFlag) {
    return [regionFlag];
  }

  const normalized = normalizeApiUrl(apiUrl);
  if (normalized && normalized !== NOVU_CLOUD_API_URL) {
    return [`--api-url ${normalized}`];
  }

  return [];
}

export function buildNovuConnectStagingHint(apiUrl?: string | null): string | undefined {
  if (!isNovuStagingApiUrl(apiUrl)) {
    return undefined;
  }

  return 'Use `npx novu@rc` and pass `--region staging`.';
}
