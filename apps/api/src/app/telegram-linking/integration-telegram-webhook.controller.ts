import { Body, Controller, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';

import { ProcessIntegrationTelegramWebhookCommand } from './process-integration-telegram-webhook/process-integration-telegram-webhook.command';
import { ProcessIntegrationTelegramWebhook } from './process-integration-telegram-webhook/process-integration-telegram-webhook.usecase';

/**
 * Public Telegram webhook for integrations that are not linked to an agent.
 * Only handles `/start <code>` subscriber-link control messages.
 */
@Controller('/integrations')
@ApiExcludeController()
export class IntegrationTelegramWebhookController {
  constructor(private readonly processIntegrationTelegramWebhook: ProcessIntegrationTelegramWebhook) {}

  @Post('/:integrationIdentifier/:environmentId/webhook')
  @HttpCode(HttpStatus.OK)
  async handleInboundWebhook(
    @Param('integrationIdentifier') integrationIdentifier: string,
    @Param('environmentId') environmentId: string,
    @Req() req: Request,
    @Body() body: Record<string, unknown>
  ): Promise<Record<string, never>> {
    await this.processIntegrationTelegramWebhook.execute(
      ProcessIntegrationTelegramWebhookCommand.create({
        environmentId,
        integrationIdentifier,
        secretToken: req.header('x-telegram-bot-api-secret-token'),
        update: body,
      })
    );

    return {};
  }
}
