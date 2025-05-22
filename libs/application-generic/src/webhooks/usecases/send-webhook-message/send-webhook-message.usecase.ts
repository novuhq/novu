import { Inject, Injectable, Optional } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { EnvironmentRepository } from '@novu/dal';
import { shortId } from '../../../utils/generate-id';
import { SendWebhookMessageCommand } from './send-webhook-message.command';
import { WrapperDto } from '../../dtos/webhook-payload.dto';
import { SvixClient } from '../../services';
import { generateWebhookAppId } from '../../utils/app-id';

@Injectable()
export class SendWebhookMessage {
  constructor(
    @Optional() @Inject('SVIX_CLIENT') private readonly svix: SvixClient | undefined,
    private logger: PinoLogger,
    private environmentRepository: EnvironmentRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: SendWebhookMessageCommand): Promise<{ eventId: string } | undefined> {
    if (!this.svix) {
      this.logger.debug('Svix client not available – webhooks are disabled for this instance.');

      return;
    }

    const eventId = `evt_${shortId()}`;
    const environment = await this.environmentRepository.findOne(
      {
        _id: command.environmentId,
      },
      'webhookAppId identifier'
    );

    if (!environment) {
      throw new Error(`Environment not found for id ${command.environmentId}`);
    }

    const appId = environment.webhookAppId;

    if (!appId) {
      this.logger.debug(`Webhook app ID not found for environment ${command.environmentId}, Event ID: ${eventId}`);

      return;
    }

    const webhookPayload: WrapperDto<any> = {
      id: eventId,
      type: command.eventType,
      object: command.objectType,
      data: command.payload,
      timestamp: new Date().toISOString(),
      environmentId: environment.identifier,
    };

    try {
      this.logger.debug(
        `Attempting to send webhook ${command.eventType} for application ${appId}, Event ID: ${eventId}`
      );

      const message = await this.svix.message.create(appId, {
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
        `Failed to send webhook ${command.eventType} for application ${appId}. Error: ${error.message}, Event ID: ${eventId}`,
        error.stack
      );

      throw error;
    }
  }
}
