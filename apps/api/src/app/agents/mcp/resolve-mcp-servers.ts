import { BadRequestException } from '@nestjs/common';
import { MCP_SERVERS } from '@novu/shared';

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
