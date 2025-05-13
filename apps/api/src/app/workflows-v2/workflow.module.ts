import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import {
  CreateWorkflow,
  DeletePreferencesUseCase,
  DeleteWorkflowUseCase,
  GetPreferences,
  GetWorkflowByIdsUseCase,
  GetWorkflowWithPreferencesUseCase,
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
  PreviewUsecase,
  GetWorkflowUseCase,
  ListWorkflowsUseCase,
  SyncToEnvironmentUseCase,
  UpsertWorkflowUseCase,
} from './usecases';
import { PatchWorkflowUsecase } from './usecases/patch-workflow';
import { CreateVariablesObject } from './usecases/create-variables-object/create-variables-object.usecase';
import { BuildStepIssuesUsecase } from './usecases/build-step-issues/build-step-issues.usecase';
import { WorkflowController } from './workflow.controller';
import { DuplicateWorkflowUseCase } from './usecases/duplicate-workflow/duplicate-workflow.usecase';
import { WebhooksModule } from '../webhooks/webhooks.module';

const DAL_REPOSITORIES = [CommunityOrganizationRepository];

const MODULES = [SharedModule, MessageTemplateModule, ChangeModule, AuthModule, BridgeModule, IntegrationModule];

if (process.env.NOVU_ENTERPRISE === 'true') {
  MODULES.push(WebhooksModule);
}

@Module({
  imports: MODULES,
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
    GetWorkflowWithPreferencesUseCase,
    SyncToEnvironmentUseCase,
    BuildStepDataUsecase,
    PreviewUsecase,
    BuildWorkflowTestDataUseCase,
    GetWorkflowUseCase,
    DuplicateWorkflowUseCase,
    BuildVariableSchemaUsecase,
    PatchWorkflowUsecase,
    CreateVariablesObject,
    BuildStepIssuesUsecase,
    ResourceValidatorService,
    TierRestrictionsValidateUsecase,
  ],
})
export class WorkflowModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}
