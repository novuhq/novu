import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger, shortId } from '@novu/application-generic';
import {
  AgentRepository,
  ConversationActivityRepository,
  ConversationActivityTypeEnum,
  ConversationChannel,
  ConversationEntity,
  ConversationRepository,
  ConversationStatusEnum,
  SubscriberRepository,
} from '@novu/dal';
import type { SentMessageInfo } from '@novu/framework';
import { AgentEventEnum } from '../../dtos/agent-event.enum';
import type { EditPayloadDto, ReplyContentDto } from '../../dtos/agent-reply-payload.dto';
import { AgentConfigResolver, ResolvedAgentConfig } from '../../services/agent-config-resolver.service';
import { AgentConversationService } from '../../services/agent-conversation.service';
import { BridgeExecutorService } from '../../services/bridge-executor.service';
import { ChatSdkService } from '../../services/chat-sdk.service';
import { HandleAgentReplyCommand } from './handle-agent-reply.command';

@Injectable()
export class HandleAgentReply {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly activityRepository: ConversationActivityRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentRepository: AgentRepository,
    @Inject(forwardRef(() => ChatSdkService))
    private readonly chatSdkService: ChatSdkService,
    private readonly bridgeExecutor: BridgeExecutorService,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly conversationService: AgentConversationService,
    private readonly logger: PinoLogger
  ) {}

  async execute(command: HandleAgentReplyCommand): Promise<SentMessageInfo | null> {
    if (command.reply && command.edit) {
      throw new BadRequestException('Only one of reply or edit can be provided');
    }
    if (command.edit && (command.resolve || command.signals?.length)) {
      throw new BadRequestException('edit cannot be combined with resolve or signals');
    }
    if (!command.reply && !command.edit && !command.resolve && !command.signals?.length) {
      throw new BadRequestException('At least one of reply, edit, resolve, or signals must be provided');
    }

    const conversation = await this.conversationRepository.findOne(
      {
        _id: command.conversationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const channel = this.getPrimaryChannel(conversation);

    if (command.edit) {
      const agentName = await this.resolveValidatedAgentNameForDelivery(command, conversation);

      return this.deliverEdit(command, conversation, channel, command.edit, agentName);
    }

    const needsConfig = !!(command.reply || command.resolve);
    const config = needsConfig
      ? await this.agentConfigResolver.resolve(conversation._agentId, command.integrationIdentifier)
      : null;

    let replyInfo: SentMessageInfo | undefined;
    if (command.reply) {
      const agentName = await this.resolveValidatedAgentNameForDelivery(command, conversation);

      replyInfo = await this.deliverMessage(
        command,
        conversation,
        channel,
        command.reply,
        ConversationActivityTypeEnum.MESSAGE,
        agentName
      );

      this.removeAckReaction(config!, conversation, channel).catch((err) => {
        this.logger.warn(err, `[agent:${command.agentIdentifier}] Failed to remove ack reaction`);
      });
    }

    if (command.signals?.length) {
      await this.executeSignals(command, conversation, channel, command.signals);
    }

    if (command.resolve) {
      await this.resolveConversation(command, config!, conversation, channel, command.resolve);
    }

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

  private getPrimaryChannel(conversation: ConversationEntity): ConversationChannel {
    const channel = conversation.channels[0];
    if (!channel?.serializedThread) {
      throw new BadRequestException('Conversation has no serialized thread — unable to deliver reply');
    }

    return channel;
  }

  private async deliverMessage(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    content: ReplyContentDto,
    type: ConversationActivityTypeEnum,
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

    await Promise.all([
      this.activityRepository.createAgentActivity({
        identifier: `act_${shortId(12)}`,
        conversationId: conversation._id,
        platform: channel.platform,
        integrationId: channel._integrationId,
        platformThreadId: sent.platformThreadId || channel.platformThreadId,
        platformMessageId: sent.messageId,
        agentId: command.agentIdentifier,
        senderName: agentName,
        content: textFallback,
        richContent: content.card || content.files?.length ? (content as Record<string, unknown>) : undefined,
        type,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      }),
      this.conversationRepository.touchActivity(
        command.environmentId,
        command.organizationId,
        conversation._id,
        textFallback
      ),
    ]);

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

    await Promise.all([
      this.activityRepository.createAgentActivity({
        identifier: `act_${shortId(12)}`,
        conversationId: conversation._id,
        platform: channel.platform,
        integrationId: channel._integrationId,
        platformThreadId: sent.platformThreadId || channel.platformThreadId,
        platformMessageId: sent.messageId,
        agentId: command.agentIdentifier,
        senderName: agentName,
        content: textFallback,
        richContent:
          edit.content.card || edit.content.files?.length ? (edit.content as Record<string, unknown>) : undefined,
        type: ConversationActivityTypeEnum.EDIT,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      }),
      // Refresh the conversation's lastMessagePreview + lastActivityAt without
      // incrementing messageCount — edits mutate an existing message, they don't add one.
      this.conversationRepository.touchPreview(
        command.environmentId,
        command.organizationId,
        conversation._id,
        textFallback
      ),
    ]);

    return sent;
  }

  private extractTextFallback(content: ReplyContentDto): string {
    if (content.text) return content.text;
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
      await this.executeMetadataSignals(command, conversation, channel, metadataSignals);
    }

    const triggerSignals = (signals ?? []).filter((s) => s.type === 'trigger');
    if (triggerSignals.length) {
      // TODO: execute trigger signals — requires wiring TriggerEvent or ParseEventRequest from EventsModule
    }
  }

  private async executeMetadataSignals(
    command: HandleAgentReplyCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    signals: Array<{ type: 'metadata'; key: string; value: unknown }>
  ): Promise<void> {
    const merged = { ...(conversation.metadata ?? {}) };
    for (const signal of signals) {
      merged[signal.key] = signal.value;
    }

    const serialized = JSON.stringify(merged);
    if (Buffer.byteLength(serialized) > 65_536) {
      throw new BadRequestException('Conversation metadata exceeds 64KB limit');
    }

    await Promise.all([
      this.conversationRepository.updateMetadata(
        command.environmentId,
        command.organizationId,
        conversation._id,
        merged
      ),
      this.activityRepository.createSignalActivity({
        identifier: `act_${shortId(12)}`,
        conversationId: conversation._id,
        platform: channel.platform,
        integrationId: channel._integrationId,
        platformThreadId: channel.platformThreadId,
        agentId: command.agentIdentifier,
        content: `Metadata updated: ${signals.map((s) => s.key).join(', ')}`,
        signalData: { type: 'metadata', payload: merged },
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      }),
    ]);
  }

  private async resolveConversation(
    command: HandleAgentReplyCommand,
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    options: { summary?: string }
  ): Promise<void> {
    await Promise.all([
      this.conversationRepository.updateStatus(
        command.environmentId,
        command.organizationId,
        conversation._id,
        ConversationStatusEnum.RESOLVED
      ),
      this.activityRepository.createSignalActivity({
        identifier: `act_${shortId(12)}`,
        conversationId: conversation._id,
        platform: channel.platform,
        integrationId: channel._integrationId,
        platformThreadId: channel.platformThreadId,
        agentId: command.agentIdentifier,
        content: options.summary ?? 'Conversation resolved',
        signalData: { type: 'resolve', payload: options.summary ? { summary: options.summary } : undefined },
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      }),
    ]);

    this.reactOnResolve(config, conversation, channel).catch((err) => {
      this.logger.warn(err, `[agent:${command.agentIdentifier}] Failed to add resolve reaction`);
    });

    this.fireOnResolveBridgeCall(command, config, conversation).catch((err) => {
      this.logger.error(err, `[agent:${command.agentIdentifier}] Failed to fire onResolve bridge call`);
    });
  }

  private async removeAckReaction(
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    channel: ConversationChannel
  ): Promise<void> {
    const firstMessageId = channel.firstPlatformMessageId;
    if (!firstMessageId || !config.reactionOnMessageReceived) return;

    await this.chatSdkService.removeReaction(
      conversation._agentId,
      config.integrationIdentifier,
      channel.platform,
      channel.platformThreadId,
      firstMessageId,
      config.reactionOnMessageReceived
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
    conversation: ConversationEntity
  ): Promise<void> {
    const subscriberParticipant = conversation.participants.find((p) => p.type === 'subscriber');
    const [subscriber, history] = await Promise.all([
      subscriberParticipant
        ? this.subscriberRepository.findBySubscriberId(command.environmentId, subscriberParticipant.id)
        : Promise.resolve(null),
      this.conversationService.getHistory(command.environmentId, conversation._id),
    ]);

    const channel = conversation.channels[0];

    await this.bridgeExecutor.execute({
      event: AgentEventEnum.ON_RESOLVE,
      config,
      conversation,
      subscriber,
      history,
      message: null,
      platformContext: {
        threadId: channel?.platformThreadId ?? '',
        channelId: '',
        isDM: false,
      },
    });
  }
}
