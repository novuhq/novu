import { Inject, Injectable, Scope } from '@nestjs/common';
import { Svix } from 'svix';
import shortid from 'shortid';

import { PinoLogger } from 'nestjs-pino';
import { SendWebhookMessageCommand } from './send-webhook-message.command';
import { WrapperDto } from '../../dtos/webhook-payload.dto';

const LOG_CONTEXT = 'SendWebhookMessageUseCase';

@Injectable()
export class SendWebhookMessage {
  constructor(
    @Inject('SVIX_CLIENT') private svix: Svix,
    private logger: PinoLogger
  ) {
    this.logger.setContext(LOG_CONTEXT);
  }

  async execute(command: SendWebhookMessageCommand): Promise<{ eventId: string } | undefined> {
    const eventId = `evt_${shortid.generate()}`;

    const webhookPayload: WrapperDto<any> = {
      type: command.eventType,
      object: command.objectType,
      data: command.payload,
      timestamp: new Date().toISOString(),
      environmentId: command.environmentId,
    };

    try {
      this.logger.debug(
        `Attempting to send webhook ${command.eventType} for application ${command.organizationId}-${command.environmentId}, Event ID: ${eventId}`
      );

      const message = await this.svix.message.create(`${command.organizationId}-${command.environmentId}`, {
        eventType: command.eventType,
        eventId,
        payload: webhookPayload,
      });

      this.logger.debug(
        `Successfully sent webhook ${command.eventType}. Svix Message ID: ${message.id}, Event ID: ${eventId}`
      );

      return { eventId };
    } catch (error: any) {
      this.logger.error(
        `Failed to send webhook ${command.eventType} for application ${
          command.organizationId
        }-${command.environmentId}. Error: ${error.message}, Event ID: ${eventId}`,
        error.stack
      );

      throw error;
    }
  }
}
