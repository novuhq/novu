import { BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger, shortId } from '@novu/application-generic';
import {
  ActivityView,
  ConversationActivityEntity,
  ConversationChannel,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  ConversationStatusEnum,
} from '@novu/dal';
import { getConversationTitle } from './agent-conversation.helpers';
import type {
  ConversationActivityContext,
  PersistAgentActivityParams,
  PersistAgentMessageResult,
  PersistInboundMessageParams,
  PersistMcpConnectionRequestParams,
  PersistMcpConnectionResultParams,
  PersistToolApprovalDecisionParams,
  PersistToolApprovalRequestParams,
  PersistToolResultParams,
  PersistTriggerSignalParams,
  PersistWorkflowOriginHydrationParams,
  ResolveConversationParams,
  UpdateMetadataParams,
} from './agent-conversation.types';
import { ConversationActivityLedger } from './conversation-activity-ledger';
import type { PersistRunLifecycleParams } from './run-lifecycle-activity';

export {
  AGENT_HISTORY_LIMIT,
  DEFAULT_CONVERSATION_TITLE,
  getConversationTitle,
  getInboundActivityPreview,
  INBOUND_ATTACHMENT_ONLY_PREVIEW,
} from './agent-conversation.helpers';

export type {
  ConversationActivityContext,
  MetadataOp,
  PersistAgentActivityParams,
  PersistAgentMessageResult,
  PersistInboundMessageParams,
  PersistMcpConnectionRequestParams,
  PersistMcpConnectionResultParams,
  PersistToolApprovalDecisionParams,
  PersistToolApprovalRequestParams,
  PersistToolResultParams,
  PersistTriggerSignalParams,
  PersistWorkflowOriginHydrationParams,
  ResolveConversationParams,
  UpdateMetadataParams,
} from './agent-conversation.types';

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
  /** Pre-minted durable identifier; for `agent_chat`, equals `platformThreadId`. */
  identifier?: string;
  /** Originating Notification id when opening from a workflow-seeded platform thread (create only). */
  notificationId?: string;
  contextKeys?: string[];
}

