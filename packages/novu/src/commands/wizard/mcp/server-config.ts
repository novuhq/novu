import { resolveMcpUrl } from '../agent/iterator';
import type { ResolvedAuth } from '../types';

export type McpServerConfigShape = {
  command: string;
  args: string[];
  env?: Record<string, string>;
};

/**
 * Returns the canonical Novu MCP server config — same shape every editor
 * adapter writes into its `mcp.json` / `settings.json`. Mirrors the
 * `mcp-remote` invocation used by the agent SDK at runtime so that whatever
 * the wizard agent talked to is the same server installed for the editor.
 */
export function buildNovuMcpServerConfig(opts: { auth: ResolvedAuth; mcpUrlOverride?: string }): McpServerConfigShape {
  const url = resolveMcpUrl(opts.mcpUrlOverride, opts.auth.region);

  return {
    command: 'npx',
    args: ['-y', 'mcp-remote', url, '--header', `Authorization:Bearer ${opts.auth.secretKey}`],
  };
}
