import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { SharedModule } from '../shared/shared.module';
import { AnalyticsService } from '@novu/application-generic';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
