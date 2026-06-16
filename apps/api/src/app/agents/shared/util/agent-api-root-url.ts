/**
 * Public agent API root used for OAuth callbacks, MCP redirects, and webhooks.
 * `AGENT_API_HOSTNAME` (e.g. ngrok) takes precedence over `API_ROOT_URL`.
 */
export function buildAgentApiRootUrl(): string {
  const rootUrl = process.env.AGENT_API_HOSTNAME?.trim() || process.env.API_ROOT_URL?.trim();
  if (!rootUrl) {
    throw new Error('AGENT_API_HOSTNAME or API_ROOT_URL environment variable is required');
  }

  return rootUrl.replace(/\/$/, '');
}
