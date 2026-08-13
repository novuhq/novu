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
import { ListInteractions } from './usecases/list-interactions/list-interactions.usecase';
import { SetupHumanRelay } from './usecases/setup-human-relay/setup-human-relay.usecase';

/**
 * The human-in-the-loop interaction API behind the `@novu/human` CLI. State
 * (interactions) lives here; delivery and inbound resolution ride the agents
 * conversation-runtime through the hidden `human_relay` system agent.
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
  ],
})
export class HumanModule {}
