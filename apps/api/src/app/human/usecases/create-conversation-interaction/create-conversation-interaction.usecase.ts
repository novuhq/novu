import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { ConversationParticipantTypeEnum, HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import { OutboundGateway } from '../../../agents/conversation-runtime/egress/outbound.gateway';
import { buildPendingContent } from '../../../agents/human-relay/human-card.builder';
import {
  assertHumanChooseOptions,
  assertHumanPendingCap,
  buildPendingHumanInteraction,
  deliverHumanInteractionOrRollback,
} from '../../services/human-interaction-lifecycle';
import { CreateConversationInteractionCommand } from './create-conversation-interaction.command';

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
    assertHumanChooseOptions(command.kind, command.options);

    const subscriberParticipant = command.conversation.participants.find(
      (participant) => participant.type === ConversationParticipantTypeEnum.SUBSCRIBER
    );

    if (!subscriberParticipant?.id) {
      throw new BadRequestException(
        'Cannot create a human interaction — this conversation has no resolved subscriber.'
      );
    }

    await assertHumanPendingCap(this.humanInteractionRepository, {
      environmentId: command.environmentId,
      subscriberId: subscriberParticipant.id,
      kind: command.kind,
      errorMessage: (pendingCount, cap) =>
        `Subscriber "${subscriberParticipant.id}" already has ${pendingCount} pending interactions (cap ${cap}).`,
    });

    const interaction = await this.humanInteractionRepository.create(
      buildPendingHumanInteraction({
        kind: command.kind,
        prompt: command.prompt,
        options: command.options,
        from: command.from,
        subscriberId: subscriberParticipant.id,
        agentId: command.conversation._agentId,
        integrationIdentifier: command.integrationIdentifier,
        platform: command.channel.platform,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        ttlSeconds: command.ttlSeconds,
        requestId: command.requestId,
        conversationId: command.conversation._id,
        platformThreadId: command.channel.platformThreadId,
      })
    );

    return deliverHumanInteractionOrRollback(
      this.humanInteractionRepository,
      this.logger,
      interaction,
      async () => {
        const sent = await this.outboundGateway.deliver(
          {
            agentId: command.conversation._agentId,
            integrationIdentifier: command.integrationIdentifier,
            platform: command.channel.platform,
            platformThreadId: command.channel.platformThreadId,
            workspaceId: command.channel.workspace?.id,
          },
          buildPendingContent(interaction),
          {
            conversationId: command.conversation._id,
            channel: command.channel,
            agentIdentifier: command.agentIdentifier,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
          }
        );

        return {
          platformMessageId: sent.messageId,
          platformThreadId: sent.platformThreadId,
          _conversationId: command.conversation._id,
        };
      },
      {
        logMessage: 'Conversation human-interaction delivery failed',
        logContext: { conversationId: command.conversation._id },
        failMessage: (err) =>
          `Failed to deliver human interaction: ${err instanceof Error ? err.message : 'unknown error'}`,
      }
    );
  }
}
