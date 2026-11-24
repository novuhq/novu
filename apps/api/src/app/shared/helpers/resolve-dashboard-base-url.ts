import { env } from '../../../config/env';

/**
 * Base URL of the dashboard for links minted by the API (setup pages, signup
 * pages). `DASHBOARD_URL` wins over the legacy `FRONT_BASE_URL`, falling back
 * to Novu Cloud. The trailing slash is stripped so callers can append paths.
 */
export function resolveDashboardBaseUrl(): string {
  return (env.DASHBOARD_URL || env.FRONT_BASE_URL || 'https://dashboard.novu.co').replace(/\/$/, '');
}
