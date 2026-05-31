export enum CloudRegionEnum {
  US = 'us',
  EU = 'eu',
  STAGING = 'staging',
  LOCAL = 'local',
}

export enum DashboardUrlEnum {
  US = 'https://dashboard.novu.co',
  EU = 'https://eu.dashboard.novu.co',
  STAGING = 'https://dashboard.novu-staging.co',
}

export enum ApiUrlEnum {
  US = 'https://api.novu.co',
  EU = 'https://eu.api.novu.co',
  STAGING = 'https://api.novu-staging.co',
}

/** Browser-auth surface for `novu connect` (distinct from the main dashboard). */
export enum ConnectDashboardUrlEnum {
  PROD = 'https://connect.novu.co',
  STAGING = 'https://connect.novu-staging.co',
}

export const LOCAL_API_URL = 'https://api.novu.localhost';
export const LOCAL_DASHBOARD_URL = 'https://dashboard.novu.localhost';
