import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  ConversationActivityEntity,
  ConversationActivityRepository,
  ConversationRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import type { Signal, ToolResult } from '@novu/framework/internal';
import {
  type AgentApprovalRequest,
  type AgentEvent,
  type AgentEventEnvelope,
  type AgentEventUsage,
  type AgentFileRef,
  type AgentMessageContent,
  isDeltaEvent,
  McpConnectionStatusEnum,
  NOVU_INTERNAL_TOOLS,
} from '@novu/shared';
import type { ActionRequired, Response as ThalamusResponse } from '@novu/thalamus';
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
import { listOAuthMcps } from '../managed-runtime/tool-connect/list-oauth-mcps.helper';
import { findOAuthMcpByServerName } from '../managed-runtime/tool-connect/oauth-mcp.types';
import type { EditPayloadDto, ReplyContentDto } from './dtos/agent-reply-payload.dto';
import { AgentPlatformEnum } from './enums/agent-platform.enum';
import { captureAgentException } from './errors/capture-agent-sentry';
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
  /** Mongo agent `_id` — required for MCP connection lookups (`connection.error`). */
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
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly activityRepository: ConversationActivityRepository,
    private readonly outboundGateway: OutboundGateway,
    private readonly conversationService: AgentConversationService,
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
    const outcomes: IngestOutcome[] = [];
    const batchApprovals: AgentApprovalRequest[] = [];

    for (let index = 0; index < envelopes.length; index += 1) {
      const envelope = envelopes[index];
      const { event } = envelope;

      if (isDeltaEvent(event)) {
        outcomes.push('accepted');
        continue;
      }

      if (event.type === 'tool-approval-request') {
        const autoDeliverCard = !this.hasFollowingMessageInBatch(envelopes, index);
        const outcome = await this.handleToolApprovalRequest(event, context, batchApprovals, autoDeliverCard);
        outcomes.push(outcome);
        continue;
      }

      if (event.type === 'run-finish' && event.outcome === 'paused') {
        await this.handlePausedRunFinish(event, context, this.buildMetadata(context), envelope.runId, batchApprovals);
        batchApprovals.length = 0;
        outcomes.push('accepted');
        continue;
      }

      const outcome = await this.dispatchEvent(envelope, context, event);
      outcomes.push(outcome);
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
        await this.handleToolUseResult(event, baseFields, context.sessionId);

        return 'accepted';

      case 'run-finish':
        await this.handleRunFinish(event, baseFields, context, metadata, envelope.runId);

        return 'accepted';

      case 'run-error':
        await this.handleRunError(event, baseFields, context, metadata, envelope.runId);

        return 'accepted';

      case 'connection.error':
        await this.handleConnectionError(event, context);

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

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          ...baseFields,
          reply,
          activityIdentifier: event.messageId,
        })
      );
    } catch (err) {
      this.logger.error(err, `message event failed: run=${runId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'message',
        sessionId: context.sessionId,
      });
      throw err;
    }

    return 'accepted';
  }

  private async handleChannelEdit(
    event: Extract<AgentEvent, { type: 'channel.edit' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    runId: string
  ): Promise<IngestOutcome> {
    const activity = await this.resolveActivityByClientId(context.environmentId, event.messageId);

    if (!activity?.platformMessageId) {
      this.logger.warn(
        { runId, messageId: event.messageId },
        'channel.edit could not resolve client message id — skipping'
      );

      return 'accepted';
    }

    const content = toReplyContent(event.content, event.files);

    if (!content) {
      return 'accepted';
    }

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          ...baseFields,
          edit: { messageId: activity.platformMessageId, content: content as EditPayloadDto['content'] },
        })
      );
    } catch (err) {
      this.logger.error(err, `channel.edit failed: run=${runId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'channel.edit',
        sessionId: context.sessionId,
      });
      throw err;
    }

    return 'accepted';
  }

  private async handleChannelDelete(
    event: Extract<AgentEvent, { type: 'channel.delete' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    runId: string
  ): Promise<IngestOutcome> {
    const activity = await this.resolveActivityByClientId(context.environmentId, event.messageId);

    if (!activity?.platformMessageId) {
      this.logger.warn(
        { runId, messageId: event.messageId },
        'channel.delete could not resolve client message id — skipping'
      );

      return 'accepted';
    }

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          ...baseFields,
          deleteMessages: [{ messageId: activity.platformMessageId }],
        })
      );
    } catch (err) {
      this.logger.error(err, `channel.delete failed: run=${runId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'channel.delete',
        sessionId: context.sessionId,
      });
      throw err;
    }

    return 'accepted';
  }

  private async handleChannelReaction(
    event: Extract<AgentEvent, { type: 'channel.reaction' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    runId: string
  ): Promise<IngestOutcome> {
    const activity = await this.resolveActivityByClientId(context.environmentId, event.messageId);

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

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          ...baseFields,
          addReactions: [{ messageId: activity.platformMessageId, emojiName: event.emoji }],
        })
      );
    } catch (err) {
      this.logger.error(err, `channel.reaction add failed: run=${runId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'channel.reaction',
        sessionId: context.sessionId,
      });
      throw err;
    }

    return 'accepted';
  }

  private async handleChannelTyping(
    event: Extract<AgentEvent, { type: 'channel.typing' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    runId: string
  ): Promise<IngestOutcome> {
    const typing = event.state === 'off' ? 'stop' : { status: event.status };

    try {
      await this.handleAgentReply.execute(HandleAgentReplyCommand.create({ ...baseFields, typing }));
    } catch (err) {
      this.logger.error(err, `channel.typing failed: run=${runId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'channel.typing',
        sessionId: context.sessionId,
      });
      throw err;
    }

    return 'accepted';
  }

  private async handleSignal(
    event: Extract<AgentEvent, { type: 'signal' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    runId: string
  ): Promise<IngestOutcome> {
    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          ...baseFields,
          signals: [event.signal as Signal],
        })
      );
    } catch (err) {
      this.logger.error(err, `signal event failed: run=${runId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'signal',
        sessionId: context.sessionId,
      });
      throw err;
    }

    return 'accepted';
  }

  private async handleResolve(
    event: Extract<AgentEvent, { type: 'resolve' }>,
    baseFields: BaseCommandFields,
    context: AgentEventContext,
    runId: string
  ): Promise<IngestOutcome> {
    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          ...baseFields,
          resolve: { summary: event.summary },
        })
      );
    } catch (err) {
      this.logger.error(err, `resolve event failed: run=${runId}`);
      captureAgentException(err, {
        component: 'agent-event-sink',
        operation: 'resolve',
        sessionId: context.sessionId,
      });
      throw err;
    }

    return 'accepted';
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
    if (!sessionId) {
      try {
        await this.handleAgentReply.execute(
          HandleAgentReplyCommand.create({
            ...baseFields,
            toolResults: [mapToolUseResultEvent(event)],
          })
        );
      } catch (err) {
        this.logger.error(err, `tool-use-result failed: run=bridge`);
        captureAgentException(err, {
          component: 'agent-event-sink',
          operation: 'tool-use-result',
          sessionId,
        });
        throw err;
      }

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

  private async isDuplicateMessage(environmentId: string, messageId: string): Promise<boolean> {
    const existing = await this.activityRepository.findOne(
      { _environmentId: environmentId, identifier: messageId },
      '*'
    );

    return existing !== null;
  }

  private async resolveActivityByClientId(
    environmentId: string,
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

    return null;
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
    if (context.sessionId) {
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

function toReplyContent(content: AgentMessageContent, files?: AgentFileRef[]): ReplyContentDto | null {
  const base: ReplyContentDto =
    'markdown' in content
      ? { markdown: content.markdown }
      : {
          card: content.card as unknown as ReplyContentDto['card'],
        };

  if ('markdown' in content && !content.markdown?.trim()) {
    return null;
  }

  if (files?.length) {
    return {
      ...base,
      files: files.map((file) => ({
        filename: file.name ?? file.fileId,
        mimeType: file.mediaType,
        data: file.data,
      })),
    };
  }

  return base;
}

function mapToolUseResultEvent(event: Extract<AgentEvent, { type: 'tool-use-result' }>): ToolResult {
  const textParts: string[] = [];
  let output: unknown;

  for (const part of event.content) {
    if (part.type === 'text') {
      textParts.push(part.text);
    } else if (part.type === 'json') {
      output = part.value;
    }
  }

  const joinedText = textParts.join('');

  return {
    toolCallId: event.toolUseId,
    output: output ?? joinedText,
    preview: joinedText || undefined,
  };
}

function activityToApprovalRequest(activity: ConversationActivityEntity): AgentApprovalRequest | null {
  const approvalId = activity.toolData?.approvalId;
  const toolUseId = activity.toolData?.toolCallId;
  const toolName = activity.toolData?.toolName;

  if (typeof approvalId !== 'string' || typeof toolUseId !== 'string' || typeof toolName !== 'string') {
    return null;
  }

  return {
    approvalId,
    toolUseId,
    toolName,
    input: activity.toolData?.input as Record<string, unknown> | undefined,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
