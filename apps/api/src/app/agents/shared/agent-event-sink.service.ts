import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentMcpServerRepository, McpConnectionRepository, SubscriberRepository } from '@novu/dal';
import {
  type AgentEvent,
  type AgentEventEnvelope,
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

const KNOWN_AGENT_EVENT_TYPES = new Set<string>([
  'run-start',
  'run-finish',
  'run-error',
  'step-start',
  'step-end',
  'message',
  'message-start',
  'message-delta',
  'message-end',
  'thinking-start',
  'thinking-delta',
  'thinking-end',
  'source',
  'tool-use-start',
  'tool-use-delta',
  'tool-use-done',
  'tool-use-result',
  'tool-approval-request',
  'tool-approval-response',
  'resolve',
  'connection.error',
  'custom',
]);

type ToolApprovalRequestEvent = Extract<AgentEvent, { type: 'tool-approval-request' }>;

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
  private readonly approvalBuffer = new Map<string, ToolApprovalRequestEvent[]>();

  constructor(
    private readonly handleAgentReply: HandleAgentReply,
    private readonly handlePlanProgress: HandlePlanProgress,
    private readonly handlePendingToolApprovals: HandlePendingToolApprovals,
    private readonly inboundAck: InboundAckService,
    private readonly demoQuota: DemoClaudeQuotaPolicy,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async ingest(envelope: AgentEventEnvelope, context: AgentEventContext): Promise<void> {
    const { event } = envelope;

    if (isDeltaEvent(event)) {
      return;
    }

    if (!KNOWN_AGENT_EVENT_TYPES.has(event.type)) {
      this.logger.debug({ eventType: event.type, runId: envelope.runId }, 'Unknown agent event type — skipping');

      return;
    }

    await this.dispatchEvent(envelope, context, event);
  }

  private async dispatchEvent(
    envelope: AgentEventEnvelope,
    context: AgentEventContext,
    event: AgentEvent
  ): Promise<void> {
    const baseFields = this.buildBaseFields(context);
    const metadata = this.buildMetadata(context, envelope);

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

      case 'tool-approval-request':
        this.bufferApprovalRequest(envelope.runId, event);

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
      case 'tool-approval-response':
      case 'message-start':
      case 'message-end':
        this.logger.debug({ eventType: event.type, runId: envelope.runId }, 'Agent event no-op');

        return;

      default: {
        const _exhaustive: never = event;

        this.logger.debug(
          { eventType: (_exhaustive as AgentEvent).type, runId: envelope.runId },
          'Unhandled agent event'
        );

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
    try {
      if (event.outcome === 'paused') {
        await this.handlePausedRunFinish(event, baseFields, context, metadata, runId);

        return;
      }

      if (context.suppressReply) {
        await this.inboundAck.onManagedTurnComplete(metadata);
        this.clearApprovalBuffer(runId);

        return;
      }

      await this.inboundAck.onManagedTurnComplete(metadata);

      await this.demoQuota.recordUsage(
        context.environmentId,
        context.organizationId,
        context.conversationId,
        event.usage as ThalamusResponse['usage']
      );

      await this.handlePlanProgress.execute(
        HandlePlanProgressCommand.create({ ...baseFields, event: { kind: 'phase', phase: 'finished' } })
      );

      this.clearApprovalBuffer(runId);
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
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    metadata: Record<string, string>,
    runId: string
  ): Promise<void> {
    const { platform, platformThreadId, sessionId, subscriberId } = context;

    if (!platform || !platformThreadId || !sessionId) {
      this.logger.error(
        { runId, platform, platformThreadId, sessionId },
        'run-finish paused missing required context — skipping tool approval dispatch'
      );

      return;
    }

    const bufferedApprovals = this.getBufferedApprovals(runId);
    const response: ThalamusResponse = {
      messages: [],
      finishReason: 'requires-action',
      usage: event.usage as ThalamusResponse['usage'],
      actionsRequired: bufferedApprovals.map(toActionRequired),
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
    this.clearApprovalBuffer(runId);
  }

  private async handleRunError(
    event: Extract<AgentEvent, { type: 'run-error' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    metadata: Record<string, string>,
    runId: string
  ): Promise<void> {
    if (event.code === 'session_expired') {
      this.logger.warn(
        { runId, sessionId: context.sessionId },
        'Session expired — SessionExpiredError handling deferred to Task 4'
      );
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

    this.clearApprovalBuffer(runId);
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

  private bufferApprovalRequest(runId: string, event: ToolApprovalRequestEvent): void {
    const existing = this.approvalBuffer.get(runId) ?? [];

    existing.push(event);
    this.approvalBuffer.set(runId, existing);
  }

  private getBufferedApprovals(runId: string): ToolApprovalRequestEvent[] {
    return this.approvalBuffer.get(runId) ?? [];
  }

  private clearApprovalBuffer(runId: string): void {
    this.approvalBuffer.delete(runId);
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

  private buildMetadata(context: AgentEventContext, envelope: AgentEventEnvelope): Record<string, string> {
    const metadata: Record<string, string> = {
      conversationId: context.conversationId,
      environmentId: context.environmentId,
      organizationId: context.organizationId,
      agentIdentifier: context.agentIdentifier,
      integrationIdentifier: context.integrationIdentifier,
      agentId: envelope.agentId,
    };

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

function toActionRequired(event: ToolApprovalRequestEvent): ActionRequired {
  if (event.source?.type === 'mcp') {
    return {
      type: 'mcp-approval',
      toolUseId: event.toolUseId,
      toolName: event.toolName,
      serverName: event.source.serverName,
      input: event.input,
    };
  }

  return {
    type: 'tool-confirmation',
    toolUseId: event.toolUseId,
    toolName: event.toolName,
    input: event.input,
  };
}
