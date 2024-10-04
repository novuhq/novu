import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import {
  IntegrationRepository,
  NotificationRepository,
  NotificationTemplateRepository,
  OrganizationRepository,
  SubscriberRepository,
  TopicRepository,
  UserRepository,
} from '@novu/dal';
import { SharedModule } from '../shared/shared.module';
import { MachineInfoService } from './usecases/machineInfoService.usecase';
import { UserInfoService } from './usecases/userInfoService.usecase';

const REPOSITORIES = [
  UserRepository,
  NotificationTemplateRepository,
  NotificationRepository,
  OrganizationRepository,
  TopicRepository,
  SubscriberRepository,
  IntegrationRepository,
];

const SERVICES = [MachineInfoService, UserInfoService];

const MODULES = [ScheduleModule.forRoot(), SharedModule, HttpModule];

@Module({
  imports: [...MODULES],
  providers: [...SERVICES, ...REPOSITORIES],
})
export class TelemetryModule {}
