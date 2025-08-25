import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import {
  CreateChange,
  CreateMessageTemplate,
  DeleteMessageTemplate,
  DeletePreferencesUseCase,
  GetPreferences,
  GetWorkflowByIdsUseCase,
  ResourceValidatorService,
  TierRestrictionsValidateUsecase,
  UpdateChange,
  UpdateMessageTemplate,
  UpsertControlValuesUseCase,
  UpsertPreferences,
} from '@novu/application-generic';
import { CommunityOrganizationRepository, PreferencesRepository } from '@novu/dal';
import { OutboundWebhooksModule } from '../outbound-webhooks/outbound-webhooks.module';
import { SharedModule } from '../shared/shared.module';
import { CreateVariablesObject } from '../shared/usecases/create-variables-object/create-variables-object.usecase';
import { CreateWorkflow } from '../workflows-v1/usecases/create-workflow/create-workflow.usecase';
import { DeleteWorkflowUseCase } from '../workflows-v1/usecases/delete-workflow/delete-workflow.usecase';
import { GetWorkflowWithPreferencesUseCase } from '../workflows-v1/usecases/get-workflow-with-preferences/get-workflow-with-preferences.usecase';
import { UpdateWorkflow } from '../workflows-v1/usecases/update-workflow/update-workflow.usecase';
import { BuildVariableSchemaUsecase } from '../workflows-v2/usecases';
import { BuildStepIssuesUsecase } from '../workflows-v2/usecases/build-step-issues/build-step-issues.usecase';
import { BridgeController } from './bridge.controller';
import { USECASES } from './usecases';

const PROVIDERS = [
  CreateWorkflow,
  UpdateWorkflow,
  GetWorkflowByIdsUseCase,
  GetWorkflowWithPreferencesUseCase,
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
  CreateVariablesObject,
  BuildStepIssuesUsecase,
  ResourceValidatorService,
  TierRestrictionsValidateUsecase,
];

const MODULES = [SharedModule, OutboundWebhooksModule.forRoot()];

@Module({
  imports: MODULES,
  providers: [...PROVIDERS, ...USECASES],
  controllers: [BridgeController],
  exports: [...USECASES],
})
export class BridgeModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {}
}
