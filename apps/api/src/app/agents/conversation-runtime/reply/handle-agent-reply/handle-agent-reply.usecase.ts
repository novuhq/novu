import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, PinoLogger } from '@novu/application-generic';
import {
  AgentRepository,
  ConversationChannel,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  SubscriberRepository,
} from '@novu/dal';
import type { SentMessageInfo, ToolResult, TriggerSignal } from '@novu/framework/internal';
import { AddressingTypeEnum, type TriggerRecipientsPayload, TriggerRequestCategoryEnum } from '@novu/shared';
import { ParseEventRequest, ParseEventRequestMulticastCommand } from '../../../../events/usecases/parse-event-request';
import { AgentConfigResolver, ResolvedAgentConfig } from '../../../channels/agent-config-resolver.service';
import { trackAgentReplyProcessed } from '../../../shared/analytics/agent-analytics';
import type {
  EditPayloadDto,
  ReplyContentDto,
  ToolApprovalRequestPayloadDto,
} from '../../../shared/dtos/agent-reply-payload.dto';
import { isValidMetadataSignalKey } from '../../../shared/dtos/agent-reply-payload.dto';
import { AgentEventEnum } from '../../../shared/enums/agent-event.enum';
import {
  AgentPlatformEnum,
  usesProtocolEventApprovals,
  usesReplyBasedApprovals,
} from '../../../shared/enums/agent-platform.enum';
import { adaptApprovalContentForReplyBasedPlatform } from '../../../shared/tool-approval/reply-based-approval';
import {
  buildSelfHostedApprovalCard,
  type SelfHostedApprovalDescriptor,
} from '../../../shared/tool-approval/self-hosted-approval';
import { InboundAckService } from '../../ack/inbound-ack.service';
import type { MetadataOp } from '../../conversation/agent-conversation.service';
import { AgentConversationService } from '../../conversation/agent-conversation.service';
import { ConversationActivationService } from '../../conversation/conversation-activation.service';
import { OutboundGateway } from '../../egress/outbound.gateway';
import { BridgeExecutorService } from '../../runtime/bridge-executor.service';
import { buildAgentPlatformContext, buildEmailPlatformContext } from '../../runtime/build-platform-context.util';
import { HandleAgentReplyCommand } from './handle-agent-reply.command';

const SELF_HOSTED_TURN_ERROR_MARKDOWN =
  '*Something went wrong while processing your message. Please try again in a moment.*';

