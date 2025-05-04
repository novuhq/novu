import { Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { Svix } from 'svix';
import { v4 as uuidv4 } from 'uuid';

import { SendWebhookMessageCommand } from './send-webhook-message.command';
import { WrapperDto } from '../../dtos/webhook-payload.dto';

const LOG_CONTEXT = 'SendWebhookMessageUseCase';

@Injectable({
  scope: Scope.REQUEST, // Assuming command context might be needed later
})
export class SendWebhookMessage {
  constructor(@Inject('SVIX_CLIENT') private svix: Svix) {}

  async execute(command: SendWebhookMessageCommand): Promise<{ eventId: string } | undefined> {
    const eventId = `evt_${uuidv4().replace(/-/g, '')}`;

    const webhookPayload: WrapperDto<any> = {
      type: command.eventType,
      object: command.objectType,
      data: command.payload,
      timestamp: new Date().toISOString(),
      environmentId: command.environmentId,
    };

    console.log('webhookPayload', webhookPayload);

    try {
      Logger.log(
        `Attempting to send webhook ${command.eventType} for application ${command.organizationId}-${command.environmentId}, Event ID: ${eventId}`,
        LOG_CONTEXT
      );

      const message = await this.svix.message.create(`${command.organizationId}-${command.environmentId}`, {
        eventType: command.eventType,
        eventId,
        payload: webhookPayload,
      });

      Logger.log(
        `Successfully sent webhook ${command.eventType}. Svix Message ID: ${message.id}, Event ID: ${eventId}`,
        LOG_CONTEXT
      );

      return { eventId };
    } catch (error: any) {
      Logger.error(
        `Failed to send webhook ${command.eventType} for application ${
          command.applicationId
        }. Error: ${error.message}, Event ID: ${eventId}`,
        error.stack,
        LOG_CONTEXT
      );
      /*
       * Depending on requirements, you might want to throw the error,
       * return a specific error object, or handle it differently.
       */
      throw error;
    }
  }
}
