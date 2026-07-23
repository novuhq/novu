import { Injectable } from '@nestjs/common';
import { type AgentEvent, type AgentEventEnvelope, isDeltaEvent } from '@novu/agent-event-protocol';
import { PinoLogger } from '@novu/application-generic';
import { ConversationActivityEntity, ConversationActivityRepository, ConversationRepository } from '@novu/dal';
import { NOVU_INTERNAL_TOOLS } from '@novu/shared';
import type { Response as ThalamusResponse } from '@novu/thalamus';
import { InboundAckService } from '../conversation-runtime/ack/inbound-ack.service';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { HandleAgentReplyCommand } from '../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { formatToolInputSummary } from '../conversation-runtime/reply/handle-plan-progress/format-tool-input';
import { HandlePlanProgressCommand } from '../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.command';
import { HandlePlanProgress } from '../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.usecase';
import { DemoClaudeQuotaPolicy } from '../managed-runtime/demo-claude-quota-policy.service';
import { buildErrorMessage } from '../managed-runtime/managed-agent-errors';
import { HandlePendingToolApprovalsCommand } from '../managed-runtime/tool-approval/handle-pending-tool-approvals.command';
import { HandlePendingToolApprovals } from '../managed-runtime/tool-approval/handle-pending-tool-approvals.usecase';
import {
  mapToolUseResultEvent,
  toActionRequired,
  toEditContent,
  toFrameworkSignal,
  toReplyContent,
  toThalamusUsage,
} from './agent-event-mappers';
import { AgentPlatformEnum } from './enums/agent-platform.enum';
import { captureAgentException } from './errors/capture-agent-sentry';
import { McpConnectionErrorHandler } from './mcp-connection-error.handler';

export type IngestOutcome = 'accepted' | 'duplicate';

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
  source: 'managed' | 'bridge';
  agentId?: string;
  subscriberId?: string;
  platform?: AgentPlatformEnum;
  platformThreadId?: string;
  sessionId?: string;
  suppressReply?: boolean;
}

const ACTIVITY_RESOLVE_MAX_ATTEMPTS = 3;
const ACTIVITY_RESOLVE_DELAY_MS = 300;

