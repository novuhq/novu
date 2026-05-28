import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentMcpServerRepository, AgentRepository } from '@novu/dal';
import { MCP_SERVERS } from '@novu/shared';

import { type SetAgentMcpServersFailureDto, type SetAgentMcpServersResponseDto } from '../../dtos/mcp-server.dto';
import { DisableAgentMcpServerCommand } from '../disable-agent-mcp-server/disable-agent-mcp-server.command';
import { DisableAgentMcpServer } from '../disable-agent-mcp-server/disable-agent-mcp-server.usecase';
import { EnableAgentMcpServerCommand } from '../enable-agent-mcp-server/enable-agent-mcp-server.command';
import { EnableAgentMcpServer, toEnablementResponse } from '../enable-agent-mcp-server/enable-agent-mcp-server.usecase';
import { SetAgentMcpServersCommand } from './set-agent-mcp-servers.command';

/**
 * Bulk "set desired state" entry point for an agent's enabled MCP set.
 *
 * Replaces the current enablement set with `command.mcpIds`: ids in the
 * request but not currently enabled are enabled; currently-enabled ids not
 * in the request are disabled; ids that are already in the desired state
 * are left untouched. Mongo is authoritative and the runtime provider is
 * re-projected after every individual mutation (see follow-up note below).
 *
 * Failure model:
 *   - Catalog validation fails the **whole** request up-front (no partial
 *     writes for malformed input). Mixing an unknown id with valid ones is
 *     treated as a programmer error in the caller.
 *   - Per-row business / provider errors during enable / disable are caught
 *     and collected into `failed[]`. The remaining mutations still run, so
 *     the response describes the final converged state plus what didn't
 *     take. The dashboard surfaces failures via toast and refetches the
 *     list to render the truth.
 *
 * Future optimisation:
 *   Today this orchestrates the existing per-row `EnableAgentMcpServer` /
 *   `DisableAgentMcpServer` usecases sequentially, which means one
 *   `SyncAgentMcpServers` projection per row. Extracting a "mongo-only"
 *   variant from each and running a single sync at the end would cut
 *   provider round-trips from O(changes) to O(1). Deferred to keep this
 *   change focused — correctness is identical either way.
 */
@Injectable()
export class SetAgentMcpServers {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly enableAgentMcpServer: EnableAgentMcpServer,
    private readonly disableAgentMcpServer: DisableAgentMcpServer,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(SetAgentMcpServers.name);
  }

  async execute(command: SetAgentMcpServersCommand): Promise<SetAgentMcpServersResponseDto> {
    const desired = uniqueIds(command.mcpIds);

    this.assertAllIdsInCatalog(desired);

    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${command.agentIdentifier}" not found.`);
    }

    const currentRows = await this.agentMcpServerRepository.findByAgent({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
    });

    // Only "currently enabled" rows are candidates for disable; rows already
    // in `enabled: false` are stale and will be cleaned up by their own
    // retry path, not by this bulk call.
    const currentlyEnabledIds = new Set(currentRows.filter((r) => r.enabled).map((r) => r.mcpId));

    const desiredSet = new Set(desired);
    const toEnable = desired.filter((id) => !currentlyEnabledIds.has(id));
    const toDisable = [...currentlyEnabledIds].filter((id) => !desiredSet.has(id));

    const failed: SetAgentMcpServersFailureDto[] = [];

    // Enables first so a swap (disable A, enable B) doesn't leave the agent
    // transiently empty mid-save. Order within enables / disables is
    // deterministic (preserves request / current order).
    for (const mcpId of toEnable) {
      try {
        await this.enableAgentMcpServer.execute(
          EnableAgentMcpServerCommand.create({
            userId: command.userId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            agentIdentifier: command.agentIdentifier,
            mcpId,
          })
        );
      } catch (err) {
        failed.push(this.toFailure(mcpId, 'enable', err));
      }
    }

    for (const mcpId of toDisable) {
      try {
        await this.disableAgentMcpServer.execute(
          DisableAgentMcpServerCommand.create({
            userId: command.userId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            agentIdentifier: command.agentIdentifier,
            mcpId,
          })
        );
      } catch (err) {
        failed.push(this.toFailure(mcpId, 'disable', err));
      }
    }

    // Re-read so the response reflects every successful mutation, even if a
    // sibling row failed mid-loop. This also picks up any concurrent
    // mutations that landed between our reads.
    const finalRows = await this.agentMcpServerRepository.findByAgent({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      enabledOnly: true,
    });

    return {
      data: finalRows.map(toEnablementResponse),
      failed,
    };
  }

  private assertAllIdsInCatalog(ids: string[]): void {
    const catalogIds = new Set(MCP_SERVERS.map((entry) => entry.id));
    const unknown = ids.filter((id) => !catalogIds.has(id));

    if (unknown.length > 0) {
      throw new BadRequestException(`Unknown MCP server id(s): ${unknown.join(', ')}.`);
    }
  }

  private toFailure(mcpId: string, operation: 'enable' | 'disable', err: unknown): SetAgentMcpServersFailureDto {
    const code = extractErrorCode(err, operation);
    const message = err instanceof Error ? err.message : `Unknown ${operation} error`;

    this.logger.warn({ err, mcpId, operation }, 'Bulk MCP set: per-row mutation failed');

    return { mcpId, operation, code, message };
  }
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function extractErrorCode(err: unknown, operation: 'enable' | 'disable'): string {
  if (!(err instanceof Error)) return `${operation}_error`;
  // Nest exceptions carry a stable `name` (e.g. "BadRequestException",
  // "ConflictException"); fall back to a generic operation code so the
  // dashboard never sees an empty string.
  return err.name || `${operation}_error`;
}
