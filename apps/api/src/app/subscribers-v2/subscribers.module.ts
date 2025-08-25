import { Module } from '@nestjs/common';
import {
  analyticsService,
  CacheInMemoryProviderService,
  CalculateLimitNovuIntegration,
  CreateOrUpdateSubscriberUseCase,
  cacheService,
  featureFlagsService,
  GetNovuProviderCredentials,
  GetPreferences,
  GetSubscriberTemplatePreference,
  GetWorkflowByIdsUseCase,
  InvalidateCacheService,
  UpdateSubscriber,
  UpdateSubscriberChannel,
  UpsertPreferences,
} from '@novu/application-generic';
import {
  ChannelEndpointRepository,
  CommunityOrganizationRepository,
  EnvironmentRepository,
  IntegrationRepository,
  MessageRepository,
  MessageTemplateRepository,
  NotificationTemplateRepository,
  PreferencesRepository,
  SubscriberRepository,
  TenantRepository,
  TopicSubscribersRepository,
  WorkflowOverrideRepository,
} from '@novu/dal';
import { ChannelEndpointsModule } from '../channel-endpoints/channel-endpoints.module';
import { InboxModule } from '../inbox/inbox.module';
import { UpdatePreferences } from '../inbox/usecases/update-preferences/update-preferences.usecase';
import { OutboundWebhooksModule } from '../outbound-webhooks/outbound-webhooks.module';
import { GetSubscriberGlobalPreference } from '../subscribers/usecases/get-subscriber-global-preference';
import { GetSubscriberPreference } from '../subscribers/usecases/get-subscriber-preference';
import { TopicsV2Module } from '../topics-v2/topics-v2.module';
import { SubscribersController } from './subscribers.controller';
import { ChatOauthCallback } from './usecases/chat-oauth-callback/chat-oauth-callback.usecase';
import { SlackOauthCallback } from './usecases/chat-oauth-callback/slack-oauth-callback/slack-oauth-callback.usecase';
import { GenerateChatOauthUrl } from './usecases/generate-chat-oath-url/generate-chat-oauth-url.usecase';
import { GenerateSlackOauthUrl } from './usecases/generate-chat-oath-url/generate-slack-oath-url/generate-slack-oauth-url.usecase';
import { GetSubscriber } from './usecases/get-subscriber/get-subscriber.usecase';
import { GetSubscriberPreferences } from './usecases/get-subscriber-preferences/get-subscriber-preferences.usecase';
import { ListSubscribersUseCase } from './usecases/list-subscribers/list-subscribers.usecase';
import { PatchSubscriber } from './usecases/patch-subscriber/patch-subscriber.usecase';
import { RemoveSubscriber } from './usecases/remove-subscriber/remove-subscriber.usecase';
import { UpdateSubscriberPreferences } from './usecases/update-subscriber-preferences/update-subscriber-preferences.usecase';

const USE_CASES = [
  ListSubscribersUseCase,
  UpdateSubscriber,
  UpdateSubscriberChannel,
  IntegrationRepository,
  CreateOrUpdateSubscriberUseCase,
  UpdateSubscriber,
  CacheInMemoryProviderService,
  GetSubscriber,
  PatchSubscriber,
  RemoveSubscriber,
  GetSubscriberPreferences,
  GetSubscriberGlobalPreference,
  GetSubscriberPreference,
  GetPreferences,
  UpdateSubscriberPreferences,
  UpdatePreferences,
  GetSubscriberTemplatePreference,
  UpsertPreferences,
  GetWorkflowByIdsUseCase,
  ChatOauthCallback,
  SlackOauthCallback,
  GenerateSlackOauthUrl,
  GenerateChatOauthUrl,
];

const DAL_MODELS = [
  SubscriberRepository,
  NotificationTemplateRepository,
  PreferencesRepository,
  TopicSubscribersRepository,
  MessageTemplateRepository,
  WorkflowOverrideRepository,
  TenantRepository,
  MessageRepository,
  ChannelEndpointRepository,
];

@Module({
  imports: [TopicsV2Module, InboxModule, OutboundWebhooksModule.forRoot(), ChannelEndpointsModule],
  controllers: [SubscribersController],
  providers: [
    ...USE_CASES,
    ...DAL_MODELS,
    cacheService,
    InvalidateCacheService,
    analyticsService,
    CommunityOrganizationRepository,
    featureFlagsService,
    EnvironmentRepository,
    GetNovuProviderCredentials,
    CalculateLimitNovuIntegration,
  ],
})
export class SubscribersModule {}
