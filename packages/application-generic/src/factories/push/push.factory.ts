import { IntegrationEntity } from '@novu/dal';
import { IPushFactory, IPushHandler } from './interfaces';
import {
  APNSHandler,
  FCMHandler,
  ExpoHandler,
  OneSignalHandler,
  PushWebhookHandler,
} from './handlers';
import { PushAPIHandler } from './handlers/push-api.handler';

export class PushFactory implements IPushFactory {
  handlers: IPushHandler[] = [
    new FCMHandler(),
    new ExpoHandler(),
    new APNSHandler(),
    new OneSignalHandler(),
    new PushAPIHandler(),
    new PushWebhookHandler(),
  ];

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
