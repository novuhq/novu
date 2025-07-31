import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CommunityOrganizationRepository, CommunityUserRepository } from '@novu/dal';
import { BridgeModule } from '../bridge';
import { EnvironmentsModuleV1 } from '../environments-v1/environments-v1.module';
import { SharedModule } from '../shared/shared.module';
import { PartnerIntegrationsController } from './partner-integrations.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, HttpModule, EnvironmentsModuleV1, BridgeModule],
  providers: [...USE_CASES, CommunityUserRepository, CommunityOrganizationRepository],
  controllers: [PartnerIntegrationsController],
})
export class PartnerIntegrationsModule {}
