const DEFAULT_API_URL = 'https://api.novu.co';

/**
 * Agent Inbox's API on this site (`app/api/[...path]`), which forwards to the Novu API: `/api/v1/inbox` here
 * is `/v1/human/inbox` there. The CLI, the MCP server, the browser and the prompts go through it, so people only
 * ever see this site's address.
 */
export const API_PROXY_PATH = '/api';

/** The Novu API that `/api` forwards to and this site's server calls. */
export function resolveNovuApiUrl(): string {
  return (process.env.NEXT_PUBLIC_NOVU_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
}
