import { Module } from '@nestjs/common';
import {
  CommunityOrganizationRepository,
  ContextRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
  TopicRepository,
  TopicSubscribersRepository,
} from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { OrganizationModule } from '../organization/organization.module';
import { OutboundWebhooksModule } from '../outbound-webhooks/outbound-webhooks.module';
import { PreferencesModule } from '../preferences';
import { SharedModule } from '../shared/shared.module';
import { SubscribersV1Module } from '../subscribers/subscribersV1.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CreateSubscriptionsUsecase } from '../subscriptions/usecases/create-subscriptions/create-subscriptions.usecase';
import { UpdateSubscriptionUsecase } from '../subscriptions/usecases/update-subscription/update-subscription.usecase';
import { TopicsV2Module } from '../topics-v2/topics-v2.module';
import { UpsertTopicUseCase } from '../topics-v2/usecases/upsert-topic/upsert-topic.usecase';
import { InboxController } from './inbox.controller';
import { InboxTopicController } from './inbox.topic.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [
    SharedModule,
    SubscribersV1Module,
    AuthModule,
    IntegrationModule,
    PreferencesModule,
    OrganizationModule,
    OutboundWebhooksModule.forRoot(),
    TopicsV2Module,
    SubscriptionsModule,
  ],
  providers: [
    ...USE_CASES,
    CommunityOrganizationRepository,
    ContextRepository,
    TopicRepository,
    TopicSubscribersRepository,
    NotificationTemplateRepository,
    SubscriberRepository,
    UpsertTopicUseCase,
    CreateSubscriptionsUsecase,
    UpdateSubscriptionUsecase,
  ],
  exports: [...USE_CASES],
  controllers: [InboxController, InboxTopicController],
})
export class InboxModule {}
