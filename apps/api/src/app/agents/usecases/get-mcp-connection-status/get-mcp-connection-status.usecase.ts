import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentMcpServerRepository, AgentRepository, McpConnectionRepository, SubscriberRepository } from '@novu/dal';
import { McpConnectionAuthModeEnum, McpConnectionScopeEnum, McpConnectionStatusEnum } from '@novu/shared';

import { McpConnectionResponseDto } from '../../dtos/mcp-server.dto';
import { GetMcpConnectionStatusCommand } from './get-mcp-connection-status.command';

/**
 * Look up the (agent, mcp, subscriber) connection status. Returns null
 * when no connection exists yet so the dashboard can surface "Authorize"
 * vs "Connected" vs "Re-authorize" UX without leaking encrypted tokens.
 */
@Injectable()
export class GetMcpConnectionStatus {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: GetMcpConnectionStatusCommand): Promise<McpConnectionResponseDto | null> {
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
      return null;
    }

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      return null;
    }

    const connection = await this.mcpConnectionRepository.findSubscriberConnection({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentMcpServerId: enablement._id,
      subscriberId: subscriber._id,
    });

    if (!connection) {
      return null;
    }

    // Only surface `lastError` when the connection is currently in error.
    // `markConnectionError` clears the row's status transition rules so
    // a previously-failed-then-reconnected row should not bleed its old
    // error to the dashboard — but defence-in-depth here too, since the
    // underlying `$unset: lastError` doesn't always fire (e.g. when the
    // pending claim runs but token exchange succeeds via a different
    // code path). Without this gate, a stale error would render forever.
    const lastError = this.buildLastErrorView(connection.status as McpConnectionStatusEnum, connection.lastError);

    return {
      id: connection._id,
      mcpId: connection.mcpId,
      scope: connection.scope as McpConnectionScopeEnum,
      authMode: connection.authMode as McpConnectionAuthModeEnum,
      status: connection.status as McpConnectionStatusEnum,
      agentMcpServerId: connection._agentMcpServerId,
      subscriberId: connection._subscriberId,
      expiresAt: connection.auth?.expiresAt,
      connectedAt: connection.connectedAt,
      lastError,
    };
  }

  private buildLastErrorView(
    status: McpConnectionStatusEnum,
    lastError: { code: string; message: string; at: Date | string } | undefined
  ): { code: string; message: string; at: string } | undefined {
    if (status !== McpConnectionStatusEnum.Error || !lastError) {
      return undefined;
    }

    const at = lastError.at instanceof Date ? lastError.at.toISOString() : String(lastError.at);

    return {
      code: lastError.code,
      message: lastError.message,
      at,
    };
  }
}
