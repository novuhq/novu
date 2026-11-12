import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Headers,
  Param,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';

import { IWebhookResult } from './dtos/webhooks-response.dto';
import { WebhookCommand } from './usecases/webhook/webhook.command';
import { Webhook } from './usecases/webhook/webhook.usecase';

type RawBodyRequest = { rawBody?: Buffer };

@Controller('/webhooks')
@UseInterceptors(ClassSerializerInterceptor)
export class WebhooksController {
  constructor(private webhookUsecase: Webhook) {}

  @Post('/organizations/:organizationId/environments/:environmentId/email/:providerOrIntegrationId')
  public emailWebhook(
    @Param('organizationId') organizationId: string,
    @Param('environmentId') environmentId: string,
    @Param('providerOrIntegrationId') providerOrIntegrationId: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
    @Req() request: RawBodyRequest
  ): Promise<IWebhookResult[]> {
    return this.webhookUsecase.execute(
      WebhookCommand.create({
        environmentId,
        organizationId,
        providerOrIntegrationId,
        body,
        headers,
        rawBody: request.rawBody,
        type: 'email',
      })
    );
  }

  @Post('/organizations/:organizationId/environments/:environmentId/sms/:providerOrIntegrationId')
  public smsWebhook(
    @Param('organizationId') organizationId: string,
    @Param('environmentId') environmentId: string,
    @Param('providerOrIntegrationId') providerOrIntegrationId: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
    @Req() request: RawBodyRequest
  ): Promise<IWebhookResult[]> {
    return this.webhookUsecase.execute(
      WebhookCommand.create({
        environmentId,
        organizationId,
        providerOrIntegrationId,
        body,
        headers,
        rawBody: request.rawBody,
        type: 'sms',
      })
    );
  }
}
