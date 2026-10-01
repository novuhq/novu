import { forwardRef, Module } from '@nestjs/common';
import {
  AgentIntegrationRepository,
  ChannelEndpointRepository,
  HumanContactRepository,
  HumanInteractionRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { AgentsModule } from '../agents/agents.module';
import { AuthModule } from '../auth/auth.module';
import { ConnectModule } from '../connect/connect.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { SharedModule } from '../shared/shared.module';
import { TelegramLinkingModule } from '../telegram-linking/telegram-linking.module';
import { HumanInteractionsController } from './human-interactions.controller';
import { HumanInvitesPublicController } from './human-invites-public.controller';
import { HumanDeliveryService } from './services/human-delivery.service';
import { HumanInviteTokenService } from './services/human-invite-token.service';
import { CancelInteraction } from './usecases/cancel-interaction/cancel-interaction.usecase';
import { ConnectHumanInviteChannel } from './usecases/connect-human-invite-channel/connect-human-invite-channel.usecase';
import { CreateHumanInvite } from './usecases/create-human-invite/create-human-invite.usecase';
import { CreateInteraction } from './usecases/create-interaction/create-interaction.usecase';
import { DeclineHumanInvite } from './usecases/decline-human-invite/decline-human-invite.usecase';
import { GetHumanInviteStatus } from './usecases/get-human-invite-status/get-human-invite-status.usecase';
import { GetInteraction } from './usecases/get-interaction/get-interaction.usecase';
import { ListContacts } from './usecases/list-contacts/list-contacts.usecase';
import { ListInteractions } from './usecases/list-interactions/list-interactions.usecase';
import { SetHumanInviteDefault } from './usecases/set-human-invite-default/set-human-invite-default.usecase';
import { SetupHumanRelay } from './usecases/setup-human-relay/setup-human-relay.usecase';

/**
 * The human-in-the-loop interaction API. State lives here.
 * `POST /v1/human/interactions` DMs the named agent (default `human-relay`).
 * Framework `ctx.*` helpers create in-thread cards via `CreateConversationInteraction`.
 */
@Module({
  imports: [
    SharedModule,
    AuthModule,
    AgentsModule,
    ConnectModule,
    TelegramLinkingModule,
    forwardRef(() => IntegrationModule),
  ],
  controllers: [HumanInteractionsController, HumanInvitesPublicController],
  providers: [
    HumanInteractionRepository,
    HumanContactRepository,
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
    HumanInviteTokenService,
    CreateHumanInvite,
    GetHumanInviteStatus,
    ConnectHumanInviteChannel,
    SetHumanInviteDefault,
    DeclineHumanInvite,
  ],
})
export class HumanModule {}
