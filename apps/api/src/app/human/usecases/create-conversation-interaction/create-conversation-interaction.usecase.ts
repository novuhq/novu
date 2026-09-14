import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { ConversationParticipantTypeEnum, HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import { isHumanCardElement, normalizeHumanTo } from '@novu/shared';
import { OutboundGateway } from '../../../agents/conversation-runtime/egress/outbound.gateway';
import { buildPendingDeliveryContent } from '../../../agents/human-relay/human-card.builder';
import type { ReplyContentDto } from '../../../agents/shared/dtos/agent-reply-payload.dto';
import {
  assertHumanCardActions,
  assertHumanPendingCap,
  buildPendingHumanInteraction,
  deliverToTargets,
  toStoredContent,
} from '../../services/human-interaction-lifecycle';
import { CreateConversationInteractionCommand } from './create-conversation-interaction.command';

function persistableIncoming(
  command: CreateConversationInteractionCommand
): CreateConversationInteractionCommand['card'] {
  if (isHumanCardElement(command.card)) {
    return command.card;
  }

  return { ...command.card, title: command.card.title?.trim() ?? '' };
}

function deliveryFromContent(
  command: CreateConversationInteractionCommand,
  interaction: HumanInteractionEntity
): ReplyContentDto {
  // Prefer the persisted `content`; fall back to recomputing from the command only
  // when the created row did not echo it back.
  const content = interaction.content ?? toStoredContent(command.kind, persistableIncoming(command));

  return buildPendingDeliveryContent({ ...interaction, content }, { actionIdentifier: command.actionIdentifier });
}

@Injectable()
export class CreateConversationInteraction {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly outboundGateway: OutboundGateway,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: CreateConversationInteractionCommand): Promise<HumanInteractionEntity> {
    const title = command.card.title?.trim();
    if (!title) {
      throw new BadRequestException('`card` is required (chrome or a Card element).');
    }

    assertHumanCardActions(command.kind, command.card);

    const subscriberIds = this.resolveRecipientIds(command);
    const [primarySubscriberId] = subscriberIds;
    if (!primarySubscriberId) {
      throw new BadRequestException(
        'Cannot create a human interaction — this conversation has no resolved subscriber.'
      );
    }

    await assertHumanPendingCap(this.humanInteractionRepository, {
      environmentId: command.environmentId,
      subscriberIds,
      kind: command.kind,
      errorMessage: (pendingCount, cap, subscriberId) =>
        `Subscriber "${subscriberId}" already has ${pendingCount} pending interactions (cap ${cap}).`,
    });

    const interaction = await this.humanInteractionRepository.create(
      buildPendingHumanInteraction({
        kind: command.kind,
        content: toStoredContent(command.kind, persistableIncoming(command)),
        from: command.from,
        subscriberIds,
        agentId: command.conversation._agentId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        ttlSeconds: command.ttlSeconds,
        requestId: command.requestId,
        conversationId: command.conversation._id,
      })
    );

    if (command.skipDelivery) {
      return interaction;
    }

    const delivered = await deliverToTargets(
      this.humanInteractionRepository,
      this.logger,
      interaction,
      [
        {
          subscriberId: primarySubscriberId,
          integrationIdentifier: command.integrationIdentifier,
          platform: command.channel.platform,
          deliver: async () => {
            const sent = await this.outboundGateway.deliver(
              {
                agentId: command.conversation._agentId,
                integrationIdentifier: command.integrationIdentifier,
                platform: command.channel.platform,
                platformThreadId: command.channel.platformThreadId,
                workspaceId: command.channel.workspace?.id,
              },
              deliveryFromContent(command, interaction),
              {
                conversationId: command.conversation._id,
                channel: command.channel,
                agentIdentifier: command.agentIdentifier,
                agentName: command.agentName,
                environmentId: command.environmentId,
                organizationId: command.organizationId,
              },
              command.slackNative ? { slackNative: command.slackNative } : undefined
            );

            return {
              platformMessageId: sent.messageId,
              platformThreadId: sent.platformThreadId,
              _conversationId: command.conversation._id,
            };
          },
        },
      ],
      {
        logMessage: 'Conversation human-interaction delivery failed',
        logContext: { conversationId: command.conversation._id },
      }
    );

    return delivered.interaction;
  }

  private resolveRecipientIds(command: CreateConversationInteractionCommand): string[] {
    if (command.to !== undefined) {
      return normalizeHumanTo(command.to);
    }

    const subscriberParticipant = command.conversation.participants.find(
      (participant) => participant.type === ConversationParticipantTypeEnum.SUBSCRIBER
    );

    if (!subscriberParticipant?.id) {
      throw new BadRequestException(
        'Cannot create a human interaction — this conversation has no resolved subscriber.'
      );
    }

    return [subscriberParticipant.id];
  }
}
