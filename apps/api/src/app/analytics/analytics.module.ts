import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [AnalyticsController],
  providers: [],
})
export class AnalyticsModule {}
