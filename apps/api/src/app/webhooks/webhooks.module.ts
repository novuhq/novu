import { Module } from '@nestjs/common';
import { SvixProviderService, SendWebhookMessage } from '@novu/application-generic';
import { SharedModule } from '../shared/shared.module';
import { WebhooksController } from './webhooks.controller';
import { GetWebhookPortalTokenUsecase } from './usecases/get-webhook-portal-token/get-webhook-portal-token.usecase';
import { CreateWebhookPortalUsecase } from './usecases/create-webhook-portal-token/create-webhook-portal.usecase';

@Module({
  imports: [SharedModule],
  controllers: [WebhooksController],
  providers: [GetWebhookPortalTokenUsecase, CreateWebhookPortalUsecase, SvixProviderService, SendWebhookMessage],
  exports: [SendWebhookMessage],
})
export class WebhooksModule {}
