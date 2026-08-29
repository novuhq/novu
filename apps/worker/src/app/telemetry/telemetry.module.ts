import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import {
  CommunityOrganizationRepository,
  CommunityUserRepository,
  IntegrationRepository,
  NotificationRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
  TopicRepository,
} from '@novu/dal';
import { SharedModule } from '../shared/shared.module';
import { MachineInfoService } from './usecases/machineInfoService.usecase';
import { UserInfoService } from './usecases/userInfoService.usecase';

const REPOSITORIES = [
  CommunityUserRepository,
  CommunityOrganizationRepository,
  NotificationTemplateRepository,
  NotificationRepository,
  TopicRepository,
  SubscriberRepository,
  IntegrationRepository,
];

const SERVICES = [MachineInfoService, UserInfoService];

const TELEMETRY_TIMEOUT_MS = 10_000;

const MODULES = [
  ScheduleModule.forRoot(),
  SharedModule,
  HttpModule.register({ timeout: TELEMETRY_TIMEOUT_MS }),
];

@Module({
  imports: [...MODULES],
  providers: [...SERVICES, ...REPOSITORIES],
})
export class TelemetryModule {}
