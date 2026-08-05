import { BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger, shortId } from '@novu/application-generic';
import {
  ConversationActivityEntity,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityToolData,
  ConversationActivityTypeEnum,
  ConversationChannel,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  ConversationStatusEnum,
  isDuplicateKeyError,
} from '@novu/dal';
import type { TriggerRecipientsPayload } from '@novu/shared';
import { ConversationEventSequenceService } from './conversation-event-sequence.service';

export const INBOUND_ATTACHMENT_ONLY_PREVIEW = '[Attachment]';
export const DEFAULT_CONVERSATION_TITLE = 'Untitled conversation';

/** Default number of recent activities loaded as conversation history for every runtime. */
export const AGENT_HISTORY_LIMIT = 50;

export function getConversationTitle(firstMessageText: string): string {
  const trimmed = firstMessageText.trim();

  if (trimmed.length === 0) {
    return DEFAULT_CONVERSATION_TITLE;
  }

  return trimmed.slice(0, 200);
}

export function getInboundActivityPreview(
  content: string | undefined,
  options: { richContent?: Record<string, unknown>; hasPlatformAttachments?: boolean } = {}
): string {
  const trimmed = content?.trim() ?? '';

  if (trimmed.length > 0) {
    return trimmed;
  }

  const attachments = options.richContent?.attachments;
  const hasStoredAttachments = Array.isArray(attachments) && attachments.length > 0;

  if (hasStoredAttachments || options.hasPlatformAttachments) {
    return INBOUND_ATTACHMENT_ONLY_PREVIEW;
  }

  return trimmed;
}

export interface CreateOrGetConversationParams {
  environmentId: string;
  organizationId: string;
  agentId: string;
  platform: string;
  integrationId: string;
  platformThreadId: string;
  participantId: string;
  participantType: ConversationParticipantTypeEnum;
  platformUserId: string;
  firstMessageText: string;
  /** Whether the thread is a direct message — persisted for active-conversation window selection. */
  isDirectMessage?: boolean;
  /**
   * Platform workspace/team id (e.g. Slack `team_id`) this thread belongs to. Persisted on the
   * channel so outbound delivery can resolve the correct per-workspace bot token in multi-workspace
   * installs. Absent for single-workspace platforms.
   */
  workspaceId?: string;
  /** Pre-minted durable identifier; for `web_chat`, equals `platformThreadId`. */
  identifier?: string;
  /**
   * When opening from a workflow-originated platform thread, the originating
   * Notification id. Stamped only on create (not on reopen of an existing conversation).
   */
  notificationId?: string;
}

export interface PersistInboundMessageParams {
  conversationId: string;
  platform: string;
  integrationId: string;
  platformThreadId: string;
  senderType: ConversationActivitySenderTypeEnum;
  senderId: string;
  senderName?: string;
  content: string;
  richContent?: Record<string, unknown>;
  hasPlatformAttachments?: boolean;
  platformMessageId?: string;
  /** Caller-supplied activity identifier; defaults to a server-minted act_* id */
  identifier?: string;
  /** Pre-allocated conversation event sequence; minted at persist time when absent */
  sequence?: number;
  environmentId: string;
  organizationId: string;
}

export interface ConversationActivityContext {
  conversationId: string;
  channel: ConversationChannel;
  agentIdentifier: string;
  environmentId: string;
  organizationId: string;
}

export interface PersistAgentMessageResult {
  activity: ConversationActivityEntity;
  /** `false` when the identifier already existed — the caller lost the persist race. */
  created: boolean;
}

export interface PersistAgentActivityParams extends ConversationActivityContext {
  platformMessageId?: string;
  /** Overrides channel.platformThreadId when delivery returns a different thread ID */
  platformThreadId?: string;
  /** Caller-supplied activity identifier; defaults to a server-minted act_* id */
  identifier?: string;
  agentName?: string;
  content: string;
  richContent?: Record<string, unknown>;
  /** Pre-allocated conversation event sequence; minted at persist time when absent */
  sequence?: number;
}

export interface PersistToolApprovalRequestParams extends ConversationActivityContext {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  input?: Record<string, unknown>;
  /** Human-readable preview for the display timeline. */
  preview?: string;
}

