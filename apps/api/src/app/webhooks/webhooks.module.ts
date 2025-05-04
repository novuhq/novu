import { Module } from '@nestjs/common';
import { SvixProviderService, SendWebhookMessage } from '@novu/application-generic';
import { SharedModule } from '../shared/shared.module';
import { WebhooksController } from './webhooks.controller';
import { GetWebhookPortalTokenUsecase } from './usecases/get-webhook-portal-token/get-webhook-portal-token.usecase';

@Module({
  imports: [SharedModule],
  controllers: [WebhooksController],
  providers: [GetWebhookPortalTokenUsecase, SvixProviderService, SendWebhookMessage],
  exports: [SendWebhookMessage],
})
export class WebhooksModule {}
