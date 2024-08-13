import { Module } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { DalService, ExecutionDetailsRepository, MessageRepository, IntegrationRepository } from '@novu/dal';

const DAL_MODELS = [ExecutionDetailsRepository, MessageRepository, IntegrationRepository];

const dalService = new DalService();

const PROVIDERS = [
  {
    provide: DalService,
    useFactory: async () => {
      await dalService.connect(process.env.MONGO_URL);

      return dalService;
    },
  },
  ...DAL_MODELS,
  {
    provide: AnalyticsService,
    useFactory: async () => {
      const analyticsService = new AnalyticsService(process.env.SEGMENT_TOKEN);

      await analyticsService.initialize();

      return analyticsService;
    },
  },
];

@Module({
  imports: [],
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class SharedModule {}
