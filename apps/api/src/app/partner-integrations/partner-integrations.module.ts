import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { EnvironmentsModule } from '../environments/environments.module';
import { USE_CASES } from './usecases';
import { PartnerIntegrationsController } from './partner-integrations.controller';

@Module({
  imports: [SharedModule, HttpModule, EnvironmentsModule],
  providers: [...USE_CASES],
  controllers: [PartnerIntegrationsController],
})
export class PartnerIntegrationsModule {}
