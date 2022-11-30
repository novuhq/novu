import { IntegrationEntity } from '@novu/dal';
import { ISmsFactory, ISmsHandler } from './interfaces';
import {
  SnsHandler,
  TelnyxHandler,
  TwilioHandler,
  Sms77Handler,
  TermiiSmsHandler,
  PlivoHandler,
  GupshupSmsHandler,
  FiretextSmsHandler,
  InfobipSmsHandler,
  BurstSmsHandler,
  ClickatellHandler,
} from './handlers';

export class SmsFactory implements ISmsFactory {
  handlers: ISmsHandler[] = [
    new SnsHandler(),
    new TelnyxHandler(),
    new TwilioHandler(),
    new Sms77Handler(),
    new TermiiSmsHandler(),
    new PlivoHandler(),
    new ClickatellHandler(),
    new GupshupSmsHandler(),
    new FiretextSmsHandler(),
    new InfobipSmsHandler(),
    new BurstSmsHandler(),
  ];

  getHandler(integration: IntegrationEntity): ISmsHandler {
    try {
      const handler =
        this.handlers.find((handlerItem) => handlerItem.canHandle(integration.providerId, integration.channel)) ?? null;

      if (!handler) return null;

      handler.buildProvider(integration.credentials);

      return handler;
    } catch (error) {
      throw new Error(`Could not build mail handler id: ${integration._id}, error: ${error}`);
    }
  }
}
