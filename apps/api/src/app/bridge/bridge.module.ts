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
import { SharedModule } from '../shared/shared.module';
import { BridgeController } from './bridge.controller';
import { USECASES } from './usecases';
import { BuildVariableSchemaUsecase } from '../workflows-v2/usecases';
import { CreateVariablesObject } from '../shared/usecases/create-variables-object/create-variables-object.usecase';
import { BuildStepIssuesUsecase } from '../workflows-v2/usecases/build-step-issues/build-step-issues.usecase';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { CreateWorkflow } from '../workflows-v1/usecases/create-workflow/create-workflow.usecase';
import { UpdateWorkflow } from '../workflows-v1/usecases/update-workflow/update-workflow.usecase';
import { DeleteWorkflowUseCase } from '../workflows-v1/usecases/delete-workflow/delete-workflow.usecase';
import { GetWorkflowWithPreferencesUseCase } from '../workflows-v1/usecases/get-workflow-with-preferences/get-workflow-with-preferences.usecase';

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

const MODULES = [SharedModule];

if (process.env.NOVU_ENTERPRISE === 'true') {
  MODULES.push(WebhooksModule);
}

@Module({
  imports: MODULES,
  providers: [...PROVIDERS, ...USECASES],
  controllers: [BridgeController],
  exports: [...USECASES],
})
export class BridgeModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {}
}
