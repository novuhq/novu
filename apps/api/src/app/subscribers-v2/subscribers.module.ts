import { Module } from '@nestjs/common';
import {
  MessageTemplateRepository,
  NotificationTemplateRepository,
  PreferencesRepository,
  SubscriberRepository,
  TenantRepository,
  TopicSubscribersRepository,
  WorkflowOverrideRepository,
} from '@novu/dal';
import {
  analyticsService,
  cacheService,
  GetPreferences,
  GetSubscriberGlobalPreference,
  GetSubscriberPreference,
  GetSubscriberTemplatePreference,
  InvalidateCacheService,
  UpsertPreferences,
} from '@novu/application-generic';
import { ListSubscribersUseCase } from './usecases/list-subscribers/list-subscribers.usecase';
import { GetSubscriber } from './usecases/get-subscriber/get-subscriber.usecase';
import { PatchSubscriber } from './usecases/patch-subscriber/patch-subscriber.usecase';
import { GetSubscriberPreferences } from './usecases/get-subscriber-preferences/get-subscriber-preferences.usecase';
import { RemoveSubscriber } from './usecases/remove-subscriber/remove-subscriber.usecase';
import { SubscribersController } from './subscribers.controller';
import { UpdateSubscriberPreferences } from './usecases/update-subscriber-preferences/update-subscriber-preferences.usecase';
import { UpdatePreferences } from '../inbox/usecases/update-preferences/update-preferences.usecase';

const USE_CASES = [
  ListSubscribersUseCase,
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
];

const DAL_MODELS = [
  SubscriberRepository,
  NotificationTemplateRepository,
  PreferencesRepository,
  TopicSubscribersRepository,
  MessageTemplateRepository,
  WorkflowOverrideRepository,
  TenantRepository,
];

@Module({
  controllers: [SubscribersController],
  providers: [...USE_CASES, ...DAL_MODELS, cacheService, InvalidateCacheService, analyticsService],
})
export class SubscribersModule {}
