import { Module } from '@nestjs/common';
import {
  analyticsService,
  CreateOrUpdateSubscriberUseCase,
  UpdateSubscriber,
  UpdateSubscriberChannel,
} from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChannelEndpointRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';

import { ChannelEndpointsModule } from '../channel-endpoints/channel-endpoints.module';
import { SharedModule } from '../shared/shared.module';
import { ConfigureTelegramWebhook } from './configure-telegram-webhook/configure-telegram-webhook.usecase';
import { ConsumeTelegramMobileLink } from './consume-telegram-mobile-link/consume-telegram-mobile-link.usecase';
import { GetTelegramMobileLinkStatus } from './get-telegram-mobile-link-status/get-telegram-mobile-link-status.usecase';
import { IssueTelegramMobileLink } from './issue-telegram-mobile-link/issue-telegram-mobile-link.usecase';
import { IssueTelegramSubscriberLink } from './issue-telegram-subscriber-link/issue-telegram-subscriber-link.usecase';
import { LinkTelegramChatToSubscriber } from './link-telegram-chat-to-subscriber/link-telegram-chat-to-subscriber.usecase';
import { TelegramAgentLinkResolver } from './telegram-agent-link.resolver';
import { TelegramMobileLinkTokenService } from './telegram-mobile-link-token.service';
import { TelegramStartCodeService } from './telegram-start-code.service';

const USE_CASES = [
  ConfigureTelegramWebhook,
  ConsumeTelegramMobileLink,
  GetTelegramMobileLinkStatus,
  IssueTelegramMobileLink,
  IssueTelegramSubscriberLink,
  LinkTelegramChatToSubscriber,
];

const SERVICES = [TelegramAgentLinkResolver, TelegramMobileLinkTokenService, TelegramStartCodeService];

const REPOSITORIES = [
  AgentRepository,
  AgentIntegrationRepository,
  IntegrationRepository,
  SubscriberRepository,
  ChannelEndpointRepository,
];

@Module({
  imports: [SharedModule, ChannelEndpointsModule],
  providers: [
    ...USE_CASES,
    ...SERVICES,
    ...REPOSITORIES,
    analyticsService,
    CreateOrUpdateSubscriberUseCase,
    UpdateSubscriber,
    UpdateSubscriberChannel,
  ],
  exports: [...USE_CASES, ...SERVICES],
})
export class TelegramLinkingModule {}
