import { Module } from '@nestjs/common';
import {
  AnalyticsService,
  ClickHouseService,
  CreateExecutionDetails,
  FeatureFlagsService,
  GetDecryptedSecretKey,
  GetLayoutUseCase as GetLayoutUseCaseV1,
  TraceLogRepository,
} from '@novu/application-generic';

import {
  CommunityOrganizationRepository,
  ControlValuesRepository,
  EnvironmentRepository,
  ExecutionDetailsRepository,
  IntegrationRepository,
  JobRepository,
  LayoutRepository,
  NotificationTemplateRepository,
} from '@novu/dal';
import { NovuClient, NovuHandler } from '@novu/framework/nest';
import { GetLayoutUseCase } from '../layouts-v2/usecases/get-layout';
import { LayoutVariablesSchemaUseCase } from '../layouts-v2/usecases/layout-variables-schema';
import { GetOrganizationSettings } from '../organization/usecases/get-organization-settings/get-organization-settings.usecase';
import { CreateVariablesObject } from '../shared/usecases/create-variables-object';
import { NovuBridgeController } from './novu-bridge.controller';
import { NovuBridgeClient } from './novu-bridge-client';
import { ConstructFrameworkWorkflow } from './usecases/construct-framework-workflow';
import {
  ChatOutputRendererUsecase,
  EmailOutputRendererUsecase,
  InAppOutputRendererUsecase,
  PushOutputRendererUsecase,
  SmsOutputRendererUsecase,
} from './usecases/output-renderers';
import { DelayOutputRendererUsecase } from './usecases/output-renderers/delay-output-renderer.usecase';
import { DigestOutputRendererUsecase } from './usecases/output-renderers/digest-output-renderer.usecase';

export const featureFlagsService = {
  provide: FeatureFlagsService,
  useFactory: async (): Promise<FeatureFlagsService> => {
    const instance = new FeatureFlagsService();
    await instance.initialize();

    return instance;
  },
};

@Module({
  controllers: [NovuBridgeController],
  providers: [
    {
      provide: NovuClient,
      useClass: NovuBridgeClient,
    },
    NovuHandler,
    EnvironmentRepository,
    NotificationTemplateRepository,
    CommunityOrganizationRepository,
    IntegrationRepository,
    ControlValuesRepository,
    LayoutRepository,
    GetOrganizationSettings,
    ConstructFrameworkWorkflow,
    GetDecryptedSecretKey,
    InAppOutputRendererUsecase,
    EmailOutputRendererUsecase,
    SmsOutputRendererUsecase,
    ChatOutputRendererUsecase,
    PushOutputRendererUsecase,
    DelayOutputRendererUsecase,
    DigestOutputRendererUsecase,
    AnalyticsService,
    GetLayoutUseCaseV1,
    LayoutVariablesSchemaUseCase,
    CreateVariablesObject,
    GetLayoutUseCase,
    JobRepository,
    ExecutionDetailsRepository,
    TraceLogRepository,
    ClickHouseService,
    CreateExecutionDetails,
    featureFlagsService,
  ],
})
export class NovuBridgeModule {}