@Injectable()
export class HandleAgentReply {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly bridgeExecutor: BridgeExecutorService,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly conversationService: AgentConversationService,
    private readonly logger: PinoLogger,
    private readonly parseEventRequest: ParseEventRequest,
    private readonly analyticsService: AnalyticsService,
    private readonly outboundGateway: OutboundGateway,
    private readonly inboundAck: InboundAckService,
    private readonly conversationActivation: ConversationActivationService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: HandleAgentReplyCommand): Promise<SentMessageInfo | null> {
    if (command.error) {
      if (
        command.reply ||
        command.edit ||
        command.resolve ||
        command.signals?.length ||
        command.toolResults?.length ||
        command.toolApprovalRequest ||
        command.addReactions?.length ||
        command.deleteMessages?.length ||
        command.plan ||
        command.typing
      ) {
        throw new BadRequestException(
          'error cannot be combined with reply, edit, resolve, signals, toolResults, toolApprovalRequest, addReactions, deleteMessages, plan, or typing'
        );
      }

      return this.deliverSelfHostedTurnError(command);
    }

    if (command.reply && command.edit) {
      throw new BadRequestException('Only one of reply or edit can be provided');
    }
    if (
      command.edit &&
      (command.resolve ||
        command.signals?.length ||
        command.toolResults?.length ||
        command.toolApprovalRequest ||
        command.addReactions?.length ||
        command.deleteMessages?.length)
    ) {
      throw new BadRequestException(
        'edit cannot be combined with resolve, signals, toolResults, toolApprovalRequest, addReactions, or deleteMessages'
      );
    }
    if (
      !command.reply &&
      !command.edit &&
      !command.resolve &&
      !command.signals?.length &&
      !command.toolResults?.length &&
      !command.toolApprovalRequest &&
      !command.addReactions?.length &&
      !command.deleteMessages?.length &&
      !command.plan &&
      !command.typing &&
      !command.error
    ) {
      throw new BadRequestException(
        'At least one of reply, edit, resolve, signals, toolResults, toolApprovalRequest, addReactions, deleteMessages, plan, typing, or error must be provided'
      );
    }

    const conversation = await this.conversationService.getConversation(
      command.conversationId,
      command.environmentId,
      command.organizationId
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const channel = this.conversationService.getPrimaryChannel(conversation);
    const agentName = await this.resolveValidatedAgentNameForDelivery(command, conversation);

    if (command.typing) {
      await this.deliverTyping(command, conversation, channel, command.typing);
    }

    if (command.edit) {
      return this.deliverEdit(command, conversation, channel, command.edit, agentName);
    }

    if (command.plan) {
      return this.deliverPlan(command, conversation, channel, command.plan);
    }

    const needsConfig = !!(command.reply || command.resolve || command.signals?.length);
    const config = needsConfig
      ? await this.agentConfigResolver.resolve(conversation._agentId, command.integrationIdentifier)
      : null;

    // Persist tool results before the reply so the ledger reads
    // tool-call → tool-result → assistant text in transcript order.
    if (command.toolResults?.length) {
      await this.persistToolResults(command, conversation, channel, command.toolResults);
    }

    let toolApprovalActivityId: string | undefined;
    if (command.toolApprovalRequest) {
      toolApprovalActivityId = await this.persistToolApprovalRequest(
        command,
        conversation,
        channel,
        command.toolApprovalRequest
      );
    }

    let replyInfo: SentMessageInfo | undefined;
    if (command.reply) {
      const skipProtocolPortableApprovalCard =
        usesProtocolEventApprovals(channel.platform) &&
        !!command.toolApprovalRequest &&
        !!command.reply.toolApprovalCard &&
        command.reply.markdown === undefined &&
        command.reply.card === undefined;

      // System-generated replies (e.g. runtime error notices) are always
      // delivered but never count an active conversation, and they bypass the
      // free-tier gate so an error message is never swallowed by a 402.
      if (!command.isSystemGenerated) {
        // Free-tier short-circuit: an agent-initiated reply that would start a new
        // active conversation is rejected once the included limit is reached
        // (covers proactive/outbound-only threads). Replies inside an already-counted
        // conversation pass through.
        await this.conversationActivation.assertOutboundWithinLimit({
          conversation,
          platform: channel.platform as AgentPlatformEnum,
          organizationId: command.organizationId,
        });
      }

      if (!skipProtocolPortableApprovalCard) {
        replyInfo = await this.deliverMessage(command, conversation, channel, command.reply, agentName);
      }

      if (toolApprovalActivityId && replyInfo) {
        await this.linkToolApprovalRequestCard(command, conversation, toolApprovalActivityId, replyInfo.messageId);
      }

      if (!command.isSystemGenerated) {
        await this.registerConversationEngagement(command, conversation, channel);
      }

      if (!config!.isManaged) {
        void this.inboundAck.onBridgeReplyDelivered({
          agentId: conversation._agentId,
          config: config!,
          platformThreadId: channel.platformThreadId,
          firstPlatformMessageId: channel.firstPlatformMessageId,
        });
      }
    }

    if (command.signals?.length) {
      await this.executeSignals(command, conversation, channel, command.signals);
    }

    if (command.addReactions?.length) {
      await Promise.allSettled(
        command.addReactions.map((r) =>
          this.outboundGateway.reactToMessage(
            conversation._agentId,
            command.integrationIdentifier,
            channel.platformThreadId,
            r.messageId,
            r.emojiName,
            channel.workspace?.id
          )
        )
      );
    }

    if (command.deleteMessages?.length) {
      await Promise.allSettled(
        command.deleteMessages.map((d) =>
          this.outboundGateway.deleteInConversation(
            conversation._agentId,
            command.integrationIdentifier,
            channel.platformThreadId,
            d.messageId,
            channel.workspace?.id,
            {
              conversationId: conversation._id,
              channel,
              agentIdentifier: command.agentIdentifier,
              agentName,
              environmentId: command.environmentId,
              organizationId: command.organizationId,
            }
          )
        )
      );
    }

    if (command.resolve) {
      await this.resolveConversation(command, config!, conversation, channel, command.resolve);
    }

    const triggerSignalCount = (command.signals ?? []).filter((s) => s.type === 'trigger').length;
    const metadataSignalCount = (command.signals ?? []).filter((s) => s.type === 'metadata').length;
    const reactionCount = command.addReactions?.length ?? 0;
    const deleteMessageCount = command.deleteMessages?.length ?? 0;
    const actions: string[] = [];

    if (command.reply) actions.push('reply');
    if (command.edit) actions.push('edit');
    if (command.resolve) actions.push('resolve');
    if (command.toolApprovalRequest) actions.push('tool_approval_request');
    if (triggerSignalCount > 0) actions.push('trigger_signals');
    if (metadataSignalCount > 0) actions.push('metadata_signals');
    if (reactionCount > 0) actions.push('add_reactions');
    if (deleteMessageCount > 0) actions.push('delete_messages');
    if (command.typing) actions.push('typing');

    trackAgentReplyProcessed(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentIdentifier: command.agentIdentifier,
      conversationId: command.conversationId,
      integrationIdentifier: command.integrationIdentifier,
      actions,
      triggerSignalCount,
      metadataSignalCount,
      reactionCount,
    });

    return replyInfo ?? null;
  }

  private async deliverSelfHostedTurnError(command: HandleAgentReplyCommand): Promise<SentMessageInfo | null> {
    const conversation = await this.conversationService.getConversation(
      command.conversationId,
      command.environmentId,
      command.organizationId
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const channel = this.conversationService.getPrimaryChannel(conversation);
    const agentName = await this.resolveValidatedAgentNameForDelivery(command, conversation);

    this.logger.warn(
      { conversationId: command.conversationId, agentIdentifier: command.agentIdentifier },
      'Self-hosted bridge reported turn error'
    );

    const config = await this.agentConfigResolver.resolve(conversation._agentId, command.integrationIdentifier);

    const replyInfo = await this.deliverMessage(
      command,
      conversation,
      channel,
      { markdown: SELF_HOSTED_TURN_ERROR_MARKDOWN },
      agentName
    );

    if (config && !config.isManaged) {
      void this.inboundAck.onBridgeReplyDelivered({
        agentId: conversation._agentId,
        config,
        platformThreadId: channel.platformThreadId,
        firstPlatformMessageId: channel.firstPlatformMessageId,
      });
    }

    trackAgentReplyProcessed(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentIdentifier: command.agentIdentifier,
      conversationId: command.conversationId,
      integrationIdentifier: command.integrationIdentifier,
      actions: ['turn_error'],
      triggerSignalCount: 0,
      metadataSignalCount: 0,
      reactionCount: 0,
    });

    return replyInfo ?? null;
  }

  private async resolveValidatedAgentNameForDelivery(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity
  ): Promise<string | undefined> {
    const agent = await this.agentRepository.findOne(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        identifier: command.agentIdentifier,
      },
      { _id: 1, name: 1, identifier: 1 }
    );

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (String(agent._id) !== conversation._agentId) {
      throw new ForbiddenException('Agent identifier does not match this conversation');
    }

    return agent.name;
  }

  /**
   * Counts the active conversation for an agent-initiated reply. Idempotent per
   * activation (a reply following a counted inbound dispatch only slides the
   * rolling window). Fail-soft — billing accounting must never fail a delivered
   * reply.
   */
  private async registerConversationEngagement(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel
  ): Promise<void> {
    try {
      await this.conversationActivation.registerEngagement({
        conversation,
        platform: channel.platform as AgentPlatformEnum,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        agentId: conversation._agentId,
      });
    } catch (err) {
      this.logger.warn(
        err,
        `[agent:${command.agentIdentifier}] Failed to register active-conversation engagement for reply`
      );
    }
  }

  private async deliverMessage(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    content: ReplyContentDto,
    agentName?: string
  ): Promise<SentMessageInfo> {
    let deliverContent = content;
    let slackNative = command.slackNative;

    if (content.toolApprovalCard) {
      if (!command.toolApprovalRequest) {
        throw new BadRequestException('toolApprovalCard reply requires an accompanying toolApprovalRequest');
      }

      const built = buildSelfHostedApprovalCard(
        content.toolApprovalCard as SelfHostedApprovalDescriptor,
        command.toolApprovalRequest
      );
      deliverContent = built.content;
      slackNative = built.slackNative;
    }

    // Platforms without callback buttons (iMessage/SMS) cannot click Approve /
    // Deny — strip the buttons and append explicit "Reply YES / NO" text so
    // the user can answer the approval by texting back.
    if (command.toolApprovalRequest && usesReplyBasedApprovals(channel.platform)) {
      deliverContent = adaptApprovalContentForReplyBasedPlatform(deliverContent);
    }

    return this.outboundGateway.deliver(
      {
        agentId: conversation._agentId,
        integrationIdentifier: command.integrationIdentifier,
        platform: channel.platform,
        platformThreadId: channel.platformThreadId,
        workspaceId: channel.workspace?.id,
      },
      deliverContent,
      {
        conversationId: conversation._id,
        channel,
        agentIdentifier: command.agentIdentifier,
        agentName,
        activityIdentifier: command.activityIdentifier,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      },
      { slackNative }
    );
  }

  private async deliverEdit(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    edit: EditPayloadDto,
    agentName?: string
  ): Promise<SentMessageInfo> {
    return this.outboundGateway.edit(
      {
        agentId: conversation._agentId,
        integrationIdentifier: command.integrationIdentifier,
        platform: channel.platform,
        platformThreadId: channel.platformThreadId,
        workspaceId: channel.workspace?.id,
      },
      edit.messageId,
      edit.content,
      {
        conversationId: conversation._id,
        channel,
        agentIdentifier: command.agentIdentifier,
        agentName,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      },
      { slackNative: command.slackNative }
    );
  }

  private async deliverPlan(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    plan: NonNullable<HandleAgentReplyCommand['plan']>
  ): Promise<SentMessageInfo | null> {
    if (plan.messageId) {
      await this.outboundGateway.editPlanObject(
        conversation._agentId,
        command.integrationIdentifier,
        channel.platform,
        channel.platformThreadId,
        plan.messageId,
        plan.model,
        plan.phase,
        channel.workspace?.id
      );

      return { messageId: plan.messageId, platformThreadId: channel.platformThreadId };
    }

    return this.outboundGateway.postPlanObject(
      conversation._agentId,
      command.integrationIdentifier,
      channel.platform,
      channel.platformThreadId,
      plan.model,
      plan.phase,
      channel.workspace?.id
    );
  }

  private async deliverTyping(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    typing: NonNullable<HandleAgentReplyCommand['typing']>
  ): Promise<void> {
    try {
      if (typing === 'stop') {
        await this.outboundGateway.stopTypingInConversation(
          conversation._agentId,
          command.integrationIdentifier,
          channel.platformThreadId,
          channel.workspace?.id
        );

        return;
      }

      await this.outboundGateway.startTypingInConversation(
        conversation._agentId,
        command.integrationIdentifier,
        channel.platformThreadId,
        typing.status ?? 'Thinking...',
        channel.workspace?.id
      );
    } catch (err) {
      this.logger.warn(err, `[agent:${command.agentIdentifier}] Failed to set typing status`);
    }
  }

  private async executeSignals(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    signals: HandleAgentReplyCommand['signals']
  ): Promise<void> {
    const rawMetadata = (signals ?? []).filter((s) => s.type === 'metadata') as Array<{
      type: 'metadata';
      action?: string;
      key?: string;
      value?: unknown;
    }>;

    if (rawMetadata.length) {
      const ops = this.normalizeMetadataOps(rawMetadata);
      await this.conversationService.updateMetadata({
        conversationId: conversation._id,
        channel,
        currentMetadata: conversation.metadata ?? {},
        ops,
        agentIdentifier: command.agentIdentifier,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      });
    }

    const triggerSignals = (signals ?? []).filter((s): s is TriggerSignal => s.type === 'trigger');
    if (triggerSignals.length) {
      await this.executeTriggerSignals(command, conversation, channel, triggerSignals);
    }
  }

  private async persistToolApprovalRequest(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    request: ToolApprovalRequestPayloadDto
  ): Promise<string | undefined> {
    try {
      const activity = await this.conversationService.persistToolApprovalRequest({
        conversationId: conversation._id,
        channel,
        agentIdentifier: command.agentIdentifier,
        approvalId: request.approvalId,
        toolCallId: request.toolCallId,
        toolName: request.name,
        input: request.input,
        approveActionId: request.approveActionId,
        denyActionId: request.denyActionId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      });

      return activity._id;
    } catch (err) {
      this.logger.warn(
        { err, agentIdentifier: command.agentIdentifier, approvalId: request.approvalId },
        `[agent:${command.agentIdentifier}] Failed to persist tool-approval-request activity`
      );

      return undefined;
    }
  }

  private async linkToolApprovalRequestCard(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    activityId: string,
    platformMessageId: string
  ): Promise<void> {
    try {
      await this.conversationService.linkToolApprovalRequestCard({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        conversationId: conversation._id,
        activityId,
        platformMessageId,
      });
    } catch (err) {
      this.logger.warn(
        { err, agentIdentifier: command.agentIdentifier, activityId, platformMessageId },
        `[agent:${command.agentIdentifier}] Failed to link tool-approval card message`
      );
    }
  }

  private async persistToolResults(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    toolResults: ToolResult[]
  ): Promise<void> {
    for (const toolResult of toolResults) {
      try {
        await this.conversationService.persistToolResult({
          conversationId: conversation._id,
          channel,
          agentIdentifier: command.agentIdentifier,
          toolCallId: toolResult.toolCallId,
          toolName: toolResult.toolName,
          output: toolResult.output,
          preview: toolResult.preview,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        });
      } catch (err) {
        this.logger.warn(
          { err, agentIdentifier: command.agentIdentifier, toolCallId: toolResult.toolCallId },
          `[agent:${command.agentIdentifier}] Failed to persist tool-result activity for ${toolResult.toolCallId}`
        );
      }
    }
  }

  private async executeTriggerSignals(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    signals: TriggerSignal[]
  ): Promise<void> {
    const subscriberParticipant = conversation.participants.find(
      (p) => p.type === ConversationParticipantTypeEnum.SUBSCRIBER
    );

    for (const signal of signals) {
      const to = (signal.to as TriggerRecipientsPayload | undefined) ?? subscriberParticipant?.id;

      if (!to) {
        this.logger.warn(
          { agentIdentifier: command.agentIdentifier, workflowId: signal.workflowId },
          `[agent:${command.agentIdentifier}] Skipping trigger signal for "${signal.workflowId}" — no recipient and conversation has no resolved subscriber`
        );
        continue;
      }

      let transactionId: string;
      try {
        const result = await this.parseEventRequest.execute(
          ParseEventRequestMulticastCommand.create({
            userId: command.userId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            identifier: signal.workflowId,
            payload: signal.payload ?? {},
            overrides: {},
            to,
            addressingType: AddressingTypeEnum.MULTICAST,
            requestCategory: TriggerRequestCategoryEnum.SINGLE,
            requestId: randomUUID(),
          })
        );
        transactionId = result.transactionId;
      } catch (err) {
        this.logger.warn(
          { err, agentIdentifier: command.agentIdentifier, workflowId: signal.workflowId },
          `[agent:${command.agentIdentifier}] Failed to dispatch trigger for workflow "${signal.workflowId}"`
        );
        continue;
      }

      try {
        await this.conversationService.persistTriggerSignal({
          conversationId: conversation._id,
          channel,
          agentIdentifier: command.agentIdentifier,
          workflowId: signal.workflowId,
          to,
          transactionId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        });
      } catch (err) {
        this.logger.warn(
          { err, agentIdentifier: command.agentIdentifier, workflowId: signal.workflowId, transactionId },
          `[agent:${command.agentIdentifier}] Workflow "${signal.workflowId}" was enqueued (txn: ${transactionId}) but failed to persist activity`
        );
      }
    }
  }

  private normalizeMetadataOps(
    signals: Array<{ type: 'metadata'; action?: string; key?: string; value?: unknown }>
  ): MetadataOp[] {
    const ops: MetadataOp[] = [];

    for (const signal of signals) {
      const action = signal.action ?? 'set';

      switch (action) {
        case 'clear':
          ops.push({ action: 'clear' });
          break;
        case 'delete':
          if (!signal.key || !isValidMetadataSignalKey(signal.key)) {
            throw new BadRequestException(`Invalid metadata signal key: "${signal.key}"`);
          }
          ops.push({ action: 'delete', key: signal.key });
          break;
        case 'set':
          if (!signal.key || !isValidMetadataSignalKey(signal.key)) {
            throw new BadRequestException(`Invalid metadata signal key: "${signal.key}"`);
          }
          if (signal.value === undefined) {
            throw new BadRequestException(`Metadata signal "${signal.key}" must have a defined value`);
          }
          ops.push({ action: 'set', key: signal.key, value: signal.value });
          break;
        default:
          throw new BadRequestException(`Unsupported metadata signal action: "${action}"`);
      }
    }

    return ops;
  }

  private async resolveConversation(
    command: HandleAgentReplyCommand,
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    options: { summary?: string }
  ): Promise<void> {
    await this.conversationService.resolveConversation({
      conversationId: conversation._id,
      channel,
      agentIdentifier: command.agentIdentifier,
      summary: options.summary,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    this.reactOnResolve(config, conversation, channel).catch((err) => {
      this.logger.warn(err, `[agent:${command.agentIdentifier}] Failed to add resolve reaction`);
    });

    this.fireOnResolveBridgeCall(command, config, conversation, channel).catch((err) => {
      this.logger.error(err, `[agent:${command.agentIdentifier}] Failed to fire onResolve bridge call`);
    });
  }

  private async reactOnResolve(
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    channel: ConversationChannel
  ): Promise<void> {
    const firstMessageId = channel.firstPlatformMessageId;
    if (!firstMessageId || !config.reactionOnResolved) return;

    await this.outboundGateway.reactToMessage(
      conversation._agentId,
      config.integrationIdentifier,
      channel.platformThreadId,
      firstMessageId,
      config.reactionOnResolved,
      channel.workspace?.id
    );
  }

  private async fireOnResolveBridgeCall(
    command: HandleAgentReplyCommand,
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    channel: ConversationChannel
  ): Promise<void> {
    const subscriberParticipant = conversation.participants.find(
      (p) => p.type === ConversationParticipantTypeEnum.SUBSCRIBER
    );
    const subscriber = subscriberParticipant
      ? await this.subscriberRepository.findBySubscriberId(command.environmentId, subscriberParticipant.id)
      : null;

    await this.bridgeExecutor.execute({
      event: AgentEventEnum.ON_RESOLVE,
      config,
      conversation,
      subscriber,
      message: null,
      platformContext: buildAgentPlatformContext({
        platformThreadId: channel.platformThreadId,
        channelId: '',
        isDM: false,
        message: null,
        email: buildEmailPlatformContext({
          platform: config.platform,
          message: null,
          firstPlatformMessageId: channel.firstPlatformMessageId,
        }),
      }),
    });
  }
}
