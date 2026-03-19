import { Module } from '@nestjs/common';
import {
  BuildStepIssuesUsecase,
  BuildVariableSchemaUsecase,
  CreateVariablesObject,
  DisconnectStepResolverUsecase,
  GetWorkflowByIdsUseCase,
  TierRestrictionsValidateUsecase,
} from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import { SharedModule } from '../shared/shared.module';
import { CloudflareStepResolverDeployService } from './services/cloudflare-step-resolver-deploy.service';
import { StepResolversController } from './step-resolvers.controller';
import { DeployStepResolverUsecase } from './usecases/deploy-step-resolver';
import { SyncStepResolverToEnvironmentUsecase } from './usecases/sync-step-resolver-to-environment';

const USE_CASES = [DeployStepResolverUsecase, DisconnectStepResolverUsecase, SyncStepResolverToEnvironmentUsecase];
const SERVICES = [CloudflareStepResolverDeployService];

@Module({
  imports: [SharedModule],
  controllers: [StepResolversController],
  providers: [
    ...USE_CASES,
    ...SERVICES,
    GetWorkflowByIdsUseCase,
    BuildStepIssuesUsecase,
    BuildVariableSchemaUsecase,
    TierRestrictionsValidateUsecase,
    CreateVariablesObject,
    CommunityOrganizationRepository,
  ],
  exports: [...USE_CASES],
})
export class StepResolversModule {}
