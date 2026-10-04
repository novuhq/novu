export type HumanRegion = 'us' | 'eu';

/**
 * Base URL of the Human website (`apps/human-website`), which hosts the pages
 * that `human invite` links point to. `HUMAN_WEBSITE_URL` wins, falling back
 * to gethuman.md. The trailing slash is stripped so callers can append paths.
 */
export function resolveHumanWebsiteBaseUrl(): string {
  return (process.env.HUMAN_WEBSITE_URL || 'https://gethuman.md').replace(/\/$/, '');
}

/**
 * The region this API serves, as the Human website names it. Every AWS EU
 * region starts with `eu-`; everything else is served by the US website flow.
 */
export function resolveHumanRegion(): HumanRegion {
  return process.env.NOVU_REGION?.startsWith('eu-') ? 'eu' : 'us';
}

/**
 * The Human website is one site for every region, so links from an EU
 * deployment carry `region=eu` and the page calls the EU API.
 */
export function buildHumanWebsiteUrl(path: string, params: Record<string, string> = {}): string {
  const url = new URL(`${resolveHumanWebsiteBaseUrl()}${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  if (resolveHumanRegion() === 'eu') {
    url.searchParams.set('region', 'eu');
  }

  return url.toString();
}
