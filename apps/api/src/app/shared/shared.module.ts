import { Module } from '@nestjs/common';
import {
  DalService,
  UserRepository,
  OrganizationRepository,
  ApplicationRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
  NotificationRepository,
  MessageRepository,
  NotificationGroupRepository,
  MessageTemplateRepository,
  MemberRepository,
  LogRepository,
  IntegrationRepository,
} from '@notifire/dal';
import { AnalyticsService } from './services/analytics/analytics.service';
import { MailService } from './services/mail/mail.service';
import { QueueService } from './services/queue';
import { StorageService } from './services/storage/storage.service';

const DAL_MODELS = [
  UserRepository,
  OrganizationRepository,
  ApplicationRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
  NotificationRepository,
  MessageRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  MemberRepository,
  LogRepository,
  IntegrationRepository,
];

const dalService = new DalService();

export const ANALYTICS_SERVICE = 'AnalyticsService';

const PROVIDERS = [
  {
    provide: QueueService,
    useFactory: () => {
      return new QueueService();
    },
  },
  {
    provide: DalService,
    useFactory: async () => {
      await dalService.connect(process.env.MONGO_URL);

      return dalService;
    },
  },
  ...DAL_MODELS,
  StorageService,
  {
    provide: ANALYTICS_SERVICE,
    useFactory: async () => {
      const analyticsService = new AnalyticsService();

      await analyticsService.initialize();

      return analyticsService;
    },
  },
  MailService,
];

@Module({
  imports: [],
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class SharedModule {}
