import { BadRequestException, Injectable } from '@nestjs/common';
import { type AgentEvent, type AgentEventEnvelope, isDeltaEvent } from '@novu/agent-event-protocol';
import { PinoLogger } from '@novu/application-generic';
import { ConversationActivityEntity, type ConversationChannel, ConversationRepository } from '@novu/dal';
import { isNovuInternalToolName } from '@novu/shared';
import type { Response as ThalamusResponse } from '@novu/thalamus';
import { AgentChatLiveActivityPublisher } from '../agent-chat/agent-chat-live-activity.publisher';
import { InboundAckService } from '../conversation-runtime/ack/inbound-ack.service';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { type RunLifecycleEvent } from '../conversation-runtime/conversation/run-lifecycle-activity';
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
import { isPersistableCustomEvent } from './custom-agent-event';
import { AgentPlatformEnum, usesProtocolEventApprovals } from './enums/agent-platform.enum';
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
  /** Conversation channel for durable activity persist (agent-chat lifecycle, tool ledger, etc.). */
  channel?: ConversationChannel;
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
    private readonly outboundGateway: OutboundGateway,
    private readonly conversationService: AgentConversationService,
    private readonly mcpConnectionErrorHandler: McpConnectionErrorHandler,
    private readonly agentChatLiveActivityPublisher: AgentChatLiveActivityPublisher,
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

      case 'provider-event':
        await this.handleProviderEvent(envelope, context);

        return 'accepted';

      case 'custom':
        return this.handleCustom(event, context, envelope.runId);

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

      case 'run-start':
        await this.persistRunLifecycleFromEvent(context, envelope.runId, event);

        return 'accepted';

      case 'run-finish':
        await this.persistRunLifecycleFromEvent(context, envelope.runId, event);

        if (event.outcome === 'paused') {
          await this.handlePausedRunFinish(event, context, metadata, envelope.runId);

          return 'accepted';
        }

        await this.handleRunFinish(event, baseFields, context, metadata, envelope.runId);

        return 'accepted';

      case 'run-error':
        await this.persistRunLifecycleFromEvent(context, envelope.runId, event);
        await this.handleRunError(event, baseFields, context, metadata, envelope.runId);

        return 'accepted';

      case 'connection.error':
        await this.mcpConnectionErrorHandler.handle(event, context);

        return 'accepted';

      case 'step-start':
      case 'step-end':
      case 'thinking-start':
      case 'thinking-delta':
      case 'thinking-end':
      case 'message-delta':
      case 'tool-use-delta':
      case 'source':
      case 'tool-approval-response':
      case 'mcp-connection-request':
      case 'mcp-connection-result':
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
    // Novu platform tools (novu_resolve, novu_tool_catalog) are auto-handled —
    // never ledger an "Approval required" activity or post a card for them.
    if (this.isInternalTool(event.toolName)) {
      return 'accepted';
    }

    const baseFields = this.buildBaseFields(context);
    const toolApprovalRequest = {
      approvalId: event.approvalId,
      toolCallId: event.toolUseId,
      name: event.toolName,
      input: event.input,
    };

    try {
      const shouldDeliverCard =
        autoDeliverCard &&
        !context.suppressReply &&
        !(context.platform && usesProtocolEventApprovals(context.platform));

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
    // Runtime ingest accepts assistant messages only. Subscriber turns arrive
    // through the inbound HTTP endpoint, not through this path.
    if (event.role !== 'assistant') {
      throw new BadRequestException(
        `Rejecting durable message with role "${event.role}": ingest accepts assistant messages only`
      );
    }

    if (context.suppressReply) {
      return 'accepted';
    }

    const isDuplicate = await this.isDuplicateMessage(context.environmentId, context.conversationId, event.messageId);

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

  private async handleProviderEvent(envelope: AgentEventEnvelope, context: AgentEventContext): Promise<void> {
    if (!context.platform || !usesProtocolEventApprovals(context.platform)) {
      return;
    }

    if (envelope.event.type !== 'provider-event') {
      return;
    }

    const conversation = await this.conversationService.getConversation(
      context.conversationId,
      context.environmentId,
      context.organizationId
    );

    if (!conversation) {
      return;
    }

    await this.agentChatLiveActivityPublisher.emitEphemeralEvent({
      agentIdentifier: context.agentIdentifier,
      environmentId: context.environmentId,
      organizationId: context.organizationId,
      conversation,
      event: envelope.event,
      runId: envelope.runId,
      turnId: envelope.turnId,
    });
  }

  private async handleCustom(
    event: Extract<AgentEvent, { type: 'custom' }>,
    context: AgentEventContext,
    runId: string
  ): Promise<IngestOutcome> {
    if (!isPersistableCustomEvent(event)) {
      this.logger.warn(
        { name: event.name, runId, conversationId: context.conversationId },
        'Skipping custom agent event: empty name or data over 64KiB'
      );

      return 'accepted';
    }

    const channel = context.channel;
    if (!channel) {
      this.logger.warn(
        { name: event.name, runId, conversationId: context.conversationId },
        'Skipping custom agent event persist: missing channel on AgentEventContext'
      );

      return 'accepted';
    }

    await this.conversationService.persistCustom({
      conversationId: context.conversationId,
      channel,
      agentIdentifier: context.agentIdentifier,
      environmentId: context.environmentId,
      organizationId: context.organizationId,
      runId,
      name: event.name,
      data: event.data,
    });

    return 'accepted';
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
      // Empty when the pending tool_use came from an earlier run (resumed streams are a live
      // tail). HandlePendingToolApprovals recovers from the session.
      this.logger.warn(
        { runId, sessionId },
        'paused run-finish carried zero approvals — recovering pending approvals from the session'
      );
    }

    try {
      // Do not ledger approvals here. Internal Novu tools are auto-handled and
      // must not appear as "Approval required". External tools are ledgered when
      // HandlePendingToolApprovals delivers the card (or auto-confirms trust).
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

  private async persistRunLifecycleFromEvent(
    context: AgentEventContext,
    runId: string,
    event: RunLifecycleEvent
  ): Promise<void> {
    const channel = context.channel;
    if (!channel) {
      const message = 'run lifecycle persist skipped: missing channel on AgentEventContext';
      this.logger.error({ runId, conversationId: context.conversationId }, message);
      captureAgentException(new Error(message), {
        component: 'agent-event-sink',
        operation: 'persist-run-lifecycle',
        sessionId: context.sessionId,
      });

      return;
    }

    try {
      await this.conversationService.persistRunLifecycle({
        conversationId: context.conversationId,
        channel,
        agentIdentifier: context.agentIdentifier,
        environmentId: context.environmentId,
        organizationId: context.organizationId,
        runId,
        event,
      });
    } catch (err) {
      this.logger.error(err, `run lifecycle persist failed: run=${runId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'persist-run-lifecycle',
        sessionId: context.sessionId,
      });

      if (event.type === 'run-start') {
        throw err;
      }
    }
  }

  private async isDuplicateMessage(environmentId: string, conversationId: string, messageId: string): Promise<boolean> {
    if (typeof messageId !== 'string' || messageId.length === 0) {
      return false;
    }

    const existing = await this.conversationService.findAgentMessageByIdentifier(
      environmentId,
      conversationId,
      messageId
    );

    return existing !== null;
  }

  /**
   * `messageId` is normally the client-minted identifier the SDK's outbox events carry. But
   * `ctx.action.sourceMessageId` (forwarded from a platform button click) is a *platform*
   * message id instead — the SDK has no client id to give it — so callers resolving an
   * edit/delete/reaction against that value would otherwise retry-then-skip forever. Fall back
   * to a platform-id lookup once the identifier retries are exhausted.
   *
   * Lookups are conversation-scoped so a same-environment client cannot resolve or mutate
   * another conversation's activity by reusing its identifier.
   */
  private async resolveActivityByClientId(
    environmentId: string,
    conversationId: string,
    messageId: string
  ): Promise<ConversationActivityEntity | null> {
    if (typeof messageId !== 'string' || messageId.length === 0) {
      return null;
    }

    for (let attempt = 0; attempt < ACTIVITY_RESOLVE_MAX_ATTEMPTS; attempt += 1) {
      const activity = await this.conversationService.findAgentMessageByIdentifier(
        environmentId,
        conversationId,
        messageId
      );

      if (activity) {
        return activity;
      }

      if (attempt < ACTIVITY_RESOLVE_MAX_ATTEMPTS - 1) {
        await delay(ACTIVITY_RESOLVE_DELAY_MS);
      }
    }

    return this.conversationService.findByPlatformMessageId(environmentId, conversationId, messageId);
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
    return isNovuInternalToolName(toolName);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
