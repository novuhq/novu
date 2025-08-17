import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import {
  DeletePreferencesUseCase,
  GetPreferences,
  GetWorkflowByIdsUseCase,
  ResourceValidatorService,
  TierRestrictionsValidateUsecase,
  UpsertControlValuesUseCase,
  UpsertPreferences,
} from '@novu/application-generic';

import { CommunityOrganizationRepository } from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { BridgeModule } from '../bridge';
import { ChangeModule } from '../change/change.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { LayoutsV2Module } from '../layouts-v2/layouts.module';
import { MessageTemplateModule } from '../message-template/message-template.module';
import { OutboundWebhooksModule } from '../outbound-webhooks/outbound-webhooks.module';
import { ControlValueSanitizerService } from '../shared/services/control-value-sanitizer.service';
import { SharedModule } from '../shared/shared.module';
import { CreateVariablesObject } from '../shared/usecases/create-variables-object/create-variables-object.usecase';
import { CreateWorkflow } from '../workflows-v1/usecases/create-workflow/create-workflow.usecase';
import { DeleteWorkflowUseCase } from '../workflows-v1/usecases/delete-workflow/delete-workflow.usecase';
import { GetWorkflowWithPreferencesUseCase } from '../workflows-v1/usecases/get-workflow-with-preferences/get-workflow-with-preferences.usecase';
import { UpdateWorkflow } from '../workflows-v1/usecases/update-workflow/update-workflow.usecase';
import {
  BuildStepDataUsecase,
  BuildVariableSchemaUsecase,
  BuildWorkflowTestDataUseCase,
  GetWorkflowUseCase,
  ListWorkflowsUseCase,
  PreviewUsecase,
  SyncToEnvironmentUseCase,
  UpsertWorkflowUseCase,
} from './usecases';
import { BuildStepIssuesUsecase } from './usecases/build-step-issues/build-step-issues.usecase';
import { DuplicateWorkflowUseCase } from './usecases/duplicate-workflow/duplicate-workflow.usecase';
import { PatchWorkflowUsecase } from './usecases/patch-workflow';
import { MockDataGeneratorService } from './usecases/preview/services/mock-data-generator.service';
import { PayloadMergerService } from './usecases/preview/services/payload-merger.service';
import { PreviewPayloadProcessorService } from './usecases/preview/services/preview-payload-processor.service';
import { SchemaBuilderService } from './usecases/preview/services/schema-builder.service';
import { PreviewErrorHandler } from './usecases/preview/utils/preview-error-handler';
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
];

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
    ControlValueSanitizerService,
    PayloadMergerService,
    SchemaBuilderService,
    PreviewPayloadProcessorService,
    MockDataGeneratorService,
    PreviewErrorHandler,
  ],
  exports: [UpsertWorkflowUseCase, SyncToEnvironmentUseCase, GetWorkflowUseCase, DeleteWorkflowUseCase],
})
export class WorkflowModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}
