import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [SharedModule],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
