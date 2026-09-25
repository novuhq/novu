import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PinoLogger, shortId } from '@novu/application-generic';
import {
  ActivityView,
  ConversationActivityEntity,
  // biome-ignore lint/style/noRestrictedImports: this class is the conversation activity ledger
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivitySignalData,
  ConversationActivityToolData,
  ConversationActivityTypeEnum,
  ConversationRepository,
  resolveCurrentMessage as foldCurrentMessage,
  isDuplicateKeyError,
} from '@novu/dal';
import { mintApprovalActionIds } from '../../shared/tool-approval/mint-approval-action-ids';
import { WebChatLiveActivityPublisher } from '../../web-chat/web-chat-live-activity.publisher';
import { AGENT_HISTORY_LIMIT, getInboundActivityPreview } from './agent-conversation.helpers';
import type {
  ConversationActivityContext,
  DeleteInboundMessageParams,
  ImportInboundMessage,
  ImportInboundMessagesParams,
  PersistAgentActivityParams,
  PersistAgentMessageResult,
  PersistCustomParams,
  PersistHumanInteractionActivityParams,
  PersistInboundMessageParams,
  PersistMcpConnectionRequestParams,
  PersistMcpConnectionResultParams,
  PersistToolApprovalDecisionParams,
  PersistToolApprovalRequestParams,
  PersistToolResultParams,
  PersistTriggerSignalParams,
  PersistWorkflowOriginHydrationParams,
  UpdateInboundMessageParams,
} from './agent-conversation.types';
// biome-ignore lint/style/noRestrictedImports: sequence minting is owned by this ledger
import { ConversationEventSequenceService } from './conversation-event-sequence.service';
import {
  describeRunLifecycleFromEvent,
  type PersistRunLifecycleParams,
  runLifecycleIdentifier,
} from './run-lifecycle-activity';

export interface ListActivityViewParams {
  view: ActivityView;
  environmentId: string;
  organizationId: string;
  conversationId: string;
  limit?: number;
  before?: string;
}

