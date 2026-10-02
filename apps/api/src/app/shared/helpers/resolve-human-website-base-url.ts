/**
 * Base URL of the Human website (`apps/human-website`), which hosts the pages
 * that `human invite` links point to. `HUMAN_WEBSITE_URL` wins, falling back
 * to gethuman.md. The trailing slash is stripped so callers can append paths.
 */
export function resolveHumanWebsiteBaseUrl(): string {
  return (process.env.HUMAN_WEBSITE_URL || 'https://gethuman.md').replace(/\/$/, '');
}
