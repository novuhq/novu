import { BadRequestException } from '@nestjs/common';
import type { AgentMcpServerDto } from '@novu/shared';
import { CLAUDE_MCP_SERVERS } from '@novu/shared';

export type ResolvedMcpServer = { name: string; url: string };

/**
 * Resolve catalog MCP server IDs (e.g. "slack") to the trusted {name, url}
 * pair from CLAUDE_MCP_SERVERS. Throws BadRequestException for unknown IDs.
 *
 * Used on the provisioning path where the API surface accepts IDs.
 */
export function resolveMcpServersById(serverIds: string[]): ResolvedMcpServer[] {
  return serverIds.map((serverId) => {
    const catalogServer = CLAUDE_MCP_SERVERS.find((s) => s.id === serverId);

    if (!catalogServer) {
      throw new BadRequestException(
        `Unknown MCP server ID "${serverId}". Must be one of the supported catalog entries.`
      );
    }

    return { name: catalogServer.name, url: catalogServer.url };
  });
}

/**
 * Resolve full MCP server DTOs against CLAUDE_MCP_SERVERS, returning the
 * trusted {externalId, name, url} triple for each entry. The caller-supplied
 * `url` is intentionally discarded and replaced with the catalog URL, so a
 * caller with agent write access cannot attach an attacker-controlled MCP
 * endpoint to a managed agent.
 *
 * Used on the update path, where the PATCH body is the round-trip shape of
 * the GET response (each server has `externalId` and `name` set to the
 * catalog server's display name, since that is what the provider returns).
 *
 * Match strategy: each entry is matched against the catalog by checking
 * `name`, then `externalId`. The first catalog hit wins. URL is never used
 * for matching to avoid trusting any client-supplied URL value.
 *
 * Throws BadRequestException for any entry that does not correspond to a
 * known catalog server.
 */
export function resolveMcpServersFromDtos(servers: AgentMcpServerDto[]): AgentMcpServerDto[] {
  return servers.map((server) => {
    const catalogServer = CLAUDE_MCP_SERVERS.find((s) => s.name === server.name || s.name === server.externalId);

    if (!catalogServer) {
      throw new BadRequestException(
        `Unknown MCP server "${server.name || server.externalId}". Must be one of the supported catalog entries.`
      );
    }

    return {
      externalId: catalogServer.name,
      name: catalogServer.name,
      url: catalogServer.url,
    };
  });
}