function workflowOriginSignalIdentifier(platformMessageId: string): string {
  return `workflow-dispatch-origin:${platformMessageId}`;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function workflowOriginContent(params: PersistWorkflowOriginHydrationParams): string {
  const firstName = params.subscriberFirstName?.trim();
  const replier = firstName || asNonEmptyString(params.signalData.subscriberId) || 'Subscriber';
  const workflowIdentifier = asNonEmptyString(params.signalData.workflowIdentifier) ?? 'unknown';

  return `${replier} replied to the message from ${workflowIdentifier}`;
}

@Injectable()
export class ConversationActivityLedger {
  constructor(
    private readonly activityRepository: ConversationActivityRepository,
    private readonly eventSequenceService: ConversationEventSequenceService,
    @Inject(forwardRef(() => WebChatLiveActivityPublisher))
    private readonly webChatLiveActivityPublisher: WebChatLiveActivityPublisher,
    private readonly conversationRepository: ConversationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async listForView(params: ListActivityViewParams): Promise<{ data: ConversationActivityEntity[]; hasMore: boolean }> {
    return this.activityRepository.listForView({
      view: params.view,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      conversationId: params.conversationId,
      limit: params.limit ?? AGENT_HISTORY_LIMIT,
      before: params.before,
    });
  }

  async mint(params: { environmentId: string; organizationId: string; conversationId: string }): Promise<number> {
    return this.eventSequenceService.mint(params);
  }

  /**
   * Persist a protocol operational event (run lifecycle today). Returns `null` when the same
   * event was already persisted. Emits a client event only when the row is newly created.
   */
  async persistRunLifecycle(params: PersistRunLifecycleParams): Promise<ConversationActivityEntity | null> {
    const { type, content, richContent, identifierSuffix } = describeRunLifecycleFromEvent(params.event);
    const identifier = runLifecycleIdentifier(params.runId, identifierSuffix);
    const sequence = await this.eventSequenceService.mint({
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      conversationId: params.conversationId,
    });

    try {
      const activity = await this.activityRepository.createRunActivity({
        identifier,
        conversationId: params.conversationId,
        platform: params.channel.platform,
        integrationId: params.channel._integrationId,
        platformThreadId: params.channel.platformThreadId,
        senderId: params.agentIdentifier,
        content,
        type,
        richContent,
        sequence,
        environmentId: params.environmentId,
        organizationId: params.organizationId,
      });

      await this.emitPersistedClientEvent(params, activity);

      return activity;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return null;
      }

      throw err;
    }
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

  async updateInboundMessage(params: UpdateInboundMessageParams): Promise<ConversationActivityEntity | null> {
    return this.appendInboundRevision({
      ...params,
      type: ConversationActivityTypeEnum.EDIT,
      content: params.content ?? '',
    });
  }

  async deleteInboundMessage(params: DeleteInboundMessageParams): Promise<ConversationActivityEntity | null> {
    return this.appendInboundRevision({
      ...params,
      type: ConversationActivityTypeEnum.DELETE,
    });
  }

  async importInboundMessages(params: ImportInboundMessagesParams): Promise<ImportInboundMessage[]> {
    if (params.messages.length === 0) {
      return [];
    }

    const existingPlatformMessageIds = await this.activityRepository.findExistingPlatformMessageIds(
      params.environmentId,
      params.conversationId,
      params.messages.map((message) => message.platformMessageId)
    );
    const messages = params.messages.filter((message) => !existingPlatformMessageIds.has(message.platformMessageId));

    if (messages.length === 0) {
      return [];
    }

    const sequences = await this.eventSequenceService.mintRange(
      {
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        conversationId: params.conversationId,
      },
      messages.length
    );

    return this.activityRepository.withTransaction(async (session) => {
      const insertedCount = await this.activityRepository.importUserActivities(
        {
          ...params,
          messages: messages.map((message, index) => ({
            ...message,
            sequence: sequences[index],
          })),
        },
        session
      );

      await this.conversationRepository.incrementMessageCount(
        params.environmentId,
        params.organizationId,
        params.conversationId,
        insertedCount,
        session
      );

      return messages;
    });
  }

  async persistAgentMessage(params: PersistAgentActivityParams): Promise<PersistAgentMessageResult> {
    const result = await this.persistAgentActivity(params, ConversationActivityTypeEnum.MESSAGE, 'activity');

    if (!result.created && params.identifier) {
      this.logger.warn(
        { identifier: params.identifier, conversationId: params.conversationId },
        'Agent message activity already recorded (duplicate identifier)'
      );
    }

    return result;
  }

  async persistAgentEdit(params: PersistAgentActivityParams): Promise<ConversationActivityEntity> {
    const { activity } = await this.persistAgentActivity(params, ConversationActivityTypeEnum.EDIT, 'preview');

    return activity;
  }

  async persistAgentDelete(params: PersistAgentActivityParams): Promise<ConversationActivityEntity> {
    const { activity } = await this.persistAgentActivity(params, ConversationActivityTypeEnum.DELETE, 'preview');

    return activity;
  }

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
    const actionIds =
      params.approveActionId && params.denyActionId
        ? { approveActionId: params.approveActionId, denyActionId: params.denyActionId }
        : mintApprovalActionIds({ approvalId: params.approvalId });

    const activity = await this.activityRepository.createToolActivity({
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
        approveActionId: actionIds.approveActionId,
        denyActionId: actionIds.denyActionId,
        mcpServerName: params.mcpServerName,
      },
      sequence,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
    });

    await this.emitPersistedClientEvent(params, activity);

    return activity;
  }

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

  async persistToolApprovalDecision(params: PersistToolApprovalDecisionParams): Promise<ConversationActivityEntity> {
    const toolName = params.toolName ?? 'tool call';
    const sequence = await this.resolveEventSequence(
      params.conversationId,
      params.environmentId,
      params.organizationId
    );

    const activity = await this.activityRepository.createToolActivity({
      identifier: params.identifier ?? `act_${shortId(12)}`,
      conversationId: params.conversationId,
      platform: params.channel.platform,
      integrationId: params.channel._integrationId,
      platformThreadId: params.channel.platformThreadId,
      senderType: params.actorType,
      senderId: params.actorId,
      senderName: params.actorName,
      content: params.approved ? `Approved ${toolName}` : `Denied ${toolName}`,
      type: ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION,
      toolData: {
        approvalId: params.approvalId,
        approved: params.approved,
        toolName: params.toolName,
        ...(params.optionId ? { optionId: params.optionId } : {}),
      },
      sequence,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
    });

    await this.emitPersistedClientEvent(params, activity);

    return activity;
  }

  async persistHumanInteractionRequest(
    params: PersistHumanInteractionActivityParams
  ): Promise<ConversationActivityEntity> {
    return this.persistHumanInteractionActivity(
      params,
      ConversationActivityTypeEnum.HUMAN_INTERACTION_REQUEST,
      'request'
    );
  }

  async persistHumanInteractionResponse(
    params: PersistHumanInteractionActivityParams
  ): Promise<ConversationActivityEntity> {
    return this.persistHumanInteractionActivity(
      params,
      ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE,
      'response'
    );
  }

  async persistToolResult(params: PersistToolResultParams): Promise<void> {
    const sequence = await this.resolveEventSequence(
      params.conversationId,
      params.environmentId,
      params.organizationId
    );

    const activity = await this.activityRepository.createToolActivity({
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

    await this.emitPersistedClientEvent(params, activity);
  }

  async persistMcpConnectionRequest(params: PersistMcpConnectionRequestParams): Promise<ConversationActivityEntity> {
    return this.persistAndEmitClientEvent(
      params,
      {
        ...params,
        identifier: `mcp-connection:${params.actionId}:request`,
        content: `Connect ${params.displayName}`,
        richContent: {
          mcpConnection: {
            actionId: params.actionId,
            mcpId: params.mcpId,
            displayName: params.displayName,
            authorizeUrl: params.authorizeUrl,
            authorizeUrlWithAutoApprove: params.authorizeUrlWithAutoApprove,
          },
        },
      },
      ConversationActivityTypeEnum.MCP_CONNECTION_REQUEST,
      'activity'
    );
  }

  async persistMcpConnectionResult(params: PersistMcpConnectionResultParams): Promise<ConversationActivityEntity> {
    return this.persistAndEmitClientEvent(
      params,
      {
        ...params,
        identifier: `mcp-connection:${params.actionId}:result`,
        content: params.status === 'connected' ? 'Connection completed' : (params.message ?? 'Connection failed'),
        richContent: {
          mcpConnection: {
            actionId: params.actionId,
            mcpId: params.mcpId,
            status: params.status,
            message: params.message,
          },
        },
      },
      ConversationActivityTypeEnum.MCP_CONNECTION_RESULT,
      'activity'
    );
  }

  async persistCustom(params: PersistCustomParams): Promise<ConversationActivityEntity> {
    return this.persistAndEmitClientEvent(
      params,
      {
        ...params,
        content: params.name,
        richContent: {
          custom: { name: params.name, data: params.data },
        },
      },
      ConversationActivityTypeEnum.CUSTOM,
      'none'
    );
  }

  async persistMetadataSignal(
    params: ConversationActivityContext & { content: string; payload: Record<string, unknown> }
  ) {
    await this.persistSignal({
      ...params,
      signalData: { type: 'metadata', payload: params.payload },
    });
  }

  async persistResolveSignal(params: ConversationActivityContext & { content: string; summary?: string }) {
    await this.persistSignal({
      ...params,
      signalData: { type: 'resolve', payload: params.summary ? { summary: params.summary } : undefined },
    });
  }

  async persistTriggerSignal(params: PersistTriggerSignalParams): Promise<void> {
    await this.persistSignal({
      ...params,
      content: `Triggered workflow: ${params.workflowId}`,
      signalData: {
        type: 'trigger',
        payload: {
          workflowId: params.workflowId,
          to: params.to,
          transactionId: params.transactionId,
        },
      },
    });
  }

  async isWorkflowOriginHydrated(
    environmentId: string,
    conversationId: string,
    platformMessageId: string
  ): Promise<boolean> {
    const count = await this.activityRepository.count(
      {
        _environmentId: environmentId,
        _conversationId: conversationId,
        identifier: workflowOriginSignalIdentifier(platformMessageId),
      },
      1
    );

    return count > 0;
  }

  /** Persist a logging-only SIGNAL for the workflow origin. */
  async persistWorkflowOriginHydration(params: PersistWorkflowOriginHydrationParams): Promise<void> {
    try {
      await this.persistSignal({
        conversationId: params.conversationId,
        channel: params.channel,
        agentIdentifier: params.agentIdentifier,
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        identifier: workflowOriginSignalIdentifier(params.platformMessageId),
        platformThreadId: params.platformThreadId,
        platformMessageId: params.platformMessageId,
        content: workflowOriginContent(params),
        signalData: {
          type: 'workflow_origin',
          payload: params.signalData,
        },
      });
    } catch (err) {
      if (!isDuplicateKeyError(err)) {
        throw err;
      }

      this.logger.warn(
        { platformMessageId: params.platformMessageId, conversationId: params.conversationId },
        'Workflow origin already hydrated'
      );
    }
  }

  async findByPlatformMessageId(
    environmentId: string,
    conversationId: string,
    platformMessageId: string
  ): Promise<ConversationActivityEntity | null> {
    return this.activityRepository.findByPlatformMessageId(environmentId, conversationId, platformMessageId);
  }

  async resolveCurrentMessage(
    environmentId: string,
    conversationId: string,
    platformMessageId: string
  ): Promise<ConversationActivityEntity | null> {
    const existing = await this.activityRepository.findByPlatformMessageId(
      environmentId,
      conversationId,
      platformMessageId
    );
    if (!existing?.platformMessageId) {
      return existing;
    }

    const revisions = await this.activityRepository.findMessageRevisions(environmentId, conversationId, [
      existing.platformMessageId,
    ]);
    if (revisions.length === 0) {
      return existing;
    }

    return foldCurrentMessage(existing, revisions);
  }

  async findSourceActivity(
    environmentId: string,
    conversationId: string,
    platformMessageId: string
  ): Promise<ConversationActivityEntity | null> {
    return this.findByPlatformMessageId(environmentId, conversationId, platformMessageId);
  }

  async countAgentMessages(environmentId: string, conversationId: string): Promise<number> {
    return this.activityRepository.countAgentMessages(environmentId, conversationId);
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

  async findActivityByIdentifier(
    environmentId: string,
    identifier: string
  ): Promise<Pick<ConversationActivityEntity, '_id' | 'platformThreadId'> | null> {
    return this.activityRepository.findOne(
      {
        _environmentId: environmentId,
        identifier,
      },
      ['_id', 'platformThreadId']
    );
  }

  async findToolActivitiesByPlanMessageId(
    environmentId: string,
    conversationId: string,
    planMessageId: string
  ): Promise<ConversationActivityEntity[]> {
    return this.activityRepository.findToolActivitiesByPlanMessageId(environmentId, conversationId, planMessageId);
  }

  async persistToolUseSignal(
    params: ConversationActivityContext & { content: string; payload: Record<string, unknown> }
  ): Promise<void> {
    await this.persistSignal({
      ...params,
      signalData: { type: 'tool-use', payload: params.payload },
    });
  }

  async persistInboundActionAccept(
    params: ConversationActivityContext & { identifier: string; actionId: string }
  ): Promise<void> {
    await this.persistSignal({
      ...params,
      identifier: params.identifier,
      content: `Action: ${params.actionId}`,
      signalData: { type: 'inbound-action', payload: { actionId: params.actionId } },
    });
  }

  async enrichToolUseSignal(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
    activityId: string;
    content: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await this.activityRepository.update(
      {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        _conversationId: params.conversationId,
        _id: params.activityId,
      },
      { $set: { content: params.content, 'signalData.payload': params.payload } }
    );
  }

  async repointSubscriberSender(params: {
    environmentId: string;
    organizationId: string;
    fromSubscriberId: string;
    toSubscriberId: string;
  }): Promise<number> {
    return this.activityRepository.repointSubscriberSender(params);
  }

  private async persistHumanInteractionActivity(
    params: PersistHumanInteractionActivityParams,
    type: ConversationActivityTypeEnum,
    suffix: 'request' | 'response'
  ): Promise<ConversationActivityEntity> {
    const sequence = await this.resolveEventSequence(
      params.conversationId,
      params.environmentId,
      params.organizationId
    );
    const identifier = `human:${params.interactionIdentifier}:${suffix}`;

    try {
      const activity = await this.activityRepository.createToolActivity({
        identifier,
        conversationId: params.conversationId,
        platform: params.channel.platform,
        integrationId: params.channel._integrationId,
        platformThreadId: params.channel.platformThreadId,
        senderType: params.actorType,
        senderId: params.actorId,
        senderName: params.actorName,
        content: humanInteractionActivityContent(params, suffix),
        type,
        toolData: {},
        richContent: {
          humanInteraction: {
            interactionIdentifier: params.interactionIdentifier,
            kind: params.kind,
            title: params.title,
            ...(params.requestId ? { requestId: params.requestId } : {}),
            ...(params.subtitle ? { subtitle: params.subtitle } : {}),
            ...(params.body ? { body: params.body } : {}),
            ...(params.status ? { status: params.status } : {}),
            ...(params.optionId ? { optionId: params.optionId } : {}),
            ...(params.text ? { text: params.text } : {}),
          },
        },
        sequence,
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        ...(params.platformMessageId ? { platformMessageId: params.platformMessageId } : {}),
      });

      await this.emitPersistedClientEvent(params, activity);

      return activity;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const existing = await this.activityRepository.findOne(
          {
            _environmentId: params.environmentId,
            _conversationId: params.conversationId,
            identifier,
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

  private async persistAndEmitClientEvent(
    context: ConversationActivityContext,
    params: PersistAgentActivityParams,
    type: ConversationActivityTypeEnum,
    touch: 'activity' | 'preview' | 'none'
  ): Promise<ConversationActivityEntity> {
    const { activity, created } = await this.persistAgentActivity(params, type, touch);

    if (created) {
      await this.emitPersistedClientEvent(context, activity);
    }

    return activity;
  }

  private async persistAgentActivity(
    params: PersistAgentActivityParams & {
      toolData?: ConversationActivityToolData;
    },
    type: ConversationActivityTypeEnum,
    touch: 'activity' | 'preview' | 'none'
  ): Promise<PersistAgentMessageResult> {
    const threadId = params.platformThreadId ?? params.channel.platformThreadId;
    const sequence = await this.resolveEventSequence(
      params.conversationId,
      params.environmentId,
      params.organizationId,
      params.sequence
    );

    try {
      // Replica-set txn: create+touch commit together. Standalone Mongo
      // degrades to sequential writes (same as other withTransaction call sites).
      return await this.activityRepository.withTransaction(async (session) => {
        const activity = await this.activityRepository.createAgentActivity({
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
          session,
        });

        if (touch === 'activity') {
          await this.conversationRepository.touchActivity(
            params.environmentId,
            params.organizationId,
            params.conversationId,
            params.content,
            session
          );
        } else if (touch === 'preview') {
          await this.conversationRepository.touchPreview(
            params.environmentId,
            params.organizationId,
            params.conversationId,
            params.content,
            session
          );
        }

        return { activity, created: true };
      });
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
          return { activity: existing, created: false };
        }
      }

      throw err;
    }
  }

  private async appendInboundRevision(params: {
    conversationId: string;
    environmentId: string;
    organizationId: string;
    platformMessageId: string;
    type: ConversationActivityTypeEnum.EDIT | ConversationActivityTypeEnum.DELETE;
    content?: string;
    richContent?: Record<string, unknown>;
    hasPlatformAttachments?: boolean;
    editedAt?: string;
  }): Promise<ConversationActivityEntity | null> {
    const existing = await this.activityRepository.findByPlatformMessageId(
      params.environmentId,
      params.conversationId,
      params.platformMessageId
    );
    if (!existing) {
      return null;
    }

    const content = params.content ?? existing.content ?? '';
    const richContent = params.richContent ?? existing.richContent;

    if (params.type === ConversationActivityTypeEnum.EDIT) {
      const preview = getInboundActivityPreview(content, {
        richContent,
        hasPlatformAttachments: params.hasPlatformAttachments,
      });

      await Promise.all([
        this.conversationRepository.touchPreview(
          params.environmentId,
          params.organizationId,
          params.conversationId,
          preview
        ),
        this.insertInboundRevision(existing, params, content, params.richContent),
      ]);
    } else {
      await this.insertInboundRevision(existing, params, content, richContent);
    }

    return {
      ...existing,
      content,
      richContent,
    };
  }

  private async insertInboundRevision(
    existing: ConversationActivityEntity,
    params: {
      conversationId: string;
      environmentId: string;
      organizationId: string;
      platformMessageId: string;
      type: ConversationActivityTypeEnum.EDIT | ConversationActivityTypeEnum.DELETE;
      editedAt?: string;
    },
    content: string,
    richContent?: Record<string, unknown>
  ): Promise<void> {
    const sequence = await this.resolveEventSequence(
      params.conversationId,
      params.environmentId,
      params.organizationId
    );
    const identifier =
      params.type === ConversationActivityTypeEnum.DELETE
        ? `inbound-delete:${params.conversationId}:${params.platformMessageId}`
        : `inbound-edit:${params.conversationId}:${params.platformMessageId}:${params.editedAt ?? new Date().toISOString()}`;

    try {
      await this.activityRepository.createUserActivity({
        identifier,
        conversationId: params.conversationId,
        platform: existing.platform,
        integrationId: existing._integrationId,
        platformThreadId: existing.platformThreadId,
        senderType: existing.senderType,
        senderId: existing.senderId,
        senderName: existing.senderName,
        content,
        richContent,
        platformMessageId: params.platformMessageId,
        type: params.type,
        sequence,
        environmentId: params.environmentId,
        organizationId: params.organizationId,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return;
      }

      throw err;
    }
  }

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

  private async persistSignal(
    params: ConversationActivityContext & {
      content: string;
      signalData: ConversationActivitySignalData;
      identifier?: string;
      platformMessageId?: string;
      platformThreadId?: string;
    }
  ): Promise<void> {
    await this.activityRepository.createSignalActivity({
      identifier: params.identifier ?? `act_${shortId(12)}`,
      conversationId: params.conversationId,
      platform: params.channel.platform,
      integrationId: params.channel._integrationId,
      platformThreadId: params.platformThreadId ?? params.channel.platformThreadId,
      agentId: params.agentIdentifier,
      content: params.content,
      signalData: params.signalData,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      platformMessageId: params.platformMessageId,
    });
  }

  private async emitPersistedClientEvent(
    params: ConversationActivityContext,
    activity: ConversationActivityEntity
  ): Promise<void> {
    await this.webChatLiveActivityPublisher.emitPersistedClientEvent({
      channel: params.channel,
      conversationId: params.conversationId,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      agentIdentifier: params.agentIdentifier,
      activity,
    });
  }
}

function humanInteractionActivityContent(
  params: PersistHumanInteractionActivityParams,
  suffix: 'request' | 'response'
): string {
  const title = params.title.trim() || params.kind;

  if (suffix === 'request') {
    switch (params.kind) {
      case 'ask':
        return `Waiting for answer: ${title}`;
      case 'choose':
        return `Choice required: ${title}`;
      case 'tell':
        return `Notice sent: ${title}`;
      case 'approve':
        return `Approval required: ${title}`;
      default:
        return `Human input required: ${title}`;
    }
  }

  const actor = params.actorName?.trim() || params.actorId;
  const status = params.status;

  switch (status) {
    case 'approved':
      return `Approved by ${actor}: ${title}`;
    case 'denied':
      return `Denied by ${actor}: ${title}`;
    case 'answered':
      return params.text?.trim() ? `Answered by ${actor}: ${params.text.trim()}` : `Answered by ${actor}: ${title}`;
    case 'expired':
      return `Expired: ${title}`;
    case 'canceled':
      return `Canceled: ${title}`;
    case 'delivered':
      return `Delivered: ${title}`;
    default:
      return params.optionId ? `${actor} chose ${params.optionId}` : `Human response from ${actor}: ${title}`;
  }
}
