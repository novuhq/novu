import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  ConversationRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import {
  type AgentApprovalRequest,
  type AgentEvent,
  type AgentEventEnvelope,
  type AgentEventUsage,
  isDeltaEvent,
  McpConnectionStatusEnum,
  NOVU_INTERNAL_TOOLS,
} from '@novu/shared';
import type { ActionRequired, Response as ThalamusResponse } from '@novu/thalamus';
import { InboundAckService } from '../conversation-runtime/ack/inbound-ack.service';
import { HandleAgentReplyCommand } from '../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { formatToolInputSummary } from '../conversation-runtime/reply/handle-plan-progress/format-tool-input';
import { HandlePlanProgressCommand } from '../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.command';
import { HandlePlanProgress } from '../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.usecase';
import { DemoClaudeQuotaPolicy } from '../managed-runtime/demo-claude-quota-policy.service';
import { buildErrorMessage } from '../managed-runtime/managed-agent-errors';
import { HandlePendingToolApprovalsCommand } from '../managed-runtime/tool-approval/handle-pending-tool-approvals.command';
import { HandlePendingToolApprovals } from '../managed-runtime/tool-approval/handle-pending-tool-approvals.usecase';
import { listOAuthMcps } from '../managed-runtime/tool-connect/list-oauth-mcps.helper';
import { findOAuthMcpByServerName } from '../managed-runtime/tool-connect/oauth-mcp.types';
import { AgentPlatformEnum } from './enums/agent-platform.enum';
import { captureAgentException } from './errors/capture-agent-sentry';

interface BaseCommandFields {
  userId: string;
  environmentId: string;
  organizationId: string;
  conversationId: string;
  agentIdentifier: string;
  integrationIdentifier: string;
}

export interface AgentEventContext {
  userId: string;
  environmentId: string;
  organizationId: string;
  conversationId: string;
  agentIdentifier: string;
  integrationIdentifier: string;
  /** Mongo agent `_id` — required for MCP connection lookups (`connection.error`). */
  agentId?: string;
  subscriberId?: string;
  platform?: AgentPlatformEnum;
  platformThreadId?: string;
  sessionId?: string;
  suppressReply?: boolean;
}

