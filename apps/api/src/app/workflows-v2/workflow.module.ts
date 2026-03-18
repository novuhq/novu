import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import {
  BuildStepDataUsecase,
  BuildStepIssuesUsecase,
  BuildVariableSchemaUsecase,
  ControlValueSanitizerService,
  CreateVariablesObject,
  CreateWorkflowV0,
  DeletePreferencesUseCase,
  GetPreferences,
  GetWorkflowByIdsUseCase,
  GetWorkflowUseCase,
  GetWorkflowWithPreferencesUseCase,
  MockDataGeneratorService,
  PayloadMergerService,
  PreviewErrorHandler,
  PreviewPayloadProcessorService,
  PreviewUsecase,
  ResourceValidatorService,
  TierRestrictionsValidateUsecase,
  UpdateWorkflowV0,
  UpsertControlValuesUseCase,
  UpsertPreferences,
  UpsertWorkflowUseCase,
} from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { BridgeModule } from '../bridge';
import { ChangeModule } from '../change/change.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { LayoutsV2Module } from '../layouts-v2/layouts.module';
import { MessageTemplateModule } from '../message-template/message-template.module';
import { OutboundWebhooksModule } from '../outbound-webhooks/outbound-webhooks.module';
import { SharedModule } from '../shared/shared.module';
import { StepResolversModule } from '../step-resolvers/step-resolvers.module';
import { DeleteWorkflowUseCase } from '../workflows-v1/usecases/delete-workflow/delete-workflow.usecase';

import {
  BuildWorkflowTestDataUseCase,
  ListWorkflowsUseCase,
  SyncToEnvironmentUseCase,
  TestHttpEndpointUsecase,
} from './usecases';

import { DuplicateWorkflowUseCase } from './usecases/duplicate-workflow/duplicate-workflow.usecase';
import { PatchWorkflowUsecase } from './usecases/patch-workflow';
import { WorkflowController } from './workflow.controller';

const DAL_REPOSITORIES = [CommunityOrganizationRepository];

const MODULES = [
  SharedModule,
  MessageTemplateModule,
  ChangeModule,
  AuthModule,
  BridgeModule,
  IntegrationModule,
  LayoutsV2Module,
  OutboundWebhooksModule.forRoot(),
  StepResolversModule,
];

@Module({
  imports: MODULES,
  controllers: [WorkflowController],
  providers: [
    ...DAL_REPOSITORIES,
    CreateWorkflowV0,
    UpdateWorkflowV0,
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
    ControlValueSanitizerService,
    PayloadMergerService,
    PreviewPayloadProcessorService,
    MockDataGeneratorService,
    PreviewErrorHandler,
    TestHttpEndpointUsecase,
  ],
  exports: [UpsertWorkflowUseCase, SyncToEnvironmentUseCase, GetWorkflowUseCase, DeleteWorkflowUseCase],
})
export class WorkflowModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}
