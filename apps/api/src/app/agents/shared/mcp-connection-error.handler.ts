import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentMcpServerRepository, McpConnectionRepository, SubscriberRepository } from '@novu/dal';
import { type AgentEvent, McpConnectionStatusEnum } from '@novu/shared';
import { listOAuthMcps } from '../managed-runtime/tool-connect/list-oauth-mcps.helper';
import { findOAuthMcpByServerName } from '../managed-runtime/tool-connect/oauth-mcp.types';
import type { AgentEventContext } from './agent-event-sink.service';
import { captureAgentException } from './errors/capture-agent-sentry';

/**
 * Runtime-ops: MCP (or other) connection failed during the run. Auth failures
 * flip the OAuth MCP connection out of `connected` so reconnect UX can offer.
 * Non-auth failures are logged only. Errors are swallowed — must not fail the
 * webhook the way message ingest does.
 */
@Injectable()
export class McpConnectionErrorHandler {
  constructor(
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async handle(event: Extract<AgentEvent, { type: 'connection.error' }>, context: AgentEventContext): Promise<void> {
    try {
      if (event.reason !== 'authentication') {
        this.logger.warn(
          {
            sessionId: context.sessionId,
            serverName: event.serverName,
            reason: event.reason,
            message: event.message,
            source: event.source,
          },
          'MCP server failure (non-auth) — session continues without updating connection status'
        );

        return;
      }

      const { environmentId, organizationId, agentId, subscriberId, sessionId } = context;

      if (!agentId || !subscriberId) {
        this.logger.warn(
          { sessionId, serverName: event.serverName },
          'connection.error missing agent/subscriber context — skipping connection update'
        );

        return;
      }

      const mcps = await listOAuthMcps(
        {
          subscriberRepository: this.subscriberRepository,
          agentMcpServerRepository: this.agentMcpServerRepository,
          mcpConnectionRepository: this.mcpConnectionRepository,
        },
        {
          environmentId,
          organizationId,
          agentId,
          subscriberId,
        }
      );

      const mcp = findOAuthMcpByServerName(mcps, event.serverName);

      if (!mcp) {
        this.logger.warn(
          { sessionId, serverName: event.serverName, agentId },
          'connection.error for unknown OAuth MCP — skipping connection update'
        );

        return;
      }

      if (mcp.status !== McpConnectionStatusEnum.Connected) {
        return;
      }

      const subscriber = await this.subscriberRepository.findBySubscriberId(environmentId, subscriberId);

      if (!subscriber) {
        return;
      }

      await this.mcpConnectionRepository.update(
        {
          _environmentId: environmentId,
          _organizationId: organizationId,
          _agentMcpServerId: mcp.agentMcpServerId,
          _subscriberId: subscriber._id,
          status: McpConnectionStatusEnum.Connected,
        },
        {
          $set: {
            status: McpConnectionStatusEnum.Error,
            lastError: {
              code: 'authentication_failed',
              message: event.message,
              at: new Date(),
            },
          },
        }
      );

      this.logger.info(
        {
          sessionId,
          serverName: event.serverName,
          mcpId: mcp.mcpId,
          agentId,
          subscriberId,
        },
        'Marked MCP connection as error after authentication failure'
      );
    } catch (err) {
      this.logger.error(err, `connection.error failed: session=${context.sessionId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'connection-error',
        sessionId: context.sessionId,
      });
    }
  }
}
