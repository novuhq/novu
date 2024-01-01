import { IntegrationEntity } from '@novu/dal';
import { IVoiceFactory, IVoiceHandler } from './interfaces';
import { TwilioHandler } from './handlers';

export class VoiceFactory implements IVoiceFactory {
  handlers: IVoiceHandler[] = [new TwilioHandler()];

  getHandler(integration: IntegrationEntity) {
    const handler =
      this.handlers.find((handlerItem) =>
        handlerItem.canHandle(integration.providerId, integration.channel)
      ) ?? null;

    if (!handler) return null;

    handler.buildProvider(integration.credentials);

    return handler;
  }
}