@Injectable()
export class AgentEventSink {
  constructor(
    private readonly handleAgentReply: HandleAgentReply,
    private readonly handlePlanProgress: HandlePlanProgress,
    private readonly handlePendingToolApprovals: HandlePendingToolApprovals,
    private readonly inboundAck: InboundAckService,
    private readonly demoQuota: DemoClaudeQuotaPolicy,
    private readonly conversationRepository: ConversationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async ingest(envelope: AgentEventEnvelope, context: AgentEventContext): Promise<void> {
    await this.ingestMany([envelope], context);
  }

  /**
   * Ingest a batch produced from one upstream unit (e.g. one Thalamus StreamPart).
   * `tool-approval-request` events in the same batch are paired with a following
   * `run-finish { outcome: 'paused' }` — no process-local Map across requests.
   */
  async ingestMany(envelopes: AgentEventEnvelope[], context: AgentEventContext): Promise<void> {
    const batchApprovals: AgentApprovalRequest[] = [];

    for (const envelope of envelopes) {
      const { event } = envelope;

      if (isDeltaEvent(event)) {
        continue;
      }

      if (event.type === 'tool-approval-request') {
        batchApprovals.push({
          approvalId: event.approvalId,
          toolUseId: event.toolUseId,
          toolName: event.toolName,
          input: event.input,
          source: event.source,
        });
        continue;
      }

      if (event.type === 'run-finish' && event.outcome === 'paused') {
        await this.handlePausedRunFinish(event, context, this.buildMetadata(context), envelope.runId, batchApprovals);
        batchApprovals.length = 0;
        continue;
      }

      await this.dispatchEvent(envelope, context, event);
    }

    if (batchApprovals.length > 0) {
      // Legitimate for framework/compat emitters that post an approval request
      // without a managed run-finish in the same batch. Phase-1 managed path
      // always pairs them via mapFinishEvents → ingestMany.
      this.logger.debug(
        {
          runId: envelopes[envelopes.length - 1]?.runId,
          count: batchApprovals.length,
        },
        'tool-approval-request(s) without paused run-finish in batch — no managed pause dispatch'
      );
    }
  }

  private async dispatchEvent(
    envelope: AgentEventEnvelope,
    context: AgentEventContext,
    event: AgentEvent
  ): Promise<void> {
    const baseFields = this.buildBaseFields(context);
    const metadata = this.buildMetadata(context);

    switch (event.type) {
      case 'message':
        await this.handleMessageEvent(event, baseFields, context, envelope.runId);

        return;

      case 'tool-use-start':
        await this.handleToolUseStart(event, baseFields, context.sessionId);

        return;

      case 'tool-use-done':
        await this.handleToolUseDone(event, baseFields, context.sessionId);

        return;

      case 'tool-use-result':
        await this.handleToolUseResult(event, baseFields, context.sessionId);

        return;

      case 'run-finish':
        await this.handleRunFinish(event, baseFields, context, metadata, envelope.runId);

        return;

      case 'run-error':
        await this.handleRunError(event, baseFields, context, metadata, envelope.runId);

        return;

      case 'connection.error':
        await this.handleConnectionError(event, context);

        return;

      case 'run-start':
      case 'step-start':
      case 'step-end':
      case 'thinking-start':
      case 'thinking-delta':
      case 'thinking-end':
      case 'message-delta':
      case 'tool-use-delta':
      case 'source':
      case 'custom':
      case 'resolve':
      case 'tool-approval-request':
      case 'tool-approval-response':
      case 'message-start':
      case 'message-end':
        this.logger.debug({ eventType: event.type, runId: envelope.runId }, 'Agent event no-op');

        return;

      default: {
        const _exhaustive: never = event;

        void _exhaustive;

        return;
      }
    }
  }

  private async handleMessageEvent(
    event: Extract<AgentEvent, { type: 'message' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    runId: string
  ): Promise<void> {
    if (context.suppressReply) {
      return;
    }

    if ('card' in event.content) {
      this.logger.debug({ runId, messageId: event.messageId }, 'Skipping card message content in v1');

      return;
    }

    const markdown = event.content.markdown?.trim();

    if (!markdown) {
      return;
    }

    try {
      await this.handleAgentReply.execute(HandleAgentReplyCommand.create({ ...baseFields, reply: { markdown } }));
    } catch (err) {
      this.logger.error(err, `message event failed: run=${runId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'message',
        sessionId: context.sessionId,
      });
      throw err;
    }
  }

  private async handleToolUseStart(
    event: Extract<AgentEvent, { type: 'tool-use-start' }>,
    baseFields: BaseCommandFields,
    sessionId?: string
  ): Promise<void> {
    try {
      if (this.isInternalTool(event.toolName)) {
        return;
      }

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
      this.logger.error(err, `tool-use-start failed: session=${sessionId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'tool-use-start',
        sessionId,
      });
    }
  }

  private async handleToolUseDone(
    event: Extract<AgentEvent, { type: 'tool-use-done' }>,
    baseFields: BaseCommandFields,
    sessionId?: string
  ): Promise<void> {
    try {
      if (this.isInternalTool(event.toolName)) {
        return;
      }

      if (!event.input || Object.keys(event.input).length === 0) {
        return;
      }

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
      this.logger.error(err, `tool-use-done failed: session=${sessionId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'tool-use-done',
        sessionId,
      });
    }
  }

  private async handleToolUseResult(
    event: Extract<AgentEvent, { type: 'tool-use-result' }>,
    baseFields: BaseCommandFields,
    sessionId?: string
  ): Promise<void> {
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
      this.logger.error(err, `tool-use-result failed: session=${sessionId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'tool-use-result',
        sessionId,
      });
    }
  }

  private async handleRunFinish(
    event: Extract<AgentEvent, { type: 'run-finish' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    metadata: Record<string, string>,
    runId: string
  ): Promise<void> {
    // Paused finishes are handled in ingestMany (paired with tool-approval-request).
    if (event.outcome === 'paused') {
      this.logger.error({ runId }, 'run-finish paused reached dispatch without batch pairing — skipping');

      return;
    }

    try {
      await this.inboundAck.onManagedTurnComplete(metadata);

      if (context.suppressReply) {
        return;
      }

      await this.demoQuota.recordUsage(
        context.environmentId,
        context.organizationId,
        context.conversationId,
        toThalamusUsage(event.usage)
      );

      await this.handlePlanProgress.execute(
        HandlePlanProgressCommand.create({ ...baseFields, event: { kind: 'phase', phase: 'finished' } })
      );
    } catch (err) {
      this.logger.error(err, `run-finish failed: run=${runId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'run-finish',
        sessionId: context.sessionId,
      });
      throw err;
    }
  }

  private async handlePausedRunFinish(
    event: Extract<AgentEvent, { type: 'run-finish' }>,
    context: AgentEventContext,
    metadata: Record<string, string>,
    runId: string,
    approvals: AgentApprovalRequest[]
  ): Promise<void> {
    const baseFields = this.buildBaseFields(context);
    const { platform, platformThreadId, sessionId, subscriberId } = context;

    if (!platform || !platformThreadId || !sessionId) {
      this.logger.error(
        { runId, platform, platformThreadId, sessionId },
        'run-finish paused missing required context — skipping tool approval dispatch'
      );

      return;
    }

    if (approvals.length === 0) {
      this.logger.error(
        { runId },
        'run-finish paused with zero tool-approval-request events in batch — skipping tool approval dispatch'
      );

      return;
    }

    try {
      const response: ThalamusResponse = {
        messages: [],
        finishReason: 'requires-action',
        usage: toThalamusUsage(event.usage),
        actionsRequired: approvals.map(toActionRequired),
      };

      await this.handlePendingToolApprovals.execute(
        HandlePendingToolApprovalsCommand.create({
          ...baseFields,
          subscriberId,
          platform,
          platformThreadId,
          sessionId,
          response,
        })
      );

      await this.inboundAck.onManagedTurnComplete(metadata);
    } catch (err) {
      this.logger.error(err, `run-finish paused failed: run=${runId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'run-finish-paused',
        sessionId: context.sessionId,
      });
      throw err;
    }
  }

  private async handleRunError(
    event: Extract<AgentEvent, { type: 'run-error' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    metadata: Record<string, string>,
    runId: string
  ): Promise<void> {
    if (event.code === 'session_expired') {
      this.logger.warn({ runId, sessionId: context.sessionId }, 'Session expired — clearing external session id');
      await this.conversationRepository.clearExternalSessionId(context.environmentId, context.conversationId);
      await this.inboundAck.onManagedTurnComplete(metadata);

      return;
    }

    const error = new Error(event.message);

    if (event.code) {
      error.name = event.code;
    }

    const message = buildErrorMessage(error);

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({ ...baseFields, reply: { markdown: message }, isSystemGenerated: true })
      );
      await this.inboundAck.onManagedTurnComplete(metadata);
      await this.handlePlanProgress.execute(
        HandlePlanProgressCommand.create({ ...baseFields, event: { kind: 'phase', phase: 'failed' } })
      );
    } catch (err) {
      this.logger.error(err, `Failed to deliver error message for run ${runId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'deliver-error-message',
        sessionId: context.sessionId,
      });
    }
  }

  /**
   * Runtime-ops: MCP (or other) connection failed during the run. Auth failures
   * flip the OAuth MCP connection out of `connected` so reconnect UX can offer.
   * Non-auth failures are logged only. Errors are swallowed — must not fail the
   * webhook the way message ingest does.
   */
  private async handleConnectionError(
    event: Extract<AgentEvent, { type: 'connection.error' }>,
    context: AgentEventContext
  ): Promise<void> {
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

  private buildBaseFields(context: AgentEventContext): BaseCommandFields {
    return {
      userId: context.organizationId,
      environmentId: context.environmentId,
      organizationId: context.organizationId,
      conversationId: context.conversationId,
      agentIdentifier: context.agentIdentifier,
      integrationIdentifier: context.integrationIdentifier,
    };
  }

  private buildMetadata(context: AgentEventContext): Record<string, string> {
    const metadata: Record<string, string> = {
      conversationId: context.conversationId,
      environmentId: context.environmentId,
      organizationId: context.organizationId,
      agentIdentifier: context.agentIdentifier,
      integrationIdentifier: context.integrationIdentifier,
    };

    if (context.agentId) {
      metadata.agentId = context.agentId;
    }

    if (context.subscriberId) {
      metadata.subscriberId = context.subscriberId;
    }

    if (context.platform) {
      metadata.platform = context.platform;
    }

    if (context.platformThreadId) {
      metadata.platformThreadId = context.platformThreadId;
    }

    if (context.suppressReply) {
      metadata.suppressReply = 'true';
    }

    return metadata;
  }

  private mcpServerNameOf(source?: { type: string; serverName?: string }): string | undefined {
    return source?.type === 'mcp' ? source.serverName : undefined;
  }

  private isInternalTool(toolName?: string): boolean {
    return NOVU_INTERNAL_TOOLS.includes(toolName ?? '');
  }
}

function toThalamusUsage(usage?: AgentEventUsage): ThalamusResponse['usage'] {
  if (!usage) {
    return undefined;
  }

  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  };
}

function toActionRequired(approval: AgentApprovalRequest): ActionRequired {
  if (approval.source?.type === 'mcp') {
    return {
      type: 'mcp-approval',
      toolUseId: approval.toolUseId,
      toolName: approval.toolName,
      serverName: approval.source.serverName,
      input: approval.input,
    };
  }

  return {
    type: 'tool-confirmation',
    toolUseId: approval.toolUseId,
    toolName: approval.toolName,
    input: approval.input,
  };
}
