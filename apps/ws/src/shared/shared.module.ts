import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  DalService,
  UserRepository,
  OrganizationRepository,
  EnvironmentRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
  NotificationRepository,
  MessageRepository,
  MemberRepository,
} from '@novu/dal';
import {
  AnalyticsService,
  DalServiceHealthIndicator,
  WebSocketsInMemoryProviderService,
  QueuesModule,
  injectCommunityAuthProviders,
} from '@novu/application-generic';

import { SubscriberOnlineService } from './subscriber-online';
import { JobTopicNameEnum, isClerkEnabled } from '@novu/shared';

function getDynamicAuthProviders() {
  if (isClerkEnabled()) {
    const eeAuthPackage = require('@novu/ee-auth');

    return eeAuthPackage.injectEEAuthProviders();
  } else {
    return injectCommunityAuthProviders();
  }
}

const DAL_MODELS = [
  UserRepository,
  OrganizationRepository,
  EnvironmentRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
  NotificationRepository,
  MessageRepository,
  MemberRepository,
  ...getDynamicAuthProviders(),
];

const dalService = {
  provide: DalService,
  useFactory: async () => {
    const service = new DalService();
    await service.connect(String(process.env.MONGO_URL));

    return service;
  },
};

const analyticsService = {
  provide: AnalyticsService,
  useFactory: async () => {
    const service = new AnalyticsService(process.env.SEGMENT_TOKEN, 500);
    await service.initialize();

    return service;
  },
};

const PROVIDERS = [
  analyticsService,
  dalService,
  DalServiceHealthIndicator,
  SubscriberOnlineService,
  WebSocketsInMemoryProviderService,
  ...DAL_MODELS,
];

@Module({
  imports: [
    QueuesModule.forRoot([JobTopicNameEnum.WEB_SOCKETS]),
    JwtModule.register({
      secretOrKeyProvider: () => process.env.JWT_SECRET as string,
      signOptions: {
        expiresIn: 360000,
      },
    }),
  ],
  providers: [...PROVIDERS],
  exports: [...PROVIDERS, JwtModule, QueuesModule],
})
export class SharedModule {}
