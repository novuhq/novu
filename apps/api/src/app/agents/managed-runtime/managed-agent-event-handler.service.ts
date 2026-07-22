import { Injectable } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  ConversationRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import { FeatureFlagsKeysEnum, McpConnectionStatusEnum, NOVU_INTERNAL_TOOLS } from '@novu/shared';
import {
  type SessionEventContext,
  SessionExpiredError,
  type StreamCallbacks,
  type StreamPart,
  type Response as ThalamusResponse,
} from '@novu/thalamus';
import { InboundAckService } from '../conversation-runtime/ack/inbound-ack.service';
import { HandleAgentReplyCommand } from '../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { formatToolInputSummary } from '../conversation-runtime/reply/handle-plan-progress/format-tool-input';
import { HandlePlanProgressCommand } from '../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.command';
import { HandlePlanProgress } from '../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.usecase';
import { AgentEventContext, AgentEventSink } from '../shared/agent-event-sink.service';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { captureAgentException } from '../shared/errors/capture-agent-sentry';
import { DemoClaudeQuotaPolicy } from './demo-claude-quota-policy.service';
import { buildErrorMessage } from './managed-agent-errors';
import { mapStreamPart, RunEventBuilder } from './stream-part-mapper';
import { HandlePendingToolApprovalsCommand } from './tool-approval/handle-pending-tool-approvals.command';
import { HandlePendingToolApprovals } from './tool-approval/handle-pending-tool-approvals.usecase';
import { listOAuthMcps } from './tool-connect/list-oauth-mcps.helper';
import { findOAuthMcpByServerName } from './tool-connect/oauth-mcp.types';

interface BaseCommandFields {
  userId: string;
  environmentId: string;
  organizationId: string;
  conversationId: string;
  agentIdentifier: string;
  integrationIdentifier: string;
}

