import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PinoLogger, shortId } from '@novu/application-generic';
import {
  ActivityView,
  ConversationActivityEntity,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivitySignalData,
  ConversationActivityToolData,
  ConversationActivityTypeEnum,
  ConversationRepository,
  isDuplicateKeyError,
} from '@novu/dal';
import { AgentChatLiveActivityPublisher } from '../../agent-chat/agent-chat-live-activity.publisher';
import { mintApprovalActionIds } from '../../shared/tool-approval/mint-approval-action-ids';
import { AGENT_HISTORY_LIMIT, getInboundActivityPreview } from './agent-conversation.helpers';
import type {
  ConversationActivityContext,
  PersistAgentActivityParams,
  PersistAgentMessageResult,
  PersistCustomParams,
  PersistInboundMessageParams,
  PersistMcpConnectionRequestParams,
  PersistMcpConnectionResultParams,
  PersistToolApprovalDecisionParams,
  PersistToolApprovalRequestParams,
  PersistToolResultParams,
  PersistTriggerSignalParams,
  PersistWorkflowOriginHydrationParams,
} from './agent-conversation.types';
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
    @Inject(forwardRef(() => AgentChatLiveActivityPublisher))
    private readonly agentChatLiveActivityPublisher: AgentChatLiveActivityPublisher,
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

  async persistAgentEdit(params: PersistAgentActivityParams): Promise<ConversationActivityEntity> {
    return this.persistAgentActivity(params, ConversationActivityTypeEnum.EDIT, 'preview');
  }

  async persistAgentDelete(params: PersistAgentActivityParams): Promise<ConversationActivityEntity> {
    return this.persistAgentActivity(params, ConversationActivityTypeEnum.DELETE, 'preview');
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
      content: params.approved ? `Approved ${toolName}` : `Denied ${toolName}`,
      type: ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION,
      toolData: { approvalId: params.approvalId, approved: params.approved, toolName: params.toolName },
      sequence,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
    });

    await this.emitPersistedClientEvent(params, activity);

    return activity;
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
    const activity = await this.persistAgentActivity(
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

    await this.emitPersistedClientEvent(params, activity);

    return activity;
  }

  async persistMcpConnectionResult(params: PersistMcpConnectionResultParams): Promise<ConversationActivityEntity> {
    const activity = await this.persistAgentActivity(
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

    await this.emitPersistedClientEvent(params, activity);

    return activity;
  }

  async persistCustom(params: PersistCustomParams): Promise<ConversationActivityEntity> {
    const activity = await this.persistAgentActivity(
      {
        ...params,
        content: params.name,
        richContent: {
          custom: {
            name: params.name,
            data: params.data,
          },
        },
      },
      ConversationActivityTypeEnum.CUSTOM,
      'activity'
    );

    await this.emitPersistedClientEvent(params, activity);

    return activity;
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

  private async persistAgentActivity(
    params: PersistAgentActivityParams & {
      toolData?: ConversationActivityToolData;
    },
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
    await this.agentChatLiveActivityPublisher.emitPersistedClientEvent({
      channel: params.channel,
      conversationId: params.conversationId,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      agentIdentifier: params.agentIdentifier,
      activity,
    });
  }
}
