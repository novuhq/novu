import { IntegrationEntity } from '@novu/dal';
import {
  APNSHandler,
  ExpoHandler,
  FCMHandler,
  OneSignalHandler,
  PusherBeamsHandler,
  PushWebhookHandler,
} from './handlers';
import { IPushFactory, IPushHandler } from './interfaces';

export class PushFactory implements IPushFactory {
  handlers: IPushHandler[] = [
    new FCMHandler(),
    new ExpoHandler(),
    new APNSHandler(),
    new OneSignalHandler(),
    new PushWebhookHandler(),
    new PusherBeamsHandler(),
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
