import { BadRequestException } from '@nestjs/common';
import { type AgentMcpServerDto, MCP_SERVERS } from '@novu/shared';

export type ResolvedMcpServer = { name: string; url: string };

/**
 * Resolve catalog MCP server IDs (e.g. "slack") to the trusted {name, url}
 * pair from MCP_SERVERS. Throws BadRequestException for unknown IDs.
 *
 * Used on the provisioning path where the API surface accepts IDs.
 *
 * NOTE: The PATCH `/agents/:id/runtime/config` flow no longer accepts
 * `mcpServers` as input — that path is owned by the dedicated
 * `POST/DELETE /agents/:id/mcp-servers` endpoints which read from
 * `agent_mcp_server` rows. The previous `resolveMcpServersFromDtos`
 * helper has been removed since it has no callers.
 */
export function resolveMcpServersById(serverIds: string[]): ResolvedMcpServer[] {
  return serverIds.map((serverId) => {
    const catalogServer = MCP_SERVERS.find((s) => s.id === serverId);

    if (!catalogServer) {
      throw new BadRequestException(
        `Unknown MCP server ID "${serverId}". Must be one of the supported catalog entries.`
      );
    }

    return { name: catalogServer.name, url: catalogServer.url };
  });
}

/**
 * Trailing-slash differences are common between catalog URLs and what a
 * provider stores (Anthropic preserves whatever was sent at create time, but
 * adopted agents may have been provisioned through a different client). We
 * key matching off the canonical URL so user-given display names that drift
 * from the catalog (e.g. "Slack — Sales") don't break adoption.
 */
function normalizeMcpUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').toLowerCase();
}

export type ResolveProviderMcpServerIdsResult = {
  /** Catalog ids matched on the provider's MCP server list, dedup-preserving order. */
  matchedIds: string[];
  /** Provider entries that did not match any catalog URL — surfaced for logging. */
  unmatched: AgentMcpServerDto[];
};

/**
 * Map MCP servers reported by the runtime provider back onto catalog ids.
 *
 * Used in the "adopt existing agent" flow so the `agent_mcp_server` table can
 * be seeded from what the provider already has configured, instead of asking
 * the caller to re-declare the list. URL is the canonical identity — names
 * are user-editable on most providers and can drift from `catalog.name`.
 */
export function resolveProviderMcpServerIds(
  providerMcpServers: AgentMcpServerDto[]
): ResolveProviderMcpServerIdsResult {
  const matchedIds: string[] = [];
  const seen = new Set<string>();
  const unmatched: AgentMcpServerDto[] = [];

  for (const providerEntry of providerMcpServers) {
    if (!providerEntry.url) {
      unmatched.push(providerEntry);
      continue;
    }

    const target = normalizeMcpUrl(providerEntry.url);
    const catalogEntry = MCP_SERVERS.find((s) => normalizeMcpUrl(s.url) === target);

    if (!catalogEntry) {
      unmatched.push(providerEntry);
      continue;
    }

    if (seen.has(catalogEntry.id)) continue;
    seen.add(catalogEntry.id);
    matchedIds.push(catalogEntry.id);
  }

  return { matchedIds, unmatched };
}
