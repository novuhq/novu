const DEFAULT_API_URL = 'https://api.novu.co';
const DEFAULT_EU_API_URL = 'https://eu.api.novu.co';

/**
 * The Novu API an invite link belongs to. Links issued by the EU API carry `?region=eu`;
 * anything else uses the default API. The API URL itself never comes from the link, so a
 * crafted link can't point this page at someone else's server.
 */
export function resolveNovuApiUrl(region: string | string[] | undefined): string {
  const url =
    region === 'eu'
      ? process.env.NEXT_PUBLIC_NOVU_API_URL_EU || DEFAULT_EU_API_URL
      : process.env.NEXT_PUBLIC_NOVU_API_URL || DEFAULT_API_URL;

  return url.replace(/\/$/, '');
}
