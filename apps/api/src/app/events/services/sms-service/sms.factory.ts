import { IntegrationEntity } from '@notifire/dal';
import { ISmsFactory, ISmsHandler } from './interfaces';
import { SnsHandler, TelnyxHandler, TwilioHandler, Sms77Handler, PlivoHandler } from './handlers';

export class SmsFactory implements ISmsFactory {
  handlers: ISmsHandler[] = [
    new SnsHandler(),
    new TelnyxHandler(),
    new TwilioHandler(),
    new Sms77Handler(),
    new PlivoHandler(),
  ];

  getHandler(integration: IntegrationEntity): ISmsHandler {
    try {
      const handler = this.handlers.find((x) => x.canHandle(integration.providerId, integration.channel)) ?? null;

      if (!handler) return null;

      handler.buildProvider(integration.credentials);

      return handler;
    } catch (error) {
      throw new Error(`Could not build mail handler id: ${integration._id}, error: ${error}`);
    }
  }
}
