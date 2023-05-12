import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import {
  CacheServiceHealthIndicator,
  DalServiceHealthIndicator,
  InMemoryProviderServiceHealthIndicator,
  TriggerQueueServiceHealthIndicator,
} from '@novu/application-generic';

import { HealthController } from './health.controller';

import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule, TerminusModule],
  controllers: [HealthController],
  providers: [
    CacheServiceHealthIndicator,
    DalServiceHealthIndicator,
    InMemoryProviderServiceHealthIndicator,
    TriggerQueueServiceHealthIndicator,
  ],
})
export class HealthModule {}
