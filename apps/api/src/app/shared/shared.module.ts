import { Module } from '@nestjs/common';
import {
  DalService,
  UserRepository,
  OrganizationRepository,
  EnvironmentRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
  NotificationRepository,
  MessageRepository,
  NotificationGroupRepository,
  MessageTemplateRepository,
  MemberRepository,
  LogRepository,
  IntegrationRepository,
  ChangeRepository,
  JobRepository,
  FeedRepository,
  SubscriberPreferenceRepository,
} from '@novu/dal';
import { AnalyticsService } from './services/analytics/analytics.service';
import { MailService } from './services/mail/mail.service';
import { QueueService } from './services/queue';
import { GCSStorageService, S3StorageService, StorageService } from './services/storage/storage.service';

const DAL_MODELS = [
  UserRepository,
  OrganizationRepository,
  EnvironmentRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
  NotificationRepository,
  MessageRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  MemberRepository,
  LogRepository,
  IntegrationRepository,
  ChangeRepository,
  JobRepository,
  FeedRepository,
  SubscriberPreferenceRepository,
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
  {
    provide: StorageService,
    useClass: process.env.STORAGE_SERVICE === 'GCS' ? GCSStorageService : S3StorageService,
  },
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