@Injectable()
export class ManagedAgentEventHandler {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly handleAgentReply: HandleAgentReply,
    private readonly handlePlanProgress: HandlePlanProgress,
    private readonly handlePendingToolApprovals: HandlePendingToolApprovals,
    private readonly demoQuota: DemoClaudeQuotaPolicy,
    private readonly inboundAck: InboundAckService,
    private readonly agentEventSink: AgentEventSink,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  createHandlers(context: SessionEventContext): StreamCallbacks {
    const { sessionId, metadata } = context;

    if (!metadata.conversationId || !metadata.environmentId || !metadata.organizationId) {
      this.logger.error(`Webhook event missing required metadata: session=${sessionId}`);

      return {};
    }

    const baseFields = this.buildBaseFields(metadata);
    const builder = new RunEventBuilder({
      conversationId: metadata.conversationId,
      agentId: metadata.agentIdentifier ?? metadata.agentId ?? '',
      turnId: context.turnId,
      runId: context.runId,
    });
    const agentEventContext: AgentEventContext = {
      userId: metadata.organizationId,
      environmentId: metadata.environmentId,
      organizationId: metadata.organizationId,
      conversationId: metadata.conversationId,
      agentIdentifier: metadata.agentIdentifier ?? '',
      integrationIdentifier: metadata.integrationIdentifier ?? '',
      agentId: metadata.agentId,
      subscriberId: metadata.subscriberId,
      platform: metadata.platform as AgentPlatformEnum,
      platformThreadId: metadata.platformThreadId,
      sessionId,
      suppressReply: metadata.suppressReply === 'true',
    };

    return {
      onPart: async (part: StreamPart) => {
        if (!(await this.isProtocolEnabled(metadata))) {
          return;
        }

        const events = mapStreamPart(part);
        const envelopes = builder.wrap(events);

        for (const envelope of envelopes) {
          await this.agentEventSink.ingest(envelope, agentEventContext);
        }
      },

      onToolUseStart: async (event: {
        toolUseId: string;
        toolName: string;
        source?: { type: string; serverName?: string };
      }) => {
        if (await this.isProtocolEnabled(metadata)) {
          return;
        }

        try {
          if (this.isInternalTool(event.toolName)) return;
          await this.handlePlanProgress.execute(
            HandlePlanProgressCommand.create({
              ...baseFields,
              event: {
                kind: 'task',
                task: {
                  id: event.toolUseId,
                  title: event.toolName,
                  group: this.mcpServerNameOf(event.source),
                  status: 'in_progress',
                },
              },
            })
          );
        } catch (err) {
          this.logger.error(err, `onToolUseStart failed: session=${sessionId}`);
          captureAgentException(err, {
            component: 'managed-agent-event-handler',
            operation: 'on-tool-use-start',
            sessionId,
          });
        }
      },

      onToolUseDone: async (event: {
        toolUseId: string;
        toolName: string;
        input?: Record<string, unknown>;
        source?: { type: string; serverName?: string };
      }) => {
        if (await this.isProtocolEnabled(metadata)) {
          return;
        }

        try {
          if (this.isInternalTool(event.toolName)) return;
          if (!event.input || Object.keys(event.input).length === 0) return;
          await this.handlePlanProgress.execute(
            HandlePlanProgressCommand.create({
              ...baseFields,
              event: {
                kind: 'task',
                task: {
                  id: event.toolUseId,
                  title: event.toolName,
                  group: this.mcpServerNameOf(event.source),
                  status: 'in_progress',
                  details: formatToolInputSummary(event.input),
                },
              },
            })
          );
        } catch (err) {
          this.logger.error(err, `onToolUseDone failed: session=${sessionId}`);
          captureAgentException(err, {
            component: 'managed-agent-event-handler',
            operation: 'on-tool-use-done',
            sessionId,
          });
        }
      },

      // TODO(agents): also persist a TOOL_RESULT activity once Thalamus sends the tool output
      // (today this event only has { toolUseId, isError }), so the ledger holds the full tool trail.
      onToolUseResult: async (event: { toolUseId: string; isError?: boolean }) => {
        if (await this.isProtocolEnabled(metadata)) {
          return;
        }

        try {
          await this.handlePlanProgress.execute(
            HandlePlanProgressCommand.create({
              ...baseFields,
              event: {
                kind: 'task',
                task: { id: event.toolUseId, status: event.isError === true ? 'error' : 'complete' },
              },
            })
          );
        } catch (err) {
          this.logger.error(err, `onToolUseResult failed: session=${sessionId}`);
          captureAgentException(err, {
            component: 'managed-agent-event-handler',
            operation: 'on-tool-use-result',
            sessionId,
          });
        }
      },

      onMessage: async (event: { text: string }) => {
        if (await this.isProtocolEnabled(metadata)) {
          return;
        }

        try {
          if (metadata.suppressReply === 'true') {
            return;
          }
          const markdown = event.text?.trim();
          if (!markdown) {
            return;
          }
          await this.handleAgentReply.execute(HandleAgentReplyCommand.create({ ...baseFields, reply: { markdown } }));
        } catch (err) {
          this.logger.error(err, `onMessage failed: session=${sessionId}`);
          captureAgentException(err, {
            component: 'managed-agent-event-handler',
            operation: 'on-message',
            sessionId,
          });
          // Re-throw so the webhook returns 5xx and the observer retries delivery,
          // otherwise a failed reply is acked as complete and silently lost.
          throw err;
        }
      },

      onFinish: async (event: { response: ThalamusResponse }) => {
        if (await this.isProtocolEnabled(metadata)) {
          return;
        }

        try {
          if (event.response.finishReason === 'requires-action') {
            await this.handlePendingToolApprovals.execute(
              HandlePendingToolApprovalsCommand.create({
                ...baseFields,
                subscriberId: metadata.subscriberId,
                platform: metadata.platform as AgentPlatformEnum,
                platformThreadId: metadata.platformThreadId,
                sessionId,
                response: event.response,
              })
            );
            await this.inboundAck.onManagedTurnComplete(metadata);

            return;
          }

          if (metadata.suppressReply === 'true') {
            await this.inboundAck.onManagedTurnComplete(metadata);

            return;
          }

          await this.inboundAck.onManagedTurnComplete(metadata);

          await this.demoQuota.recordUsage(
            metadata.environmentId,
            metadata.organizationId,
            metadata.conversationId,
            event.response.usage
          );
          await this.handlePlanProgress.execute(
            HandlePlanProgressCommand.create({ ...baseFields, event: { kind: 'phase', phase: 'finished' } })
          );
        } catch (err) {
          this.logger.error(err, `onFinish failed: session=${sessionId}`);
          captureAgentException(err, {
            component: 'managed-agent-event-handler',
            operation: 'on-finish',
            sessionId,
          });
          throw err;
        }
      },

      onError: async (event: { error: Error }) => {
        if (await this.isProtocolEnabled(metadata)) {
          return;
        }

        try {
          await this.handleErrorEvent(metadata, sessionId, event.error, baseFields);
        } catch (err) {
          this.logger.error(err, `onError handler failed: session=${sessionId}`);
          captureAgentException(err, {
            component: 'managed-agent-event-handler',
            operation: 'on-error-handler',
            sessionId,
          });
        }
      },

      onMcpServerFailure: async (event: {
        reason: 'authentication' | 'connection';
        serverName: string;
        message: string;
      }) => {
        if (await this.isProtocolEnabled(metadata)) {
          return;
        }

        try {
          await this.handleMcpServerFailure(metadata, sessionId, event);
        } catch (err) {
          this.logger.error(err, `onMcpServerFailure failed: session=${sessionId}`);
          captureAgentException(err, {
            component: 'managed-agent-event-handler',
            operation: 'on-mcp-server-failure',
            sessionId,
          });
        }
      },
    };
  }