export type MetadataOp =
  | { action: 'set'; key: string; value: unknown }
  | { action: 'delete'; key: string }
  | { action: 'clear' };

export interface UpdateMetadataParams extends ConversationActivityContext {
  currentMetadata: Record<string, unknown>;
  ops: MetadataOp[];
}

export interface ResolveConversationParams extends ConversationActivityContext {
  summary?: string;
}

export interface PersistTriggerSignalParams extends ConversationActivityContext {
  workflowId: string;
  to: TriggerRecipientsPayload;
  transactionId: string;
}

export interface PersistWorkflowOriginHydrationParams extends ConversationActivityContext {
  platformMessageId: string;
  platformThreadId: string;
  content: string;
  originPayload: Record<string, unknown>;
}

export interface PersistToolApprovalDecisionParams extends ConversationActivityContext {
  approvalId: string;
  approved: boolean;
  toolName?: string;
  actorType:
    | ConversationActivitySenderTypeEnum.SUBSCRIBER
    | ConversationActivitySenderTypeEnum.PLATFORM_USER
    | ConversationActivitySenderTypeEnum.SYSTEM;
  actorId: string;
}

export interface PersistToolResultParams extends ConversationActivityContext {
  toolCallId: string;
  toolName?: string;
  /** The tool's output as returned by the model runtime (JSON-serializable). */
  output: unknown;
  /** Human-readable preview for the display timeline; defaults to a generic line. */
  preview?: string;
}

