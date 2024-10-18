import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CommunityUserRepository, CommunityOrganizationRepository } from '@novu/dal';
import { USE_CASES } from './usecases';
import { PartnerIntegrationsController } from './partner-integrations.controller';
import { SharedModule } from '../shared/shared.module';
import { EnvironmentsModuleV1 } from '../environments-v1/environments-v1.module';
import { BridgeModule } from '../bridge';

@Module({
  imports: [SharedModule, HttpModule, EnvironmentsModuleV1, BridgeModule],
  providers: [...USE_CASES, CommunityUserRepository, CommunityOrganizationRepository],
  controllers: [PartnerIntegrationsController],
})
export class PartnerIntegrationsModule {}
