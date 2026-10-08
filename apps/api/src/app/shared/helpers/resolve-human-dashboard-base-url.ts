export type HumanRegion = 'us' | 'eu';

/**
 * Base URL of the Human dashboard (`apps/human-dashboard`), which hosts the pages
 * that `human invite` links point to. `HUMAN_DASHBOARD_URL` wins, falling back
 * to gethuman.md. The trailing slash is stripped so callers can append paths.
 */
export function resolveHumanDashboardBaseUrl(): string {
  return (process.env.HUMAN_DASHBOARD_URL || 'https://gethuman.md').replace(/\/$/, '');
}

/**
 * The region this API serves, as the Human dashboard names it. Every AWS EU
 * region starts with `eu-`; everything else is served by the US website flow.
 */
export function resolveHumanRegion(): HumanRegion {
  return process.env.NOVU_REGION?.startsWith('eu-') ? 'eu' : 'us';
}

/**
 * The Human dashboard is one site for every region, so links from an EU
 * deployment carry `region=eu` and the page calls the EU API.
 */
export function buildHumanDashboardUrl(path: string, params: Record<string, string> = {}): string {
  const url = new URL(`${resolveHumanDashboardBaseUrl()}${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  if (resolveHumanRegion() === 'eu') {
    url.searchParams.set('region', 'eu');
  }

  return url.toString();
}

/**
 * Page where an operator approves `human login` by typing the code their terminal shows. Approving goes
 * through the Human accounts endpoints, which only run where the Human dashboard is configured, so there's
 * no browser login without it.
 */
export function buildHumanCliLoginUrl(): string | undefined {
  if (!process.env.HUMAN_DASHBOARD_URL?.trim()) {
    return undefined;
  }

  return buildHumanDashboardUrl('/cli/login');
}
