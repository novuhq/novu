import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import {
  MessageTemplateRepository,
  NotificationTemplateRepository,
  EnvironmentRepository,
  NotificationGroupRepository,
  FeedRepository,
  LayoutRepository,
  ChangeRepository,
  MessageRepository,
} from '@novu/dal';
import { ControlVariablesRepository } from '@novu/dal';
import {
  AnalyticsService,
  cacheService,
  CreateChange,
  CreateMessageTemplate,
  CreateWorkflow,
  DeleteMessageTemplate,
  ExecuteBridgeRequest,
  InvalidateCacheService,
  UpdateChange,
  UpdateMessageTemplate,
  UpdateWorkflow,
} from '@novu/application-generic';

import { BridgeController } from './bridge.controller';
import { USECASES } from './usecases';

const DAL = [
  LayoutRepository,
  NotificationGroupRepository,
  MessageTemplateRepository,
  NotificationTemplateRepository,
  EnvironmentRepository,
  ControlVariablesRepository,
  FeedRepository,
  ChangeRepository,
  MessageRepository,
];

export const analyticsService = {
  provide: AnalyticsService,
  useFactory: async () => {
    const service = new AnalyticsService(process.env.SEGMENT_TOKEN);
    await service.initialize();

    return service;
  },
};

const SERVICES = [
  CreateWorkflow,
  UpdateWorkflow,
  CreateMessageTemplate,
  UpdateMessageTemplate,
  DeleteMessageTemplate,
  CreateChange,
  UpdateChange,
  DeleteMessageTemplate,
  analyticsService,
  cacheService,
  InvalidateCacheService,
  ExecuteBridgeRequest,
];

const PROVIDERS = [...DAL, ...SERVICES, ...USECASES];

@Module({
  providers: [...PROVIDERS],
  controllers: [BridgeController],
  exports: [...USECASES],
})
export class BridgeModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {}
}
