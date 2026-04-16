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
import { AgentEventEnum } from '../../dtos/agent-event.enum';
import type { ReplyContentDto } from '../../dtos/agent-reply-payload.dto';
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

  async execute(command: HandleAgentReplyCommand): Promise<{ status: string }> {
    if (command.reply && command.update) {
      throw new BadRequestException('Only one of reply or update can be provided');
    }
    if (!command.reply && !command.update && !command.resolve && !command.signals?.length) {
      throw new BadRequestException('At least one of reply, update, resolve, or signals must be provided');
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

    if (command.update) {
      const agentName = await this.resolveValidatedAgentNameForDelivery(command, conversation);

      await this.deliverMessage(
        command,
        conversation,
        channel,
        command.update,
        ConversationActivityTypeEnum.UPDATE,
        agentName
      );

      return { status: 'update_sent' };
    }

    const needsConfig = !!(command.reply || command.resolve);
    const config = needsConfig
      ? await this.agentConfigResolver.resolve(conversation._agentId, command.integrationIdentifier)
      : null;

    if (command.reply) {
      const agentName = await this.resolveValidatedAgentNameForDelivery(command, conversation);

      await this.deliverMessage(
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
      await this.executeResolveSignal(command, config!, conversation, channel, command.resolve);
    }

    return { status: 'ok' };
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
  ): Promise<void> {
    const textFallback = this.extractTextFallback(content);

    await Promise.all([
      this.chatSdkService.postToConversation(
        conversation._agentId,
        command.integrationIdentifier,
        channel.platform,
        channel.serializedThread!,
        content
      ),
      this.activityRepository.createAgentActivity({
        identifier: `act_${shortId(12)}`,
        conversationId: conversation._id,
        platform: channel.platform,
        integrationId: channel._integrationId,
        platformThreadId: channel.platformThreadId,
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

  private async executeResolveSignal(
    command: HandleAgentReplyCommand,
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    signal: { summary?: string }
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
        content: signal.summary ?? 'Conversation resolved',
        signalData: { type: 'resolve', payload: signal.summary ? { summary: signal.summary } : undefined },
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
