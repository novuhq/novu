import { Body, ClassSerializerInterceptor, Controller, Param, Post, UseInterceptors } from '@nestjs/common';

import { IWebhookResult } from './dtos/webhooks-response.dto';
import { Webhook } from './usecases/webhook/webhook.usecase';
import { WebhookCommand } from './usecases/webhook/webhook.command';

@Controller('/webhooks')
@UseInterceptors(ClassSerializerInterceptor)
export class WebhooksController {
  constructor(private webhookUsecase: Webhook) {}

  @Post('/organizations/:organizationId/environments/:environmentId/email/:providerId')
  public emailWebhook(
    @Param('organizationId') organizationId: string,
    @Param('environmentId') environmentId: string,
    @Param('providerId') providerId: string,
    @Body() body: any
  ): Promise<IWebhookResult[]> {
    return this.webhookUsecase.execute(
      WebhookCommand.create({
        environmentId,
        organizationId,
        providerId,
        body,
        type: 'email',
      })
    );
  }

  @Post('/organizations/:organizationId/environments/:environmentId/sms/:providerId')
  public smsWebhook(
    @Param('organizationId') organizationId: string,
    @Param('environmentId') environmentId: string,
    @Param('providerId') providerId: string,
    @Body() body: any
  ): Promise<IWebhookResult[]> {
    return this.webhookUsecase.execute(
      WebhookCommand.create({
        environmentId,
        organizationId,
        providerId,
        body,
        type: 'sms',
      })
    );
  }
}
