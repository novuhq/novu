import { Inject, Injectable, Optional } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { PinoLogger } from 'nestjs-pino';
import { InstrumentUsecase } from '../../../instrumentation';
import { generateObjectId } from '../../../utils';
import { WrapperDto } from '../../dtos/webhook-payload.dto';
import { SvixClient } from '../../services';
import { SendWebhookMessageCommand } from './send-webhook-message.command';

@Injectable()
export class SendWebhookMessage {
  constructor(
    @Optional() @Inject('SVIX_CLIENT') private readonly svix: SvixClient | undefined,
    private logger: PinoLogger,
    private environmentRepository: EnvironmentRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: SendWebhookMessageCommand): Promise<{ eventId: string } | undefined> {
    if (!this.svix) {
      this.logger.debug('Outbound webhook client not available – webhooks are disabled for this instance.');

      return;
    }

    const environment =
      command.environment ||
      (await this.environmentRepository.findOne(
        {
          _id: command.environmentId,
        },
        'webhookAppId identifier'
      ));

    if (!environment) {
      throw new Error(`Environment not found for id ${command.environmentId}`);
    }

    const appId = environment.webhookAppId;

    if (!appId) {
      this.logger.debug(`Webhook app ID not found for environment ${command.environmentId}`);

      return;
    }

    const eventId = `evt_${generateObjectId()}`;

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

      await this.svix.message.create(appId, {
        eventType: command.eventType,
        eventId,
        payload: webhookPayload,
      });

      this.logger.debug(`Successfully sent webhook ${command.eventType}. Event ID: ${eventId}`);

      return { eventId };
    } catch (error: any) {
      this.logger.error(
        `Failed to send webhook ${command.eventType} for application ${appId}. Error: ${error.message}, Event ID: ${eventId}`,
        error.stack
      );
    }
  }
}
