import { DynamicModule, Module } from '@nestjs/common';
import { SendWebhookMessage, SvixProviderService } from '@novu/application-generic';
import { NoopSendWebhookMessage } from '../inbox/usecases/noop-send-webhook-message.usecase';
import { SharedModule } from '../shared/shared.module';
import { OutboundWebhooksController } from './outbound-webhooks.controller';
import { CreateWebhookPortalUsecase } from './usecases/create-webhook-portal-token/create-webhook-portal.usecase';
import { GetWebhookPortalTokenUsecase } from './usecases/get-webhook-portal-token/get-webhook-portal-token.usecase';

@Module({})
class OutboundWebhooksModuleDefinition {}

export const OutboundWebhooksModule = {
  forRoot(): DynamicModule {
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true';

    if (isEnterprise) {
      return {
        module: OutboundWebhooksModuleDefinition,
        imports: [SharedModule],
        controllers: [OutboundWebhooksController],
        providers: [GetWebhookPortalTokenUsecase, CreateWebhookPortalUsecase, SvixProviderService, SendWebhookMessage],
        exports: [SendWebhookMessage],
      };
    }

    return {
      module: OutboundWebhooksModuleDefinition,
      imports: [SharedModule],
      providers: [
        {
          provide: SendWebhookMessage,
          useClass: NoopSendWebhookMessage,
        },
      ],
      exports: [SendWebhookMessage],
    };
  },
};
