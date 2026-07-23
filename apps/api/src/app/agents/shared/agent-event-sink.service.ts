import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ConversationActivityEntity, ConversationActivityRepository, ConversationRepository } from '@novu/dal';
import {
  type AgentApprovalRequest,
  type AgentEvent,
  type AgentEventEnvelope,
  isDeltaEvent,
  NOVU_INTERNAL_TOOLS,
} from '@novu/shared';
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
  activityToApprovalRequest,
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
import { findUnresolvedToolApprovalRequests } from './tool-approval/unresolved-approvals';

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
  /** Which runtime produced this batch — drives auto-delivery and typing cleanup, not just a `sessionId` presence check. */
  source: 'managed' | 'bridge';
  /** Mongo agent `_id` — required for MCP connection lookups (`connection.error`). */
  agentId?: string;
  subscriberId?: string;
  platform?: AgentPlatformEnum;
  platformThreadId?: string;
  sessionId?: string;
  suppressReply?: boolean;
}

/** One batch-plan entry per envelope — see {@link AgentEventSink.planBatch}. */
type BatchPlanEntry =
  | { kind: 'delta' }
  | {
      kind: 'tool-approval-request';
      event: Extract<AgentEvent, { type: 'tool-approval-request' }>;
      autoDeliverCard: boolean;
    }
  | { kind: 'paused-run-finish'; event: Extract<AgentEvent, { type: 'run-finish' }> }
  | { kind: 'dispatch' };

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

  async ingest(envelope: AgentEventEnvelope, context: AgentEventContext): Promise<IngestOutcome> {
    const outcomes = await this.ingestMany([envelope], context);

    return outcomes[0] ?? 'accepted';
  }

  /**
   * Ingest a batch produced from one upstream unit (e.g. one Thalamus StreamPart).
   * `tool-approval-request` events in the same batch are paired with a following
   * `run-finish { outcome: 'paused' }` — no process-local Map across requests.
   */
  async ingestMany(envelopes: AgentEventEnvelope[], context: AgentEventContext): Promise<IngestOutcome[]> {
    const plan = this.planBatch(envelopes, context);
    const outcomes: IngestOutcome[] = [];
    const batchApprovals: AgentApprovalRequest[] = [];

    for (let index = 0; index < envelopes.length; index += 1) {
      const envelope = envelopes[index];
      const entry = plan[index];

      switch (entry.kind) {
        case 'delta':
          outcomes.push('accepted');
          break;

        case 'tool-approval-request': {
          const outcome = await this.handleToolApprovalRequest(
            entry.event,
            context,
            batchApprovals,
            entry.autoDeliverCard
          );
          outcomes.push(outcome);
          break;
        }

        case 'paused-run-finish':
          await this.handlePausedRunFinish(
            entry.event,
            context,
            this.buildMetadata(context),
            envelope.runId,
            batchApprovals
          );
          batchApprovals.length = 0;
          outcomes.push('accepted');
          break;

        case 'dispatch': {
          const outcome = await this.dispatchEvent(envelope, context, envelope.event);
          outcomes.push(outcome);
          break;
        }

        default: {
          const exhaustive: never = entry;
          void exhaustive;
        }
      }
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

    return outcomes;
  }

  /**
   * Pre-scans the batch once so the pairing invariant — "approval requests accumulate until
   * the next paused run-finish in the same batch, and only auto-deliver their card when no
   * message follows before another approval" — lives in one named place instead of emerging
   * from loop bookkeeping (a per-approval scan-forward interleaved with per-event dispatch).
   */
  private planBatch(envelopes: AgentEventEnvelope[], context: AgentEventContext): BatchPlanEntry[] {
    return envelopes.map((envelope, index) => {
      const { event } = envelope;

      if (isDeltaEvent(event)) {
        return { kind: 'delta' };
      }

      if (event.type === 'tool-approval-request') {
        return {
          kind: 'tool-approval-request',
          event,
          autoDeliverCard: context.source === 'bridge' && !this.hasFollowingMessageInBatch(envelopes, index),
        };
      }

      if (event.type === 'run-finish' && event.outcome === 'paused') {
        return { kind: 'paused-run-finish', event };
      }

      return { kind: 'dispatch' };
    });
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

      case 'run-finish':
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
      case 'tool-approval-request':
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

  private hasFollowingMessageInBatch(envelopes: AgentEventEnvelope[], approvalIndex: number): boolean {
    for (let index = approvalIndex + 1; index < envelopes.length; index += 1) {
      const nextEvent = envelopes[index].event;

      if (isDeltaEvent(nextEvent)) {
        continue;
      }

      if (nextEvent.type === 'tool-approval-request') {
        return false;
      }

      if (nextEvent.type === 'message') {
        return true;
      }
    }

    return false;
  }

  private async handleToolApprovalRequest(
    event: Extract<AgentEvent, { type: 'tool-approval-request' }>,
    context: AgentEventContext,
    batchApprovals: AgentApprovalRequest[],
    autoDeliverCard: boolean
  ): Promise<IngestOutcome> {
    batchApprovals.push({
      approvalId: event.approvalId,
      toolUseId: event.toolUseId,
      toolName: event.toolName,
      input: event.input,
      source: event.source,
    });

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
    // Paused finishes are handled in ingestMany (paired with tool-approval-request).
    if (event.outcome === 'paused') {
      this.logger.error({ runId }, 'run-finish paused reached dispatch without batch pairing — skipping');

      return;
    }

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

    let resolvedApprovals = approvals;

    if (resolvedApprovals.length === 0) {
      const history = await this.conversationService.getHistory(context.environmentId, context.conversationId);
      resolvedApprovals = findUnresolvedToolApprovalRequests(history)
        .map(activityToApprovalRequest)
        .filter((approval): approval is AgentApprovalRequest => approval !== null);
    }

    if (resolvedApprovals.length === 0) {
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
        actionsRequired: resolvedApprovals.map(toActionRequired),
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
