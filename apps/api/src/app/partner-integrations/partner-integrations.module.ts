import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CommunityOrganizationRepository, CommunityUserRepository } from '@novu/dal';
import { AgentsModule } from '../agents/agents.module';
import { BridgeModule } from '../bridge';
import { EnvironmentsModuleV1 } from '../environments-v1/environments-v1.module';
import { SharedModule } from '../shared/shared.module';
import { PartnerIntegrationsController } from './partner-integrations.controller';
import { VercelBridgeSyncService } from './services/vercel-bridge-sync.service';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, HttpModule, EnvironmentsModuleV1, BridgeModule, AgentsModule],
  providers: [...USE_CASES, VercelBridgeSyncService, CommunityUserRepository, CommunityOrganizationRepository],
  controllers: [PartnerIntegrationsController],
})
export class PartnerIntegrationsModule {}