@Injectable()
export class AgentConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly activityRepository: ConversationActivityRepository,
    private readonly eventSequenceService: ConversationEventSequenceService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  getPrimaryChannel(conversation: ConversationEntity): ConversationChannel {
    const channel = conversation.channels?.[0];
    if (!channel) {
      throw new BadRequestException(`Conversation ${conversation._id} has no channel`);
    }

    return channel;
  }

  async createOrGetConversation(params: CreateOrGetConversationParams): Promise<ConversationEntity> {
    const { environmentId, organizationId, platformThreadId } = params;
    const existing = await this.conversationRepository.findByPlatformThread(
      environmentId,
      organizationId,
      params.agentId,
      params.integrationId,
      platformThreadId
    );
    if (existing) {
      if (existing.status === ConversationStatusEnum.RESOLVED) {
        await this.conversationRepository.updateStatus(
          environmentId,
          organizationId,
          existing._id,
          ConversationStatusEnum.ACTIVE
        );
        existing.status = ConversationStatusEnum.ACTIVE;

        this.logger.debug(`Reopened resolved conversation ${existing._id} for thread ${platformThreadId}`);
      }

      await this.ensureParticipant(existing, params);

      return existing;
    }

    const conversation = await this.conversationRepository.create({
      identifier: params.identifier ?? `conv_${shortId(12)}`,
      _agentId: params.agentId,
      ...(params.notificationId ? { _notificationId: params.notificationId } : {}),
      participants: [
        { type: params.participantType, id: params.participantId },
        { type: ConversationParticipantTypeEnum.AGENT, id: params.agentId },
      ],
      channels: [
        {
          platform: params.platform,
          _integrationId: params.integrationId,
          platformThreadId,
          ...(params.workspaceId ? { workspace: { id: params.workspaceId } } : {}),
        },
      ],
      status: ConversationStatusEnum.ACTIVE,
      title: getConversationTitle(params.firstMessageText),
      metadata: {},
      isDirectMessage: params.isDirectMessage,
      _environmentId: environmentId,
      _organizationId: organizationId,
      lastActivityAt: new Date().toISOString(),
    });

    this.logger.debug(`Created conversation ${conversation._id} for thread ${platformThreadId}`);

    return conversation;
  }

  private async ensureParticipant(conversation: ConversationEntity, params: CreateOrGetConversationParams) {
    const alreadyPresent = conversation.participants.some(
      (p) => p.id === params.participantId && p.type === params.participantType
    );
    if (alreadyPresent) return;

    const platformIdentity = `${params.platform}:${params.platformUserId}`;

    if (params.participantType === ConversationParticipantTypeEnum.SUBSCRIBER) {
      const platformUserIdx = conversation.participants.findIndex(
        (p) => p.type === ConversationParticipantTypeEnum.PLATFORM_USER && p.id === platformIdentity
      );

      if (platformUserIdx !== -1) {
        conversation.participants[platformUserIdx] = { type: params.participantType, id: params.participantId };

        this.logger.debug(
          `Upgraded participant ${platformIdentity} → subscriber ${params.participantId} in conversation ${conversation._id}`
        );
      } else {
        conversation.participants.push({ type: params.participantType, id: params.participantId });
      }
    } else {
      conversation.participants.push({ type: params.participantType, id: params.participantId });
    }

    await this.conversationRepository.updateParticipants(
      params.environmentId,
      params.organizationId,
      conversation._id,
      conversation.participants
    );
  }

  async persistInboundMessage(params: PersistInboundMessageParams): Promise<ConversationActivityEntity> {
    const content = params.content ?? '';
    const preview = getInboundActivityPreview(content, {
      richContent: params.richContent,
      hasPlatformAttachments: params.hasPlatformAttachments,
    });
    const identifier = params.identifier ?? `act_${shortId(12)}`;
    const sequence = await this.resolveEventSequence(
      params.conversationId,
      params.environmentId,
      params.organizationId,
      params.sequence
    );

    try {
      const [activity] = await Promise.all([
        this.activityRepository.createUserActivity({
          identifier,
          conversationId: params.conversationId,
          platform: params.platform,
          integrationId: params.integrationId,
          platformThreadId: params.platformThreadId,
          senderType: params.senderType,
          senderId: params.senderId,
          senderName: params.senderName,
          content,
          richContent: params.richContent,
          platformMessageId: params.platformMessageId,
          sequence,
          environmentId: params.environmentId,
          organizationId: params.organizationId,
        }),
        this.conversationRepository.touchActivity(
          params.environmentId,
          params.organizationId,
          params.conversationId,
          preview
        ),
      ]);

      return activity;
    } catch (err) {
      if (params.identifier && isDuplicateKeyError(err)) {
        const existing = await this.activityRepository.findOne(
          {
            _environmentId: params.environmentId,
            _conversationId: params.conversationId,
            identifier: params.identifier,
          },
          '*'
        );

        if (existing) {
          return existing;
        }
      }

      throw err;
    }
  }

  async getHistory(
    environmentId: string,
    conversationId: string,
    limit = AGENT_HISTORY_LIMIT
  ): Promise<ConversationActivityEntity[]> {
    return this.activityRepository.findByConversation(environmentId, conversationId, limit);
  }

  /** Resolves the stored activity a reaction targets, matched by platform-native message id. */
  async findSourceActivity(
    environmentId: string,
    conversationId: string,
    platformMessageId: string
  ): Promise<ConversationActivityEntity | null> {
    return this.activityRepository.findByPlatformMessageId(environmentId, conversationId, platformMessageId);
  }

  async countAgentMessages(environmentId: string, conversationId: string): Promise<number> {
    return this.activityRepository.countAgentMessages(environmentId, conversationId);
  }

  async getConversation(
    conversationId: string,
    environmentId: string,
    organizationId: string
  ): Promise<ConversationEntity | null> {
    return this.conversationRepository.findOne(
      { _id: conversationId, _environmentId: environmentId, _organizationId: organizationId },
      '*'
    );
  }

  async findByPlatformThread(
    environmentId: string,
    organizationId: string,
    agentId: string,
    integrationId: string,
    platformThreadId: string
  ): Promise<ConversationEntity | null> {
    return this.conversationRepository.findByPlatformThread(
      environmentId,
      organizationId,
      agentId,
      integrationId,
      platformThreadId
    );
  }

  async findByPublicIdentifier(
    environmentId: string,
    organizationId: string,
    identifier: string
  ): Promise<ConversationEntity | null> {
    return this.conversationRepository.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        identifier,
      },
      '*'
    );
  }

  async findByAgentIntegrationParticipant(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    integrationId: string;
    participantId: string;
    participantType?: ConversationParticipantTypeEnum;
    title?: string;
    workspaceId?: string;
  }): Promise<ConversationEntity | null> {
    return this.conversationRepository.findByAgentIntegrationParticipant(
      params.environmentId,
      params.organizationId,
      params.agentId,
      params.integrationId,
      params.participantId,
      params.participantType,
      params.title,
      params.workspaceId
    );
  }

  async setFirstPlatformMessageId(
    environmentId: string,
    organizationId: string,
    conversationId: string,
    platformThreadId: string,
    messageId: string
  ): Promise<void> {
    await this.conversationRepository.setFirstPlatformMessageId(
      environmentId,
      organizationId,
      conversationId,
      platformThreadId,
      messageId
    );
  }

  async findAgentMessageByIdentifier(
    environmentId: string,
    conversationId: string,
    identifier: string
  ): Promise<ConversationActivityEntity | null> {
    return this.activityRepository.findOne(
      {
        _environmentId: environmentId,
        _conversationId: conversationId,
        identifier,
        type: ConversationActivityTypeEnum.MESSAGE,
      },
      '*'
    );
  }

  async persistAgentMessage(params: PersistAgentActivityParams): Promise<PersistAgentMessageResult> {
    try {
      const activity = await this.persistAgentActivity(params, ConversationActivityTypeEnum.MESSAGE, 'activity');

      return { activity, created: true };
    } catch (err) {
      if (params.identifier && isDuplicateKeyError(err)) {
        this.logger.warn(
          { identifier: params.identifier, conversationId: params.conversationId },
          'Agent message activity already recorded (duplicate identifier)'
        );

        const existing = await this.activityRepository.findOne(
          {
            _environmentId: params.environmentId,
            _conversationId: params.conversationId,
            identifier: params.identifier,
          },
          '*'
        );

        if (existing) {
          return { activity: existing, created: false };
        }
      }

      throw err;
    }
  }

  /** Records the platform-native message id after a successful post on a persist-first delivery. */
  async setAgentMessagePlatformMessageId(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
    activityId: string;
    platformMessageId: string;
  }): Promise<void> {
    await this.activityRepository.update(
      {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        _conversationId: params.conversationId,
        _id: params.activityId,
      },
      { $set: { platformMessageId: params.platformMessageId } }
    );
  }

  /** Compensating delete when the platform post fails, so a retry can re-claim the identifier. */
  async deleteAgentMessage(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
    activityId: string;
  }): Promise<void> {
    await this.activityRepository.findOneAndDelete({
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
      _conversationId: params.conversationId,
      _id: params.activityId,
    });
  }

  async persistToolApprovalRequest(params: PersistToolApprovalRequestParams): Promise<ConversationActivityEntity> {
    const toolName = params.toolName;
    const sequence = await this.resolveEventSequence(
      params.conversationId,
      params.environmentId,
      params.organizationId
    );

    return this.activityRepository.createToolActivity({
      identifier: `act_${shortId(12)}`,
      conversationId: params.conversationId,
      platform: params.channel.platform,
      integrationId: params.channel._integrationId,
      platformThreadId: params.channel.platformThreadId,
      senderType: ConversationActivitySenderTypeEnum.AGENT,
      senderId: params.agentIdentifier,
      content: params.preview ?? `Approval required: ${toolName}`,
      type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
      toolData: {
        approvalId: params.approvalId,
        toolCallId: params.toolCallId,
        toolName: params.toolName,
        input: params.input,
      },
      sequence,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
    });
  }

  /** Links a delivered approval card message to its ledger row (for platform edits). */
  async linkToolApprovalRequestCard(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
    activityId: string;
    platformMessageId: string;
  }): Promise<void> {
    await this.activityRepository.update(
      {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        _conversationId: params.conversationId,
        _id: params.activityId,
        type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
      },
      { $set: { platformMessageId: params.platformMessageId } }
    );
  }

  async persistAgentEdit(params: PersistAgentActivityParams): Promise<ConversationActivityEntity> {
    return this.persistAgentActivity(params, ConversationActivityTypeEnum.EDIT, 'preview');
  }

  async persistAgentDelete(params: PersistAgentActivityParams): Promise<ConversationActivityEntity> {
    return this.persistAgentActivity(params, ConversationActivityTypeEnum.DELETE, 'preview');
  }

  private async persistAgentActivity(
    params: PersistAgentActivityParams & { toolData?: ConversationActivityToolData },
    type: ConversationActivityTypeEnum,
    touch: 'activity' | 'preview'
  ): Promise<ConversationActivityEntity> {
    const threadId = params.platformThreadId ?? params.channel.platformThreadId;
    const sequence = await this.resolveEventSequence(
      params.conversationId,
      params.environmentId,
      params.organizationId,
      params.sequence
    );

    const touchFn =
      touch === 'activity'
        ? this.conversationRepository.touchActivity.bind(this.conversationRepository)
        : this.conversationRepository.touchPreview.bind(this.conversationRepository);

    const [activity] = await Promise.all([
      this.activityRepository.createAgentActivity({
        identifier: params.identifier ?? `act_${shortId(12)}`,
        conversationId: params.conversationId,
        platform: params.channel.platform,
        integrationId: params.channel._integrationId,
        platformThreadId: threadId,
        platformMessageId: params.platformMessageId,
        agentId: params.agentIdentifier,
        senderName: params.agentName,
        content: params.content,
        richContent: params.richContent,
        toolData: params.toolData,
        type,
        sequence,
        environmentId: params.environmentId,
        organizationId: params.organizationId,
      }),
      touchFn(params.environmentId, params.organizationId, params.conversationId, params.content),
    ]);

    return activity;
  }

  async updateMetadata(params: UpdateMetadataParams): Promise<void> {
    let merged: Record<string, unknown> = { ...(params.currentMetadata ?? {}) };
    const descriptions: string[] = [];

    for (const op of params.ops) {
      switch (op.action) {
        case 'set':
          merged[op.key] = op.value;
          descriptions.push(op.key);
          break;
        case 'delete':
          delete merged[op.key];
          descriptions.push(`-${op.key}`);
          break;
        case 'clear':
          merged = {};
          descriptions.push('(cleared)');
          break;
      }
    }

    const serialized = JSON.stringify(merged);
    if (Buffer.byteLength(serialized) > 65_536) {
      throw new BadRequestException('Conversation metadata exceeds 64KB limit');
    }

    await Promise.all([
      this.conversationRepository.updateMetadata(
        params.environmentId,
        params.organizationId,
        params.conversationId,
        merged
      ),
      this.activityRepository.createSignalActivity({
        identifier: `act_${shortId(12)}`,
        conversationId: params.conversationId,
        platform: params.channel.platform,
        integrationId: params.channel._integrationId,
        platformThreadId: params.channel.platformThreadId,
        agentId: params.agentIdentifier,
        content: `Metadata updated: ${descriptions.join(', ')}`,
        signalData: { type: 'metadata', payload: merged },
        environmentId: params.environmentId,
        organizationId: params.organizationId,
      }),
    ]);
  }

  async resolveConversation(params: ResolveConversationParams): Promise<void> {
    await Promise.all([
      this.conversationRepository.updateStatus(
        params.environmentId,
        params.organizationId,
        params.conversationId,
        ConversationStatusEnum.RESOLVED
      ),
      // Mark for billing so the next agent engagement is counted as a reopen
      // activation (a closed thread ends the active conversation episode).
      this.conversationRepository.markBillingResolved(
        params.environmentId,
        params.organizationId,
        params.conversationId,
        new Date().toISOString()
      ),
      this.conversationRepository.clearExternalSessionId(params.environmentId, params.conversationId),
      this.activityRepository.createSignalActivity({
        identifier: `act_${shortId(12)}`,
        conversationId: params.conversationId,
        platform: params.channel.platform,
        integrationId: params.channel._integrationId,
        platformThreadId: params.channel.platformThreadId,
        agentId: params.agentIdentifier,
        content: params.summary ?? 'Conversation resolved',
        signalData: { type: 'resolve', payload: params.summary ? { summary: params.summary } : undefined },
        environmentId: params.environmentId,
        organizationId: params.organizationId,
      }),
    ]);
  }

  /**
   * Persist a tool-approval decision as a signal activity so it becomes part of
   * the durable transcript. Self-hosted (stateless) agents reconstruct the resume
   * message list from history via `toModelMessages`, so the decision must live in
   * the transcript — not only in the ephemeral approval card.
   */
  async persistToolApprovalDecision(params: PersistToolApprovalDecisionParams): Promise<void> {
    const toolName = params.toolName ?? 'tool call';
    const sequence = await this.resolveEventSequence(
      params.conversationId,
      params.environmentId,
      params.organizationId
    );

    await this.activityRepository.createToolActivity({
      identifier: `act_${shortId(12)}`,
      conversationId: params.conversationId,
      platform: params.channel.platform,
      integrationId: params.channel._integrationId,
      platformThreadId: params.channel.platformThreadId,
      senderType: params.actorType,
      senderId: params.actorId,
      content: params.approved ? `Approved ${toolName}` : `Denied ${toolName}`,
      type: ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION,
      toolData: { approvalId: params.approvalId, approved: params.approved, toolName: params.toolName },
      sequence,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
    });
  }

  async persistToolResult(params: PersistToolResultParams): Promise<void> {
    const sequence = await this.resolveEventSequence(
      params.conversationId,
      params.environmentId,
      params.organizationId
    );

    await this.activityRepository.createToolActivity({
      identifier: `act_${shortId(12)}`,
      conversationId: params.conversationId,
      platform: params.channel.platform,
      integrationId: params.channel._integrationId,
      platformThreadId: params.channel.platformThreadId,
      senderType: ConversationActivitySenderTypeEnum.AGENT,
      senderId: params.agentIdentifier,
      content: params.preview ?? `Tool result: ${params.toolName ?? params.toolCallId}`,
      type: ConversationActivityTypeEnum.TOOL_RESULT,
      toolData: { toolCallId: params.toolCallId, toolName: params.toolName, output: params.output },
      sequence,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
    });
  }

  /**
   * Whoever makes the event real first mints its sequence: live delivery paths
   * (web) mint before emitting and pass the value here; everything else gets
   * one at persist time. Channel-agnostic — every conversation is sequenced.
   */
  private async resolveEventSequence(
    conversationId: string,
    environmentId: string,
    organizationId: string,
    sequence?: number
  ): Promise<number> {
    if (sequence !== undefined) {
      return sequence;
    }

    return this.eventSequenceService.mint({
      environmentId,
      organizationId,
      conversationId,
    });
  }

  async persistTriggerSignal(params: PersistTriggerSignalParams): Promise<void> {
    await this.activityRepository.createSignalActivity({
      identifier: `act_${shortId(12)}`,
      conversationId: params.conversationId,
      platform: params.channel.platform,
      integrationId: params.channel._integrationId,
      platformThreadId: params.channel.platformThreadId,
      agentId: params.agentIdentifier,
      content: `Triggered workflow: ${params.workflowId}`,
      signalData: {
        type: 'trigger',
        payload: {
          workflowId: params.workflowId,
          to: params.to,
          transactionId: params.transactionId,
        },
      },
      environmentId: params.environmentId,
      organizationId: params.organizationId,
    });
  }

  /**
   * Runs once, on the turn that creates a conversation from a workflow-seeded
   * Message — `_notificationId` on the conversation marks it as hydrated, so
   * callers never invoke this for existing conversations. The stable
   * `workflow-dispatch-*` identifiers keep a rare concurrent first-turn race
   * from double-writing (the loser fails on the unique index).
   */
  async persistWorkflowOriginHydration(params: PersistWorkflowOriginHydrationParams): Promise<void> {
    await this.persistAgentMessage({
      conversationId: params.conversationId,
      channel: params.channel,
      agentIdentifier: params.agentIdentifier,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      platformMessageId: params.platformMessageId,
      platformThreadId: params.platformThreadId,
      identifier: `workflow-dispatch-msg:${params.platformMessageId}`,
      content: params.content,
    });

    await this.activityRepository.createSignalActivity({
      identifier: `workflow-dispatch-origin:${params.platformMessageId}`,
      conversationId: params.conversationId,
      platform: params.channel.platform,
      integrationId: params.channel._integrationId,
      platformThreadId: params.platformThreadId,
      agentId: params.agentIdentifier,
      content: `Workflow origin: ${String(params.originPayload.workflowIdentifier ?? 'unknown')}`,
      signalData: {
        type: 'workflow_origin',
        payload: params.originPayload,
      },
      platformMessageId: params.platformMessageId,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
    });
  }
}
