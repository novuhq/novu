import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ConnectModule } from '../../connect/connect.module';
import { SharedModule } from '../../shared/shared.module';
import { WorkflowModule } from '../../workflows-v2/workflow.module';
import { KeylessClaimController } from './keyless-claim.controller';
import { ClaimKeylessEnvironment } from './usecases/claim-keyless-environment/claim-keyless-environment.usecase';
import { CopyKeylessWorkflows } from './usecases/copy-keyless-workflows/copy-keyless-workflows.usecase';

/** Lives outside `ConnectModule` because `WorkflowModule` already depends on it (via Agents → Keyless). */
@Module({
  imports: [SharedModule, AuthModule, ConnectModule, WorkflowModule],
  controllers: [KeylessClaimController],
  providers: [ClaimKeylessEnvironment, CopyKeylessWorkflows],
})
export class KeylessClaimModule {}
