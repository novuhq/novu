import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { SharedModule } from '../shared/shared.module';
import { AnalyticsService } from '@novu/application-generic';

@Module({
  imports: [SharedModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