@Injectable()
export class AgentConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly ledger: ConversationActivityLedger,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  // --- Thread ---

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
      if (params.contextKeys !== undefined) {
        const contextMatch = await this.conversationRepository.findOne(
          {
            _id: existing._id,
            _environmentId: environmentId,
            _organizationId: organizationId,
            $and: [this.conversationRepository.buildContextExactMatchQuery(params.contextKeys)],
          },
          ['_id']
        );
        if (!contextMatch) {
          throw new BadRequestException('Conversation context mismatch');
        }
      } else if (existing.contextKeys?.length) {
        throw new BadRequestException('Conversation context mismatch');
      }

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
      _notificationId: params.notificationId,
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
      ...(params.contextKeys !== undefined ? { contextKeys: [...params.contextKeys].sort() } : {}),
      _environmentId: environmentId,
      _organizationId: organizationId,
      lastActivityAt: new Date().toISOString(),
    });

    this.logger.debug(`Created conversation ${conversation._id} for thread ${platformThreadId}`);

    return conversation;
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
      this.ledger.persistMetadataSignal({
        ...params,
        content: `Metadata updated: ${descriptions.join(', ')}`,
        payload: merged,
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
      this.ledger.persistResolveSignal({
        ...params,
        content: params.summary ?? 'Conversation resolved',
      }),
    ]);
  }

  // --- Messages ---

  async persistInboundMessage(params: PersistInboundMessageParams): Promise<ConversationActivityEntity> {
    return this.ledger.persistInboundMessage(params);
  }

  async persistAgentMessage(params: PersistAgentActivityParams): Promise<PersistAgentMessageResult> {
    return this.ledger.persistAgentMessage(params);
  }

  async setAgentMessagePlatformMessageId(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
    activityId: string;
    platformMessageId: string;
  }): Promise<void> {
    return this.ledger.setAgentMessagePlatformMessageId(params);
  }

  async deleteAgentMessage(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
    activityId: string;
  }): Promise<void> {
    return this.ledger.deleteAgentMessage(params);
  }

  async persistAgentEdit(params: PersistAgentActivityParams): Promise<ConversationActivityEntity> {
    return this.ledger.persistAgentEdit(params);
  }

  async persistAgentDelete(params: PersistAgentActivityParams): Promise<ConversationActivityEntity> {
    return this.ledger.persistAgentDelete(params);
  }

  async persistWorkflowOriginHydration(params: PersistWorkflowOriginHydrationParams): Promise<void> {
    return this.ledger.persistWorkflowOriginHydration(params);
  }

  async isWorkflowOriginHydrated(
    environmentId: string,
    conversationId: string,
    platformMessageId: string
  ): Promise<boolean> {
    return this.ledger.isWorkflowOriginHydrated(environmentId, conversationId, platformMessageId);
  }

  async findLatestWorkflowOrigin(
    environmentId: string,
    conversationId: string
  ): Promise<ConversationActivityEntity | null> {
    return this.ledger.findLatestWorkflowOrigin(environmentId, conversationId);
  }

  async listForView(params: {
    view: ActivityView;
    environmentId: string;
    organizationId: string;
    conversationId: string;
    limit?: number;
    before?: string;
  }): Promise<{ data: ConversationActivityEntity[]; hasMore: boolean }> {
    return this.ledger.listForView(params);
  }

  // --- Tools ---

  async persistToolApprovalRequest(params: PersistToolApprovalRequestParams): Promise<ConversationActivityEntity> {
    return this.ledger.persistToolApprovalRequest(params);
  }

  async linkToolApprovalRequestCard(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
    activityId: string;
    platformMessageId: string;
  }): Promise<void> {
    return this.ledger.linkToolApprovalRequestCard(params);
  }

  async persistToolApprovalDecision(params: PersistToolApprovalDecisionParams): Promise<ConversationActivityEntity> {
    return this.ledger.persistToolApprovalDecision(params);
  }

  async persistToolResult(params: PersistToolResultParams): Promise<void> {
    return this.ledger.persistToolResult(params);
  }

  async persistMcpConnectionRequest(params: PersistMcpConnectionRequestParams): Promise<ConversationActivityEntity> {
    return this.ledger.persistMcpConnectionRequest(params);
  }

  async persistMcpConnectionResult(params: PersistMcpConnectionResultParams): Promise<ConversationActivityEntity> {
    return this.ledger.persistMcpConnectionResult(params);
  }

  async persistTriggerSignal(params: PersistTriggerSignalParams): Promise<void> {
    return this.ledger.persistTriggerSignal(params);
  }

  async persistRunLifecycle(params: PersistRunLifecycleParams): Promise<ConversationActivityEntity | null> {
    return this.ledger.persistRunLifecycle(params);
  }

  // --- Lookups ---

  async findByPlatformMessageId(
    environmentId: string,
    conversationId: string,
    platformMessageId: string
  ): Promise<ConversationActivityEntity | null> {
    return this.ledger.findByPlatformMessageId(environmentId, conversationId, platformMessageId);
  }

  async findSourceActivity(
    environmentId: string,
    conversationId: string,
    platformMessageId: string
  ): Promise<ConversationActivityEntity | null> {
    return this.findByPlatformMessageId(environmentId, conversationId, platformMessageId);
  }

  async countAgentMessages(environmentId: string, conversationId: string): Promise<number> {
    return this.ledger.countAgentMessages(environmentId, conversationId);
  }

  async findAgentMessageByIdentifier(
    environmentId: string,
    conversationId: string,
    identifier: string
  ): Promise<ConversationActivityEntity | null> {
    return this.ledger.findAgentMessageByIdentifier(environmentId, conversationId, identifier);
  }

  async findToolActivitiesByPlanMessageId(
    environmentId: string,
    conversationId: string,
    planMessageId: string
  ): Promise<ConversationActivityEntity[]> {
    return this.ledger.findToolActivitiesByPlanMessageId(environmentId, conversationId, planMessageId);
  }

  async persistToolUseSignal(
    params: ConversationActivityContext & { content: string; payload: Record<string, unknown> }
  ): Promise<void> {
    return this.ledger.persistToolUseSignal(params);
  }

  async enrichToolUseSignal(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
    activityId: string;
    content: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    return this.ledger.enrichToolUseSignal(params);
  }

  async repointSubscriberSender(params: {
    environmentId: string;
    organizationId: string;
    fromSubscriberId: string;
    toSubscriberId: string;
  }): Promise<number> {
    return this.ledger.repointSubscriberSender(params);
  }

  // --- Sequence ---

  async mintEventSequence(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
  }): Promise<number> {
    return this.ledger.mint(params);
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
}
