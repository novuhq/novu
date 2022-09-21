import { Body, ClassSerializerInterceptor, Controller, Param, Post, UseInterceptors } from '@nestjs/common';
import { EmailWebhook, IWebhookResult } from './usecases/email-webhook/email-webhook.usecase';
import { EmailWebhookCommand } from './usecases/email-webhook/email-webhook.command';

@Controller('/webhooks')
@UseInterceptors(ClassSerializerInterceptor)
export class WebhooksController {
  constructor(private emailWebhookUsecase: EmailWebhook) {}

  @Post('/:organizationId/:environmentId/email/:providerId')
  public emailWebhook(
    @Param('organizationId') organizationId: string,
    @Param('environmentId') environmentId: string,
    @Param('providerId') providerId: string,
    @Body() body: any
  ): Promise<IWebhookResult[]> {
    return this.emailWebhookUsecase.execute(
      EmailWebhookCommand.create({
        environmentId,
        organizationId,
        providerId,
        body,
      })
    );
  }
}
