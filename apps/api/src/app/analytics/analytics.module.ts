import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [SharedModule, AuthModule, HttpModule],
  controllers: [AnalyticsController],
  providers: [],
})
export class AnalyticsModule {}
