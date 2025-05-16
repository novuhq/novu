import { Inject, Injectable, Scope } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { shortId } from '../../../utils/generate-id';
import { SendWebhookMessageCommand } from './send-webhook-message.command';
import { WrapperDto } from '../../dtos/webhook-payload.dto';
import { SvixClient } from '../../services';

@Injectable()
export class SendWebhookMessage {
  constructor(
    @Inject('SVIX_CLIENT') private svix: SvixClient,
    private logger: PinoLogger,
    private environmentRepository: EnvironmentRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: SendWebhookMessageCommand): Promise<{ eventId: string } | undefined> {
    if (!this.svix) {
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

    const appId = (environment as any).webhookAppId;

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
        `Attempting to send webhook ${command.eventType} for application o=${command.organizationId}:e=${command.environmentId}, Event ID: ${eventId}`
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
        `Failed to send webhook ${command.eventType} for application o=${
          command.organizationId
        }:e=${command.environmentId}. Error: ${error.message}, Event ID: ${eventId}`,
        error.stack
      );

      throw error;
    }
  }
}
