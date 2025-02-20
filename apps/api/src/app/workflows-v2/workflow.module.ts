import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import {
  CreateWorkflow,
  DeletePreferencesUseCase,
  DeleteWorkflowUseCase,
  GetPreferences,
  GetWorkflowByIdsUseCase,
  ResourceValidatorService,
  TierRestrictionsValidateUsecase,
  UpdateWorkflow,
  UpsertControlValuesUseCase,
  UpsertPreferences,
} from '@novu/application-generic';

import { CommunityOrganizationRepository } from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { BridgeModule } from '../bridge';
import { ChangeModule } from '../change/change.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { MessageTemplateModule } from '../message-template/message-template.module';
import { SharedModule } from '../shared/shared.module';
import {
  BuildStepDataUsecase,
  BuildVariableSchemaUsecase,
  BuildWorkflowTestDataUseCase,
  GeneratePreviewUsecase,
  GetWorkflowUseCase,
  ListWorkflowsUseCase,
  SyncToEnvironmentUseCase,
  UpsertWorkflowUseCase,
} from './usecases';
import { PatchWorkflowUsecase } from './usecases/patch-workflow';
import { PatchStepUsecase } from './usecases/patch-step-data';
import { ExtractVariables } from './usecases/extract-variables/extract-variables.usecase';
import { BuildStepIssuesUsecase } from './usecases/build-step-issues/build-step-issues.usecase';
import { WorkflowController } from './workflow.controller';

const DAL_REPOSITORIES = [CommunityOrganizationRepository];

@Module({
  imports: [SharedModule, MessageTemplateModule, ChangeModule, AuthModule, BridgeModule, IntegrationModule],
  controllers: [WorkflowController],
  providers: [
    ...DAL_REPOSITORIES,
    CreateWorkflow,
    UpdateWorkflow,
    UpsertWorkflowUseCase,
    ListWorkflowsUseCase,
    DeleteWorkflowUseCase,
    UpsertPreferences,
    DeletePreferencesUseCase,
    UpsertControlValuesUseCase,
    GetPreferences,
    GetWorkflowByIdsUseCase,
    SyncToEnvironmentUseCase,
    BuildStepDataUsecase,
    GeneratePreviewUsecase,
    BuildWorkflowTestDataUseCase,
    GetWorkflowUseCase,
    BuildVariableSchemaUsecase,
    PatchStepUsecase,
    PatchWorkflowUsecase,
    ExtractVariables,
    BuildStepIssuesUsecase,
    ResourceValidatorService,
    TierRestrictionsValidateUsecase,
  ],
})
export class WorkflowModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}
