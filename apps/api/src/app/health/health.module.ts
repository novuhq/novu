import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { HealthController } from './health.controller';
import { CacheServiceHealthIndicator } from './cache-health-indicator';

@Module({
  imports: [SharedModule, TerminusModule],
  controllers: [HealthController],
  providers: [CacheServiceHealthIndicator],
})
export class HealthModule {}
