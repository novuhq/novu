export const NOVU_CLOUD_API_URL = 'https://api.novu.co';
export const NOVU_STAGING_API_URL = 'https://api.novu-staging.co';
export const NOVU_EU_API_URL = 'https://eu.api.novu.co';

export type NovuConnectPackageTag = 'latest' | 'rc';

/** npm dist-tag for @novu/react, @novu/js, and @novu/framework in connect scaffolds. */
export type NovuScaffoldSdkTag = 'next' | 'latest';

export type NovuConnectTargetOptions = {
  apiUrl?: string | null;
  connectDashboardUrl?: string | null;
  dashboardUrl?: string | null;
};

const NOVU_CLOUD_DASHBOARD_URLS = new Set([
  'https://dashboard.novu.co',
  'https://eu.dashboard.novu.co',
  'https://dashboard.novu-staging.co',
  'https://dashboard.novu.localhost',
]);

function normalizeUrl(url: string | null | undefined): string {
  return (url ?? '').replace(/\/$/, '');
}

function normalizeApiUrl(apiUrl: string | null | undefined): string {
  return normalizeUrl(apiUrl);
}

export function normalizeConnectTargetOptions<T extends NovuConnectTargetOptions = NovuConnectTargetOptions>(
  apiUrlOrOptions?: string | null | T
): T {
  if (typeof apiUrlOrOptions === 'string' || apiUrlOrOptions == null) {
    return { apiUrl: apiUrlOrOptions } as T;
  }

  return apiUrlOrOptions;
}

export function isNovuStagingApiUrl(apiUrl: string | null | undefined): boolean {
  return normalizeApiUrl(apiUrl) === NOVU_STAGING_API_URL;
}

export function isNovuLocalApiUrl(apiUrl: string | null | undefined): boolean {
  const normalized = normalizeApiUrl(apiUrl);
  if (!normalized) {
    return false;
  }

  try {
    const hostname = new URL(normalized).hostname;

    // `.localhost` is reserved for loopback (RFC 6761) — covers the
    // `api.novu.localhost` local-dev host alongside plain localhost.
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
  } catch {
    return false;
  }
}

export function getNovuConnectPackageTag(apiUrl?: string | null): NovuConnectPackageTag {
  return isNovuStagingApiUrl(apiUrl) || isNovuLocalApiUrl(apiUrl) ? 'rc' : 'latest';
}

export function isNovuPreReleaseConnectMode(apiUrl?: string | null, region?: string | null): boolean {
  return isNovuStagingApiUrl(apiUrl) || isNovuLocalApiUrl(apiUrl) || region === 'staging' || region === 'local';
}

export function getNovuScaffoldSdkTag(apiUrl?: string | null, region?: string | null): NovuScaffoldSdkTag {
  return isNovuPreReleaseConnectMode(apiUrl, region) ? 'next' : 'latest';
}

export function isNovuEuApiUrl(apiUrl: string | null | undefined): boolean {
  return normalizeApiUrl(apiUrl) === NOVU_EU_API_URL;
}

/**
 * Cloud regions are passed as `--region` so the CLI resolves the matching API and
 * dashboard URLs together (browser OAuth, post-connect links, scaffold region).
 */
export function getNovuConnectRegionFlag(apiUrl?: string | null): '--region staging' | '--region eu' | undefined {
  if (isNovuStagingApiUrl(apiUrl)) {
    return '--region staging';
  }

  if (isNovuEuApiUrl(apiUrl)) {
    return '--region eu';
  }

  return undefined;
}

export function getNovuConnectInvocation(apiUrl?: string | null): string {
  return `npx novu@${getNovuConnectPackageTag(apiUrl)} connect`;
}

function shouldEmitConnectDashboardFlags(connectDashboardUrl?: string | null): boolean {
  const normalized = normalizeUrl(connectDashboardUrl);

  if (!normalized) {
    return false;
  }

  return !NOVU_CLOUD_DASHBOARD_URLS.has(normalized);
}

export function formatNovuConnectCommandForDisplay(parts: readonly string[]): string {
  return parts.join(' \\\n  ');
}

/**
 * Staging and EU use `--region` so OAuth hits the matching Cloud dashboard
 * (dashboard.novu-staging.co / eu.dashboard.novu.co). Other non-US APIs
 * (self-hosted, local) keep `--api-url`. Local dev also needs dashboard URLs
 * so browser OAuth opens the same dashboard the user copied the command from.
 */
export function getNovuConnectTargetFlags(apiUrlOrOptions?: string | null | NovuConnectTargetOptions): string[] {
  const options = normalizeConnectTargetOptions(apiUrlOrOptions);
  const regionFlag = getNovuConnectRegionFlag(options.apiUrl);
  if (regionFlag) {
    return [regionFlag];
  }

  const flags: string[] = [];
  const normalizedApiUrl = normalizeApiUrl(options.apiUrl);

  if (normalizedApiUrl && normalizedApiUrl !== NOVU_CLOUD_API_URL) {
    flags.push(`--api-url ${normalizedApiUrl}`);
  }

  if (shouldEmitConnectDashboardFlags(options.connectDashboardUrl)) {
    const connectDashboardUrl = normalizeUrl(options.connectDashboardUrl);
    const dashboardUrl = normalizeUrl(options.dashboardUrl) || connectDashboardUrl;

    flags.push(`--connect-dashboard-url ${connectDashboardUrl}`);
    flags.push(`--dashboard-url ${dashboardUrl}`);
  }

  return flags;
}

export function buildNovuConnectStagingHint(apiUrl?: string | null): string | undefined {
  if (!isNovuStagingApiUrl(apiUrl)) {
    return undefined;
  }

  return 'Use `npx novu@rc` and pass `--region staging`.';
}
