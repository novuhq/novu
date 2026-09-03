import { Module } from '@nestjs/common';
import {
  AgentIntegrationRepository,
  ChannelEndpointRepository,
  HumanInteractionRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { AgentsModule } from '../agents/agents.module';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { HumanInteractionsController } from './human-interactions.controller';
import { HumanDeliveryService } from './services/human-delivery.service';
import { CancelInteraction } from './usecases/cancel-interaction/cancel-interaction.usecase';
import { CreateInteraction } from './usecases/create-interaction/create-interaction.usecase';
import { GetInteraction } from './usecases/get-interaction/get-interaction.usecase';
import { ListContacts } from './usecases/list-contacts/list-contacts.usecase';
import { ListInteractions } from './usecases/list-interactions/list-interactions.usecase';
import { SetupHumanRelay } from './usecases/setup-human-relay/setup-human-relay.usecase';

/**
 * The human-in-the-loop interaction API. State lives here.
 * `POST /v1/human/interactions` DMs the named agent (default `human-relay`).
 * Framework `ctx.*` helpers create in-thread cards via `CreateConversationInteraction`.
 */
@Module({
  imports: [SharedModule, AuthModule, AgentsModule],
  controllers: [HumanInteractionsController],
  providers: [
    HumanInteractionRepository,
    AgentIntegrationRepository,
    ChannelEndpointRepository,
    IntegrationRepository,
    SubscriberRepository,
    HumanDeliveryService,
    CreateInteraction,
    GetInteraction,
    ListInteractions,
    CancelInteraction,
    SetupHumanRelay,
    ListContacts,
  ],
})
export class HumanModule {}
