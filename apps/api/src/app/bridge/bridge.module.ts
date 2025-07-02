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
  GetWorkflowWithPreferencesUseCase,
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
import { CreateVariablesObject } from '../shared/usecases/create-variables-object/create-variables-object.usecase';
import { BuildStepIssuesUsecase } from '../workflows-v2/usecases/build-step-issues/build-step-issues.usecase';
import { WebhooksModule } from '../webhooks/webhooks.module';

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
