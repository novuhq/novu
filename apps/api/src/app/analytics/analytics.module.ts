import { Module } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { HttpModule } from '@nestjs/axios';
import { AnalyticsController } from './analytics.controller';
import { HubspotIdentifyFormUsecase } from './usecases/hubspot-identify-form/hubspot-identify-form.usecase';

@Module({
  imports: [HttpModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, HubspotIdentifyFormUsecase],
})
export class AnalyticsModule {}
