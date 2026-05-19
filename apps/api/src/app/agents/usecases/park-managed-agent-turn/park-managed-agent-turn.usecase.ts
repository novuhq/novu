import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentMcpServerRepository, AgentRepository, McpConnectionRepository, SubscriberRepository } from '@novu/dal';
import { McpConnectionStatusEnum } from '@novu/shared';

import { ParkManagedAgentTurnCommand } from './park-managed-agent-turn.command';

/**
 * Persist a managed-agent job that failed because the upstream MCP couldn't
 * be initialised (no credential available in the runtime provider's vault).
 * The OAuth callback replays the parked job once the subscriber finishes
 * authorising, so the user never has to retype the message that triggered
 * the OAuth prompt.
 *
 * Pre-condition: `GenerateMcpOAuthUrl` has been called for the same
 * (agent, mcp, subscriber) tuple — that's the usecase that creates the
 * `pending_oauth` `mcp_connection` row this routine attaches `pendingTurn`
 * to. The worker is expected to call that first to obtain the authorize URL
 * for the chat card, then call this to park the job.
 */
@Injectable()
export class ParkManagedAgentTurn {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: ParkManagedAgentTurnCommand): Promise<void> {
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

    const enablement = await this.agentMcpServerRepository.findByAgentAndMcpId({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      mcpId: command.mcpId,
    });

    if (!enablement) {
      throw new NotFoundException(`MCP "${command.mcpId}" is not enabled on agent "${command.agentIdentifier}".`);
    }

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      throw new NotFoundException(`Subscriber "${command.subscriberId}" not found in this environment.`);
    }

    const connection = await this.mcpConnectionRepository.findSubscriberConnection({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentMcpServerId: enablement._id,
      subscriberId: subscriber._id,
    });

    if (!connection) {
      throw new NotFoundException(
        `No OAuth connection in progress for subscriber "${command.subscriberId}" on MCP "${command.mcpId}". Call /oauth/url first.`
      );
    }

    // Only `pending_oauth` rows are eligible for parking — attaching a
    // pendingTurn to a connection that is already `connected` / `error` /
    // anything else would leave the job dangling because the OAuth callback
    // (which is the only path that drains `pendingTurn`) will never fire
    // again for that row.
    if (connection.status !== McpConnectionStatusEnum.PendingOAuth) {
      throw new ConflictException(
        `MCP connection for subscriber "${command.subscriberId}" on "${command.mcpId}" is not awaiting OAuth (status: ${connection.status}). Call /oauth/url to start a new authorisation before parking a turn.`
      );
    }

    await this.mcpConnectionRepository.setPendingTurn({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      connectionId: connection._id,
      pendingTurn: {
        jobData: { ...command.jobData },
        queuedAt: new Date(),
      },
    });
  }
}
