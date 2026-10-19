import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DalServiceHealthIndicator } from '@novu/application-generic';
import { SharedModule } from '../shared/shared.module';
import { HealthController } from './health.controller';

@Module({
  imports: [SharedModule, TerminusModule],
  controllers: [HealthController],
  providers: [DalServiceHealthIndicator],
})
export class HealthModule {}
