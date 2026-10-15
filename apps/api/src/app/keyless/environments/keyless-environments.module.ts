import { Module } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';

import { AuthModule } from '../../auth/auth.module';
import { ConnectModule } from '../../connect/connect.module';
import { InboxModule } from '../../inbox/inbox.module';
import { SharedModule } from '../../shared/shared.module';
import { KeylessModule } from '../keyless.module';
import { KeylessEnvironmentsController } from './keyless-environments.controller';
import { GetAgentKeylessEnvironment } from './usecases/get-agent-keyless-environment/get-agent-keyless-environment.usecase';
import { GetKeylessClaimSource } from './usecases/get-keyless-claim-source/get-keyless-claim-source.usecase';
import { ProvisionAgentKeylessEnvironment } from './usecases/provision-agent-keyless-environment/provision-agent-keyless-environment.usecase';

@Module({
  imports: [SharedModule, InboxModule, ConnectModule, KeylessModule, AuthModule],
  controllers: [KeylessEnvironmentsController],
  providers: [
    ProvisionAgentKeylessEnvironment,
    GetAgentKeylessEnvironment,
    GetKeylessClaimSource,
    CommunityOrganizationRepository,
  ],
})
export class KeylessEnvironmentsModule {}
