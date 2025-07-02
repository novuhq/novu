import { Module } from '@nestjs/common';
import { NovuClient, NovuHandler } from '@novu/framework/nest';

import {
  EnvironmentRepository,
  NotificationTemplateRepository,
  CommunityOrganizationRepository,
  IntegrationRepository,
  ControlValuesRepository,
  LayoutRepository,
} from '@novu/dal';
import {
  AnalyticsService,
  GetDecryptedSecretKey,
  FeatureFlagsService,
  GetLayoutUseCase as GetLayoutUseCaseV1,
} from '@novu/application-generic';
import { NovuBridgeClient } from './novu-bridge-client';
import { ConstructFrameworkWorkflow } from './usecases/construct-framework-workflow';
import { NovuBridgeController } from './novu-bridge.controller';
import {
  ChatOutputRendererUsecase,
  InAppOutputRendererUsecase,
  PushOutputRendererUsecase,
  EmailOutputRendererUsecase,
  SmsOutputRendererUsecase,
} from './usecases/output-renderers';
import { DelayOutputRendererUsecase } from './usecases/output-renderers/delay-output-renderer.usecase';
import { DigestOutputRendererUsecase } from './usecases/output-renderers/digest-output-renderer.usecase';
import { GetOrganizationSettings } from '../organization/usecases/get-organization-settings/get-organization-settings.usecase';
import { GetLayoutUseCase } from '../layouts-v2/usecases/get-layout';
import { LayoutVariablesSchemaUseCase } from '../layouts-v2/usecases/layout-variables-schema';
import { CreateVariablesObject } from '../shared/usecases/create-variables-object';

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
    featureFlagsService,
  ],
})
export class NovuBridgeModule {}
