import { Module } from '@nestjs/common';
import { SendWebhookMessage, SvixProviderService } from '@novu/application-generic';
import { SharedModule } from '../shared/shared.module';
import { WebhooksController } from './outbound-webhooks.controller';
import { CreateWebhookPortalUsecase } from './usecases/create-webhook-portal-token/create-webhook-portal.usecase';
import { GetWebhookPortalTokenUsecase } from './usecases/get-webhook-portal-token/get-webhook-portal-token.usecase';

@Module({
  imports: [SharedModule],
  controllers: [WebhooksController],
  providers: [GetWebhookPortalTokenUsecase, CreateWebhookPortalUsecase, SvixProviderService, SendWebhookMessage],
  exports: [SendWebhookMessage],
})
export class OutboundWebhooksModule {}
