import { forwardRef, Module } from '@nestjs/common';
import {
  AgentIntegrationRepository,
  AgentMcpServerRepository,
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  ConversationActivityRepository,
  ConversationRepository,
  HumanContactRepository,
  HumanInteractionRepository,
  IntegrationRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import { AgentsModule } from '../agents/agents.module';
import { AuthModule } from '../auth/auth.module';
import { CliAuthModule } from '../cli-auth/cli-auth.module';
import { ConnectModule } from '../connect/connect.module';
import { GenerateUniqueApiKey } from '../environments-v1/usecases/generate-unique-api-key/generate-unique-api-key.usecase';
import { RegenerateApiKeys } from '../environments-v1/usecases/regenerate-api-keys/regenerate-api-keys.usecase';
import { IntegrationModule } from '../integrations/integrations.module';
import { SharedModule } from '../shared/shared.module';
import { RemoveSubscriber } from '../subscribers-v2/usecases/remove-subscriber/remove-subscriber.usecase';
import { TelegramLinkingModule } from '../telegram-linking/telegram-linking.module';
import { HumanDashboardSecretGuard } from './guards/human-dashboard-secret.guard';
import { HumanAccountsController } from './human-accounts.controller';
import { HumanAgentPicturesPublicController } from './human-agent-pictures-public.controller';
import { HumanInboxController } from './human-inbox.controller';
import { HumanInteractionsController } from './human-interactions.controller';
import { HumanInvitesPublicController } from './human-invites-public.controller';
import { HumanAccountAgentService } from './services/human-account-agent.service';
import { HumanAgentIdentityService } from './services/human-agent-identity.service';
import { HumanAgentPictureService } from './services/human-agent-picture.service';
import { HumanBackingAccounts } from './services/human-backing-accounts.service';
import { HumanDeliveryService } from './services/human-delivery.service';
import { HumanInboxService } from './services/human-inbox.service';
import { HumanInviteTokenService } from './services/human-invite-token.service';
import { HumanKeylessCapService } from './services/human-keyless-cap.service';
import { HumanOperatorService } from './services/human-operator.service';
import { ApproveHumanCliLogin } from './usecases/approve-human-cli-login/approve-human-cli-login.usecase';
import { CancelInteraction } from './usecases/cancel-interaction/cancel-interaction.usecase';
import { ClaimForHumanAccount } from './usecases/claim-for-human-account/claim-for-human-account.usecase';
import { ConnectHumanInviteChannel } from './usecases/connect-human-invite-channel/connect-human-invite-channel.usecase';
import { CreateHumanInvite } from './usecases/create-human-invite/create-human-invite.usecase';
import { CreateInboxInteraction } from './usecases/create-inbox-interaction/create-inbox-interaction.usecase';
import { CreateInteraction } from './usecases/create-interaction/create-interaction.usecase';
import { DeclineHumanInvite } from './usecases/decline-human-invite/decline-human-invite.usecase';
import { DeleteHumanAccount } from './usecases/delete-human-account/delete-human-account.usecase';
import { DenyHumanCliLogin } from './usecases/deny-human-cli-login/deny-human-cli-login.usecase';
import { EnsureBackingOrganization } from './usecases/ensure-backing-organization/ensure-backing-organization.usecase';
import { GetBackingSecretKey } from './usecases/get-backing-secret-key/get-backing-secret-key.usecase';
import { GetHumanCliLogin } from './usecases/get-human-cli-login/get-human-cli-login.usecase';
import { GetHumanInviteStatus } from './usecases/get-human-invite-status/get-human-invite-status.usecase';
import { GetInboxThread } from './usecases/get-inbox-thread/get-inbox-thread.usecase';
import { GetInteraction } from './usecases/get-interaction/get-interaction.usecase';
import { GetKeylessClaimToken } from './usecases/get-keyless-claim-token/get-keyless-claim-token.usecase';
import { ListContacts } from './usecases/list-contacts/list-contacts.usecase';
import { ListInboxThreads } from './usecases/list-inbox-threads/list-inbox-threads.usecase';
import { ListInteractions } from './usecases/list-interactions/list-interactions.usecase';
import { MarkInboxRead } from './usecases/mark-inbox-read/mark-inbox-read.usecase';
import { RegenerateBackingSecretKey } from './usecases/regenerate-backing-secret-key/regenerate-backing-secret-key.usecase';
import { RemoveContact } from './usecases/remove-contact/remove-contact.usecase';
import { ReplyInboxThread } from './usecases/reply-inbox-thread/reply-inbox-thread.usecase';
import { ResolveInboxThread } from './usecases/resolve-inbox-thread/resolve-inbox-thread.usecase';
import { SetHumanInviteDefault } from './usecases/set-human-invite-default/set-human-invite-default.usecase';
import { SetupHumanRelay } from './usecases/setup-human-relay/setup-human-relay.usecase';
import { UpdateHumanAgent } from './usecases/update-human-agent/update-human-agent.usecase';

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
    CliAuthModule,
    ConnectModule,
    TelegramLinkingModule,
    forwardRef(() => IntegrationModule),
  ],
  controllers: [
    HumanInteractionsController,
    HumanInboxController,
    HumanInvitesPublicController,
    HumanAgentPicturesPublicController,
    HumanAccountsController,
  ],
  providers: [
    HumanInteractionRepository,
    HumanContactRepository,
    AgentIntegrationRepository,
    ChannelConnectionRepository,
    ChannelEndpointRepository,
    IntegrationRepository,
    SubscriberRepository,
    ConversationRepository,
    ConversationActivityRepository,
    AgentMcpServerRepository,
    McpConnectionRepository,
    HumanDeliveryService,
    HumanKeylessCapService,
    CreateInteraction,
    GetInteraction,
    ListInteractions,
    CancelInteraction,
    SetupHumanRelay,
    UpdateHumanAgent,
    ListContacts,
    RemoveContact,
    RemoveSubscriber,
    HumanInviteTokenService,
    HumanOperatorService,
    HumanAgentIdentityService,
    HumanAgentPictureService,
    HumanAccountAgentService,
    CreateHumanInvite,
    GetHumanInviteStatus,
    ConnectHumanInviteChannel,
    SetHumanInviteDefault,
    DeclineHumanInvite,
    HumanBackingAccounts,
    HumanDashboardSecretGuard,
    EnsureBackingOrganization,
    ClaimForHumanAccount,
    GetBackingSecretKey,
    GenerateUniqueApiKey,
    RegenerateApiKeys,
    RegenerateBackingSecretKey,
    DeleteHumanAccount,
    ApproveHumanCliLogin,
    GetHumanCliLogin,
    DenyHumanCliLogin,
    GetKeylessClaimToken,
    HumanInboxService,
    ListInboxThreads,
    GetInboxThread,
    MarkInboxRead,
    ResolveInboxThread,
    ReplyInboxThread,
    CreateInboxInteraction,
  ],
})
export class HumanModule {}
