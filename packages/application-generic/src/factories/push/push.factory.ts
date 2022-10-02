import { IntegrationEntity } from '@novu/dal';
import { IPushFactory, IPushHandler } from './interfaces';
import { FCMHandler } from './handlers';

export class PushFactory implements IPushFactory {
  handlers: IPushHandler[] = [new FCMHandler()];

  getHandler(integration: IntegrationEntity): IPushHandler {
    try {
      const handler =
        this.handlers.find((handlerItem) =>
          handlerItem.canHandle(integration.providerId, integration.channel)
        ) ?? null;

      if (!handler) return null;

      handler.buildProvider(integration.credentials);

      return handler;
    } catch (error) {
      throw new Error(
        `Could not build push handler id: ${integration._id}, error: ${error}`
      );
    }
  }
}
