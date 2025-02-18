import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import {
  CreateChange,
  CreateMessageTemplate,
  CreateWorkflow,
  DeleteMessageTemplate,
  DeletePreferencesUseCase,
  DeleteWorkflowUseCase,
  GetPreferences,
  GetWorkflowByIdsUseCase,
  ResourceValidatorService,
  TierRestrictionsValidateUsecase,
  UpdateChange,
  UpdateMessageTemplate,
  UpdateWorkflow,
  UpsertControlValuesUseCase,
  UpsertPreferences,
} from '@novu/application-generic';
import { CommunityOrganizationRepository, PreferencesRepository } from '@novu/dal';
import { SharedModule } from '../shared/shared.module';
import { BridgeController } from './bridge.controller';
import { USECASES } from './usecases';
import { BuildVariableSchemaUsecase } from '../workflows-v2/usecases';
import { ExtractVariables } from '../workflows-v2/usecases/extract-variables/extract-variables.usecase';
import { BuildStepIssuesUsecase } from '../workflows-v2/usecases/build-step-issues/build-step-issues.usecase';

const PROVIDERS = [
  CreateWorkflow,
  UpdateWorkflow,
  GetWorkflowByIdsUseCase,
  DeleteWorkflowUseCase,
  UpsertControlValuesUseCase,
  CreateMessageTemplate,
  UpdateMessageTemplate,
  DeleteMessageTemplate,
  CreateChange,
  UpdateChange,
  PreferencesRepository,
  GetPreferences,
  UpsertPreferences,
  DeletePreferencesUseCase,
  UpsertControlValuesUseCase,
  BuildVariableSchemaUsecase,
  CommunityOrganizationRepository,
  ExtractVariables,
  BuildStepIssuesUsecase,
  ResourceValidatorService,
  TierRestrictionsValidateUsecase,
];

@Module({
  imports: [SharedModule],
  providers: [...PROVIDERS, ...USECASES],
  controllers: [BridgeController],
  exports: [...USECASES],
})
export class BridgeModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {}
}
