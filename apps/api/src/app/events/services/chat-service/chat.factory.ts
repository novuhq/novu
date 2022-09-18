import { IChatFactory, IChatHandler } from './interfaces';
import { SlackHandler } from './handlers/slack.handler';
import { IntegrationEntity } from '@novu/dal';
import { DiscordHandler } from './handlers/discord.handler';
import { MSTeamsHandler } from './handlers/msteams.handler';

export class ChatFactory implements IChatFactory {
  handlers: IChatHandler[] = [new SlackHandler(), new DiscordHandler(), new MSTeamsHandler()];

  getHandler(integration: IntegrationEntity): IChatHandler {
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
