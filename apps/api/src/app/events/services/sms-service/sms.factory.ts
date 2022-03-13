import { IntegrationEntity } from '@notifire/dal';
import { ISmsFactory, ISmsHandler } from './interfaces';
import { SnsHandler, TelnyxHandler, TwilioHandler } from './handlers';

export class SmsFactory implements ISmsFactory {
  handlers: ISmsHandler[] = [new SnsHandler(), new TelnyxHandler(), new TwilioHandler()];

  getHandler(integration: IntegrationEntity, from: string): ISmsHandler {
    try {
      const handler = this.handlers.find((x) => x.canHandle(integration.providerId, integration.channel)) ?? null;

      if (!handler) return null;

      handler.buildProvider(integration.credentials, from);

      return handler;
    } catch (error) {
      throw new Error(`Could not build mail handler id: ${integration._id}, error: ${error}`);
    }
  }
}
