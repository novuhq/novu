import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import {
  BuildStepIssuesUsecase,
  BuildVariableSchemaUsecase,
  CreateChange,
  CreateMessageTemplate,
  CreateVariablesObject,
  CreateWorkflowV0,
  DeleteMessageTemplate,
  DeletePreferencesUseCase,
  GetPreferences,
  GetWorkflowByIdsUseCase,
  GetWorkflowWithPreferencesUseCase,
  ResourceValidatorService,
  TierRestrictionsValidateUsecase,
  UpdateChange,
  UpdateMessageTemplate,
  UpdateWorkflowV0,
  UpsertControlValuesUseCase,
  UpsertPreferences,
} from '@novu/application-generic';
import { CommunityOrganizationRepository, PreferencesRepository } from '@novu/dal';
import { OutboundWebhooksModule } from '../outbound-webhooks/outbound-webhooks.module';
import { SharedModule } from '../shared/shared.module';
import { DeleteWorkflowUseCase } from '../workflows-v1/usecases/delete-workflow/delete-workflow.usecase';
import { BridgeController } from './bridge.controller';
import { USECASES } from './usecases';

const PROVIDERS = [
  CreateWorkflowV0,
  UpdateWorkflowV0,
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