  private async isProtocolEnabled(metadata: Record<string, string>): Promise<boolean> {
    const organizationId = metadata.organizationId;
    const environmentId = metadata.environmentId;

    if (!organizationId || !environmentId) {
      return false;
    }

    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AGENT_EVENT_PROTOCOL_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
      environment: { _id: environmentId },
    });
  }

  private mcpServerNameOf(source?: { type: string; serverName?: string }): string | undefined {
    return source?.type === 'mcp' ? source.serverName : undefined;
  }

  private isInternalTool(toolName?: string): boolean {
    return NOVU_INTERNAL_TOOLS.includes(toolName ?? '');
  }

  private buildBaseFields(metadata: Record<string, string>): BaseCommandFields {
    return {
      userId: metadata.organizationId,
      environmentId: metadata.environmentId,
      organizationId: metadata.organizationId,
      conversationId: metadata.conversationId,
      agentIdentifier: metadata.agentIdentifier ?? '',
      integrationIdentifier: metadata.integrationIdentifier ?? '',
    };
  }

  /**
   * MCP init failed upstream (non-fatal). For authentication failures, flip the
   * connection out of `connected` so `list_available` / `request_connect` can
   * offer reconnect. Connection failures are logged only — credentials may still
   * be valid.
   */
  private async handleMcpServerFailure(
    metadata: Record<string, string>,
    sessionId: string,
    event: { reason: 'authentication' | 'connection'; serverName: string; message: string }
  ): Promise<void> {
    if (event.reason !== 'authentication') {
      this.logger.warn(
        { sessionId, serverName: event.serverName, reason: event.reason, message: event.message },
        'MCP server failure (non-auth) — session continues without updating connection status'
      );

      return;
    }

    const { environmentId, organizationId, agentId, subscriberId } = metadata;

    if (!environmentId || !organizationId || !agentId || !subscriberId) {
      this.logger.warn(
        { sessionId, serverName: event.serverName },
        'mcp-server-failure missing webhook metadata — skipping connection update'
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
        'mcp-server-failure for unknown OAuth MCP — skipping connection update'
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
  }

  private async handleErrorEvent(
    metadata: Record<string, string>,
    sessionId: string,
    error: Error,
    baseCommand: BaseCommandFields
  ): Promise<void> {
    if (error instanceof SessionExpiredError) {
      this.logger.warn(`Session ${sessionId} expired, clearing for next message`);
      await this.conversationRepository.clearExternalSessionId(metadata.environmentId, metadata.conversationId);
      await this.inboundAck.onManagedTurnComplete(metadata);

      return;
    }

    const message = buildErrorMessage(error);

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({ ...baseCommand, reply: { markdown: message }, isSystemGenerated: true })
      );
      await this.inboundAck.onManagedTurnComplete(metadata);
      await this.handlePlanProgress.execute(
        HandlePlanProgressCommand.create({ ...baseCommand, event: { kind: 'phase', phase: 'failed' } })
      );
    } catch (err) {
      this.logger.error(err, `Failed to deliver error message for session ${sessionId}`);
      captureAgentException(err, {
        component: 'managed-agent-event-handler',
        operation: 'deliver-error-message',
        sessionId,
      });
    }
  }
}
