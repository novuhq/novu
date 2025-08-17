import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AnalyticsController } from './analytics.controller';
import { HubspotIdentifyFormUsecase } from './usecases/hubspot-identify-form/hubspot-identify-form.usecase';

@Module({
  imports: [SharedModule, HttpModule],
  controllers: [AnalyticsController],
  providers: [HubspotIdentifyFormUsecase],
})
export class AnalyticsModule {}
