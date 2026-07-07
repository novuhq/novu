import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseInterceptors,
} from '@nestjs/common';

import { IWebhookResult } from './dtos/webhooks-response.dto';
import { normalizeHeaders } from './helpers/normalize-headers';
import { WebhookCommand } from './usecases/webhook/webhook.command';
import { Webhook } from './usecases/webhook/webhook.usecase';

@Controller('/webhooks')
@UseInterceptors(ClassSerializerInterceptor)
export class WebhooksController {
  constructor(private webhookUsecase: Webhook) {}

  @Post('/organizations/:organizationId/environments/:environmentId/email/:providerOrIntegrationId')
  public emailWebhook(
    @Param('organizationId') organizationId: string,
    @Param('environmentId') environmentId: string,
    @Param('providerOrIntegrationId') providerOrIntegrationId: string,
    @Body() body: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() request: RawBodyRequest<Request>
  ): Promise<IWebhookResult[]> {
    return this.webhookUsecase.execute(
      WebhookCommand.create({
        environmentId,
        organizationId,
        providerOrIntegrationId,
        body,
        headers: normalizeHeaders(headers),
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
    @Body() body: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() request: RawBodyRequest<Request>
  ): Promise<IWebhookResult[]> {
    return this.webhookUsecase.execute(
      WebhookCommand.create({
        environmentId,
        organizationId,
        providerOrIntegrationId,
        body,
        headers: normalizeHeaders(headers),
        rawBody: request.rawBody,
        type: 'sms',
      })
    );
  }
}
