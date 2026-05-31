import {
  ApiUrlEnum,
  CloudRegionEnum,
  ConnectDashboardUrlEnum,
  DashboardUrlEnum,
  LOCAL_API_URL,
  LOCAL_DASHBOARD_URL,
} from './enums';

export interface RegionUrlSet {
  apiUrl: string;
  dashboardUrl: string;
  connectDashboardUrl: string;
}

export interface RegionUrlOverrides {
  apiUrl?: string;
  dashboardUrl?: string;
  connectDashboardUrl?: string;
}

export function getRegionUrls(region: CloudRegionEnum): RegionUrlSet {
  switch (region) {
    case CloudRegionEnum.EU:
      return {
        apiUrl: ApiUrlEnum.EU,
        dashboardUrl: DashboardUrlEnum.EU,
        connectDashboardUrl: ConnectDashboardUrlEnum.PROD,
      };
    case CloudRegionEnum.STAGING:
      return {
        apiUrl: ApiUrlEnum.STAGING,
        dashboardUrl: DashboardUrlEnum.STAGING,
        connectDashboardUrl: ConnectDashboardUrlEnum.STAGING,
      };
    case CloudRegionEnum.LOCAL:
      return {
        apiUrl: LOCAL_API_URL,
        dashboardUrl: LOCAL_DASHBOARD_URL,
        connectDashboardUrl: LOCAL_DASHBOARD_URL,
      };
    case CloudRegionEnum.US:
    default:
      return {
        apiUrl: ApiUrlEnum.US,
        dashboardUrl: DashboardUrlEnum.US,
        connectDashboardUrl: ConnectDashboardUrlEnum.PROD,
      };
  }
}

/** Apply explicit CLI overrides on top of region defaults. */
export function resolveRegionUrls(region: CloudRegionEnum, overrides: RegionUrlOverrides = {}): RegionUrlSet {
  const defaults = getRegionUrls(region);

  return {
    apiUrl: normalizeUrl(overrides.apiUrl, defaults.apiUrl),
    dashboardUrl: normalizeUrl(overrides.dashboardUrl, defaults.dashboardUrl),
    connectDashboardUrl: normalizeUrl(overrides.connectDashboardUrl, defaults.connectDashboardUrl),
  };
}

function normalizeUrl(override: string | undefined, fallback: string): string {
  const trimmed = override?.trim();

  if (!trimmed) {
    return fallback;
  }

  return trimmed.replace(/\/$/, '');
}
