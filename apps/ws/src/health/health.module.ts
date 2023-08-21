import { Module } from '@nestjs/common';
import { DalServiceHealthIndicator, WsQueueService, WsQueueServiceHealthIndicator } from '@novu/application-generic';
import { HealthController } from './health.controller';
import { SharedModule } from '../shared/shared.module';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [TerminusModule, SharedModule],
  controllers: [HealthController],
  providers: [DalServiceHealthIndicator, WsQueueServiceHealthIndicator, WsQueueService],
})
export class HealthModule {}
