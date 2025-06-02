import { Module } from '@nestjs/common';
import { NovuClient, NovuHandler } from '@novu/framework/nest';

import {
  EnvironmentRepository,
  NotificationTemplateRepository,
  CommunityOrganizationRepository,
  IntegrationRepository,
} from '@novu/dal';
import { GetDecryptedSecretKey, FeatureFlagsService } from '@novu/application-generic';
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
    featureFlagsService,
  ],
})
export class NovuBridgeModule {}
