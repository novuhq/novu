import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, shortId } from '@novu/application-generic';
import { type InteractionResponseDto, toInteractionResponse } from '../../dtos/interaction-response.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { CreateConversationInteractionCommand } from '../create-conversation-interaction/create-conversation-interaction.command';
import { CreateConversationInteraction } from '../create-conversation-interaction/create-conversation-interaction.usecase';
import { CreateInboxInteractionCommand } from './create-inbox-interaction.command';

/**
 * Posts an ask / approve / choose / tell card into the thread instead of a fresh DM. The answer
 * settles it like any other interaction, so `human wait <id>` works unchanged.
 */
@Injectable()
export class CreateInboxInteraction {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly createConversationInteraction: CreateConversationInteraction
  ) {}

  @InstrumentUsecase()
  async execute(command: CreateInboxInteractionCommand): Promise<InteractionResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);
    const conversation = await this.inbox.findThread(scope, agent, command.identifier);
    const channel = this.inbox.primaryChannel(conversation);
    const integrationIdentifier = await this.inbox.resolveIntegrationIdentifier(scope, channel);

    const interaction = await this.createConversationInteraction.execute(
      CreateConversationInteractionCommand.create({
        ...scope,
        userId: command.userId,
        conversation,
        channel,
        agentIdentifier: agent.identifier,
        agentName: agent.name,
        integrationIdentifier,
        kind: command.kind,
        requestId: `inbox_${shortId(12)}`,
        card: command.card,
        from: command.from,
        ttlSeconds: command.ttlSeconds,
      })
    );

    await this.inbox.markRead(scope, conversation);

    return toInteractionResponse(interaction);
  }
}
