import { Body, ClassSerializerInterceptor, Controller, Param, Post, UseInterceptors } from '@nestjs/common';

import { IWebhookResult } from './dtos/webhooks-response.dto';
import { Webhook } from './usecases/webhook/webhook.usecase';
import { WebhookCommand } from './usecases/webhook/webhook.command';

@Controller('/webhooks')
@UseInterceptors(ClassSerializerInterceptor)
export class WebhooksController {
  constructor(private webhookUsecase: Webhook) {}

  @Post('/organizations/:organizationId/environments/:environmentId/email/:providerOrIntegrationId')
  public emailWebhook(
    @Param('organizationId') organizationId: string,
    @Param('environmentId') environmentId: string,
    @Param('providerOrIntegrationId') providerOrIntegrationId: string,
    @Body() body: any
  ): Promise<IWebhookResult[]> {
    return this.webhookUsecase.execute(
      WebhookCommand.create({
        environmentId,
        organizationId,
        providerOrIntegrationId,
        body,
        type: 'email',
      })
    );
  }

  @Post('/organizations/:organizationId/environments/:environmentId/sms/:providerOrIntegrationId')
  public smsWebhook(
    @Param('organizationId') organizationId: string,
    @Param('environmentId') environmentId: string,
    @Param('providerOrIntegrationId') providerOrIntegrationId: string,
    @Body() body: any
  ): Promise<IWebhookResult[]> {
    return this.webhookUsecase.execute(
      WebhookCommand.create({
        environmentId,
        organizationId,
        providerOrIntegrationId,
        body,
        type: 'sms',
      })
    );
  }
}
