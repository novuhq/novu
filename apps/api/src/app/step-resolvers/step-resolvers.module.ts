import { Module } from '@nestjs/common';
import { GetWorkflowByIdsUseCase } from '@novu/application-generic';
import { SharedModule } from '../shared/shared.module';
import { CloudflareStepResolverDeployService } from './services/cloudflare-step-resolver-deploy.service';
import { StepResolversController } from './step-resolvers.controller';
import { DeployStepResolverUsecase } from './usecases/deploy-step-resolver';
import { DisconnectStepResolverUsecase } from './usecases/disconnect-step-resolver';

const USE_CASES = [DeployStepResolverUsecase, DisconnectStepResolverUsecase];
const SERVICES = [CloudflareStepResolverDeployService];

@Module({
  imports: [SharedModule],
  controllers: [StepResolversController],
  providers: [...USE_CASES, ...SERVICES, GetWorkflowByIdsUseCase],
  exports: [...USE_CASES],
})
export class StepResolversModule {}
