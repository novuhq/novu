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
import type { SentMessageInfo, TriggerSignal } from '@novu/framework';
import { AddressingTypeEnum, type TriggerRecipientsPayload, TriggerRequestCategoryEnum } from '@novu/shared';
import { ParseEventRequest, ParseEventRequestMulticastCommand } from '../../../events/usecases/parse-event-request';
import { trackAgentReplyProcessed } from '../../agent-analytics';
import { AgentEventEnum } from '../../dtos/agent-event.enum';
import type { EditPayloadDto, ReplyContentDto } from '../../dtos/agent-reply-payload.dto';
import { isValidMetadataSignalKey } from '../../dtos/agent-reply-payload.dto';
import { AgentConfigResolver, ResolvedAgentConfig } from '../../services/agent-config-resolver.service';
import { AgentConversationService } from '../../services/agent-conversation.service';
import { BridgeExecutorService } from '../../services/bridge-executor.service';
import { ChatSdkService } from '../../services/chat-sdk.service';
import { HandleAgentReplyCommand } from './handle-agent-reply.command';

@Injectable()
export class HandleAgentReply {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly chatSdkService: ChatSdkService,
    private readonly bridgeExecutor: BridgeExecutorService,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly conversationService: AgentConversationService,
    private readonly logger: PinoLogger,
    private readonly parseEventRequest: ParseEventRequest,
    private readonly analyticsService: AnalyticsService
  ) {}

  async execute(command: HandleAgentReplyCommand): Promise<SentMessageInfo | null> {
    if (command.reply && command.edit) {
      throw new BadRequestException('Only one of reply or edit can be provided');
    }
    if (command.edit && (command.resolve || command.signals?.length || command.addReactions?.length)) {
      throw new BadRequestException('edit cannot be combined with resolve, signals, or addReactions');
    }
    if (
      !command.reply &&
      !command.edit &&
      !command.resolve &&
      !command.signals?.length &&
      !command.addReactions?.length
    ) {
      throw new BadRequestException('At least one of reply, edit, resolve, signals, or addReactions must be provided');
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

    if (command.edit) {
      return this.deliverEdit(command, conversation, channel, command.edit, agentName);
    }

    const needsConfig = !!(command.reply || command.resolve || command.signals?.length);
    const config = needsConfig
      ? await this.agentConfigResolver.resolve(conversation._agentId, command.integrationIdentifier)
      : null;

    let replyInfo: SentMessageInfo | undefined;
    if (command.reply) {
      this.ensureSerializedThread(channel);

      replyInfo = await this.deliverMessage(command, conversation, channel, command.reply, agentName);

      this.removeAckReaction(config!, conversation, channel).catch((err) => {
        this.logger.warn(err, `[agent:${command.agentIdentifier}] Failed to remove ack reaction`);
      });
    }

    if (command.signals?.length) {
      await this.executeSignals(command, conversation, channel, command.signals);
    }

    if (command.addReactions?.length) {
      await Promise.allSettled(
        command.addReactions.map((r) =>
          this.chatSdkService.reactToMessage(
            conversation._agentId,
            command.integrationIdentifier,
            channel.platform,
            channel.platformThreadId,
            r.messageId,
            r.emojiName
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
    const actions: string[] = [];

    if (command.reply) actions.push('reply');
    if (command.edit) actions.push('edit');
    if (command.resolve) actions.push('resolve');
    if (triggerSignalCount > 0) actions.push('trigger_signals');
    if (metadataSignalCount > 0) actions.push('metadata_signals');
    if (reactionCount > 0) actions.push('add_reactions');

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

  private ensureSerializedThread(
    channel: ConversationChannel
  ): asserts channel is ConversationChannel & { serializedThread: Record<string, unknown> } {
    if (!channel.serializedThread) {
      throw new BadRequestException('Conversation has no serialized thread — unable to deliver reply');
    }
  }

  private async deliverMessage(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    content: ReplyContentDto,
    agentName?: string
  ): Promise<SentMessageInfo> {
    const textFallback = this.extractTextFallback(content);

    const sent = await this.chatSdkService.postToConversation(
      conversation._agentId,
      command.integrationIdentifier,
      channel.platform,
      channel.serializedThread!,
      content
    );

    await this.conversationService.persistAgentMessage({
      conversationId: conversation._id,
      channel,
      platformThreadId: sent.platformThreadId || undefined,
      platformMessageId: sent.messageId,
      agentIdentifier: command.agentIdentifier,
      agentName,
      content: textFallback,
      richContent: content.card || content.files?.length ? (content as Record<string, unknown>) : undefined,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    return sent;
  }

  private async deliverEdit(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    edit: EditPayloadDto,
    agentName?: string
  ): Promise<SentMessageInfo> {
    const textFallback = this.extractTextFallback(edit.content);

    const sent = await this.chatSdkService.editInConversation(
      conversation._agentId,
      command.integrationIdentifier,
      channel.platform,
      channel.platformThreadId,
      edit.messageId,
      edit.content
    );

    await this.conversationService.persistAgentEdit({
      conversationId: conversation._id,
      channel,
      platformThreadId: sent.platformThreadId || undefined,
      platformMessageId: sent.messageId,
      agentIdentifier: command.agentIdentifier,
      agentName,
      content: textFallback,
      richContent:
        edit.content.card || edit.content.files?.length ? (edit.content as Record<string, unknown>) : undefined,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    return sent;
  }

  private extractTextFallback(content: ReplyContentDto): string {
    if (content.markdown) return content.markdown;
    if (content.card) {
      const title = (content.card as { title?: string }).title;

      return title ?? '[Card]';
    }

    return '';
  }

  private async executeSignals(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    signals: HandleAgentReplyCommand['signals']
  ): Promise<void> {
    const metadataSignals = (signals ?? []).filter(
      (s): s is Extract<NonNullable<HandleAgentReplyCommand['signals']>[number], { type: 'metadata' }> =>
        s.type === 'metadata'
    );

    if (metadataSignals.length) {
      await this.validateMetadataSignalKeys(metadataSignals);
      await this.conversationService.updateMetadata({
        conversationId: conversation._id,
        channel,
        currentMetadata: conversation.metadata ?? {},
        signals: metadataSignals,
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

  private validateMetadataSignalKeys(signals: Array<{ key: string; value: unknown }>): void {
    for (const signal of signals) {
      if (!isValidMetadataSignalKey(signal.key)) {
        throw new BadRequestException(`Invalid metadata signal key: "${signal.key}"`);
      }
      if (signal.value === undefined) {
        throw new BadRequestException(`Metadata signal "${signal.key}" must have a defined value`);
      }
    }
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

  private async removeAckReaction(
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    channel: ConversationChannel
  ): Promise<void> {
    const firstMessageId = channel.firstPlatformMessageId;
    if (!firstMessageId || !config.acknowledgeOnReceived) return;

    await this.chatSdkService.removeReaction(
      conversation._agentId,
      config.integrationIdentifier,
      channel.platform,
      channel.platformThreadId,
      firstMessageId,
      'eyes'
    );
  }

  private async reactOnResolve(
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    channel: ConversationChannel
  ): Promise<void> {
    const firstMessageId = channel.firstPlatformMessageId;
    if (!firstMessageId || !config.reactionOnResolved) return;

    await this.chatSdkService.reactToMessage(
      conversation._agentId,
      config.integrationIdentifier,
      channel.platform,
      channel.platformThreadId,
      firstMessageId,
      config.reactionOnResolved
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
    const [subscriber, history] = await Promise.all([
      subscriberParticipant
        ? this.subscriberRepository.findBySubscriberId(command.environmentId, subscriberParticipant.id)
        : Promise.resolve(null),
      this.conversationService.getHistory(command.environmentId, conversation._id),
    ]);

    await this.bridgeExecutor.execute({
      event: AgentEventEnum.ON_RESOLVE,
      config,
      conversation,
      subscriber,
      history,
      message: null,
      platformContext: {
        threadId: channel.platformThreadId,
        channelId: '',
        isDM: false,
      },
    });
  }
}
