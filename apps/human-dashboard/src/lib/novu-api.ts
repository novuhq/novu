const DEFAULT_API_URL = 'https://api.novu.co';
const DEFAULT_EU_API_URL = 'https://eu.api.novu.co';

/**
 * Agent Inbox's API on this site (`app/api/[...path]`), which forwards to the US Novu API: `/api/v1/inbox` here
 * is `/v1/human/inbox` there. The CLI, the MCP server, the browser and the prompts go through it, so people only
 * ever see this site's address.
 */
export const API_PROXY_PATH = '/api';

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