@Injectable()
export class AgentEventSink {
  constructor(
    private readonly handleAgentReply: HandleAgentReply,
    private readonly handlePlanProgress: HandlePlanProgress,
    private readonly handlePendingToolApprovals: HandlePendingToolApprovals,
    private readonly inboundAck: InboundAckService,
    private readonly demoQuota: DemoClaudeQuotaPolicy,
    private readonly conversationRepository: ConversationRepository,
    private readonly activityRepository: ConversationActivityRepository,
    private readonly outboundGateway: OutboundGateway,
    private readonly conversationService: AgentConversationService,
    private readonly mcpConnectionErrorHandler: McpConnectionErrorHandler,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async ingest(envelope: AgentEventEnvelope, context: AgentEventContext): Promise<void> {
    await this.ingestMany([envelope], context);
  }

  /**
   * Ingest a batch produced from one upstream unit (e.g. one Thalamus StreamPart).
   * Each envelope is dispatched independently — paused `run-finish` events carry
   * their tool approvals inline.
   *
   * Internal handlers may still short-circuit as `duplicate` (message idempotency);
   * that outcome is not exposed on the public ingest HTTP response.
   */
  async ingestMany(envelopes: AgentEventEnvelope[], context: AgentEventContext): Promise<void> {
    for (const envelope of envelopes) {
      const { event } = envelope;

      if (isDeltaEvent(event)) {
        continue;
      }

      await this.dispatchEvent(envelope, context, event);
    }
  }

  private async dispatchEvent(
    envelope: AgentEventEnvelope,
    context: AgentEventContext,
    event: AgentEvent
  ): Promise<IngestOutcome> {
    const baseFields = this.buildBaseFields(context);
    const metadata = this.buildMetadata(context);

    switch (event.type) {
      case 'message':
        return this.handleMessageEvent(event, baseFields, context, envelope.runId);

      case 'channel.edit':
        return this.handleChannelEdit(event, baseFields, context, envelope.runId);

      case 'channel.delete':
        return this.handleChannelDelete(event, baseFields, context, envelope.runId);

      case 'channel.reaction':
        return this.handleChannelReaction(event, baseFields, context, envelope.runId);

      case 'channel.typing':
        return this.handleChannelTyping(event, baseFields, context, envelope.runId);

      case 'signal':
        return this.handleSignal(event, baseFields, context, envelope.runId);

      case 'resolve':
        return this.handleResolve(event, baseFields, context, envelope.runId);

      case 'tool-use-start':
        await this.handleToolUseStart(event, baseFields, context.sessionId);

        return 'accepted';

      case 'tool-use-done':
        await this.handleToolUseDone(event, baseFields, context.sessionId);

        return 'accepted';

      case 'tool-use-result':
        await this.handleToolUseResult(event, baseFields, context, envelope.runId);

        return 'accepted';

      case 'tool-approval-request':
        return this.handleToolApprovalRequest(
          event,
          context,
          event.deliverCard === true && context.source === 'bridge'
        );

      case 'run-finish':
        if (event.outcome === 'paused') {
          await this.handlePausedRunFinish(event, context, metadata, envelope.runId);

          return 'accepted';
        }

        await this.handleRunFinish(event, baseFields, context, metadata, envelope.runId);

        return 'accepted';

      case 'run-error':
        await this.handleRunError(event, baseFields, context, metadata, envelope.runId);

        return 'accepted';

      case 'connection.error':
        await this.mcpConnectionErrorHandler.handle(event, context);

        return 'accepted';

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
      case 'tool-approval-response':
      case 'message-start':
      case 'message-end':
        this.logger.debug({ eventType: event.type, runId: envelope.runId }, 'Agent event no-op');

        return 'accepted';

      default: {
        const _exhaustive: never = event;

        void _exhaustive;

        return 'accepted';
      }
    }
  }

  private async handleToolApprovalRequest(
    event: Extract<AgentEvent, { type: 'tool-approval-request' }>,
    context: AgentEventContext,
    autoDeliverCard: boolean
  ): Promise<IngestOutcome> {
    const baseFields = this.buildBaseFields(context);
    const toolApprovalRequest = {
      approvalId: event.approvalId,
      toolCallId: event.toolUseId,
      name: event.toolName,
      input: event.input,
    };

    try {
      const shouldDeliverCard = autoDeliverCard && !context.suppressReply;

      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          ...baseFields,
          toolApprovalRequest,
          ...(shouldDeliverCard ? { reply: { toolApprovalCard: {} } } : {}),
        })
      );
    } catch (err) {
      this.logger.error(err, `tool-approval-request failed: approval=${event.approvalId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'tool-approval-request',
        sessionId: context.sessionId,
      });
      throw err;
    }

    return 'accepted';
  }

  /** Shared dispatch + error-reporting wrapper for the handlers that resolve to a single `HandleAgentReply` call. */
  private async dispatchReply(
    command: HandleAgentReplyCommand,
    context: AgentEventContext,
    operation: string,
    runId: string
  ): Promise<IngestOutcome> {
    try {
      await this.handleAgentReply.execute(command);
    } catch (err) {
      this.logger.error(err, `${operation} failed: run=${runId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation,
        sessionId: context.sessionId,
      });
      throw err;
    }

    return 'accepted';
  }

  private async handleMessageEvent(
    event: Extract<AgentEvent, { type: 'message' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    runId: string
  ): Promise<IngestOutcome> {
    if (context.suppressReply) {
      return 'accepted';
    }

    const isDuplicate = await this.isDuplicateMessage(context.environmentId, event.messageId);

    if (isDuplicate) {
      return 'duplicate';
    }

    const reply = toReplyContent(event.content, event.files);

    if (!reply) {
      return 'accepted';
    }

    return this.dispatchReply(
      HandleAgentReplyCommand.create({ ...baseFields, reply, activityIdentifier: event.messageId }),
      context,
      'message',
      runId
    );
  }

  private async handleChannelEdit(
    event: Extract<AgentEvent, { type: 'channel.edit' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    runId: string
  ): Promise<IngestOutcome> {
    const activity = await this.resolveActivityByClientId(
      context.environmentId,
      context.conversationId,
      event.messageId
    );

    if (!activity?.platformMessageId) {
      this.logger.warn(
        { runId, messageId: event.messageId },
        'channel.edit could not resolve client message id — skipping'
      );

      return 'accepted';
    }

    const content = toEditContent(event.content, event.files);

    if (!content) {
      return 'accepted';
    }

    return this.dispatchReply(
      HandleAgentReplyCommand.create({
        ...baseFields,
        edit: { messageId: activity.platformMessageId, content },
      }),
      context,
      'channel.edit',
      runId
    );
  }

  private async handleChannelDelete(
    event: Extract<AgentEvent, { type: 'channel.delete' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    runId: string
  ): Promise<IngestOutcome> {
    const activity = await this.resolveActivityByClientId(
      context.environmentId,
      context.conversationId,
      event.messageId
    );

    if (!activity?.platformMessageId) {
      this.logger.warn(
        { runId, messageId: event.messageId },
        'channel.delete could not resolve client message id — skipping'
      );

      return 'accepted';
    }

    return this.dispatchReply(
      HandleAgentReplyCommand.create({ ...baseFields, deleteMessages: [{ messageId: activity.platformMessageId }] }),
      context,
      'channel.delete',
      runId
    );
  }

  private async handleChannelReaction(
    event: Extract<AgentEvent, { type: 'channel.reaction' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    runId: string
  ): Promise<IngestOutcome> {
    const activity = await this.resolveActivityByClientId(
      context.environmentId,
      context.conversationId,
      event.messageId
    );

    if (!activity?.platformMessageId) {
      this.logger.warn(
        { runId, messageId: event.messageId },
        'channel.reaction could not resolve client message id — skipping'
      );

      return 'accepted';
    }

    if (event.op === 'remove') {
      const agentId = await this.resolveConversationAgentId(context);

      if (!agentId || !context.platform || !context.platformThreadId) {
        this.logger.warn({ runId }, 'channel.reaction remove missing delivery context — skipping');

        return 'accepted';
      }

      try {
        await this.outboundGateway.removeReaction(
          agentId,
          context.integrationIdentifier,
          context.platform,
          context.platformThreadId,
          activity.platformMessageId,
          event.emoji
        );
      } catch (err) {
        this.logger.warn(err, `channel.reaction remove failed: run=${runId}`);
      }

      return 'accepted';
    }

    return this.dispatchReply(
      HandleAgentReplyCommand.create({
        ...baseFields,
        addReactions: [{ messageId: activity.platformMessageId, emojiName: event.emoji }],
      }),
      context,
      'channel.reaction',
      runId
    );
  }

  private async handleChannelTyping(
    event: Extract<AgentEvent, { type: 'channel.typing' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    runId: string
  ): Promise<IngestOutcome> {
    const typing = event.state === 'off' ? 'stop' : { status: event.status };

    return this.dispatchReply(
      HandleAgentReplyCommand.create({ ...baseFields, typing }),
      context,
      'channel.typing',
      runId
    );
  }

  private async handleSignal(
    event: Extract<AgentEvent, { type: 'signal' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    runId: string
  ): Promise<IngestOutcome> {
    return this.dispatchReply(
      HandleAgentReplyCommand.create({ ...baseFields, signals: [toFrameworkSignal(event.signal)] }),
      context,
      'signal',
      runId
    );
  }

  private async handleResolve(
    event: Extract<AgentEvent, { type: 'resolve' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    runId: string
  ): Promise<IngestOutcome> {
    return this.dispatchReply(
      HandleAgentReplyCommand.create({ ...baseFields, resolve: { summary: event.summary } }),
      context,
      'resolve',
      runId
    );
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
    context: AgentEventContext,
    runId: string
  ): Promise<void> {
    if (context.source === 'bridge') {
      await this.dispatchReply(
        HandleAgentReplyCommand.create({ ...baseFields, toolResults: [mapToolUseResultEvent(event)] }),
        context,
        'tool-use-result',
        runId
      );

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
      this.logger.error(err, `tool-use-result failed: session=${context.sessionId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'tool-use-result',
        sessionId: context.sessionId,
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
      await this.inboundAck.onManagedTurnComplete(metadata);

      if (context.suppressReply) {
        await this.stopTypingIfBridge(context);

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

      await this.stopTypingIfBridge(context);
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
    runId: string
  ): Promise<void> {
    const baseFields = this.buildBaseFields(context);
    const { platform, platformThreadId, sessionId, subscriberId } = context;
    const approvals = event.approvals ?? [];

    if (!platform || !platformThreadId || !sessionId) {
      this.logger.error(
        { runId, platform, platformThreadId, sessionId },
        'run-finish paused missing required context — skipping tool approval dispatch'
      );

      return;
    }

    if (approvals.length === 0) {
      this.logger.error({ runId }, 'paused run-finish carried zero approvals — skipping tool approval dispatch');

      return;
    }

    try {
      for (const approval of approvals) {
        await this.handleToolApprovalRequest(
          {
            type: 'tool-approval-request',
            approvalId: approval.approvalId,
            toolUseId: approval.toolUseId,
            toolName: approval.toolName,
            input: approval.input,
            source: approval.source,
          },
          context,
          false
        );
      }

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
      await this.stopTypingIfBridge(context);

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
      await this.stopTypingIfBridge(context);
    } catch (err) {
      this.logger.error(err, `Failed to deliver error message for run ${runId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'deliver-error-message',
        sessionId: context.sessionId,
      });
    }
  }

  private async isDuplicateMessage(environmentId: string, messageId: string): Promise<boolean> {
    const existing = await this.activityRepository.findOne(
      { _environmentId: environmentId, identifier: messageId },
      '*'
    );

    return existing !== null;
  }

  /**
   * `messageId` is normally the client-minted identifier the SDK's outbox events carry. But
   * `ctx.action.sourceMessageId` (forwarded from a platform button click) is a *platform*
   * message id instead — the SDK has no client id to give it — so callers resolving an
   * edit/delete/reaction against that value would otherwise retry-then-skip forever. Fall back
   * to a platform-id lookup once the identifier retries are exhausted.
   */
  private async resolveActivityByClientId(
    environmentId: string,
    conversationId: string,
    messageId: string
  ): Promise<ConversationActivityEntity | null> {
    for (let attempt = 0; attempt < ACTIVITY_RESOLVE_MAX_ATTEMPTS; attempt += 1) {
      const activity = await this.activityRepository.findOne(
        { _environmentId: environmentId, identifier: messageId },
        '*'
      );

      if (activity) {
        return activity;
      }

      if (attempt < ACTIVITY_RESOLVE_MAX_ATTEMPTS - 1) {
        await delay(ACTIVITY_RESOLVE_DELAY_MS);
      }
    }

    return this.activityRepository.findByPlatformMessageId(environmentId, conversationId, messageId);
  }

  private async resolveConversationAgentId(context: AgentEventContext): Promise<string | null> {
    if (context.agentId) {
      return context.agentId;
    }

    const conversation = await this.conversationService.getConversation(
      context.conversationId,
      context.environmentId,
      context.organizationId
    );

    return conversation?._agentId ?? null;
  }

  private async stopTypingIfBridge(context: AgentEventContext): Promise<void> {
    if (context.source === 'managed') {
      return;
    }

    const agentId = await this.resolveConversationAgentId(context);

    if (!agentId || !context.platformThreadId) {
      return;
    }

    try {
      await this.outboundGateway.stopTypingInConversation(
        agentId,
        context.integrationIdentifier,
        context.platformThreadId
      );
    } catch (err) {
      this.logger.warn(err, 'Failed to stop typing on bridge run terminal');
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
