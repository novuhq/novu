import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AnalyticsController } from './analytics.controller';
import { HubspotIdentifyFormUsecase } from './usecases/hubspot-identify-form/hubspot-identify-form.usecase';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule, HttpModule],
  controllers: [AnalyticsController],
  providers: [HubspotIdentifyFormUsecase],
})
export class AnalyticsModule {}
