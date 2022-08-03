import { IDirectFactory, IDirectHandler } from './interfaces';
import { SlackHandler } from './handlers/slack.handler';
import { IntegrationEntity } from '@novu/dal';

export class DirectFactory implements IDirectFactory {
  handlers: IDirectHandler[] = [new SlackHandler()];

  getHandler(integration: IntegrationEntity): IDirectHandler {
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
