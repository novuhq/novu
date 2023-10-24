import { IntegrationEntity } from '@novu/dal';
import { IPushFactory, IPushHandler } from './interfaces';
import {
  APNSHandler,
  FCMHandler,
  ExpoHandler,
  OneSignalHandler,
  PushWebhookHandler,
} from './handlers';

export class PushFactory implements IPushFactory {
  handlers: IPushHandler[] = [
    new FCMHandler(),
    new ExpoHandler(),
    new APNSHandler(),
    new OneSignalHandler(),
    new PushWebhookHandler(),
  ];

  getHandler(integration: IntegrationEntity): IPushHandler {
    const handler =
      this.handlers.find((handlerItem) =>
        handlerItem.canHandle(integration.providerId, integration.channel)
      ) ?? null;
    if (!handler) return null;

    handler.buildProvider(integration.credentials);

    return handler;
  }
}
