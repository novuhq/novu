import { Module } from '@nestjs/common';
import { MachineInfoService } from './usecases/machineInfoService.usecase';
import { ScheduleModule } from '@nestjs/schedule';
import { UserInfoService } from './usecases/userInfoService.usecase';
import { SharedModule } from '../shared/shared.module';
import {
  IntegrationRepository,
  NotificationRepository,
  NotificationTemplateRepository,
  OrganizationRepository,
  SubscriberRepository,
  TopicRepository,
  UserRepository,
} from '@novu/dal';
import { HttpModule } from '@nestjs/axios';

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
